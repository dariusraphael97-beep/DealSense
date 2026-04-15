/**
 * Buy Timing — determines status and builds insight context for tracked vehicles.
 *
 * WHAT WE TRACK:
 *   The fair value estimate for a saved vehicle, refreshed via market data.
 *   We do NOT track live listing prices (which we can't fetch automatically).
 *   Instead we track whether the *market* moved in the user's favor or against them.
 *
 *   A rising fair value → the car looks like a better deal vs. current market.
 *   A falling fair value → the market is softening, asking price looks worse relatively.
 *
 * HONESTY RULES:
 *   - Never claim certainty we don't have.
 *   - Respect confidence level — Low confidence suppresses action-oriented labels.
 *   - High-variance categories (exotic/performance) require High confidence for
 *     strong buy signals.
 */

import type { VehicleCategory, ConfidenceLevel } from "./types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BuyTimingStatus =
  | "buy_now"             // Strong signal — asking well below fair value, high confidence
  | "strong_opportunity"  // Asking below fair value or market improved significantly
  | "worth_watching"      // At/near fair value; market stable or improving slightly
  | "wait"                // Asking above fair value; market not helping
  | "no_change"           // Market essentially unchanged
  | "needs_review";       // Low confidence or high-variance — directional only

export type BuyTimingLabel = {
  text: string;
  severity: "positive" | "neutral" | "negative" | "caution";
};

export const BUY_TIMING_LABELS: Record<BuyTimingStatus, BuyTimingLabel> = {
  buy_now:             { text: "Buy Now",            severity: "positive" },
  strong_opportunity:  { text: "Strong Opportunity", severity: "positive" },
  worth_watching:      { text: "Worth Watching",     severity: "neutral"  },
  wait:                { text: "Wait",               severity: "negative" },
  no_change:           { text: "No Change",          severity: "neutral"  },
  needs_review:        { text: "Needs Review",       severity: "caution"  },
};

export interface BuyTimingInput {
  askingPrice:          number;
  originalFairValueMid: number;  // fair_value_mid at time of save
  newFairValueMid:      number;  // fresh market estimate
  newFairValueLow:      number;
  newFairValueHigh:     number;
  dealScore:            number;
  confidenceLevel:      ConfidenceLevel;
  vehicleCategory:      VehicleCategory;
}

export interface BuyTimingResult {
  status:              BuyTimingStatus;
  label:               BuyTimingLabel;
  fairValueChange:     number;       // new_fv_mid - original_fv_mid
  fairValueChangePct:  number;       // as decimal e.g. 0.03 = 3%
  pricePosition:       number;       // askingPrice - newFairValueMid
  pricePositionPct:    number;       // pricePosition / newFairValueMid
  isAboveRange:        boolean;
  isBelowRange:        boolean;
  isWithinRange:       boolean;
  eventType:           string;
  changeDescription:   string;       // plain text summary of what changed
}

// ── Thresholds ────────────────────────────────────────────────────────────────
//   Tunable without touching the logic — tweak here to adjust sensitivity.

export const CHANGE_THRESHOLDS = {
  noise:       0.010,  // < 1%  — market noise, don't surface
  mild:        0.025,  // 1–2.5% — worth noting quietly
  meaningful:  0.040,  // 2.5–4% — meaningful shift
  significant: 0.080,  // 4%+ — significant
} as const;

const POSITION_THRESHOLDS = {
  strong_buy:  -0.06,  // asking ≥ 6% below fair value (high conf only)
  buy:         -0.03,  // asking 3–6% below
  fair_zone:    0.03,  // within ±3% of midpoint
  negotiate:    0.10,  // 3–10% above
  overpriced:   0.20,  // > 10% above
} as const;

// ── Core function ─────────────────────────────────────────────────────────────

