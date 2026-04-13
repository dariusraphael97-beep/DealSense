"use client";

import { useCompare } from "@/contexts/compare-context";
import type { AnalysisResult, CompareItem } from "@/lib/types";

interface AddToCompareButtonProps {
  result: AnalysisResult;
  variant?: "default" | "compact";
}

function resultToCompareItem(result: AnalysisResult): CompareItem {
  return {
    analysisId: (result as any).savedId,
    vin: result.input?.vin,
    year: result.input?.year,
    make: result.input?.make,
    model: result.input?.model,
    trim: result.input?.trim,
    askingPrice: result.input?.askingPrice,
    mileage: result.input?.mileage,
    dealScore: result.score,
    verdict: result.verdict,
    priceDelta: result.priceDelta,
    priceDeltaPct: result.priceDeltaPct,
    fairValueLow: result.fairValueRange?.low,
    fairValueMid: result.fairValueRange?.midpoint,
    fairValueHigh: result.fairValueRange?.high,
    confidenceLevel: result.confidenceLevel,
    confidenceScore: result.confidenceScore,
    vehicleCategory: result.vehicleCategory,
    monthlyPayment: result.monthlyPayment,
    keyInsights: result.keyInsights?.slice(0, 3) ?? [],
    optionDataStatus: result.optionDataStatus,
    resultJson: result,
  };
}

export function AddToCompareButton({ result, variant = "default" }: AddToCompareButtonProps) {
  const { addItem, removeItem, isInCompare, isFull } = useCompare();
  const vin = result.input?.vin ?? "";
  const inCompare = isInCompare(vin);
  const isCompact = variant === "compact";

  function handleClick() {
    if (inCompare) {
      removeItem(vin);
    } else if (!isFull) {
      addItem(resultToCompareItem(result));
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isFull && !inCompare}
      className={`flex items-center gap-1.5 font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        isCompact ? "px-2.5 py-1.5 rounded-lg text-[11px]" : "px-3.5 py-2 rounded-xl text-xs"
      }`}
      style={{
        background: inCompare ? "rgba(99,102,241,0.12)" : "var(--ds-badge-bg)",
        border: `1px solid ${inCompare ? "rgba(99,102,241,0.25)" : "var(--ds-badge-border)"}`,
        color: inCompare ? "var(--ds-accent-text)" : "var(--ds-text-2)",
      }}
      title={isFull && !inCompare ? "Compare is full (max 4)" : undefined}
    >
      {inCompare ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
      {!isCompact && (inCompare ? "In Compare" : "Compare")}
    </button>
  );
}

export { resultToCompareItem };
