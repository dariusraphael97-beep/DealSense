import { NextRequest, NextResponse } from "next/server";
import { scoreCarDeal, estimateFairValue, determineVehicleCategory } from "@/lib/scoring";
import type { CarInput, AnalysisResult, PriceRange, ConfidenceLevel, VehicleCategory } from "@/lib/types";
import { decodeVin, fetchValuation } from "@/lib/providers";

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

  const { valuation, compMetadata } = await fetchValuation(input);
  let marketValue: PriceRange | undefined;
  let priceSource: string;

  if (valuation) {
    marketValue = valuation.range;
    priceSource = valuation.source;
  } else {
    priceSource = "Statistical model (depreciation data)";
  }

  // ── VIN decode metadata for confidence/config adjustment ──────────────
  let vinData: {
    driveType?: string;
    bodyClass?: string;
    fuelType?: string;
    engineCylinders?: string;
    displacement?: string;
    trim?: string;
  } | undefined;

  if (input.vin) {
    try {
      const vehicle = await decodeVin(input.vin);
      vinData = {
        driveType: vehicle.driveType,
        bodyClass: vehicle.bodyClass,
        fuelType: vehicle.fuelType,
        engineCylinders: vehicle.engineCylinders,
        displacement: vehicle.displacement,
        trim: vehicle.trim,
      };
    } catch {
      // Non-fatal — scoring will proceed with less confidence
    }
  }

  const scored = scoreCarDeal(input, marketValue, {
    priceSource,
    vinDecoded: !!input.vin,
    trimVerified: !!input.trim && input.trim.length > 0,
    vinData,
    compMetadata: compMetadata ?? undefined,
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
