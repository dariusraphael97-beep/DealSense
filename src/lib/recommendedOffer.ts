/**
 * Recommended Offer — generates a confidence-aware offer range or target.
 *
 * Logic:
 * - High confidence: concrete "Target: $X – $Y" range
 * - Medium confidence: softer "Consider up to $X" suggestion
 * - Low confidence: no specific number, just directional guidance
 *
 * The offer is derived from the fair value range, price delta, and score.
 */

import type { AnalysisResult, ConfidenceLevel } from "./types";

export interface RecommendedOffer {
  /** Whether a concrete number should be shown */
  hasTarget: boolean;
  /** "strong" | "moderate" | "directional" */
  strength: "strong" | "moderate" | "directional";
  /** Low end of recommended range (only if hasTarget) */
  targetLow?: number;
  /** High end of recommended range (only if hasTarget) */
  targetHigh?: number;
  /** Single "pay up to" number (only if hasTarget) */
  payUpTo?: number;
  /** Human-readable headline */
  headline: string;
  /** Human-readable explanation */
  description: string;
  /** Whether the car is already a good deal (no need to negotiate) */
  alreadyGoodDeal: boolean;
}

export function generateRecommendedOffer(result: AnalysisResult): RecommendedOffer {
  const {
    input,
    fairValueRange,
    priceDelta,
    priceDeltaPct,
    confidenceLevel,
    confidenceScore,
    vehicleCategory,
    optionDataStatus,
    score,
    verdict,
  } = result;

  const isHighVariance = ["exotic", "performance", "luxury"].includes(vehicleCategory);
  const fvLow = fairValueRange.low;
  const fvMid = fairValueRange.midpoint;
  const fvHigh = fairValueRange.high;
  const askingPrice = input.askingPrice;

  // Round to nearest $100
  const round100 = (n: number) => Math.round(n / 100) * 100;

  // ── Already a good deal ──
  if (priceDeltaPct <= -0.05 && (confidenceLevel === "High" || confidenceLevel === "Medium")) {
    return {
      hasTarget: true,
      strength: confidenceLevel === "High" ? "strong" : "moderate",
      payUpTo: round100(askingPrice),
      headline: "This appears competitively priced",
      description: confidenceLevel === "High"
        ? `At $${askingPrice.toLocaleString()}, this is already below the estimated fair value midpoint. Focus on confirming out-the-door fees rather than negotiating the sticker.`
        : `At $${askingPrice.toLocaleString()}, this appears below estimated fair value. Confirm the full configuration to be sure, then focus on out-the-door fees.`,
      alreadyGoodDeal: true,
    };
  }

  // ── High confidence — concrete range ──
  if (confidenceLevel === "High") {
    // Target: between fair value low and midpoint, biased by how overpriced it is
    let targetLow: number;
    let targetHigh: number;

    if (priceDeltaPct > 0.15) {
      // Significantly overpriced — target below midpoint
      targetLow = round100(fvLow);
      targetHigh = round100(fvMid * 0.97);
    } else if (priceDeltaPct > 0.05) {
      // Moderately overpriced — target around midpoint
      targetLow = round100(fvLow + (fvMid - fvLow) * 0.3);
      targetHigh = round100(fvMid);
    } else {
      // Close to fair — small negotiation room
      targetLow = round100(fvMid * 0.97);
      targetHigh = round100(fvMid);
    }

    return {
      hasTarget: true,
      strength: "strong",
      targetLow,
      targetHigh,
      payUpTo: round100(fvMid),
      headline: `Target offer: $${targetLow.toLocaleString()} – $${targetHigh.toLocaleString()}`,
      description: `Based on market data, aim for this range. Avoid paying above $${round100(fvMid).toLocaleString()} — the estimated fair value midpoint.`,
      alreadyGoodDeal: false,
    };
  }

  // ── Medium confidence — softer suggestion ──
  if (confidenceLevel === "Medium") {
    const payUpTo = round100(fvMid);
    const suggestion = priceDelta > 0
      ? `Consider negotiating toward $${payUpTo.toLocaleString()} — our estimated fair value midpoint. This estimate has moderate confidence, so use it as a starting point.`
      : `The asking price is close to our estimated fair value. Verify configuration details and focus on fees.`;

    return {
      hasTarget: true,
      strength: "moderate",
      payUpTo,
      headline: priceDelta > 0
        ? `Consider up to $${payUpTo.toLocaleString()}`
        : "Price appears reasonable",
      description: suggestion + (isHighVariance ? " Factory packages can shift the true value significantly on this type of vehicle." : ""),
      alreadyGoodDeal: false,
    };
  }

  // ── Low confidence — directional only ──
  return {
    hasTarget: false,
    strength: "directional",
    headline: "Get more information before making an offer",
    description: `We don't have enough data to suggest a specific number. The estimated range is $${fvLow.toLocaleString()} – $${fvHigh.toLocaleString()}, but this carries low confidence. ${
      isHighVariance
        ? "Request a full option list and compare similar listings before negotiating."
        : "Compare similar listings in your area to build a more informed offer."
    }`,
    alreadyGoodDeal: false,
  };
}
