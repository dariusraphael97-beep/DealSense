import { NextRequest, NextResponse } from "next/server";
import { scoreCarDeal, estimateFairValue } from "@/lib/scoring";
import type { CarInput, AnalysisResult, PriceRange } from "@/lib/types";
import { fetchCraigslistPrices } from "@/lib/craigslist";

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
        console.log(`[MC] listings radius=${radius} status=${res.status}`);
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
        console.log(`[MC] fallback radius=${radius} total=${listings2.length} mileage-filtered=${filtered2.length}`);
        if (prices2.length < 3) continue;
        const tc2 = Math.floor(prices2.length * 0.1);
        const tr2 = prices2.slice(tc2, prices2.length - tc2);
        return { low: tr2[0], high: tr2[tr2.length - 1], midpoint: tr2[Math.floor(tr2.length / 2)] };
      }

      const data = await res.json();
      const listings: { price: number; miles: number }[] = data?.listings ?? [];
      console.log(`[MC] listings radius=${radius} found=${listings.length}`);
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
      console.log(`[MC] listings radius=${radius} error=${e}`);
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
      console.log(`[Edmunds] styles ${stylesRes.status} — ${makeNiceId}/${modelNiceId}/${input.year}`);
      return null;
    }

    const stylesData = await stylesRes.json();
    const styles: Array<{ id: number; name: string }> = stylesData?.styles ?? [];
    if (styles.length === 0) {
      console.log(`[Edmunds] no styles found for ${makeNiceId}/${modelNiceId}/${input.year}`);
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
    console.log(`[Edmunds] matched style "${bestStyle.name}" (id=${bestStyle.id})`);

    // Step 3: Get TMV for this style + mileage + zip
    const tmvRes = await fetch(
      `https://api.edmunds.com/v1/api/tmv/tmvservice/calculateusedtmv?styleid=${bestStyle.id}&condition=Good&mileage=${input.mileage}&zip=${input.zipCode}&api_key=${apiKey}`,
      { cache: "no-store" }
    );
    if (!tmvRes.ok) {
      console.log(`[Edmunds] TMV ${tmvRes.status} for styleId=${bestStyle.id}`);
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

  const scriptInstruction =
    scored.verdict === "Buy"
      ? `Write a CLOSING script — NOT a negotiation script. The car is already priced ${deltaDir} market by $${absDelta.toLocaleString()}, so the buyer should NOT ask for a lower price. Instead, help them express readiness to close, confirm out-the-door fees, and move quickly before someone else does.`
      : scored.verdict === "Negotiate"
      ? `Write a polite but data-backed negotiation script. The car is $${absDelta.toLocaleString()} ABOVE fair value. The buyer should cite the market data and push toward the midpoint of $${scored.fairValueRange.midpoint.toLocaleString()}.`
      : `Write a firm, professional walk-away script. The car is $${absDelta.toLocaleString()} ABOVE fair value — a ${Math.abs(Math.round(scored.priceDeltaPct * 100))}% premium. The buyer should make clear the price is too high and they are prepared to walk unless it drops to around $${scored.fairValueRange.midpoint.toLocaleString()}.`;

  const prompt = `You are an expert used-car advisor. Given the following deal analysis, write:
1. A SHORT SUMMARY (2–3 sentences, plain language) explaining whether this is a good deal and exactly what the buyer should do next.
2. A SCRIPT (4–6 sentences the buyer says out loud to the dealer or seller). ${scriptInstruction}

Car: ${input.year} ${input.make} ${input.model}${input.trim ? " " + input.trim : ""}
Mileage: ${input.mileage.toLocaleString()} miles
Asking price: $${input.askingPrice.toLocaleString()}
Fair value range: $${scored.fairValueRange.low.toLocaleString()}–$${scored.fairValueRange.high.toLocaleString()} (midpoint $${scored.fairValueRange.midpoint.toLocaleString()})
Price vs market: ${scored.priceDelta >= 0 ? "+" : ""}$${scored.priceDelta.toLocaleString()} (${scored.priceDelta >= 0 ? "overpriced" : "underpriced"})
Deal Score: ${scored.score}/100
Verdict: ${scored.verdict}

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
  if (scored.verdict === "Buy") {
    if (scored.priceDelta <= -5000) {
      return `This ${input.year} ${input.make} ${input.model} is an excellent deal — the asking price is $${delta.toLocaleString()} below estimated fair market value. Don't try to negotiate lower; you risk losing this car to another buyer. Get an independent inspection and move quickly to close.`;
    }
    return `This ${input.year} ${input.make} ${input.model} is fairly priced and a solid buy. The asking price is $${delta.toLocaleString()} below fair value, putting this comfortably in "move forward" territory. Confirm the out-the-door fees and close.`;
  }
  if (scored.verdict === "Negotiate") {
    return `This listing has potential but the price needs work. At $${input.askingPrice.toLocaleString()}, the seller is asking $${delta.toLocaleString()} above what comparable vehicles are trading for. A counter-offer closer to $${scored.fairValueRange.midpoint.toLocaleString()} is reasonable and supported by market data.`;
  }
  return `This listing is significantly overpriced. The asking price is $${delta.toLocaleString()} above fair market value — a ${Math.abs(Math.round(scored.priceDeltaPct * 100))}% premium that's hard to justify. Either the seller needs to come down significantly toward $${scored.fairValueRange.midpoint.toLocaleString()}, or walk away and find a better deal.`;
}

