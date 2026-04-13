"use client";

import type { AnalysisResult } from "@/lib/types";
import { generateMarketPosition } from "@/lib/marketPosition";

export function MarketPositionBadge({ result }: { result: AnalysisResult }) {
  const position = generateMarketPosition(result);

  const sentimentStyles = {
    positive: {
      bg: "var(--ds-success-bg)",
      border: "var(--ds-success-border)",
      color: "var(--ds-success)",
      icon: "↓",
    },
    neutral: {
      bg: "var(--ds-badge-bg)",
      border: "var(--ds-badge-border)",
      color: "var(--ds-text-3)",
      icon: "≈",
    },
    negative: {
      bg: "var(--ds-danger-bg)",
      border: "var(--ds-danger-border)",
      color: "var(--ds-danger)",
      icon: "↑",
    },
  };

  const s = sentimentStyles[position.sentiment];

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
      title={position.description}
    >
      <span className="text-[10px]">{s.icon}</span>
      {position.label}
    </span>
  );
}
