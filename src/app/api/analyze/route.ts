import { NextRequest, NextResponse } from "next/server";
import { scoreCarDeal, estimateFairValue, determineVehicleCategory } from "@/lib/scoring";
import type { CarInput, AnalysisResult, PriceRange, ConfidenceLevel, VehicleCategory } from "@/lib/types";
import { fetchCraigslistPrices } from "@/lib/craigslist";
import { AutoDev } from "@auto.dev/sdk";

/**
 * VinAudit Market Value API — most accurate when a VIN is provided.
 * Uses 90-day rolling window of real transaction data.
 * Sign up at vinaudit.com/market-value-api (pay-per-use, ~$0.40/lookup).
 */
async function fetchVinAuditValue(input: CarInput): Promise<PriceRange | null> {
  const apiKey = process.env.VINAUDIT_API_KEY;
  if (!apiKey || !input.vin) return null;

  try {
    const params = new URLSearchParams({
      key: apiKey,
      vin: input.vin,
      format: "json",
      period: "90",
    });
    const res = await fetch(
      `https://api.vinaudit.com/query.php?${params}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data?.prices?.average) return null;

    const { average, below, above } = data.prices as {
      average: number;
      below: number;
      above: number;
    };
    if (!average || average < 500) return null;

    return {
      low: below ?? Math.round(average * 0.93),
      high: above ?? Math.round(average * 1.07),
      midpoint: average,
    };
  } catch {
    return null;
  }
}

/**
 * MarketCheck Price Prediction API — uses ML model trained on live listings.
 * More accurate than raw listing search. Set MARKETCHECK_API_KEY in env.
 */
async function fetchMarketCheckValue(input: CarInput): Promise<PriceRange | null> {
  const apiKey = process.env.MARKETCHECK_API_KEY;
  if (!apiKey) return null;

  // Build mileage range filter — compare to similar-mileage vehicles only
  const miles = input.mileage;
  const milesMin = Math.max(0, Math.round(miles * 0.4));
  const milesMax = Math.round(miles * 2.5 + 15000); // generous upper bound

  for (const radius of ["100", "500", "2000"]) {
    try {
      const params = new URLSearchParams({
        api_key:   apiKey,
        year:      String(input.year),
        make:      input.make,
        model:     input.model,
        ...(input.trim ? { trim: input.trim } : {}),
        zip:       input.zipCode,
        radius,
        rows:      "50",
        miles_min: String(milesMin),
        miles_max: String(milesMax),
      });
      const res = await fetch(
        `https://mc-api.marketcheck.com/v2/search/car/active?${params}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        // debug:`[MC] listings radius=${radius} status=${res.status}`);
        // If radius restriction on free tier, still try without mileage filter
        const params2 = new URLSearchParams({
          api_key: apiKey,
          year:    String(input.year),
          make:    input.make,
          model:   input.model,
          ...(input.trim ? { trim: input.trim } : {}),
          zip:     input.zipCode,
          radius,
          rows:    "50",
        });
        params2.set("radius", "100");
        const res2 = await fetch(
          `https://mc-api.marketcheck.com/v2/search/car/active?${params2}`,
          { cache: "no-store" }
        );
        if (!res2.ok) continue;
        const data2 = await res2.json();
        const listings2: { price: number; miles: number }[] = data2?.listings ?? [];
        // Filter by mileage client-side
        const filtered2 = listings2.filter((l) => l.miles >= milesMin && l.miles <= milesMax);
        const src = filtered2.length >= 3 ? filtered2 : listings2;
        const prices2 = src.map((l) => l.price).filter((p) => p > 500).sort((a, b) => a - b);
        // debug:`[MC] fallback radius=${radius} total=${listings2.length} mileage-filtered=${filtered2.length}`);
        if (prices2.length < 3) continue;
        const tc2 = Math.floor(prices2.length * 0.1);
        const tr2 = prices2.slice(tc2, prices2.length - tc2);
        return { low: tr2[0], high: tr2[tr2.length - 1], midpoint: tr2[Math.floor(tr2.length / 2)] };
      }

      const data = await res.json();
      const listings: { price: number; miles: number }[] = data?.listings ?? [];
      // debug:`[MC] listings radius=${radius} found=${listings.length}`);
      if (listings.length < 3) continue;

      const prices = listings.map((l) => l.price).filter((p) => p > 500).sort((a, b) => a - b);
      const trimCount = Math.floor(prices.length * 0.1);
      const trimmed = prices.slice(trimCount, prices.length - trimCount);
      return {
        low:      trimmed[0],
        high:     trimmed[trimmed.length - 1],
        midpoint: trimmed[Math.floor(trimmed.length / 2)],
      };
    } catch (e) {
      // debug:`[MC] listings radius=${radius} error=${e}`);
      continue;
    }
  }
  return null;
}