function buildFallbackScript(
  input: CarInput,
  scored: ReturnType<typeof scoreCarDeal>
): string {
  const target = Math.round(scored.fairValueRange.midpoint / 100) * 100;
  const delta = Math.abs(scored.priceDelta);

  if (scored.verdict === "Buy") {
    if (scored.priceDelta <= -5000) {
      return `"I've done my homework on this ${input.year} ${input.make} ${input.model} and the market data supports this price — it's well below what comparable vehicles are listing for. I'm ready to move forward today. Can we go over the out-the-door number so I know the full cost including fees and taxes? I'd like to close this as soon as possible."`;
    }
    return `"I've looked at the market for this ${input.year} ${input.make} ${input.model} and this is priced fairly. I'm happy with the price and ready to proceed. Can you walk me through the out-the-door cost including any dealer fees? I'd like to get the paperwork started today."`;
  }

  if (scored.verdict === "Negotiate") {
    return `"I've researched this ${input.year} ${input.make} ${input.model} and comparable vehicles in this market are selling for $${scored.fairValueRange.low.toLocaleString()}–$${scored.fairValueRange.high.toLocaleString()}. At $${input.askingPrice.toLocaleString()}, you're $${delta.toLocaleString()} above what I'm seeing. I'd move forward today at $${target.toLocaleString()} — is that something you can work with?"`;
  }

  // Walk Away
  return `"I want to be straightforward — I've done my research and this ${input.year} ${input.make} ${input.model} is listed $${delta.toLocaleString()} above fair market value. That's a ${Math.abs(Math.round(scored.priceDeltaPct * 100))}% premium I can't justify. If you're able to come down to around $${target.toLocaleString()}, I'm still interested. Otherwise I'll have to keep looking."`;
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

  // VIN is required for verified transaction data
  if (!input.vin || input.vin.trim().length < 11) {
    return NextResponse.json(
      { error: "A VIN is required for verified pricing. Enter your VIN and click Decode before submitting." },
      { status: 400 }
    );
  }

  // Check and deduct credits (staff/admin bypass)
  let userId: string | null = null;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits, role")
        .eq("id", user.id)
        .single();

      const isStaff = profile?.role === "staff" || profile?.role === "admin";

      if (!isStaff && profile && profile.credits <= 0) {
        return NextResponse.json({ error: "No credits remaining." }, { status: 402 });
      }

      // Deduct 1 credit — skip for staff/admin
      if (!isStaff && profile) {
        await supabase
          .from("profiles")
          .update({ credits: profile.credits - 1 })
          .eq("id", user.id);
      }
    }
  } catch (err) {
    console.error("Credit check error:", err);
  }

  // ── VIN cache check: skip API call if we already have recent data ────────
  // Only reuses data from EXTERNAL APIs (VinAudit, Edmunds) — never caches our
  // own statistical model output, since model updates would be masked by stale data.
  let cachedMarketValue: PriceRange | undefined;
  try {
    const { createClient: cc } = await import("@/lib/supabase/server");
    const sbCache = await cc();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: cached } = await sbCache
      .from("analyses")
      .select("estimated_value_low, estimated_value_high, price_source")
      .eq("vin", input.vin!)
      .not("estimated_value_low", "is", null)
      .not("price_source", "is", null)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    // Only use cache if the original data came from a real external API,
    // NOT from our own statistical model (which may have been updated/fixed).
    const isExternalSource = cached?.price_source &&
      !cached.price_source.toLowerCase().includes("statistical model");
    if (isExternalSource && cached?.estimated_value_low && cached?.estimated_value_high) {
      cachedMarketValue = {
        low:      cached.estimated_value_low,
        high:     cached.estimated_value_high,
        midpoint: Math.round((cached.estimated_value_low + cached.estimated_value_high) / 2),
      };
    }
  } catch { /* non-fatal */ }

  // Pricing priority order:
  // 0. VIN cache — free, instant, reuses external API data from previous analyses
  // 1. VinAudit — real transaction data, most accurate (VIN always provided)
  // 2. Edmunds TMV — real transaction data fallback (requires EDMUNDS_API_KEY)
  // 3. Statistical depreciation model — always-on fallback, no API needed
  let marketValue: PriceRange | undefined;
  let priceSource: string;

  if (cachedMarketValue) {
    marketValue = cachedMarketValue;
    priceSource = "VinAudit transaction data (cached)";
  } else {
    const [vinAuditValue, edmundsValue] = await Promise.all([
      fetchVinAuditValue(input),
      fetchEdmundsTMV(input),
    ]);
    if (vinAuditValue) {
      marketValue = vinAuditValue;
      priceSource = "VinAudit transaction data";
    } else if (edmundsValue) {
      marketValue = edmundsValue;
      priceSource = "Edmunds True Market Value (TMV)";
    } else {
      priceSource = "Statistical model (depreciation data)";
    }
  }

  console.log(`[analyze] make="${input.make}" model="${input.model}" trim="${input.trim}" vin="${input.vin}"`);
  console.log(`[analyze] priceSource="${priceSource}" marketValue=${JSON.stringify(marketValue)}`);
  const scored = scoreCarDeal(input, marketValue);
  console.log(`[analyze] fairValue=${JSON.stringify(scored.fairValueRange)} score=${scored.score} verdict=${scored.verdict}`);

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
