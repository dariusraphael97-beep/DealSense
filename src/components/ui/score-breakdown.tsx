"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { extractScoreBreakdown } from "@/lib/scoreBreakdown";
import type { ScoreResult, FactorSentiment } from "@/lib/types";

const ease = [0.22, 1, 0.36, 1] as const;

function SentimentIcon({ sentiment }: { sentiment: FactorSentiment }) {
  if (sentiment === "positive") {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--ds-success-bg)", border: "1px solid var(--ds-success-border)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ds-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (sentiment === "negative") {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--ds-danger-bg)", border: "1px solid var(--ds-danger-border)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ds-danger)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: "var(--ds-warn-bg)", border: "1px solid var(--ds-warn-border)" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--ds-warn)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </div>
  );
}

function BarFill({ value, sentiment }: { value: number; sentiment: FactorSentiment }) {
  const color = sentiment === "positive" ? "var(--ds-success)"
    : sentiment === "negative" ? "var(--ds-danger)"
    : "var(--ds-warn)";

  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--ds-divider)" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

export function ScoreBreakdown({ result }: { result: ScoreResult }) {
  const [open, setOpen] = useState(false);
  const breakdown = extractScoreBreakdown(result);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors text-left cursor-pointer"
        style={{ color: "var(--ds-text-1)" }}
      >
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--ds-accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-sm font-semibold">Why This Score?</span>
          <span className="text-xs px-2 py-0.5 rounded-md font-medium"
            style={{ background: "rgba(99,102,241,0.1)", color: "var(--ds-accent-text)", border: "1px solid rgba(99,102,241,0.2)" }}>
            {breakdown.factors.filter(f => f.sentiment === "positive").length} positive
          </span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="w-4 h-4 transition-transform duration-200 flex-shrink-0"
          style={{ color: "var(--ds-text-4)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-5 space-y-4" style={{ borderTop: "1px solid var(--ds-divider)" }}>
              {/* Summary */}
              <p className="text-xs leading-relaxed pt-4" style={{ color: "var(--ds-text-3)" }}>
                {breakdown.summary}
              </p>

              {/* Factor rows */}
              <div className="space-y-3.5">
                {breakdown.factors.map((factor) => (
                  <motion.div
                    key={factor.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <SentimentIcon sentiment={factor.sentiment} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-xs font-semibold" style={{ color: "var(--ds-text-1)" }}>
                            {factor.label}
                          </span>
                          {factor.scoreDelta !== 0 && (
                            <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded"
                              style={{
                                background: factor.scoreDelta > 0 ? "var(--ds-success-bg)" : "var(--ds-danger-bg)",
                                color: factor.scoreDelta > 0 ? "var(--ds-success)" : "var(--ds-danger)",
                              }}>
                              {factor.scoreDelta > 0 ? "+" : ""}{factor.scoreDelta} pts
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: "var(--ds-text-3)" }}>
                          {factor.description}
                        </p>
                        <BarFill value={factor.barValue} sentiment={factor.sentiment} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Base score note */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-medium" style={{ color: "var(--ds-text-4)" }}>
                  Base score: {breakdown.baseScore} → Final: {breakdown.finalScore}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
