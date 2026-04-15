import { NextRequest, NextResponse } from "next/server";
import { scoreCarDeal, estimateFairValue, determineVehicleCategory } from "@/lib/scoring";
import type { CarInput, AnalysisResult, PriceRange, ConfidenceLevel, VehicleCategory, NegotiationScripts, NegotiationScriptVariant } from "@/lib/types";
import { decodeVin, fetchValuation } from "@/lib/providers";
import { checkUserRateLimit, withTimeout } from "@/lib/rateLimiter";
import { analysisCache, ANALYSIS_CACHE_TTL } from "@/lib/cache";

// ── Analysis cache key ────────────────────────────────────────────────────────
// Stable key using VIN + bucketed mileage + bucketed price + region prefix.
// Mileage bucket: nearest 5k (±2,500 mi treated as same analysis)
// Price bucket:   nearest $500 (±$250 treated as same analysis)
// This prevents redundant API calls for near-identical re-submissions.
function buildAnalysisCacheKey(input: CarInput): string {
  const mileageBucket = Math.round(input.mileage / 5000) * 5000;
  const priceBucket   = Math.round(input.askingPrice / 500) * 500;
  const zipPrefix     = (input.zipCode ?? "00000").slice(0, 3);

  if (input.vin) {
    // VIN uniquely identifies the vehicle — tightest possible key
    return `v1:vin:${input.vin}:mi${mileageBucket}:p${priceBucket}`;
  }

  const make  = input.make.toLowerCase().replace(/\s+/g, "-");
  const model = input.model.toLowerCase().replace(/\s+/g, "-");
  const trim  = (input.trim ?? "base").toLowerCase().replace(/\s+/g, "-");
  return `v1:novin:${input.year}:${make}:${model}:${trim}:mi${mileageBucket}:z${zipPrefix}:p${priceBucket}`;
}

