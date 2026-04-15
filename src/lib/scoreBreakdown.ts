/**
 * Score Breakdown — extracts human-readable factor explanations from a ScoreResult.
 *
 * This derives the breakdown AFTER scoring, reading the already-computed values.
 * It mirrors the logic in scoreCarDeal() to back-calculate each factor's contribution.
 */

import type { ScoreResult, ScoreBreakdown, ScoreBreakdownFactor, FactorSentiment } from "./types";

function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v));
}

function sentiment(v: number, posThresh: number, negThresh: number): FactorSentiment {
  if (v >= posThresh) return "positive";
  if (v <= negThresh) return "negative";
  return "neutral";
}

export function extractScoreBreakdown(result: ScoreResult): ScoreBreakdown {
  const factors: ScoreBreakdownFactor[] = [];
  const currentYear = new Date().getFullYear();
  const input = (result as any).input;
  const ageYears = Math.max(0, currentYear - (input?.year ?? currentYear));

  // ── 1. Price vs Fair Value ──
  const pctOff = result.priceDeltaPct;
  let priceDelta = 0;
  if      (pctOff <= -0.15) priceDelta = 30;
  else if (pctOff <= -0.08) priceDelta = 20;
  else if (pctOff <= -0.03) priceDelta = 10;
  else if (pctOff <=  0.03) priceDelta = 5;
  else if (pctOff <=  0.08) priceDelta = -5;
  else if (pctOff <=  0.15) priceDelta = -18;
  else if (pctOff <=  0.25) priceDelta = -32;
  else                       priceDelta = -45;

  const absPct = Math.abs(pctOff * 100);
  const priceBar = clamp(0, 100, 50 - pctOff * 200);

  let priceDesc: string;
  if (pctOff <= -0.08) priceDesc = `Asking price is ${absPct.toFixed(0)}% below estimated fair value — a strong deal.`;
  else if (pctOff <= -0.03) priceDesc = `Priced ${absPct.toFixed(0)}% below fair value midpoint.`;
  else if (pctOff <= 0.03) priceDesc = `Asking price is within 3% of estimated fair value.`;
  else if (pctOff <= 0.08) priceDesc = `Priced ${absPct.toFixed(0)}% above fair value — room to negotiate.`;
  else if (pctOff <= 0.15) priceDesc = `Asking ${absPct.toFixed(0)}% above fair value. Negotiate firmly.`;
  else priceDesc = `Priced ${absPct.toFixed(0)}% over fair value — significantly overpriced.`;

  factors.push({
    id: "price_vs_market",
    label: "Price vs Fair Value",
    description: priceDesc,
    sentiment: pctOff <= -0.03 ? "positive" : pctOff <= 0.03 ? "neutral" : "negative",
    barValue: Math.round(priceBar),
    scoreDelta: priceDelta,
  });

  // ── 2. Mileage Impact ──
  const mileage = input?.mileage ?? 0;
  const avgMileage = Math.max(ageYears * 13500, 6750);
  const mileageRatio = mileage / avgMileage;

  const catWeight = result.vehicleCategory === "exotic" ? 0.65
    : result.vehicleCategory === "performance" ? 0.70
    : result.vehicleCategory === "luxury" ? 0.80
    : 1.0;

  let mileDelta = 0;
  if      (mileageRatio > 1.6)  mileDelta = -Math.round(12 * catWeight);
  else if (mileageRatio > 1.3)  mileDelta = -Math.round(7 * catWeight);
  else if (mileageRatio > 1.1)  mileDelta = -Math.round(3 * catWeight);
  else if (mileageRatio < 0.6)  mileDelta = Math.round(8 * catWeight);
  else if (mileageRatio < 0.8)  mileDelta = Math.round(4 * catWeight);

  const mileBar = clamp(0, 100, Math.round(100 - (mileageRatio - 0.4) * 80));

  let mileDesc: string;
  if (mileageRatio < 0.7) mileDesc = `Very low mileage for this age — ${Math.round((1 - mileageRatio) * 100)}% below average.`;
  else if (mileageRatio < 0.9) mileDesc = `Below-average mileage for the year.`;
  else if (mileageRatio < 1.15) mileDesc = `Mileage is close to average for this year and age.`;
  else if (mileageRatio < 1.4) mileDesc = `Above-average mileage — may affect resale value.`;
  else mileDesc = `High mileage — ${Math.round((mileageRatio - 1) * 100)}% above average for this age.`;

  factors.push({
    id: "mileage",
    label: "Mileage",
    description: mileDesc,
    sentiment: sentiment(mileBar, 60, 35),
    barValue: mileBar,
    scoreDelta: mileDelta,
  });

  // ── 3. Vehicle Age ──
  let ageDelta = 0;
  if      (ageYears > 15) ageDelta = -8;
  else if (ageYears > 10) ageDelta = -4;
  else if (ageYears <= 2) ageDelta = 8;
  else if (ageYears <= 4) ageDelta = 4;

  const ageBar = clamp(0, 100, Math.round(100 - ageYears * 6));

  let ageDesc: string;
  if (ageYears <= 2) ageDesc = `Nearly new — still under warranty for most makes.`;
  else if (ageYears <= 4) ageDesc = `Recent model year with predictable depreciation.`;
  else if (ageYears <= 7) ageDesc = `Mid-age vehicle in the depreciation sweet spot.`;
  else if (ageYears <= 10) ageDesc = `Older model year — value depends heavily on condition.`;
  else ageDesc = `${ageYears} years old. Higher uncertainty in fair value estimation.`;

  factors.push({
    id: "age",
    label: "Vehicle Age",
    description: ageDesc,
    sentiment: sentiment(ageBar, 55, 30),
    barValue: ageBar,
    scoreDelta: ageDelta,
  });

  // ── 4. Market Data Quality ──
  const mds = result.confidenceBreakdown?.marketDataSpecificity ?? "statistical";
  const comp = result.compMetadata;
  const marketMap: Record<string, { bar: number; s: FactorSentiment; desc: string }> = {
    transaction:  { bar: 95, s: "positive", desc: "Fair value backed by real transaction data — highest reliability." },
    listings:     { bar: 72, s: "positive", desc: "Based on active dealer listings near your area." },
    broad_model:  { bar: 45, s: "neutral",  desc: "Using broad model-level data. Less specific to your exact configuration." },
    statistical:  { bar: 22, s: "negative", desc: "Using statistical depreciation models only. No live market comps available." },
  };
  let md = marketMap[mds] ?? marketMap.statistical;

  // Refine description with comp metadata when available
  if (comp) {
    if (comp.compQuality === "strong") {
      md = { bar: 85, s: "positive", desc: `Based on ${comp.compCount} comparable listings with consistent pricing.` };
    } else if (comp.compQuality === "moderate") {
      md = { bar: 65, s: "positive", desc: `Based on ${comp.compCount} comparable listings. Pricing varies moderately.` };
    } else {
      md = { bar: 38, s: "neutral", desc: `Only ${comp.compCount} comparable listings found with wide price variation. Estimate is less precise.` };
    }
  }

  factors.push({
    id: "market_confidence",
    label: "Market Data Quality",
    description: md.desc,
    sentiment: md.s,
    barValue: md.bar,
    scoreDelta: 0, // doesn't directly affect score, affects confidence
  });

  // ── 5. Configuration Confidence ──
  const optStatus = result.optionDataStatus ?? "missing";
  const vinDecoded = result.confidenceBreakdown?.vinDecoded ?? false;
  const trimVerified = result.confidenceBreakdown?.trimVerified ?? false;

  let configBar = 0;
  if (vinDecoded) configBar += 40;
  if (trimVerified) configBar += 30;
  if (optStatus === "complete") configBar += 30;
  else if (optStatus === "partial") configBar += 15;

  let configDesc: string;
  if (configBar >= 80) configDesc = "VIN decoded, trim verified, and option data available.";
  else if (configBar >= 50) configDesc = "Most configuration data available. Some package details may be missing.";
  else if (vinDecoded) configDesc = "VIN decoded but trim or option details are incomplete.";
  else configDesc = "Limited configuration data — fair value range is wider to account for uncertainty.";

  factors.push({
    id: "config_confidence",
    label: "Configuration Confidence",
    description: configDesc,
    sentiment: configBar >= 70 ? "positive" : configBar >= 40 ? "neutral" : "negative",
    barValue: configBar,
    scoreDelta: 0,
  });

  // ── 6. Option / Package Completeness ──
  const isHighVariance = ["luxury", "performance", "exotic"].includes(result.vehicleCategory);
  let optBar = optStatus === "complete" ? 90 : optStatus === "partial" ? 50 : 15;
  let optDesc: string;

  if (optStatus === "complete") {
    optDesc = "Full option and package data decoded from VIN.";
  } else if (optStatus === "partial") {
    optDesc = isHighVariance
      ? "Partial option data. For this vehicle category, packages can shift value significantly."
      : "Some option data available. Estimate may vary slightly.";
  } else {
    optDesc = isHighVariance
      ? "No package-level data. High-variance vehicle — fair value range widened to compensate."
      : "Package details are unavailable. Using base configuration for estimates.";
  }

  factors.push({
    id: "option_completeness",
    label: "Option / Package Data",
    description: optDesc,
    sentiment: optStatus === "complete" ? "positive" : optStatus === "partial" ? "neutral" : "negative",
    barValue: optBar,
    scoreDelta: 0,
  });

  // ── Build summary ──
  const totalDelta = priceDelta + mileDelta + ageDelta;
  let summary: string;
  if (result.confidenceLevel === "High") {
    summary = "This score is based on decoded VIN data, real market pricing, mileage benchmarks, and vehicle configuration detail. Confidence is high.";
  } else if (result.confidenceLevel === "Medium") {
    summary = "This score is based on decoded VIN data and available market comparisons. Some data gaps widen the fair value range.";
  } else {
    summary = "This score uses limited data. The fair value range is wider to reflect uncertainty. Use it as a directional guide, not a definitive answer.";
  }

  return {
    factors,
    baseScore: 65,
    finalScore: result.score,
    summary,
  };
}