/**
 * Edmunds True Market Value (TMV) API — transaction-based pricing, no VIN required.
 * Uses real closed-sale data, not just listing prices. More accurate than listing-based APIs.
 * Sign up at developer.edmunds.com (free tier available).
 *
 * Flow: year/make/model → styleId lookup → TMV call with mileage + zip
 */
async function fetchEdmundsTMV(input: CarInput): Promise<PriceRange | null> {
  const apiKey = process.env.EDMUNDS_API_KEY;
  if (!apiKey) return null;

  try {
    // Edmunds uses "niceId" format: lowercase, spaces → hyphens, strip special chars
    const toNiceId = (s: string) =>
      s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const makeNiceId  = toNiceId(input.make);
    const modelNiceId = toNiceId(input.model);

    // Step 1: Get all styles (trim levels) for this year/make/model
    const stylesRes = await fetch(
      `https://api.edmunds.com/api/vehicle/v2/${makeNiceId}/${modelNiceId}/${input.year}/styles?view=basic&api_key=${apiKey}`,
      { cache: "no-store" }
    );
    if (!stylesRes.ok) {
      // debug:`[Edmunds] styles ${stylesRes.status} — ${makeNiceId}/${modelNiceId}/${input.year}`);
      return null;
    }

    const stylesData = await stylesRes.json();
    const styles: Array<{ id: number; name: string }> = stylesData?.styles ?? [];
    if (styles.length === 0) {
      // debug:`[Edmunds] no styles found for ${makeNiceId}/${modelNiceId}/${input.year}`);
      return null;
    }

    // Step 2: Find best matching style for the given trim
    let bestStyle = styles[0];
    if (input.trim) {
      const trimLower = input.trim.toLowerCase();
      const exact   = styles.find(s => s.name.toLowerCase() === trimLower);
      const partial = styles.find(s =>
        s.name.toLowerCase().includes(trimLower) || trimLower.includes(s.name.toLowerCase())
      );
      bestStyle = exact ?? partial ?? styles[0];
    }
    // debug:`[Edmunds] matched style "${bestStyle.name}" (id=${bestStyle.id})`);

    // Step 3: Get TMV for this style + mileage + zip
    const tmvRes = await fetch(
      `https://api.edmunds.com/v1/api/tmv/tmvservice/calculateusedtmv?styleid=${bestStyle.id}&condition=Good&mileage=${input.mileage}&zip=${input.zipCode}&api_key=${apiKey}`,
      { cache: "no-store" }
    );
    if (!tmvRes.ok) {
      // debug:`[Edmunds] TMV ${tmvRes.status} for styleId=${bestStyle.id}`);
      return null;
    }

    const tmvData = await tmvRes.json();
    const base = tmvData?.tmv?.nationalBasePrice;
    if (!base) return null;

    // Edmunds returns three price points — use private party as midpoint (most relevant for buyers)
    const privateParty = base.usedPrivateParty as number | undefined;
    const retail       = base.usedTmvRetail    as number | undefined;
    const tradeIn      = base.usedTradeIn      as number | undefined;

    const midpoint = privateParty ?? retail;
    if (!midpoint || midpoint < 500) return null;

    return {
      low:      tradeIn      ?? Math.round(midpoint * 0.88),
      high:     retail       ?? Math.round(midpoint * 1.08),
      midpoint: midpoint,
    };
  } catch (err) {
    console.error("[Edmunds] error:", err);
    return null;
  }
}

/**
 * Auto.dev Listings API — searches real dealer listings to derive fair value.
 * Free tier: 1,000 calls/mo. Uses median of comparable listings as anchor.
 * Set AUTODEV_API_KEY in env (get one at auto.dev/pricing).
 */