// ── AI generation: summary + 3-tone structured scripts ───────────────────────
async function generateAiContent(
  input: CarInput,
  scored: ReturnType<typeof scoreCarDeal>
): Promise<{ summary: string; negotiationScripts: NegotiationScripts }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      summary: buildFallbackSummary(input, scored),
      negotiationScripts: buildFallbackScripts(input, scored),
    };
  }

  const { year, make, model, trim, mileage, askingPrice } = input;
  const { verdict, fairValueRange, priceDelta, confidenceLevel, vehicleCategory, score } = scored;
  const carName = `${year} ${make} ${model}${trim ? ` ${trim}` : ""}`;
  const delta = Math.abs(priceDelta);
  const target = Math.round(fairValueRange.midpoint / 100) * 100;
  const rangeStr = `$${fairValueRange.low.toLocaleString()}–$${fairValueRange.high.toLocaleString()}`;
  const currentYear = new Date().getFullYear();
  const carAge = Math.max(1, currentYear - year);
  const milesPerYear = Math.round(mileage / carAge);
  const mileageContext = mileage > carAge * 13500 * 1.3 ? "higher than average"
    : mileage < carAge * 13500 * 0.7 ? "lower than average"
    : "typical";

  const isClosingDeal = verdict === "Buy" || verdict === "Fair Deal";
  const isNegotiating = verdict === "Negotiate" || verdict === "Walk Away" || verdict === "Possibly Overpriced";
  const needsInfo = verdict === "Needs Option Review";

  const prompt = `You are a professional car negotiation coach writing for real buyers — not a corporate advisor. Keep language conversational and direct. No buzzwords.

DEAL DATA:
Car: ${carName}
Asking: $${askingPrice.toLocaleString()}
Fair value: ${rangeStr} (midpoint $${fairValueRange.midpoint.toLocaleString()})
Gap: ${priceDelta >= 0 ? "+" : ""}$${priceDelta.toLocaleString()} vs midpoint
Deal Score: ${score}/100
Verdict: ${verdict}
Mileage: ${mileage.toLocaleString()} miles (~${milesPerYear.toLocaleString()}/yr — ${mileageContext} for this age)
Vehicle type: ${vehicleCategory}
Confidence: ${confidenceLevel}${confidenceLevel !== "High" ? " — estimate may have data gaps" : ""}

Generate 3 script variations (confident / calm / aggressive) each with 5 short sections.
${isClosingDeal ? "IMPORTANT: This is a GOOD deal. Scripts are about CLOSING and confirming fees — NOT pushing price down." : ""}
${isNegotiating ? `IMPORTANT: Buyer needs to push back. Target price around $${target.toLocaleString()} (range: ${rangeStr}).` : ""}
${needsInfo ? "IMPORTANT: Buyer needs to gather option/package info before committing to any price." : ""}
${confidenceLevel !== "High" ? "IMPORTANT: All scripts must naturally mention wanting to verify configuration/options before finalizing." : ""}

TONES:
- confident: Direct, data-backed, minimal warmup, gets to the point fast
- calm: Friendly, collaborative, leaves room for back-and-forth, not pushy
- aggressive: Maximum leverage, references alternatives, clear walk-away power

SECTIONS (1–2 short sentences each, natural spoken language, contractions OK):
- opening: First thing you say — establishes your position
- valuePosition: How you reference what you've seen in the market (avoid "research" or "analysis")
- justification: Specific reason to move fast (good deal) OR why price needs to change (overpriced)
- ask: The exact thing you're asking for — a price, a number, a decision
- close: Final line — commit to buy today OR signal you're walking

RULES:
- No "based on my extensive research" or "I've done comprehensive analysis"
- Say "what I'm seeing" or "what similar ones are going for" not "real market value"
- Reference actual numbers from the deal data
- Each section max 2 sentences
- Aggressive tone can be blunt — that's intentional

Also provide:
- keyPoints: 4–5 bullet talking points, ≤8 words each (what to remember in the moment)
- priceAnchor: ${isNegotiating ? `"Target: $${(target - 250).toLocaleString()}–$${(target + 250).toLocaleString()}" (the range to negotiate within)` : "null"}
- contextNote: ${confidenceLevel !== "High" ? `"One natural sentence about verifying configuration before finalizing"` : "null"}
- summary: 2–3 plain-language sentences — is this a good deal, what should the buyer do

Return ONLY this JSON (no markdown, no extra text):
{
  "summary": "...",
  "scripts": {
    "confident":  { "opening": "...", "valuePosition": "...", "justification": "...", "ask": "...", "close": "..." },
    "calm":       { "opening": "...", "valuePosition": "...", "justification": "...", "ask": "...", "close": "..." },
    "aggressive": { "opening": "...", "valuePosition": "...", "justification": "...", "ask": "...", "close": "..." }
  },
  "keyPoints": ["...", "...", "...", "..."],
  "priceAnchor": "Target: $X,XXX–$X,XXX" or null,
  "contextNote": "..." or null
}`;

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
        max_tokens: 1400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);

    const scripts = parsed.scripts;
    if (!scripts?.confident?.opening) throw new Error("Missing script structure");

    const negotiationScripts: NegotiationScripts = {
      confident:  scripts.confident,
      calm:       scripts.calm,
      aggressive: scripts.aggressive,
      keyPoints:  Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      priceAnchor: parsed.priceAnchor ?? null,
      contextNote: parsed.contextNote ?? null,
    };

    return {
      summary: parsed.summary ?? buildFallbackSummary(input, scored),
      negotiationScripts,
    };
  } catch (err) {
    console.error("AI generation error:", err);
    return {
      summary: buildFallbackSummary(input, scored),
      negotiationScripts: buildFallbackScripts(input, scored),
    };
  }
}

// ── Assemble a script variant into a copyable string ─────────────────────────
function assembleScript(v: NegotiationScriptVariant): string {
  return [v.opening, v.valuePosition, v.justification, v.ask, v.close]
    .filter(Boolean)
    .join(" ");
}

