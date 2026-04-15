/**
 * GET /api/cron/refresh-tracked-cars
 *
 * Scheduled via Vercel Cron: "0 8,20 * * *" — runs at 8am and 8pm UTC daily.
 * Refreshes tracked cars that haven't been checked in the last 8 hours.
 *
 * Uses the Supabase service role key to process all users' cars (bypasses RLS).
 * Uses the fallback insight generator (no Claude API call) to keep runs fast
 * and cost-free. Users can still trigger Claude-generated insights via the
 * manual "Refresh" button on each card.
 *
 * Security: Vercel automatically sends an Authorization: Bearer <CRON_SECRET>
 * header. This route verifies it. Set CRON_SECRET in your Vercel env vars.
 *
 * Limits: Processes up to MAX_CARS per run, in parallel batches of BATCH_SIZE,
 * to stay well within Vercel Pro's 60-second function timeout.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchValuation } from "@/lib/providers";
import { scoreCarDeal, determineVehicleCategory } from "@/lib/scoring";
import type { CarInput, ConfidenceLevel, VehicleCategory } from "@/lib/types";
import { determineBuyTiming, isNoMeaningfulChange } from "@/lib/buyTiming";

const STALE_THRESHOLD_MS = 8 * 60 * 60 * 1000;  // 8 hours
const RATE_LIMIT_MS      = 25 * 60 * 1000;       // 25-min guard per car
const MAX_CARS           = 12;
const BATCH_SIZE         = 3;

// ── Fallback insight (no Claude API — keeps cron fast and cheap) ──────────────

function buildCronInsight(
  askingPrice: number,
  newFairValueMid: number,
  fairValueChange: number,
  fairValueChangePct: number,
  pricePositionPct: number,
  confidenceLevel: ConfidenceLevel,
  isFirstCheck: boolean,
): string {
  const posAmt  = Math.abs(Math.round(askingPrice - newFairValueMid)).toLocaleString();
  const posPct  = Math.abs(Math.round(pricePositionPct * 100));
  const posDir  = pricePositionPct > 0 ? "above" : "below";
  const confNote = confidenceLevel !== "High"
    ? ` Confidence is ${confidenceLevel.toLowerCase()} — treat as directional.`
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
    ? `The market estimate for this type of vehicle increased $${chgAmt} — the asking price is relatively less attractive vs. the current market.`
    : `The market estimate eased $${chgAmt} — the asking price is now ${posDir} the current estimate.`;
  const actionNote = pricePositionPct <= -0.05
    ? "This looks like a favorable window to move."
    : pricePositionPct <= 0.03
    ? "Pricing is near fair value — a clean inspection should seal it."
    : "Negotiating toward the fair value midpoint makes sense.";

  return `${chgNote} ${actionNote}${confNote}`;
}

// ── Process a single car ──────────────────────────────────────────────────────

async function processCar(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  car: Record<string, any>,
): Promise<{ id: string; status: "refreshed" | "skipped" | "error"; reason?: string }> {
  const id = car.id as string;

  // Rate limit per car
  if (car.last_checked_at) {
    const elapsed = Date.now() - new Date(car.last_checked_at).getTime();
    if (elapsed < RATE_LIMIT_MS) {
      return { id, status: "skipped", reason: "rate_limited" };
    }
  }

  // Always recompute category from source data
  const vehicleCategory: VehicleCategory = determineVehicleCategory(
    car.make as string,
    car.model as string,
    (car.trim as string | null) ?? undefined,
  );

  const resultJson = car.result_json as Record<string, unknown> | null;
  const zipCode =
    (car.zip_code as string | null)
    ?? (resultJson?.input as Record<string, unknown> | undefined)?.zipCode as string | undefined
    ?? "90210";

  const originalFairValueMid: number = (car.fair_value_mid as number | null) ?? 0;

  const carInput: CarInput = {
    year:        car.year as number,
    make:        car.make as string,
    model:       car.model as string,
    trim:        (car.trim as string | null) ?? undefined,
    mileage:     car.mileage as number,
    askingPrice: car.asking_price as number,
    zipCode,
    vin:         (car.vin as string | null) ?? undefined,
  };

  let newFairValueLow: number;
  let newFairValueMid: number;
  let newFairValueHigh: number;
  let newDealScore = (car.latest_deal_score as number | null) ?? (car.deal_score as number);
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

      const scored = scoreCarDeal(carInput, valuationResult.valuation.range, {
        priceSource:  valuationResult.valuation.source,
        vinDecoded:   !!car.vin,
        trimVerified: !!car.trim,
        compMetadata: valuationResult.compMetadata ?? undefined,
      });
      newDealScore       = scored.score;
      newConfidenceLevel = scored.confidenceLevel;
    } else {
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
    console.error(`[cron] valuation error for car ${id}:`, err);
    return { id, status: "error", reason: "valuation_failed" };
  }

  const timing = determineBuyTiming({
    askingPrice:          car.asking_price as number,
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

  const insight = buildCronInsight(
    car.asking_price as number,
    newFairValueMid,
    timing.fairValueChange,
    timing.fairValueChangePct,
    timing.pricePositionPct,
    newConfidenceLevel,
    isFirstCheck,
  );

  const now = new Date().toISOString();
  const EVENT_TYPE_MAP: Record<string, string> = {
    first_check:      "first_check",
    no_change:        "no_change",
    fair_value_up:    "fair_value_up",
    fair_value_down:  "fair_value_down",
    high_opportunity: "high_opportunity",
    watch_only:       "watch_only",
  };
  const eventType = isFirstCheck
    ? "first_check"
    : noChange
    ? "no_change"
    : EVENT_TYPE_MAP[timing.eventType] ?? "watch_only";

  const { error: updateErr } = await supabase
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
    .eq("id", id);

  if (updateErr) {
    console.error(`[cron] update error for car ${id}:`, updateErr);
    return { id, status: "error", reason: "update_failed" };
  }

  // Insert event (skip repetitive no_change after first check)
  if (isFirstCheck || !noChange) {
    supabase.from("tracked_vehicle_events").insert({
      saved_car_id:       id,
      user_id:            car.user_id,
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
    }).then(() => {}, (e: unknown) => console.error(`[cron] event insert failed for ${id}:`, e));
  }

  return { id, status: "refreshed" };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Verify Vercel cron authorization
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Find cars not checked in STALE_THRESHOLD_MS, oldest first
  const staleAt = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
  const { data: staleCars, error: fetchErr } = await supabase
    .from("saved_cars")
    .select("*")
    .eq("is_tracking", true)
    .or(`last_checked_at.is.null,last_checked_at.lt.${staleAt}`)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_CARS);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const cars = staleCars ?? [];
  if (cars.length === 0) {
    return NextResponse.json({ processed: 0, message: "No stale cars" });
  }

  // Process in parallel batches
  const results: { id: string; status: string; reason?: string }[] = [];
  for (let i = 0; i < cars.length; i += BATCH_SIZE) {
    const batch = cars.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((car) => processCar(supabase, car)));
    results.push(...batchResults);
  }

  const refreshed = results.filter((r) => r.status === "refreshed").length;
  const skipped   = results.filter((r) => r.status === "skipped").length;
  const errors    = results.filter((r) => r.status === "error").length;

  console.log(`[cron] Completed: ${refreshed} refreshed, ${skipped} skipped, ${errors} errors`);

  return NextResponse.json({
    processed: cars.length,
    refreshed,
    skipped,
    errors,
    timestamp: new Date().toISOString(),
  });
}
