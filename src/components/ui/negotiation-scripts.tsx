"use client";

import { useState } from "react";
import type { NegotiationScripts, NegotiationScriptVariant, Verdict, ConfidenceLevel } from "@/lib/types";

/* ── Icons ── */
function IconCopy() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}
function IconCheckLg() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>;
}

function assembleScript(v: NegotiationScriptVariant): string {
  return [v.opening, v.valuePosition, v.justification, v.ask, v.close]
    .filter(Boolean)
    .join(" ");
}

const TONE_LABELS = {
  confident:  { label: "Confident",  sub: "Direct & data-backed" },
  calm:       { label: "Calm",       sub: "Friendly & collaborative" },
  aggressive: { label: "Aggressive", sub: "Max leverage" },
} as const;
type ToneKey = keyof typeof TONE_LABELS;

const SECTION_LABELS: { key: keyof NegotiationScriptVariant; label: string }[] = [
  { key: "opening",       label: "Opening" },
  { key: "valuePosition", label: "The data" },
  { key: "justification", label: "Your leverage" },
  { key: "ask",           label: "What to ask for" },
  { key: "close",         label: "How to close" },
];

function scriptTitle(verdict: Verdict): string {
  switch (verdict) {
    case "Buy":
    case "Fair Deal":        return "Your Closing Script";
    case "Walk Away":        return "Your Walk-Away Script";
    case "Needs Option Review": return "Your Option Inquiry Script";
    case "Possibly Overpriced": return "Your Inquiry Script";
    default:                 return "Your Negotiation Script";
  }
}

function tipsForVerdict(verdict: Verdict, confidenceLevel: ConfidenceLevel): string {
  if (verdict === "Buy" || verdict === "Fair Deal") {
    return confidenceLevel === "High"
      ? "💡 Well-priced based on strong data — focus on confirming out-the-door fees, not pushing the sticker lower."
      : "💡 Competitively priced, though some data gaps exist. Confirm configuration and focus on out-the-door fees.";
  }
  if (verdict === "Walk Away") return "💡 Be prepared to actually walk. Sellers often come back when they see you mean it.";
  if (verdict === "Needs Option Review") return "💡 Get the full option/package list before discussing price. Configuration shifts fair value significantly on this type of vehicle.";
  if (verdict === "Possibly Overpriced") {
    return confidenceLevel === "High"
      ? "💡 Appears overpriced based on market data. Negotiate firmly using comparable listings."
      : "💡 May be above fair value, but verify the full configuration first — some options can justify a premium.";
  }
  return confidenceLevel === "High"
    ? "💡 Reference specific numbers. Sellers respond better when you can point to comparable listings."
    : "💡 Our estimate has some data gaps. Supplement with comparable listings, service records, and a pre-purchase inspection.";
}

interface Props {
  negotiationScripts?: NegotiationScripts;
  /** Legacy fallback — used when negotiationScripts is absent (old saved analyses) */
  negotiationScript?: string;
  verdict: Verdict;
  confidenceLevel: ConfidenceLevel;
}