// ── Fallback summary (no API key) ─────────────────────────────────────────────
function buildFallbackSummary(
  input: CarInput,
  scored: ReturnType<typeof scoreCarDeal>
): string {
  const delta = Math.abs(scored.priceDelta);
  const uncertaintyNote = scored.confidenceLevel === "Low"
    ? " Note: low confidence estimate — option-level details could shift the actual fair value."
    : scored.confidenceLevel === "Medium"
    ? " Medium confidence estimate; configuration details may affect the fair value."
    : "";
  const categoryNote = (scored.vehicleCategory === "performance" || scored.vehicleCategory === "exotic" || scored.vehicleCategory === "luxury")
    ? ` Factory packages and options can significantly affect value on this type of vehicle.`
    : "";

  if (scored.verdict === "Buy") {
    return scored.priceDelta <= -5000
      ? `This ${input.year} ${input.make} ${input.model} looks like a strong deal — asking price is $${delta.toLocaleString()} below estimated fair value. Move quickly and confirm out-the-door fees before someone else does.${uncertaintyNote}`
      : `This ${input.year} ${input.make} ${input.model} is priced below the estimated fair value midpoint. Solid deal — confirm fees and close.${uncertaintyNote}`;
  }
  if (scored.verdict === "Fair Deal") {
    return `This ${input.year} ${input.make} ${input.model} is priced close to estimated fair value at $${input.askingPrice.toLocaleString()}. Verify out-the-door costs and move forward.${uncertaintyNote}`;
  }
  if (scored.verdict === "Needs Option Review") {
    return `This ${input.year} ${input.make} ${input.model} needs option/package confirmation before a confident assessment.${categoryNote} Get the full equipment list before committing to any price.`;
  }
  if (scored.verdict === "Negotiate") {
    return `At $${input.askingPrice.toLocaleString()}, this ${input.year} ${input.make} ${input.model} is $${delta.toLocaleString()} above estimated fair value. There's room to negotiate — target around $${scored.fairValueRange.midpoint.toLocaleString()}.${uncertaintyNote}`;
  }
  if (scored.verdict === "Possibly Overpriced") {
    return `This ${input.year} ${input.make} ${input.model} appears above the estimated fair value range by $${delta.toLocaleString()}.${uncertaintyNote}${categoryNote} Negotiate or confirm configuration before committing.`;
  }
  return `This listing appears significantly overpriced — $${delta.toLocaleString()} above the estimated fair value midpoint (${Math.abs(Math.round(scored.priceDeltaPct * 100))}% premium). The seller needs to come down to around $${scored.fairValueRange.midpoint.toLocaleString()} or this isn't worth pursuing.${uncertaintyNote}`;
}

