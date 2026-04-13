/**
 * Market Position & Deal Strength — high-level labels for the results page.
 *
 * Market Position: Where this listing sits relative to similar vehicles.
 *   - "Below most similar listings"
 *   - "Around average for similar listings"
 *   - "Above most similar listings"
 *
 * Deal Strength: Combines score + confidence + delta into a single tag.
 *   - "Strong Deal" / "Fair Deal" / "Uncertain" / "Weak Deal"
 */

import type { AnalysisResult, ConfidenceLevel } from "./types";

/* ── Market Position ───────────────────────────────────────────────────── */

export type MarketPositionLabel =
  | "Well below similar listings"
  | "Below most similar listings"
  | "Around average for similar listings"
  | "Slightly above similar listings"
  | "Above most similar listings";

export interface MarketPosition {
  label: MarketPositionLabel;
  sentiment: "positive" | "neutral" | "negative";
  /** Short explanation */
  description: string;
}

export function generateMarketPosition(result: AnalysisResult): MarketPosition {
  const { priceDeltaPct, confidenceLevel } = result;
  const qualifier = confidenceLevel === "High" ? "" : " (estimated)";

  if (priceDeltaPct <= -0.12) {
    return {
      label: "Well below similar listings",
      sentiment: "positive",
      description: `This asking price is significantly lower than comparable vehicles${qualifier}.`,
    };
  }
  if (priceDeltaPct <= -0.04) {
    return {
      label: "Below most similar listings",
      sentiment: "positive",
      description: `Priced below the estimated fair value range midpoint${qualifier}.`,
    };
  }
  if (priceDeltaPct <= 0.04) {
    return {
      label: "Around average for similar listings",
      sentiment: "neutral",
      description: `Price is within a typical range for this vehicle${qualifier}.`,
    };
  }
  if (priceDeltaPct <= 0.12) {
    return {
      label: "Slightly above similar listings",
      sentiment: "negative",
      description: `Priced moderately above the estimated fair value${qualifier}. Room to negotiate.`,
    };
  }
  return {
    label: "Above most similar listings",
    sentiment: "negative",
    description: `Asking price is well above estimated fair value${qualifier}. Negotiate firmly or consider alternatives.`,
  };
}

/* ── Deal Strength ─────────────────────────────────────────────────────── */

export type DealStrengthLabel = "Strong Deal" | "Good Deal" | "Fair Deal" | "Uncertain" | "Weak Deal";

export interface DealStrength {
  label: DealStrengthLabel;
  sentiment: "positive" | "neutral" | "negative" | "uncertain";
  description: string;
}

export function generateDealStrength(result: AnalysisResult): DealStrength {
  const { score, confidenceLevel, priceDeltaPct, confidenceScore } = result;

  // Low confidence always → "Uncertain" unless it's very clearly good or bad
  if (confidenceLevel === "Low") {
    if (score >= 80 && priceDeltaPct <= -0.10) {
      return {
        label: "Good Deal",
        sentiment: "positive",
        description: "Score is high even with limited data. Verify configuration to confirm.",
      };
    }
    return {
      label: "Uncertain",
      sentiment: "uncertain",
      description: "Not enough data to confidently assess this deal. Gather more information before deciding.",
    };
  }

  // Medium/High confidence — use score + delta
  if (score >= 80 && priceDeltaPct <= -0.08) {
    return {
      label: "Strong Deal",
      sentiment: "positive",
      description: confidenceLevel === "High"
        ? "Well-priced with strong data backing the estimate."
        : "Appears well-priced. Some data gaps exist — verify configuration.",
    };
  }

  if (score >= 68 && priceDeltaPct <= 0.03) {
    return {
      label: "Good Deal",
      sentiment: "positive",
      description: "Competitively priced based on available market data.",
    };
  }

  if (score >= 55 && priceDeltaPct <= 0.08) {
    return {
      label: "Fair Deal",
      sentiment: "neutral",
      description: "Price is within a reasonable range. Some negotiation room may exist.",
    };
  }

  if (confidenceLevel === "Medium" && score < 55) {
    return {
      label: "Uncertain",
      sentiment: "uncertain",
      description: "The data suggests this may be overpriced, but confidence is moderate. Verify before walking away.",
    };
  }

  return {
    label: "Weak Deal",
    sentiment: "negative",
    description: "Price appears above fair value. Negotiate firmly or explore alternatives.",
  };
}