export function determineBuyTiming(input: BuyTimingInput): BuyTimingResult {
  const {
    askingPrice, originalFairValueMid, newFairValueMid,
    newFairValueLow, newFairValueHigh, dealScore,
    confidenceLevel, vehicleCategory,
  } = input;

  const isHighVariance = vehicleCategory === "exotic"
    || vehicleCategory === "performance"
    || vehicleCategory === "luxury";

  // ── Fair value movement ──
  const fairValueChange    = newFairValueMid - originalFairValueMid;
  const fairValueChangePct = originalFairValueMid > 0
    ? fairValueChange / originalFairValueMid
    : 0;

  // ── Price position vs CURRENT fair value ──
  const pricePosition    = askingPrice - newFairValueMid;
  const pricePositionPct = newFairValueMid > 0
    ? pricePosition / newFairValueMid
    : 0;

  const isWithinRange = askingPrice >= newFairValueLow && askingPrice <= newFairValueHigh;
  const isBelowRange  = askingPrice < newFairValueLow;
  const isAboveRange  = askingPrice > newFairValueHigh;

  const noMeaningfulChange = Math.abs(fairValueChangePct) < CHANGE_THRESHOLDS.noise;

  // ── Build change description (used in UI) ──
  const changeDescription = buildChangeDescription(fairValueChange, fairValueChangePct, askingPrice, newFairValueMid, pricePositionPct);

  // ── Low confidence → needs_review regardless ──
  if (confidenceLevel === "Low") {
    return build("needs_review", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
      isAboveRange, isBelowRange, isWithinRange, "watch_only", changeDescription);
  }

  // ── High-variance with non-High confidence ──
  if (isHighVariance && confidenceLevel !== "High") {
    return build("needs_review", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
      isAboveRange, isBelowRange, isWithinRange, "watch_only", changeDescription);
  }

  // ── No meaningful fair value change ──
  if (noMeaningfulChange) {
    // Status still depends on price position even when market hasn't moved
    if (pricePositionPct <= POSITION_THRESHOLDS.buy) {
      return build("strong_opportunity", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
        isAboveRange, isBelowRange, isWithinRange, "no_change", changeDescription);
    }
    if (pricePositionPct > POSITION_THRESHOLDS.negotiate) {
      return build("wait", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
        isAboveRange, isBelowRange, isWithinRange, "no_change", changeDescription);
    }
    return build("no_change", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
      isAboveRange, isBelowRange, isWithinRange, "no_change", changeDescription);
  }

  // ── Primary signal: price position vs current fair value ──

  if (pricePositionPct <= POSITION_THRESHOLDS.strong_buy && confidenceLevel === "High") {
    return build("buy_now", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
      isAboveRange, isBelowRange, isWithinRange, "high_opportunity", changeDescription);
  }

  if (pricePositionPct <= POSITION_THRESHOLDS.buy) {
    const evt = fairValueChangePct >= CHANGE_THRESHOLDS.meaningful ? "fair_value_up" : "high_opportunity";
    return build("strong_opportunity", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
      isAboveRange, isBelowRange, isWithinRange, evt, changeDescription);
  }

  if (pricePositionPct <= POSITION_THRESHOLDS.fair_zone || isWithinRange) {
    // Within fair zone — secondary signal is direction of fair value movement
    if (fairValueChangePct <= -CHANGE_THRESHOLDS.meaningful) {
      // Market softening → car getting relatively more expensive
      return build("wait", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
        isAboveRange, isBelowRange, isWithinRange, "fair_value_down", changeDescription);
    }
    if (fairValueChangePct >= CHANGE_THRESHOLDS.meaningful) {
      // Market strengthening → car looks better
      return build("worth_watching", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
        isAboveRange, isBelowRange, isWithinRange, "fair_value_up", changeDescription);
    }
    return build("worth_watching", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
      isAboveRange, isBelowRange, isWithinRange, "no_change", changeDescription);
  }

  // Above fair zone
  if (pricePositionPct <= POSITION_THRESHOLDS.negotiate) {
    return build("wait", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
      isAboveRange, isBelowRange, isWithinRange,
      fairValueChangePct <= -CHANGE_THRESHOLDS.mild ? "fair_value_down" : "watch_only",
      changeDescription);
  }

  // Significantly overpriced
  return build("wait", fairValueChange, fairValueChangePct, pricePosition, pricePositionPct,
    isAboveRange, isBelowRange, isWithinRange, "watch_only", changeDescription);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function build(
  status: BuyTimingStatus,
  fairValueChange: number,
  fairValueChangePct: number,
  pricePosition: number,
  pricePositionPct: number,
  isAboveRange: boolean,
  isBelowRange: boolean,
  isWithinRange: boolean,
  eventType: string,
  changeDescription: string,
): BuyTimingResult {
  return {
    status,
    label: BUY_TIMING_LABELS[status],
    fairValueChange,
    fairValueChangePct,
    pricePosition,
    pricePositionPct,
    isAboveRange,
    isBelowRange,
    isWithinRange,
    eventType,
    changeDescription,
  };
}

function buildChangeDescription(
  fairValueChange: number,
  fairValueChangePct: number,
  askingPrice: number,
  newFairValueMid: number,
  pricePositionPct: number,
): string {
  const absFvChange = Math.abs(Math.round(fairValueChange));
  const changePct   = Math.abs(fairValueChangePct * 100).toFixed(1);
  const posPct      = Math.abs(Math.round(pricePositionPct * 100));
  const isOver      = pricePositionPct > 0;

  const positionStr = isOver
    ? `$${Math.abs(Math.round(askingPrice - newFairValueMid)).toLocaleString()} (${posPct}%) above fair value`
    : `$${Math.abs(Math.round(askingPrice - newFairValueMid)).toLocaleString()} (${posPct}%) below fair value`;

  if (Math.abs(fairValueChangePct) < CHANGE_THRESHOLDS.noise) {
    return `Fair value estimate unchanged. Asking price is ${positionStr}.`;
  }

  const fvChangeStr = fairValueChange > 0
    ? `Fair value estimate up $${absFvChange.toLocaleString()} (+${changePct}%)`
    : `Fair value estimate down $${absFvChange.toLocaleString()} (${changePct}%)`;

  return `${fvChangeStr}. Asking price is now ${positionStr}.`;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function isNoMeaningfulChange(fairValueChangePct: number): boolean {
  return Math.abs(fairValueChangePct) < CHANGE_THRESHOLDS.noise;
}

/** Maps event_type to a user-friendly activity label */
export function eventTypeLabel(eventType: string): string {
  const map: Record<string, string> = {
    first_check:    "Initial check",
    no_change:      "No change",
    fair_value_up:  "Market strengthened",
    fair_value_down:"Market softened",
    high_opportunity:"Strong opportunity found",
    watch_only:     "Updated",
  };
  return map[eventType] ?? "Updated";
}

/** Relative time helper */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