// ── Fallback scripts (no API key) ─────────────────────────────────────────────
function buildFallbackScripts(
  input: CarInput,
  scored: ReturnType<typeof scoreCarDeal>
): NegotiationScripts {
  const { year, make, model, trim, mileage, askingPrice } = input;
  const { verdict, fairValueRange, priceDelta, confidenceLevel } = scored;
  const car = `${year} ${make} ${model}${trim ? ` ${trim}` : ""}`;
  const delta = Math.abs(priceDelta);
  const target = Math.round(fairValueRange.midpoint / 100) * 100;
  const rangeStr = `$${fairValueRange.low.toLocaleString()}–$${fairValueRange.high.toLocaleString()}`;
  const pctOver = Math.abs(Math.round(scored.priceDeltaPct * 100));
  const confNote = confidenceLevel !== "High"
    ? ` I'd want to confirm the full option list and run a history check before we finalize anything.`
    : "";

  if (verdict === "Buy") {
    const strong = priceDelta <= -5000;
    return {
      confident: {
        opening:       `I've been looking at the ${car} market pretty closely and this one caught my attention.`,
        valuePosition: `It's priced $${delta.toLocaleString()} below what comparable ones are going for — that's a real gap.`,
        justification: strong ? `At this price I'm not looking to negotiate, I just don't want to lose it.` : `The numbers work for me, I just want to make sure the final fees match what I'm expecting.`,
        ask:           `Can you walk me through the full out-the-door breakdown including all fees and taxes?`,
        close:         `If everything checks out I'd like to move forward today.`,
      },
      calm: {
        opening:       `Hey, I really like this ${car}. I've done some homework on the market.`,
        valuePosition: `The pricing looks fair to me based on what similar ones are listing for.`,
        justification: `I'm not trying to negotiate — I just want to make sure I know the full cost before I commit.`,
        ask:           `What's the out-the-door number with all fees included?`,
        close:         `If that's in the range I'm expecting, I'm ready to go.`,
      },
      aggressive: {
        opening:       `I'm ready to buy the ${car} today.`,
        valuePosition: `It's priced well under what I've been seeing — I don't need to look further.`,
        justification: `I can have a payment or check ready this afternoon.`,
        ask:           `What's the fastest way to get the paperwork done?`,
        close:         `I want to drive it home today if we can make that happen.`,
      },
      keyPoints: [
        `Priced $${delta.toLocaleString()} below market`,
        `Don't negotiate — just close`,
        `Confirm out-the-door fees first`,
        `Move fast before someone else does`,
      ],
      priceAnchor: null,
      contextNote: confNote || null,
    };
  }

  if (verdict === "Fair Deal") {
    return {
      confident: {
        opening:       `I've looked at the ${car} market and the price is in the right range.`,
        valuePosition: `It's close to what similar ones are going for, so I'm not trying to grind you down.`,
        justification: `I just want to make sure there are no surprise fees before I commit.`,
        ask:           `Can you give me the full out-the-door breakdown?`,
        close:         `If the fees are reasonable, I'm ready to move today.`,
      },
      calm: {
        opening:       `I like this ${car} and the price seems fair.`,
        valuePosition: `It's in line with what I've been seeing for comparable vehicles.`,
        justification: `I don't have any major concerns — I just want to confirm the total cost including everything.`,
        ask:           `What does the out-the-door number look like with dealer fees and taxes?`,
        close:         `If that makes sense I'd like to go ahead.`,
      },
      aggressive: {
        opening:       `The ${car} is priced fairly — let's get it done.`,
        valuePosition: `I've seen the comps, the number works.`,
        justification: `I don't need to negotiate, but I do need the out-the-door number to be clean with no add-ons I didn't ask for.`,
        ask:           `What's the final price out the door, no extras?`,
        close:         `I can sign today if the number is straight.`,
      },
      keyPoints: [
        `Price is at fair value — don't over-negotiate`,
        `Confirm out-the-door total`,
        `Watch for dealer add-ons`,
        `Ready to close today`,
      ],
      priceAnchor: null,
      contextNote: confNote || null,
    };
  }

  if (verdict === "Needs Option Review") {
    return {
      confident: {
        opening:       `I'm interested in this ${car}, but I need to understand exactly what's on it before we discuss price.`,
        valuePosition: `Similar ${year} ${make} ${model}s run ${rangeStr} depending on packages — the configuration matters a lot here.`,
        justification: `I don't want to make an offer based on incomplete information.`,
        ask:           `Can you give me a full list of the options, packages, and equipment on this specific car?`,
        close:         `Once I know what I'm working with, I'll have a clear number in mind.`,
      },
      calm: {
        opening:       `I like this ${car} and the price might work, but I want to make sure I understand what's included.`,
        valuePosition: `Value on this model can vary a lot based on options and packages.`,
        justification: `I just want to make sure I'm comparing apples to apples before committing.`,
        ask:           `Is there a full equipment list or window sticker I can look at?`,
        close:         `If the configuration justifies the price, I'm genuinely interested.`,
      },
      aggressive: {
        opening:       `Before we go any further on the ${car} I need the full spec sheet.`,
        valuePosition: `Depending on packages, this could be anywhere in ${rangeStr} — I can't make an offer blind.`,
        justification: `I've walked from deals before when the equipment didn't match the price.`,
        ask:           `What exactly is on this car — packages, options, everything?`,
        close:         `If it pencils out, I'll have an answer fast. If not, I'll move on.`,
      },
      keyPoints: [
        `Get full option/package list first`,
        `Value depends heavily on configuration`,
        `Fair value range: ${rangeStr}`,
        `Don't commit before seeing specs`,
      ],
      priceAnchor: null,
      contextNote: `I'd want to see the full option list and run a vehicle history before finalizing anything.`,
    };
  }

  if (verdict === "Negotiate") {
    const confRange = confidenceLevel === "High";
    return {
      confident: {
        opening:       `I've been looking at ${year} ${make} ${model}s for a while and I want to make an offer on this one.`,
        valuePosition: `What I'm seeing for comparable cars is in the ${rangeStr} range.`,
        justification: `At $${askingPrice.toLocaleString()}, you're $${delta.toLocaleString()} above that.`,
        ask:           confRange ? `I'd move forward today at $${target.toLocaleString()} — is there room to get there?` : `I'd like to find a number closer to the midpoint of that range. Can you work with me on that?`,
        close:         `If we can get there I can have a decision for you today.${confNote}`,
      },
      calm: {
        opening:       `I really like this ${car}, honestly. Just want to make sure the price works for me too.`,
        valuePosition: `Looking at what similar ones have been selling for, the range seems to be around ${rangeStr}.`,
        justification: `At $${askingPrice.toLocaleString()}, there's a bit of a gap I'm trying to close.`,
        ask:           `Is there any flexibility? I'm not trying to lowball — just trying to get to market.`,
        close:         `If we can get a bit closer I'd feel comfortable moving forward.${confNote}`,
      },
      aggressive: {
        opening:       `I want this ${car} but the price needs to come down.`,
        valuePosition: `I've got comps showing similar cars in the ${rangeStr} range.`,
        justification: `At $${askingPrice.toLocaleString()}, that's $${delta.toLocaleString()} — a ${pctOver}% premium — over what the market supports.`,
        ask:           confRange ? `I'll write a check today at $${target.toLocaleString()}. That's a fair offer.` : `Meet me in the middle of that range and I'll buy it today.`,
        close:         `Otherwise I've got two other cars I'm looking at this week.${confNote}`,
      },
      keyPoints: [
        `$${delta.toLocaleString()} above comparable prices`,
        `Target: around $${target.toLocaleString()}`,
        `Fair value range: ${rangeStr}`,
        `Ready to buy if price adjusts`,
        `Have alternatives — not desperate`,
      ],
      priceAnchor: `Target: $${(target - 250).toLocaleString()}–$${(target + 250).toLocaleString()}`,
      contextNote: confNote || null,
    };
  }

  if (verdict === "Possibly Overpriced") {
    return {
      confident: {
        opening:       `I'm interested in this ${car} but the price is giving me pause.`,
        valuePosition: `Based on what I'm seeing, comparable cars are in the ${rangeStr} range.`,
        justification: `At $${askingPrice.toLocaleString()}, there's about $${delta.toLocaleString()} unexplained — and I need to understand why before I can move.`,
        ask:           `Is there something about this car's spec or condition that justifies the premium? And is there flexibility?`,
        close:         `If there's a good reason for the price I'm open to hearing it. Otherwise I'd need to see it come down.${confNote}`,
      },
      calm: {
        opening:       `I want to be upfront — I like this ${car} but the price feels a bit high based on what I've been seeing.`,
        valuePosition: `Similar ones seem to be going for around ${rangeStr}.`,
        justification: `I could be missing something about this specific car's options or history.`,
        ask:           `Can you help me understand what's going into the pricing? Is there any room to move?`,
        close:         `I really do want to make this work if we can.${confNote}`,
      },
      aggressive: {
        opening:       `The ${car} is overpriced based on current market data.`,
        valuePosition: `Comps are in the ${rangeStr} range.`,
        justification: `At $${askingPrice.toLocaleString()} you're $${delta.toLocaleString()} over — that's a ${pctOver}% premium with nothing obvious to justify it.`,
        ask:           `If you can get to $${target.toLocaleString()} I'll consider it seriously. Otherwise I'm moving on.`,
        close:         `I've got other options at better prices.${confNote}`,
      },
      keyPoints: [
        `Appears above fair value`,
        `Ask what justifies the price`,
        `Fair value range: ${rangeStr}`,
        `Verify full configuration first`,
        `Be ready to walk if no movement`,
      ],
      priceAnchor: `Target: $${(target - 250).toLocaleString()}–$${(target + 250).toLocaleString()}`,
      contextNote: confNote || `I'd want to verify the full configuration and history before finalizing.`,
    };
  }

  // Walk Away
  return {
    confident: {
      opening:       `I want to be straight with you about this ${car}.`,
      valuePosition: `What I'm seeing in the market puts comparable cars at ${rangeStr}.`,
      justification: `At $${askingPrice.toLocaleString()} that's $${delta.toLocaleString()} — a ${pctOver}% premium — I can't justify.`,
      ask:           `If you can get to $${target.toLocaleString()} I'm still interested. That's my number.`,
      close:         `If not, I understand — but I'll have to move on.`,
    },
    calm: {
      opening:       `I appreciate your time on the ${car}, but I need to be honest with you.`,
      valuePosition: `I've been looking at the market carefully and similar cars are going for ${rangeStr}.`,
      justification: `At the current price, I can't make the numbers work for myself.`,
      ask:           `If you're able to come down to around $${target.toLocaleString()}, I'd come back to the table.`,
      close:         `I'm not trying to lowball — I just need the price to match the market.`,
    },
    aggressive: {
      opening:       `This ${car} is listed $${delta.toLocaleString()} over what the market supports.`,
      valuePosition: `Comparable cars are selling in the ${rangeStr} range.`,
      justification: `That's a ${pctOver}% premium with nothing I can see that justifies it.`,
      ask:           `I'll buy it today at $${target.toLocaleString()}. That's a real offer.`,
      close:         `If the answer is no, I'll put that money toward one of the other cars I'm looking at.`,
    },
    keyPoints: [
      `$${delta.toLocaleString()} above market (${pctOver}% over)`,
      `Target: $${target.toLocaleString()} or walk`,
      `Fair value: ${rangeStr}`,
      `Have real alternatives`,
      `Be prepared to actually walk`,
    ],
    priceAnchor: `Target: $${(target - 250).toLocaleString()}–$${(target + 250).toLocaleString()}`,
    contextNote: confNote || null,
  };
}

