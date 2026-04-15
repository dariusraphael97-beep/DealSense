/**
 * POST /api/saved-cars/[id]/refresh
 *
 * Fetches fresh market data for a tracked saved car and updates:
 *   - latest_fair_value_low/mid/high
 *   - latest_deal_score
 *   - confidence_level
 *   - fair_value_change_amount / fair_value_change_percent
 *   - buy_timing_status / buy_timing_summary
 *   - last_checked_at
 *
 * Does NOT consume credits. Refreshes market valuation only (not the full
 * AI analysis pipeline). Rate-limited to once per 30 minutes per car.
 *
 * Honest framing: we track fair value estimate movement, not live listing
 * price changes (which we cannot fetch automatically).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchValuation } from "@/lib/providers";
import { scoreCarDeal, determineVehicleCategory } from "@/lib/scoring";
import type { CarInput, ConfidenceLevel, VehicleCategory } from "@/lib/types";
import { determineBuyTiming, isNoMeaningfulChange } from "@/lib/buyTiming";

const MIN_REFRESH_MS = 30 * 60 * 1000; // 30 minutes between auto-refreshes

// ── AI insight generation ─────────────────────────────────────────────────────

interface InsightParams {
  carName: string;
  askingPrice: number;
  originalFairValueMid: number;
  newFairValueMid: number;
  newFairValueLow: number;
  newFairValueHigh: number;
  fairValueChange: number;
  fairValueChangePct: number;
  pricePositionPct: number;
  dealScore: number;
  confidenceLevel: ConfidenceLevel;
  vehicleCategory: VehicleCategory;
  buyTimingStatus: string;
  isFirstCheck: boolean;
}

async function generateInsight(p: InsightParams): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return buildFallbackInsight(p);

  const {
    carName, askingPrice, originalFairValueMid, newFairValueMid,
    newFairValueLow, newFairValueHigh, fairValueChange, fairValueChangePct,
    pricePositionPct, dealScore, confidenceLevel, vehicleCategory, isFirstCheck,
  } = p;

  const changeDir  = fairValueChange > 0 ? "increased" : "decreased";
  const changeAmt  = Math.abs(Math.round(fairValueChange)).toLocaleString();
  const changePct  = Math.abs(fairValueChangePct * 100).toFixed(1);
  const absPosAmt  = Math.abs(Math.round(pricePositionPct * p.newFairValueMid)).toLocaleString();
  const posDir     = pricePositionPct > 0 ? "above" : "below";
  const posPct     = Math.abs(Math.round(pricePositionPct * 100));

  const prompt = `You're writing a 2-sentence market watch insight for a car deal tracker. Be specific, direct, and honest. No buzzwords or fake urgency.

IMPORTANT FRAMING: We track fair value estimate movement — NOT the dealer's asking price. The asking price has not changed. Only the market estimate has shifted. Never imply the dealer changed their price.

${isFirstCheck
    ? "CONTEXT: This is the first market check since the user saved this car."
    : `CONTEXT: The fair value estimate for this type of vehicle ${changeDir} $${changeAmt} (${changePct}%) since this car was saved. The dealer's asking price has NOT changed — the market has shifted.`
  }

Car: ${carName}
Dealer's asking price (unchanged): $${askingPrice.toLocaleString()}
Fair value estimate when saved: $${originalFairValueMid.toLocaleString()}
Current fair value estimate: $${newFairValueMid.toLocaleString()} (range: $${newFairValueLow.toLocaleString()}–$${newFairValueHigh.toLocaleString()})
Asking price is now ${posPct}% ${posDir} current fair value ($${absPosAmt} ${posDir})
Deal score: ${dealScore}/100
Confidence: ${confidenceLevel}
Vehicle type: ${vehicleCategory}

Write exactly 2 plain sentences:
1. What the current market situation is (be specific with numbers if meaningful)
2. What the buyer should consider doing next

Rules:
- NEVER imply the dealer's asking price changed — we do not track live listing prices
- Say "fair value estimate" or "market estimate" — never "real market value" or "true value"
- Don't use "our" or "we" — say "the fair value estimate" not "our estimate"
- Be honest if confidence is ${confidenceLevel.toLowerCase()} — acknowledge limited data
- No fake urgency, no marketing language
- Max 45 words total
- Don't start both sentences the same way

Return ONLY the 2 sentences. No JSON, no labels, no extra text.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":          apiKey,
        "anthropic-version":  "2023-06-01",
        "content-type":       "application/json",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 130,
        messages:   [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return buildFallbackInsight(p);
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    return text.trim() || buildFallbackInsight(p);
  } catch {
    return buildFallbackInsight(p);
  }
}

function buildFallbackInsight(p: InsightParams): string {
  const { askingPrice, originalFairValueMid, newFairValueMid, fairValueChange,
    fairValueChangePct, pricePositionPct, confidenceLevel, isFirstCheck } = p;

  const posAmt  = Math.abs(Math.round(askingPrice - newFairValueMid)).toLocaleString();
  const posPct  = Math.abs(Math.round(pricePositionPct * 100));
  const posDir  = pricePositionPct > 0 ? "above" : "below";
  const confNote = confidenceLevel !== "High"
    ? ` Confidence is ${confidenceLevel.toLowerCase()} — treat this as directional.`
    : "";

  if (isFirstCheck || Math.abs(fairValueChangePct) < 0.01) {
    const neutral = `Asking price is $${posAmt} (${posPct}%) ${posDir} the current fair value estimate of $${newFairValueMid.toLocaleString()}.`;
    const action = pricePositionPct <= -0.05
      ? "This looks like a favorable buying window."
      : pricePositionPct <= 0.03
      ? "Pricing is near fair value — verify condition and history before moving."
      : "Negotiate toward the fair value midpoint before committing.";
    return `${neutral} ${action}${confNote}`;
  }

  const chgAmt = Math.abs(Math.round(fairValueChange)).toLocaleString();
  const chgNote = fairValueChange > 0
    ? `The fair value estimate for this type of vehicle increased $${chgAmt} — the asking price is now relatively less attractive vs. current market.`
    : `The fair value estimate eased $${chgAmt} — the asking price is now ${posDir} the current estimate.`;

  const actionNote = pricePositionPct <= -0.05
    ? "This looks like a favorable window to move."
    : pricePositionPct <= 0.03
    ? "Pricing is near fair value — a clean history and inspection should seal it."
    : "Negotiating toward the fair value midpoint makes sense.";

  return `${chgNote} ${actionNote}${confNote}`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  // ── 1. Load saved car ──────────────────────────────────────────────────────
  const { data: car, error: carErr } = await supabase
    .from("saved_cars")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (carErr || !car) {
    return NextResponse.json({ error: "Car not found" }, { status: 404 });
  }

  // ── 2. Rate limit: 30 min per car ──────────────────────────────────────────
  if (car.last_checked_at) {
    const elapsed = Date.now() - new Date(car.last_checked_at).getTime();
    if (elapsed < MIN_REFRESH_MS) {
      const waitMins = Math.ceil((MIN_REFRESH_MS - elapsed) / 60000);
      return NextResponse.json({
        rateLimited:  true,
        waitMinutes:  waitMins,
        car,
      }, { status: 429 });
    }
  }

  // ── 3. Build CarInput ──────────────────────────────────────────────────────
  // Pull zipCode from stored column first, fall back to result_json.input
  const resultJson  = car.result_json as Record<string, any> | null;
  const zipCode     = car.zip_code
    ?? (resultJson?.input?.zipCode as string | undefined)
    ?? "90210";

  // Always recompute category from source data — avoids legacy "mainstream"
  // fallback for luxury/performance cars saved before category was tracked.
  const vehicleCategory: VehicleCategory = determineVehicleCategory(
    car.make,
    car.model,
    car.trim ?? undefined,
  );

  // The original fair value midpoint saved at analysis time
  const originalFairValueMid: number = car.fair_value_mid ?? 0;

  const carInput: CarInput = {
    year:        car.year,
    make:        car.make,
    model:       car.model,
    trim:        car.trim ?? undefined,
    mileage:     car.mileage,
    askingPrice: car.asking_price,
    zipCode,
    vin:         car.vin ?? undefined,
  };

  // ── 4. Fetch fresh valuation ───────────────────────────────────────────────
  let newFairValueLow:  number;
  let newFairValueMid:  number;
  let newFairValueHigh: number;
  let newDealScore            = car.latest_deal_score ?? car.deal_score;
  let newConfidenceLevel: ConfidenceLevel =
    (car.confidence_level as ConfidenceLevel | null) ?? "Low";
  let marketDataAvailable = false;

  try {
    const valuationResult = await fetchValuation(carInput);

    if (valuationResult.valuation) {
      marketDataAvailable  = true;
      newFairValueLow      = valuationResult.valuation.range.low;
      newFairValueMid      = valuationResult.valuation.range.midpoint;
      newFairValueHigh     = valuationResult.valuation.range.high;

      // Re-score with fresh market data
      const scored = scoreCarDeal(carInput, valuationResult.valuation.range, {
        priceSource:  valuationResult.valuation.source,
        vinDecoded:   !!car.vin,
        trimVerified: !!car.trim,
        compMetadata: valuationResult.compMetadata ?? undefined,
      });
      newDealScore         = scored.score;
      newConfidenceLevel   = scored.confidenceLevel;

    } else {
      // Statistical fallback — still useful for trend detection
      const scored = scoreCarDeal(carInput, undefined, {
        priceSource:  "Statistical model",
        vinDecoded:   !!car.vin,
        trimVerified: !!car.trim,
      });
      newFairValueLow  = scored.fairValueRange.low;
      newFairValueMid  = scored.fairValueRange.midpoint;
      newFairValueHigh = scored.fairValueRange.high;
      newDealScore     = scored.score;
      newConfidenceLevel = scored.confidenceLevel;
    }
  } catch (err) {
    console.error("[refresh] valuation error:", err);
    return NextResponse.json(
      { error: "Unable to fetch market data. Try again shortly." },
      { status: 503 }
    );
  }

  // ── 5. Compute buy timing ──────────────────────────────────────────────────
  const timing = determineBuyTiming({
    askingPrice:          car.asking_price,
    originalFairValueMid: originalFairValueMid || newFairValueMid,
    newFairValueMid,
    newFairValueLow,
    newFairValueHigh,
    dealScore:            newDealScore,
    confidenceLevel:      newConfidenceLevel,
    vehicleCategory,
  });

  const isFirstCheck = !car.last_checked_at;
  const noChange     = isNoMeaningfulChange(timing.fairValueChangePct);

  // Map timing eventType → tracked_vehicle_events event_type
  const EVENT_TYPE_MAP: Record<string, string> = {
    first_check:     "first_check",
    no_change:       "no_change",
    fair_value_up:   "fair_value_up",
    fair_value_down: "fair_value_down",
    high_opportunity:"high_opportunity",
    watch_only:      "watch_only",
  };
  const eventType = isFirstCheck
    ? "first_check"
    : noChange
    ? "no_change"
    : EVENT_TYPE_MAP[timing.eventType] ?? "watch_only";

  // ── 6. Generate AI insight ─────────────────────────────────────────────────
  const carName = `${car.year} ${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`;
  const insight = await generateInsight({
    carName,
    askingPrice:          car.asking_price,
    originalFairValueMid: originalFairValueMid || newFairValueMid,
    newFairValueMid,
    newFairValueLow,
    newFairValueHigh,
    fairValueChange:      timing.fairValueChange,
    fairValueChangePct:   timing.fairValueChangePct,
    pricePositionPct:     timing.pricePositionPct,
    dealScore:            newDealScore,
    confidenceLevel:      newConfidenceLevel,
    vehicleCategory,
    buyTimingStatus:      timing.status,
    isFirstCheck,
  });

  const now = new Date().toISOString();

  // ── 7. Persist to saved_cars ───────────────────────────────────────────────
  const { data: updated, error: updateErr } = await supabase
    .from("saved_cars")
    .update({
      latest_fair_value_low:     newFairValueLow,
      latest_fair_value_mid:     newFairValueMid,
      latest_fair_value_high:    newFairValueHigh,
      latest_deal_score:         newDealScore,
      confidence_level:          newConfidenceLevel,
      last_checked_at:           now,
      last_price_change_at:      noChange && !isFirstCheck ? car.last_price_change_at : now,
      fair_value_change_amount:  Math.round(timing.fairValueChange),
      fair_value_change_percent: parseFloat((timing.fairValueChangePct * 100).toFixed(3)),
      buy_timing_status:         timing.status,
      buy_timing_summary:        insight,
      market_data_available:     marketDataAvailable,
      vehicle_category:          vehicleCategory,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateErr || !updated) {
    console.error("[refresh] update error:", updateErr);
    return NextResponse.json({ error: "Failed to save tracking update." }, { status: 500 });
  }

  // ── 8. Insert event (skip repetitive no_change after first check) ──────────
  if (isFirstCheck || !noChange) {
    supabase.from("tracked_vehicle_events").insert({
      saved_car_id:       id,
      user_id:            user.id,
      event_type:         eventType,
      old_fair_value_mid: isFirstCheck ? null : (car.latest_fair_value_mid ?? originalFairValueMid),
      new_fair_value_mid: newFairValueMid,
      asking_price:       car.asking_price,
      delta_amount:       Math.round(timing.fairValueChange),
      delta_percent:      parseFloat((timing.fairValueChangePct * 100).toFixed(3)),
      deal_score:         newDealScore,
      confidence_level:   newConfidenceLevel,
      buy_timing_status:  timing.status,
      insight_summary:    insight,
    }).then(() => {}, (e) => console.error("[refresh] event insert failed:", e));
  }

  return NextResponse.json({ car: updated, timing, fresh: true });
}
