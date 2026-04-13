/**
 * Risk Flags — generates 2-4 concise risk factors from an AnalysisResult.
 *
 * Flags are short, actionable, and confidence-aware. They complement
 * the existing warnings by being more specific and user-facing.
 */

import type { AnalysisResult, VehicleCategory, ConfidenceLevel } from "./types";

export interface RiskFlag {
  id: string;
  label: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export function generateRiskFlags(result: AnalysisResult): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const {
    input,
    priceDelta,
    priceDeltaPct,
    confidenceLevel,
    confidenceScore,
    vehicleCategory,
    optionDataStatus,
    fairValueRange,
    trimValidation,
    score,
  } = result;

  const currentYear = new Date().getFullYear();
  const ageYears = Math.max(0, currentYear - input.year);
  const avgMileage = Math.max(ageYears * 13500, 1);
  const mileageRatio = input.mileage / avgMileage;
  const isHighVariance = ["exotic", "performance", "luxury"].includes(vehicleCategory);

  // ── 1. Overpriced risk ──
  if (priceDeltaPct > 0.12) {
    flags.push({
      id: "overpriced",
      label: "Priced above estimated range",
      description: `Asking price is ~${Math.round(priceDeltaPct * 100)}% above the estimated fair value midpoint. ${
        confidenceLevel === "High"
          ? "This gap is based on strong market data."
          : "Note: this estimate carries " + confidenceLevel.toLowerCase() + " confidence."
      }`,
      severity: priceDeltaPct > 0.20 ? "high" : "medium",
    });
  }

  // ── 2. High mileage risk ──
  if (mileageRatio > 1.3) {
    flags.push({
      id: "high_mileage",
      label: "Higher-than-average mileage",
      description: `${input.mileage.toLocaleString()} miles is ~${Math.round((mileageRatio - 1) * 100)}% above average for a ${ageYears}-year-old vehicle. Expect higher maintenance costs.`,
      severity: mileageRatio > 1.6 ? "high" : "medium",
    });
  }

  // ── 3. Low confidence / data gaps ──
  if (confidenceLevel === "Low" || confidenceScore < 40) {
    flags.push({
      id: "low_confidence",
      label: "Limited data available",
      description: "This estimate is based on limited information. The fair value range is wider to reflect uncertainty — treat the score as directional.",
      severity: "high",
    });
  } else if (confidenceLevel === "Medium" && isHighVariance) {
    flags.push({
      id: "medium_confidence_hv",
      label: "Incomplete data on high-variance vehicle",
      description: `${vehicleCategory.charAt(0).toUpperCase() + vehicleCategory.slice(1)} vehicles can vary significantly in value based on factory packages. Some configuration details are missing.`,
      severity: "medium",
    });
  }

  // ── 4. Missing option data on high-variance ──
  if (isHighVariance && optionDataStatus !== "complete") {
    const alreadyHasConfFlag = flags.some(f => f.id === "medium_confidence_hv" || f.id === "low_confidence");
    if (!alreadyHasConfFlag) {
      flags.push({
        id: "missing_options",
        label: "Package details unavailable",
        description: `No full option/package data was decoded. On ${vehicleCategory} vehicles, factory options can shift fair value by thousands.`,
        severity: optionDataStatus === "missing" ? "high" : "medium",
      });
    }
  }

  // ── 5. Old vehicle risk ──
  if (ageYears > 10) {
    flags.push({
      id: "old_vehicle",
      label: "Older vehicle — inspection recommended",
      description: `At ${ageYears} years old, a pre-purchase inspection (PPI) is strongly recommended. Repair costs and parts availability may be factors.`,
      severity: ageYears > 15 ? "high" : "medium",
    });
  }

  // ── 6. Trim mismatch ──
  if (trimValidation?.trimConfidence === "low") {
    flags.push({
      id: "trim_uncertain",
      label: "Trim/configuration not fully verified",
      description: trimValidation.isHighRiskModel
        ? `${input.make} ${input.model} trims vary significantly across years. The exact configuration may not be reflected in this estimate.`
        : "The trim could not be fully verified from the VIN. Valuation accuracy may be affected.",
      severity: trimValidation.isHighRiskModel ? "high" : "medium",
    });
  }

  // ── 7. Wide fair value range ──
  const rangeSpread = fairValueRange.high - fairValueRange.low;
  const rangeSpreadPct = rangeSpread / fairValueRange.midpoint;
  if (rangeSpreadPct > 0.30) {
    const alreadyHasDataFlag = flags.some(f => f.id === "low_confidence" || f.id === "missing_options" || f.id === "medium_confidence_hv");
    if (!alreadyHasDataFlag) {
      flags.push({
        id: "wide_range",
        label: "Wide estimated value range",
        description: `The estimated fair value spans $${fairValueRange.low.toLocaleString()} – $${fairValueRange.high.toLocaleString()}. Verify configuration to narrow this down.`,
        severity: "medium",
      });
    }
  }

  // ── 8. Weak comps ──
  const comp = (result as any).compMetadata;
  if (comp && comp.compQuality === "weak" && comp.compCount < 5) {
    const alreadyHasCompFlag = flags.some(f => f.id === "low_confidence");
    if (!alreadyHasCompFlag) {
      flags.push({
        id: "weak_comps",
        label: "Few comparable listings available",
        description: `Only ${comp.compCount} comparable listings were found, which limits pricing accuracy. The estimate is less reliable for this vehicle.`,
        severity: "medium",
      });
    }
  }

  // Cap at 4 flags, prioritizing high severity first
  flags.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return flags.slice(0, 4);
}
