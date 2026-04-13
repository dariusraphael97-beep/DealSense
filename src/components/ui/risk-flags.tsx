"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisResult } from "@/lib/types";
import { generateRiskFlags, type RiskFlag } from "@/lib/riskFlags";

const ease = [0.22, 1, 0.36, 1] as const;

function SeverityIcon({ severity }: { severity: RiskFlag["severity"] }) {
  if (severity === "high") {
    return (
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--ds-danger-bg)", border: "1px solid var(--ds-danger-border)" }}>
        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" style={{ color: "var(--ds-danger)" }}>
          <path d="M8 3v6M8 11.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  if (severity === "medium") {
    return (
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--ds-warn-bg)", border: "1px solid var(--ds-warn-border)" }}>
        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" style={{ color: "var(--ds-warn)" }}>
          <path d="M8 4v5M8 11.5v.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)" }}>
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" style={{ color: "var(--ds-text-3)" }}>
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function RiskFlags({ result }: { result: AnalysisResult }) {
  const flags = generateRiskFlags(result);
  const [expanded, setExpanded] = useState(false);

  if (flags.length === 0) return null;

  const highCount = flags.filter(f => f.severity === "high").length;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--ds-card-bg)",
        border: `1px solid ${highCount > 0 ? "var(--ds-danger-border)" : "var(--ds-card-border)"}`,
        boxShadow: "var(--ds-card-shadow)",
      }}
    >
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full px-6 py-4 flex items-center justify-between gap-3 transition-colors hover:brightness-[0.98]"
      >
        <div className="flex items-center gap-3">
          <span className="text-base">⚡</span>
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--ds-text-4)" }}>
              Potential Risks
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-3)" }}>
              {flags.length} {flags.length === 1 ? "flag" : "flags"} identified
              {highCount > 0 && (
                <span style={{ color: "var(--ds-danger)" }}> · {highCount} high</span>
              )}
            </p>
          </div>
        </div>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--ds-text-4)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <div
              className="px-6 pb-5 space-y-3"
              style={{ borderTop: "1px solid var(--ds-divider)" }}
            >
              <div className="pt-4 space-y-3">
                {flags.map((flag, i) => (
                  <motion.div
                    key={flag.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3, ease }}
                    className="flex items-start gap-3"
                  >
                    <SeverityIcon severity={flag.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--ds-text-1)" }}>
                        {flag.label}
                      </p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
                        {flag.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
