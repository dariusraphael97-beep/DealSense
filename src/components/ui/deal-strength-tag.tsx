"use client";

import type { AnalysisResult } from "@/lib/types";
import { generateDealStrength, type DealStrengthLabel } from "@/lib/marketPosition";

const tagStyles: Record<string, { bg: string; border: string; color: string; glow: string }> = {
  "Strong Deal": {
    bg: "var(--ds-success-bg)",
    border: "var(--ds-success-border)",
    color: "var(--ds-success)",
    glow: "var(--ds-success-glow)",
  },
  "Good Deal": {
    bg: "var(--ds-success-bg)",
    border: "var(--ds-success-border)",
    color: "var(--ds-success)",
    glow: "var(--ds-success-glow)",
  },
  "Fair Deal": {
    bg: "var(--ds-badge-bg)",
    border: "var(--ds-badge-border)",
    color: "var(--ds-text-2)",
    glow: "transparent",
  },
  "Uncertain": {
    bg: "var(--ds-warn-bg)",
    border: "var(--ds-warn-border)",
    color: "var(--ds-warn)",
    glow: "var(--ds-warn-glow)",
  },
  "Weak Deal": {
    bg: "var(--ds-danger-bg)",
    border: "var(--ds-danger-border)",
    color: "var(--ds-danger)",
    glow: "var(--ds-danger-glow)",
  },
};

export function DealStrengthTag({ result }: { result: AnalysisResult }) {
  const dealStrength = generateDealStrength(result);
  const style = tagStyles[dealStrength.label] ?? tagStyles["Fair Deal"];

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color,
        boxShadow: `0 0 12px ${style.glow}`,
      }}
      title={dealStrength.description}
    >
      {dealStrength.label === "Strong Deal" && "🔥 "}
      {dealStrength.label === "Good Deal" && "✓ "}
      {dealStrength.label === "Uncertain" && "? "}
      {dealStrength.label}
    </span>
  );
}