export async function POST(req: NextRequest) {
  // ── 1. Parse + validate ───────────────────────────────────────────────────
  let input: CarInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!input.year || !input.make || !input.model || !input.mileage || !input.askingPrice || !input.zipCode) {
    return NextResponse.json(
      { error: "Missing required fields: year, make, model, mileage, askingPrice, zipCode." },
      { status: 400 }
    );
  }

  const vinTrimmed = input.vin?.trim().toUpperCase() ?? "";
  if (!vinTrimmed || !/^[A-HJ-NPR-Z0-9]{17}$/.test(vinTrimmed)) {
    return NextResponse.json(
      { error: "A valid 17-character VIN is required. Enter your VIN and click Decode before submitting." },
      { status: 400 }
    );
  }
  input.vin = vinTrimmed;

  // ── 2. Auth ───────────────────────────────────────────────────────────────
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const userId = user.id;

  // ── 3. Rate limit — checked before any credit deduction ──────────────────
  const rl = checkUserRateLimit(userId);
  if (!rl.allowed) {
    const waitMins = Math.max(1, Math.ceil(rl.retryAfterMs / 60000));
    console.log(`[analyze] rate_limited user=${userId.slice(0, 8)} retry_in=${waitMins}min`);
    return NextResponse.json(
      {
        error: `Too many analyses in a short period. Please wait about ${waitMins} minute${waitMins !== 1 ? "s" : ""} and try again.`,
        rateLimited: true,
      },
      { status: 429 }
    );
  }

  // ── 4. Analysis cache — checked before credit deduction ──────────────────
  // Cache hits return instantly without consuming a credit or calling any API.
  const cacheKey = buildAnalysisCacheKey(input);
  const cached = analysisCache.get<AnalysisResult & { savedId: string | null }>(cacheKey);
  if (cached) {
    console.log(`[analyze] cache:hit  key=${cacheKey.slice(0, 72)}`);
    // Return the cached result; no credit is deducted and no DB row is written.
    return NextResponse.json({ ...cached, fromCache: true, savedId: null });
  }
  console.log(`[analyze] cache:miss key=${cacheKey.slice(0, 72)}`);

  // ── 5. Credit check + atomic deduction ───────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, role")
    .eq("id", userId)
    .single();

  const isStaff = profile?.role === "staff" || profile?.role === "admin";
  let creditDeducted = false;

  if (!isStaff) {
    if (!profile || profile.credits <= 0) {
      return NextResponse.json({ error: "No credits remaining." }, { status: 402 });
    }

    // Atomic deduction — .gte("credits", 1) prevents TOCTOU double-spend
    const { data: updated, error: deductError } = await supabase
      .from("profiles")
      .update({ credits: profile.credits - 1 })
      .eq("id", userId)
      .gte("credits", 1)
      .select("credits");

    if (deductError || !updated?.length) {
      console.error("[analyze] credit:deduction_failed", deductError ?? "race condition");
      return NextResponse.json({ error: "No credits remaining." }, { status: 402 });
    }

    creditDeducted = true;
    const creditsRemaining = updated[0].credits;

    supabase.from("events").insert({
      user_id: userId, event_type: "analysis_used",
      properties: { credits_remaining: creditsRemaining },
    }).then(() => {}, () => {});

    if (creditsRemaining === 0) {
      supabase.from("events").insert({
        user_id: userId, event_type: "credits_exhausted", properties: {},
      }).then(() => {}, () => {});
    }
  }

  // ── 6. Run analysis — wrapped so credits can be refunded on crash ─────────
  try {

    // ── 6a. Market data (9s overall timeout — each provider has its own 6s) ──
    console.log(`[analyze] fetch:start vin=${input.vin}`);
    const valuationResult = await withTimeout(fetchValuation(input), 9000)
      ?? { valuation: null, compMetadata: null, errors: [] };

    const { valuation, compMetadata } = valuationResult;
    let marketValue: PriceRange | undefined;
    let priceSource: string;
    let isStatisticalFallback = false;

    if (valuation) {
      marketValue = valuation.range;
      priceSource = valuation.source;
      console.log(`[analyze] market_data source="${priceSource}" mid=$${valuation.range.midpoint}`);
    } else {
      priceSource = "Statistical model (depreciation data)";
      isStatisticalFallback = true;
      console.log(`[analyze] market_data:fallback statistical (no external data available)`);
    }

    // ── 6b. VIN decode (4s timeout — non-fatal if slow/missing) ──────────────
    let vinData: {
      driveType?: string; bodyClass?: string; fuelType?: string;
      engineCylinders?: string; displacement?: string; trim?: string;
    } | undefined;

    if (input.vin) {
      try {
        const vehicle = await withTimeout(decodeVin(input.vin), 4000);
        if (vehicle) {
          vinData = {
            driveType:       vehicle.driveType,
            bodyClass:       vehicle.bodyClass,
            fuelType:        vehicle.fuelType,
            engineCylinders: vehicle.engineCylinders,
            displacement:    vehicle.displacement,
            trim:            vehicle.trim,
          };
        }
      } catch {
        console.warn(`[analyze] vin_decode:failed vin=${input.vin} (non-fatal)`);
      }
    }

    // ── 6c. Score ──────────────────────────────────────────────────────────
    const scored = scoreCarDeal(input, marketValue, {
      priceSource,
      vinDecoded:   !!input.vin,
      trimVerified: !!input.trim && input.trim.length > 0,
      vinData,
      compMetadata: compMetadata ?? undefined,
    });

    // ── 6d. AI content (12s timeout — falls back to templates if exceeded) ──
    console.log(`[analyze] ai:start score=${scored.score} verdict=${scored.verdict}`);
    const aiResult = await withTimeout(generateAiContent(input, scored), 12000);
    const { summary, negotiationScripts } = aiResult ?? {
      summary:            buildFallbackSummary(input, scored),
      negotiationScripts: buildFallbackScripts(input, scored),
    };
    const legacyScript = assembleScript(negotiationScripts.confident);

    const result: AnalysisResult = {
      ...scored,
      aiSummary:          summary,
      negotiationScript:  legacyScript,
      negotiationScripts,
      input,
      priceSource,
      isStatisticalFallback,
    };

    // ── 6e. Store in analysis cache ────────────────────────────────────────
    analysisCache.set(cacheKey, result, ANALYSIS_CACHE_TTL);
    console.log(`[analyze] cache:stored ttl=4hr key=${cacheKey.slice(0, 72)}`);

    // ── 6f. Persist to Supabase (non-fatal — log but don't crash) ─────────
    let savedId: string | null = null;
    try {
      const { data: inserted } = await supabase.from("analyses").insert({
        user_id:              userId,
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
        negotiation_script:   legacyScript,
        price_source:         priceSource,
        result_json:          result,
      }).select("id").single();
      savedId = inserted?.id ?? null;
    } catch (dbErr) {
      console.error("[analyze] db:insert_failed (non-fatal)", dbErr);
    }

    console.log(`[analyze] success vin=${input.vin} score=${scored.score} verdict=${scored.verdict} fallback=${isStatisticalFallback}`);
    return NextResponse.json({ ...result, savedId });

  } catch (err) {
    // ── Unexpected crash — refund credit if one was deducted ──────────────
    console.error("[analyze] unexpected_error", err);

    if (creditDeducted) {
      try {
        const { data: currentProfile } = await supabase
          .from("profiles").select("credits").eq("id", userId).single();
        if (currentProfile) {
          await supabase
            .from("profiles")
            .update({ credits: currentProfile.credits + 1 })
            .eq("id", userId);
          console.log(`[analyze] credit:refunded user=${userId.slice(0, 8)}`);
        }
      } catch (refundErr) {
        console.error("[analyze] credit:refund_failed", refundErr);
      }
    }

    return NextResponse.json(
      { error: "Analysis failed unexpectedly. Your credit has been refunded. Please try again." },
      { status: 500 }
    );
  }
}