async function fetchAutoDevValue(input: CarInput): Promise<PriceRange | null> {
  const apiKey = process.env.AUTODEV_API_KEY;
  if (!apiKey) return null;

  try {
    const auto = new AutoDev({ apiKey });

    // Build mileage bounds for filtering (±50% of input mileage, min 5k window)
    const milesLow = Math.max(0, Math.round(input.mileage * 0.5));
    const milesHigh = Math.max(milesLow + 5000, Math.round(input.mileage * 1.8));

    const result = await auto.listings({
      "vehicle.make": input.make,
      "vehicle.model": input.model,
      "vehicle.year": String(input.year),
      ...(input.trim ? { "vehicle.trim": input.trim } : {}),
    });

    // SDK types result.data as {} — cast to array
    const listings = (Array.isArray(result?.data) ? result.data : []) as Record<string, unknown>[];
    if (listings.length < 3) {
      // debug:`[Auto.dev] only ${listings.length} listings found — skipping`);
      return null;
    }

    // Extract prices, filter to valid range and mileage window
    const prices = listings
      .filter((l: Record<string, unknown>) => {
        const p = Number(l.price ?? l.askingPrice ?? 0);
        const m = Number(l.mileage ?? l.miles ?? 0);
        return p > 2000 && (m === 0 || (m >= milesLow && m <= milesHigh));
      })
      .map((l: Record<string, unknown>) => Number(l.price ?? l.askingPrice))
      .sort((a: number, b: number) => a - b);

    // debug:`[Auto.dev] ${listings.length} total listings, ${prices.length} after mileage/price filter`);
    if (prices.length < 3) return null;

    // Trim outliers (10% from each end) and take median
    const trimCount = Math.floor(prices.length * 0.1);
    const trimmed = prices.slice(trimCount, prices.length - trimCount);
    const mid = trimmed[Math.floor(trimmed.length / 2)];

    return {
      low: trimmed[0],
      high: trimmed[trimmed.length - 1],
      midpoint: mid,
    };
  } catch (err) {
    console.error("[Auto.dev] error:", err);
    return null;
  }
}