export function NegotiationScriptSection({ negotiationScripts, negotiationScript, verdict, confidenceLevel }: Props) {
  const [activeTone, setActiveTone] = useState<ToneKey>("confident");
  const [copied, setCopied] = useState(false);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select
    }
  }

  // ── Legacy fallback ──────────────────────────────────────────────────────
  if (!negotiationScripts) {
    const text = negotiationScript ?? "";
    return (
      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(99,102,241,0.25)", boxShadow: "0 0 40px rgba(99,102,241,0.08)" }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: "rgba(99,102,241,0.08)", borderBottom: "1px solid rgba(99,102,241,0.15)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500"/>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">
              {scriptTitle(verdict)}
            </p>
          </div>
          <button onClick={() => handleCopy(text)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: copied ? "var(--ds-success-bg)" : "rgba(99,102,241,0.10)",
              border: copied ? "1px solid var(--ds-success-border)" : "1px solid rgba(99,102,241,0.22)",
              color: copied ? "var(--ds-success)" : "var(--ds-accent-text)",
            }}>
            {copied ? <><IconCheckLg />Copied!</> : <><IconCopy />Copy script</>}
          </button>
        </div>
        <div className="px-6 py-5" style={{ background: "var(--ds-card-bg)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ds-text-1)", fontStyle: "italic", lineHeight: 1.85 }}>
            &ldquo;{text}&rdquo;
          </p>
          <p className="text-xs mt-4 pt-4" style={{ color: "var(--ds-text-4)", borderTop: "1px solid var(--ds-divider)" }}>
            {tipsForVerdict(verdict, confidenceLevel)}
          </p>
          {confidenceLevel !== "High" && (
            <p className="text-[10px] mt-2" style={{ color: "var(--ds-text-4)" }}>
              Note: Script based on estimated values with {confidenceLevel.toLowerCase()} confidence. Verify key details before using specific numbers.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Full structured version ──────────────────────────────────────────────
  const variant = negotiationScripts[activeTone];
  const fullScript = assembleScript(variant);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(99,102,241,0.25)", boxShadow: "0 0 40px rgba(99,102,241,0.08)" }}>

      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between"
        style={{ background: "rgba(99,102,241,0.08)", borderBottom: "1px solid rgba(99,102,241,0.15)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500"/>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">
            {scriptTitle(verdict)}
          </p>
        </div>
        <button onClick={() => handleCopy(fullScript)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: copied ? "var(--ds-success-bg)" : "rgba(99,102,241,0.10)",
            border: copied ? "1px solid var(--ds-success-border)" : "1px solid rgba(99,102,241,0.22)",
            color: copied ? "var(--ds-success)" : "var(--ds-accent-text)",
          }}>
          {copied ? <><IconCheckLg />Copied!</> : <><IconCopy />Copy script</>}
        </button>
      </div>

      {/* Tone tabs */}
      <div className="flex border-b" style={{ background: "var(--ds-card-bg)", borderColor: "var(--ds-divider)" }}>
        {(Object.keys(TONE_LABELS) as ToneKey[]).map((tone) => {
          const active = tone === activeTone;
          return (
            <button key={tone} onClick={() => setActiveTone(tone)}
              className="flex-1 py-3 px-2 flex flex-col items-center gap-0.5 transition-all relative"
              style={{ color: active ? "var(--ds-accent-text)" : "var(--ds-text-3)" }}>
              <span className="text-xs font-semibold">{TONE_LABELS[tone].label}</span>
              <span className="text-[10px] hidden sm:block" style={{ color: active ? "var(--ds-text-3)" : "var(--ds-text-4)" }}>
                {TONE_LABELS[tone].sub}
              </span>
              {active && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-indigo-500"/>
              )}
            </button>
          );
        })}
      </div>

      {/* Script sections */}
      <div className="px-6 py-5 space-y-4" style={{ background: "var(--ds-card-bg)" }}>
        {SECTION_LABELS.map(({ key, label }) => {
          const text = variant[key];
          if (!text) return null;
          return (
            <div key={key} className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <span className="inline-block text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md whitespace-nowrap"
                  style={{
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.18)",
                    color: "var(--ds-accent-text)",
                    minWidth: "88px",
                    textAlign: "center",
                  }}>
                  {label}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ds-text-1)", fontStyle: "italic" }}>
                &ldquo;{text}&rdquo;
              </p>
            </div>
          );
        })}

        {/* Price anchor */}
        {negotiationScripts.priceAnchor && (
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--ds-divider)" }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.20)",
                color: "#ef4444",
              }}>
              🎯 {negotiationScripts.priceAnchor}
            </span>
          </div>
        )}

        {/* Key talking points */}
        {negotiationScripts.keyPoints.length > 0 && (
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--ds-divider)" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2.5" style={{ color: "var(--ds-text-4)" }}>
              Key talking points
            </p>
            <ul className="space-y-1.5">
              {negotiationScripts.keyPoints.map((pt, i) => (
                <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--ds-text-2)" }}>
                  <div className="w-1 h-1 rounded-full flex-shrink-0 bg-indigo-400"/>
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tip line */}
        <p className="text-xs pt-4" style={{ color: "var(--ds-text-4)", borderTop: "1px solid var(--ds-divider)" }}>
          {tipsForVerdict(verdict, confidenceLevel)}
        </p>

        {/* Context note for low/medium confidence */}
        {negotiationScripts.contextNote && (
          <p className="text-[10px]" style={{ color: "var(--ds-text-4)" }}>
            ⚠ {negotiationScripts.contextNote}
          </p>
        )}
      </div>
    </div>
  );
}
