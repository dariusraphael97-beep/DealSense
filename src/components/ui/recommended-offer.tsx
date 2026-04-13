"use client";

import type { AnalysisResult } from "@/lib/types";
import { generateRecommendedOffer } from "@/lib/recommendedOffer";

export function RecommendedOffer({ result }: { result: AnalysisResult }) {
  const offer = generateRecommendedOffer(result);

  // Color based on strength
  const strengthStyles = {
    strong: {
      accentColor: "var(--ds-success)",
      accentBg: "var(--ds-success-bg)",
      accentBorder: "var(--ds-success-border)",
    },
    moderate: {
      accentColor: "var(--ds-warn)",
      accentBg: "var(--ds-warn-bg)",
      accentBorder: "var(--ds-warn-border)",
    },
    directional: {
      accentColor: "var(--ds-text-3)",
      accentBg: "var(--ds-badge-bg)",
      accentBorder: "var(--ds-badge-border)",
    },
  };

  const style = strengthStyles[offer.strength];

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "var(--ds-card-bg)",
        border: "1px solid var(--ds-card-border)",
        boxShadow: "var(--ds-card-shadow)",
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: "var(--ds-text-4)" }}>
        Recommended Offer
      </p>

      {/* Headline */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-1.5 h-10 rounded-full flex-shrink-0 mt-0.5" style={{ background: style.accentColor }} />
        <div>
          <p className="font-heading text-lg font-bold" style={{ color: "var(--ds-text-1)" }}>
            {offer.headline}
          </p>
          {offer.hasTarget && offer.targetLow && offer.targetHigh && !offer.alreadyGoodDeal && (
            <p className="font-mono text-sm mt-0.5" style={{ color: style.accentColor }}>
              ${offer.targetLow.toLocaleString()} – ${offer.targetHigh.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed" style={{ color: "var(--ds-text-2)" }}>
        {offer.description}
      </p>

      {/* Pay-up-to badge */}
      {offer.hasTarget && offer.payUpTo && !offer.alreadyGoodDeal && (
        <div
          className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{
            background: style.accentBg,
            border: `1px solid ${style.accentBorder}`,
            color: style.accentColor,
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 2v12M5 5c0-1.1.9-2 3-2s3 .9 3 2-1 2-3 2-3 .9-3 2 .9 2 3 2 3-.9 3-2" />
          </svg>
          Avoid paying above ${offer.payUpTo.toLocaleString()}
        </div>
      )}

      {/* Confidence qualifier */}
      {offer.strength !== "strong" && (
        <p className="text-[11px] mt-3" style={{ color: "var(--ds-text-4)" }}>
          {offer.strength === "moderate"
            ? "Based on moderate-confidence data. Verify configuration for a more precise range."
            : "This guidance is directional only. Gather more data before committing."}
        </p>
      )}
    </div>
  );
}