// AI explanation using Anthropic (or falls back gracefully)
async function generateAiSummary(
  input: CarInput,
  scored: ReturnType<typeof scoreCarDeal>
): Promise<{ summary: string; script: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      summary: buildFallbackSummary(input, scored),
      script: buildFallbackScript(input, scored),
    };
  }

  const absDelta = Math.abs(scored.priceDelta);
  const deltaDir = scored.priceDelta >= 0 ? "ABOVE" : "BELOW";

  // PART 7: Negotiation script respects confidence level
  const confidenceNote = scored.confidenceLevel !== "High"
    ? ` Our confidence in this estimate is ${scored.confidenceLevel.toLowerCase()} — the buyer should reference a fair value RANGE rather than anchoring to one exact number.`
    : "";

  const scriptInstruction =
    scored.verdict === "Buy"
      ? `Write a CLOSING script — NOT a negotiation script. The car is already priced ${deltaDir} market by $${absDelta.toLocaleString()}, so the buyer should NOT ask for a lower price. Instead, help them express readiness to close, confirm out-the-door fees, and move quickly before someone else does.`
      : scored.verdict === "Fair Deal"
      ? `Write a script for a fair deal. The price is close to estimated fair value. The buyer should verify the out-the-door price and any dealer fees, but doesn't need to negotiate aggressively.`
      : scored.verdict === "Needs Option Review"
      ? `Write a script that acknowledges the price may be reasonable but the buyer needs more information about the vehicle's specific configuration and options before committing. The buyer should ask the seller about packages, options, and equipment to determine if the price aligns with the vehicle's actual spec level. Reference the estimated fair value range of $${scored.fairValueRange.low.toLocaleString()}–$${scored.fairValueRange.high.toLocaleString()} but note that the actual value depends heavily on configuration.${confidenceNote}`
      : scored.verdict === "Negotiate"
      ? `Write a polite but data-backed negotiation script. The car is $${absDelta.toLocaleString()} ABOVE estimated fair value. The buyer should reference the estimated fair value range of $${scored.fairValueRange.low.toLocaleString()}–$${scored.fairValueRange.high.toLocaleString()} and push toward the midpoint.${confidenceNote}`
      : scored.verdict === "Possibly Overpriced"
      ? `Write a cautious script. The car appears to be priced above estimated fair value by $${absDelta.toLocaleString()}, but our confidence is ${scored.confidenceLevel.toLowerCase()}. The buyer should reference the range and express that the price seems high based on available data, while acknowledging that specific options or condition may justify some premium.`
      : `Write a firm, professional walk-away script. The car is $${absDelta.toLocaleString()} ABOVE estimated fair value — a ${Math.abs(Math.round(scored.priceDeltaPct * 100))}% premium. The buyer should make clear the price is too high and they are prepared to walk unless it drops closer to $${scored.fairValueRange.midpoint.toLocaleString()}.`;

  // PART 3: Wording rules — never say "real market value" or "definitely overpriced"
  // when confidence is not high. Use "estimated fair value range" instead.
  const confidenceContext = scored.confidenceLevel === "High"
    ? "Our estimate has high confidence based on specific VIN data and market comparisons."
    : scored.confidenceLevel === "Medium"
    ? "Our estimate has medium confidence — some option-level detail is incomplete, so the actual fair value may differ."
    : "Our estimate has low confidence — this should be treated as directional. Configuration details could materially affect the true fair value.";

  const categoryContext = (scored.vehicleCategory === "performance" || scored.vehicleCategory === "exotic" || scored.vehicleCategory === "luxury")
    ? ` This is a ${scored.vehicleCategory}-category vehicle where factory packages and options can significantly affect value.`
    : "";

  const prompt = `You are an expert used-car advisor. Given the following deal analysis, write:
1. A SHORT SUMMARY (2–3 sentences, plain language) explaining whether this looks like a good deal and what the buyer should do next. ${confidenceContext}${categoryContext} IMPORTANT: Never say "real market value" — say "estimated fair value range" instead. If confidence is not High, include a note about estimate uncertainty.
2. A SCRIPT (4–6 sentences the buyer says out loud to the dealer or seller). ${scriptInstruction}

Car: ${input.year} ${input.make} ${input.trim && input.trim.toLowerCase().startsWith(input.model.toLowerCase()) ? input.trim : input.model + (input.trim ? " " + input.trim : "")}
Mileage: ${input.mileage.toLocaleString()} miles
Asking price: $${input.askingPrice.toLocaleString()}
Estimated fair value range: $${scored.fairValueRange.low.toLocaleString()}–$${scored.fairValueRange.high.toLocaleString()} (midpoint $${scored.fairValueRange.midpoint.toLocaleString()})
Price vs estimated fair value: ${scored.priceDelta >= 0 ? "+" : ""}$${scored.priceDelta.toLocaleString()} (${scored.priceDelta >= 0 ? "above" : "below"} midpoint)
Deal Score: ${scored.score}/100
Verdict: ${scored.verdict}
Confidence: ${scored.confidenceLevel} (${scored.confidenceScore}/100)
Vehicle Category: ${scored.vehicleCategory}
Option Data: ${scored.optionDataStatus}

Respond with JSON exactly like this:
{"summary": "...", "negotiationScript": "..."}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary ?? buildFallbackSummary(input, scored),
      script: parsed.negotiationScript ?? buildFallbackScript(input, scored),
    };
  } catch (err) {
    console.error("AI generation error:", err);
    return {
      summary: buildFallbackSummary(input, scored),
      script: buildFallbackScript(input, scored),
    };
  }
}

function buildFallbackSummary(
  input: CarInput,
  scored: ReturnType<typeof scoreCarDeal>
): string {
  const delta = Math.abs(scored.priceDelta);
  const isLowConfidence = scored.confidenceLevel === "Low";
  const isMedConfidence = scored.confidenceLevel === "Medium";
  const uncertaintyNote = isLowConfidence
    ? " Note: this estimate has low confidence — option-level details could materially affect the actual fair value."
    : isMedConfidence
    ? " This estimate carries medium confidence; specific configuration details may shift the fair value."
    : "";
  const categoryNote = (scored.vehicleCategory === "performance" || scored.vehicleCategory === "exotic" || scored.vehicleCategory === "luxury")
    ? ` As a ${scored.vehicleCategory}-category vehicle, factory packages and options can significantly affect value.`
    : "";

  if (scored.verdict === "Buy") {
    if (scored.priceDelta <= -5000) {
      return `This ${input.year} ${input.make} ${input.model} looks like a strong deal — the asking price is $${delta.toLocaleString()} below the estimated fair value range. Don't negotiate lower; move quickly to close. Get an independent inspection and confirm out-the-door fees.${uncertaintyNote}`;
    }
    return `This ${input.year} ${input.make} ${input.model} is priced well within the estimated fair value range. The asking price is $${delta.toLocaleString()} below the midpoint estimate, putting this in "move forward" territory. Confirm out-the-door fees and close.${uncertaintyNote}`;
  }
  if (scored.verdict === "Fair Deal") {
    return `This ${input.year} ${input.make} ${input.model} is priced in line with the estimated fair value range. At $${input.askingPrice.toLocaleString()}, it's close to the midpoint of $${scored.fairValueRange.midpoint.toLocaleString()}. Verify out-the-door costs and consider moving forward.${uncertaintyNote}`;
  }
  if (scored.verdict === "Needs Option Review") {
    return `This ${input.year} ${input.make} ${input.model} needs more option-level detail before a confident assessment. The asking price of $${input.askingPrice.toLocaleString()} falls within a range that could be fair depending on configuration.${categoryNote} Ask the seller for a full equipment list and compare against the estimated fair value range of $${scored.fairValueRange.low.toLocaleString()}–$${scored.fairValueRange.high.toLocaleString()}.`;
  }
  if (scored.verdict === "Negotiate") {
    return `This listing has potential but the price needs work. At $${input.askingPrice.toLocaleString()}, the seller is asking $${delta.toLocaleString()} above the estimated fair value midpoint. A counter-offer closer to $${scored.fairValueRange.midpoint.toLocaleString()} is reasonable based on available market data.${uncertaintyNote}`;
  }
  if (scored.verdict === "Possibly Overpriced") {
    return `This ${input.year} ${input.make} ${input.model} appears to be priced above the estimated fair value range. The asking price is $${delta.toLocaleString()} above the midpoint estimate.${uncertaintyNote}${categoryNote} Consider getting more details on options and configuration before making a decision.`;
  }
  // Walk Away
  return `This listing appears significantly overpriced. The asking price is $${delta.toLocaleString()} above the estimated fair value midpoint — a ${Math.abs(Math.round(scored.priceDeltaPct * 100))}% premium. Either the seller needs to come down significantly toward $${scored.fairValueRange.midpoint.toLocaleString()}, or consider other options.${uncertaintyNote}`;
}

