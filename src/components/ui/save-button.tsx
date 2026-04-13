"use client";

import { useState, useEffect, useCallback } from "react";
import type { AnalysisResult } from "@/lib/types";

interface SaveButtonProps {
  analysisId?: string;
  result: AnalysisResult;
  variant?: "default" | "compact";
}

export function SaveButton({ analysisId, result, variant = "default" }: SaveButtonProps) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Check if already saved on mount
  useEffect(() => {
    if (!analysisId) return;
    fetch(`/api/saved-cars?analysis_id=${analysisId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.saved) { setSaved(true); setSavedId(d.savedId); }
      })
      .catch(() => {});
  }, [analysisId]);

  const toggle = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (saved && savedId) {
        // Unsave
        await fetch(`/api/saved-cars?id=${savedId}`, { method: "DELETE" });
        setSaved(false);
        setSavedId(null);
      } else if (saved && analysisId) {
        await fetch(`/api/saved-cars?analysis_id=${analysisId}`, { method: "DELETE" });
        setSaved(false);
        setSavedId(null);
      } else {
        // Save
        const res = await fetch("/api/saved-cars", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            analysisId,
            vin: result.input?.vin,
            year: result.input?.year,
            make: result.input?.make,
            model: result.input?.model,
            trim: result.input?.trim,
            mileage: result.input?.mileage,
            askingPrice: result.input?.askingPrice,
            dealScore: result.score,
            verdict: result.verdict,
            priceDelta: result.priceDelta,
            fairValueMid: result.fairValueRange?.midpoint,
            confidenceLevel: result.confidenceLevel,
            resultJson: result,
          }),
        });
        const data = await res.json();
        if (data.saved || data.alreadySaved) {
          setSaved(true);
          if (data.id) setSavedId(data.id);
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [saved, savedId, analysisId, result, loading]);

  const isCompact = variant === "compact";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 font-semibold transition-all disabled:opacity-50 ${
        isCompact ? "px-2.5 py-1.5 rounded-lg text-[11px]" : "px-3.5 py-2 rounded-xl text-xs"
      }`}
      style={{
        background: saved ? "var(--ds-success-bg)" : "var(--ds-badge-bg)",
        border: `1px solid ${saved ? "var(--ds-success-border)" : "var(--ds-badge-border)"}`,
        color: saved ? "var(--ds-success)" : "var(--ds-text-2)",
      }}
    >
      {saved ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )}
      {!isCompact && (saved ? "Saved" : "Save Car")}
    </button>
  );
}