function buildFallbackScript(
  input: CarInput,
  scored: ReturnType<typeof scoreCarDeal>
): string {
  const target = Math.round(scored.fairValueRange.midpoint / 100) * 100;
  const delta = Math.abs(scored.priceDelta);
  const rangeStr = `$${scored.fairValueRange.low.toLocaleString()}–$${scored.fairValueRange.high.toLocaleString()}`;

  if (scored.verdict === "Buy") {
    if (scored.priceDelta <= -5000) {
      return `"I've done my homework on this ${input.year} ${input.make} ${input.model} and the market data supports this price — it's well below what comparable vehicles are listing for. I'm ready to move forward today. Can we go over the out-the-door number so I know the full cost including fees and taxes? I'd like to close this as soon as possible."`;
    }
    return `"I've looked at the market for this ${input.year} ${input.make} ${input.model} and this is priced fairly. I'm happy with the price and ready to proceed. Can you walk me through the out-the-door cost including any dealer fees? I'd like to get the paperwork started today."`;
  }

  if (scored.verdict === "Fair Deal") {
    return `"I've researched this ${input.year} ${input.make} ${input.model} and the price is in line with what I'm seeing in the market. I'm interested in moving forward — can you walk me through the out-the-door costs including dealer fees? I want to make sure there aren't any surprises."`;
  }

  if (scored.verdict === "Needs Option Review") {
    // PART 7: Low-confidence script references a range, not an exact number
    return `"I'm interested in this ${input.year} ${input.make} ${input.model}, but I need to understand the full configuration before we talk numbers. Can you tell me exactly what packages and options are on this vehicle? Comparable vehicles in this range run ${rangeStr} depending on equipment. Once I know the exact spec, I'll have a better sense of where the price should land."`;
  }

  if (scored.verdict === "Negotiate") {
    if (scored.confidenceLevel === "High") {
      return `"I've researched this ${input.year} ${input.make} ${input.model} and comparable vehicles in this market are estimated at ${rangeStr}. At $${input.askingPrice.toLocaleString()}, you're $${delta.toLocaleString()} above what I'm seeing. I'd move forward today at $${target.toLocaleString()} — is that something you can work with?"`;
    }
    // Medium/Low confidence: reference range, not exact target
    return `"I've looked at comparable ${input.year} ${input.make} ${input.model}s and they're estimated in the ${rangeStr} range. At $${input.askingPrice.toLocaleString()}, there's a gap worth discussing. I'd like to find a number closer to that range — can you work with something in that neighborhood?"`;
  }

  if (scored.verdict === "Possibly Overpriced") {
    return `"I've been researching this ${input.year} ${input.make} ${input.model} and based on available data, comparable vehicles are estimated in the ${rangeStr} range. At $${input.askingPrice.toLocaleString()}, the price seems high relative to what I'm seeing. Is there flexibility on the price, or are there specific options or conditions that justify the premium?"`;
  }

  // Walk Away
  return `"I want to be straightforward — I've done my research and this ${input.year} ${input.make} ${input.model} is listed $${delta.toLocaleString()} above the estimated fair value range. That's a ${Math.abs(Math.round(scored.priceDeltaPct * 100))}% premium I can't justify. If you're able to come down to around $${target.toLocaleString()}, I'm still interested. Otherwise I'll have to keep looking."`;
}

export async function POST(req: NextRequest) {
  let input: CarInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Validate required fields
  if (
    !input.year ||
    !input.make ||
    !input.model ||
    !input.mileage ||
    !input.askingPrice ||
    !input.zipCode
  ) {
    return NextResponse.json(
      { error: "Missing required fields: year, make, model, mileage, askingPrice, zipCode." },
      { status: 400 }
    );
  }

  // VIN is required for verified transaction data — must be a valid 17-char
  // NHTSA VIN (excludes I, O, Q which are easily confused with 1, 0, 9)
  const vinTrimmed = input.vin?.trim().toUpperCase() ?? "";
  if (!vinTrimmed || !/^[A-HJ-NPR-Z0-9]{17}$/.test(vinTrimmed)) {
    return NextResponse.json(
      { error: "A valid 17-character VIN is required. Enter your VIN and click Decode before submitting." },
      { status: 400 }
    );
  }
  input.vin = vinTrimmed;

  // ── Auth gate — require a logged-in user ──────────────────────────────────
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const userId: string = user.id;

  // ── Check and deduct credits (staff/admin bypass) ────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, role")
    .eq("id", user.id)
    .single();

  const isStaff = profile?.role === "staff" || profile?.role === "admin";

  if (!isStaff) {
    if (!profile || profile.credits <= 0) {
      return NextResponse.json({ error: "No credits remaining." }, { status: 402 });
    }

    // Atomic credit deduction — the .gte("credits", 1) filter ensures the
    // UPDATE only applies when credits ≥ 1 at execution time, preventing
    // the TOCTOU race where two concurrent requests both read credits = 1
    // and both deduct.  If the filter doesn't match, no rows are returned
    // and we treat it as "out of credits".
    const { data: updated, error: deductError } = await supabase
      .from("profiles")
      .update({ credits: profile.credits - 1 })
      .eq("id", user.id)
      .gte("credits", 1)
      .select("credits");

    if (deductError || !updated?.length) {
      console.error("Credit deduction failed:", deductError ?? "no matching row (race)");
      return NextResponse.json({ error: "No credits remaining." }, { status: 402 });
    }
  }

  // ── VIN cache DISABLED ───────────────────────────────────────────────────
  // The VIN cache was designed to save VinAudit API costs (~$0.40/lookup) by
  // reusing price data from previous analyses on the same VIN. However, it
  // caused a cascading bug: statistical model output was cached, then relabeled
  // as "VinAudit (cached)" on reuse, making stale/buggy values look like real
  // external API data. The cache will be re-enabled once VinAudit is active and
  // we can reliably distinguish real API responses from model output.
  // ─────────────────────────────────────────────────────────────────────────

  // Pricing priority order:
  // 1. VinAudit — real transaction data, most accurate (requires VINAUDIT_API_KEY)
  // 2. Auto.dev — real dealer listings data (requires AUTODEV_API_KEY, free tier)
  // 3. Edmunds TMV — real transaction data fallback (requires EDMUNDS_API_KEY)
  // 4. MarketCheck — live listings data (requires MARKETCHECK_API_KEY)
  // 5. Statistical depreciation model — always-on fallback, no API needed
  let marketValue: PriceRange | undefined;
  let priceSource: string;

  const [vinAuditValue, autoDevValue, edmundsValue, marketCheckValue] = await Promise.all([
    fetchVinAuditValue(input),
    fetchAutoDevValue(input),
    fetchEdmundsTMV(input),
    fetchMarketCheckValue(input),
  ]);
  if (vinAuditValue) {
    marketValue = vinAuditValue;
    priceSource = "VinAudit transaction data";
  } else if (autoDevValue) {
    marketValue = autoDevValue;
    priceSource = "Auto.dev dealer listings";
  } else if (edmundsValue) {
    marketValue = edmundsValue;
    priceSource = "Edmunds True Market Value (TMV)";
  } else if (marketCheckValue) {
    marketValue = marketCheckValue;
    priceSource = "MarketCheck live listings";
  } else {
    priceSource = "Statistical model (depreciation data)";
  }

  // ── VIN decode metadata for confidence/config adjustment ──────────────
  // If VIN was decoded (via NHTSA), pass that data through to the scoring
  // engine so it can adjust for drivetrain, body, cylinders, etc.
  let vinData: {
    driveType?: string;
    bodyClass?: string;
    fuelType?: string;
    engineCylinders?: string;
    displacement?: string;
    trim?: string;
  } | undefined;

  // Attempt to fetch VIN decode data from NHTSA for confidence/config scoring
  if (input.vin) {
    try {
      const nhtsa = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${input.vin}?format=json`,
        { next: { revalidate: 86400 } }
      );
      if (nhtsa.ok) {
        const nhtsaData = await nhtsa.json();
        const r = nhtsaData?.Results?.[0];
        if (r) {
          vinData = {
            driveType: r.DriveType || undefined,
            bodyClass: r.BodyClass || undefined,
            fuelType: r.FuelTypePrimary || undefined,
            engineCylinders: r.EngineCylinders || undefined,
            displacement: r.DisplacementL || undefined,
            trim: r.Trim || undefined,
          };
        }
      }
    } catch {
      // Non-fatal — scoring will proceed with less confidence
    }
  }

  const scored = scoreCarDeal(input, marketValue, {
    priceSource,
    vinDecoded: !!input.vin,
    trimVerified: !!input.trim && input.trim.length > 0,
    vinData,
  });

  // AI summary (gracefully degrades if no API key)
  const { summary, script } = await generateAiSummary(input, scored);

  const result: AnalysisResult = {
    ...scored,
    aiSummary: summary,
    negotiationScript: script,
    input,
    priceSource,
  };

  // Persist analysis to Supabase — store full result_json for history/sharing
  let savedId: string | null = null;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: inserted } = await supabase.from("analyses").insert({
      user_id:              userId ?? null,
      vin:                  input.vin ?? null,
      year:                 input.year,
      make:                 input.make,
      model:                input.model,
      trim:                 input.trim ?? null,
      mileage:              input.mileage,
      asking_price:         input.askingPrice,
      zip_code:             input.zipCode,
      estimated_value_low:  scored.fairValueRange.low,
      estimated_value_high: scored.fairValueRange.high,
      price_delta:          scored.priceDelta,
      deal_score:           scored.score,
      verdict:              scored.verdict,
      ai_summary:           summary,
      negotiation_script:   script,
      price_source:         priceSource,
      result_json:          result,
    }).select("id").single();
    savedId = inserted?.id ?? null;
  } catch (err) {
    console.error("Supabase insert error:", err);
  }

  return NextResponse.json({ ...result, savedId });
}
