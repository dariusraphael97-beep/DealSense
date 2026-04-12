"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence, useInView } from "framer-motion";
import type { AnalysisResult } from "@/lib/types";
import Link from "next/link";
import dynamic from "next/dynamic";
const DepreciationChart = dynamic(() => import("@/components/ui/depreciation-chart").then(m => m.DepreciationChart), { ssr: false });
import { UserNav } from "@/components/ui/user-nav";
import { Logo } from "@/components/ui/logo";
import { USMapPin } from "@/components/ui/us-map-pin";

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };

function FadeSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "show" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

/* ── Icons ── */
function IconCopy() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}
function IconCheckLg() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconPrint() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
}
function IconTrendUp() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
function IconTrendDown() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
}
function IconShield() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function IconGauge() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v6l4 2"/></svg>;
}
function IconShare() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
}

/* ── Loan calculator ── */
function calcMonthly(price: number, apr: number, downPct: number, termMonths: number): number {
  const principal = price * (1 - downPct / 100);
  const monthlyRate = apr / 100 / 12;
  if (monthlyRate === 0) return Math.round(principal / termMonths);
  return Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)
  );
}

function LoanCalculator({ askingPrice, initialApr, initialDownPct, initialTerm }: {
  askingPrice: number; initialApr: number; initialDownPct: number; initialTerm: number;
}) {
  const [apr, setApr] = useState(initialApr);
  const [downPct, setDownPct] = useState(initialDownPct);
  const [term, setTerm] = useState(initialTerm);

  const downAmount = Math.round(askingPrice * downPct / 100);
  const financed = askingPrice - downAmount;
  const monthly = calcMonthly(askingPrice, apr, downPct, term);
  const totalPaid = monthly * term + downAmount;
  const totalInterest = totalPaid - askingPrice;

  const sliderCls = "w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(99,102,241,0.5)]";

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] mb-0.5" style={{ color: "var(--ds-text-4)" }}>Loan Calculator</p>
          <p className="text-xs" style={{ color: "var(--ds-text-4)" }}>Adjust to match your financing</p>
        </div>
        <div className="text-right">
          <p className="font-heading text-3xl font-extrabold" style={{ color: "var(--ds-text-1)" }}>
            ${monthly.toLocaleString()}<span className="text-base font-medium" style={{ color: "var(--ds-text-4)" }}>/mo</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-4)" }}>estimated payment</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-medium" style={{ color: "var(--ds-text-2)" }}>APR</label>
            <span className="font-mono text-xs font-semibold text-indigo-500">{apr.toFixed(1)}%</span>
          </div>
          <input type="range" min={1} max={20} step={0.1} value={apr}
            onChange={(e) => setApr(parseFloat(e.target.value))}
            aria-label={`APR: ${apr.toFixed(1)}%`}
            aria-valuemin={1} aria-valuemax={20} aria-valuenow={apr}
            aria-valuetext={`${apr.toFixed(1)} percent`}
            className={sliderCls}
            style={{ background: `linear-gradient(to right, #6366f1 ${(apr - 1) / 19 * 100}%, var(--ds-divider) ${(apr - 1) / 19 * 100}%)` }} />
          <div className="flex justify-between text-xs mt-1" style={{ color: "var(--ds-text-4)" }}><span>1%</span><span>20%</span></div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-medium" style={{ color: "var(--ds-text-2)" }}>Down payment</label>
            <span className="font-mono text-xs font-semibold text-indigo-500">{downPct}% · ${downAmount.toLocaleString()}</span>
          </div>
          <input type="range" min={0} max={60} step={1} value={downPct}
            onChange={(e) => setDownPct(parseInt(e.target.value))}
            aria-label={`Down payment: ${downPct}%, $${downAmount.toLocaleString()}`}
            aria-valuemin={0} aria-valuemax={60} aria-valuenow={downPct}
            aria-valuetext={`${downPct} percent, ${downAmount.toLocaleString()} dollars`}
            className={sliderCls}
            style={{ background: `linear-gradient(to right, #6366f1 ${downPct / 60 * 100}%, var(--ds-divider) ${downPct / 60 * 100}%)` }} />
          <div className="flex justify-between text-xs mt-1" style={{ color: "var(--ds-text-4)" }}><span>$0</span><span>${Math.round(askingPrice * 0.6).toLocaleString()}</span></div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-medium" style={{ color: "var(--ds-text-2)" }}>Loan term</label>
            <span className="font-mono text-xs font-semibold text-indigo-500">{term} months</span>
          </div>
          <div className="flex rounded-xl overflow-hidden" role="group" aria-label="Loan term in months" style={{ border: "1px solid var(--ds-input-border)", background: "var(--ds-badge-bg)" }}>
            {[24, 36, 48, 60, 72, 84].map((t) => (
              <button key={t} onClick={() => setTerm(t)}
                aria-pressed={t === term}
                aria-label={`${t} months`}
                className="flex-1 py-2 text-xs font-medium transition-all"
                style={t === term
                  ? { background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", boxShadow: "0 0 12px rgba(99,102,241,0.3)" }
                  : { color: "var(--ds-text-3)", background: "transparent" }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl p-3"
        style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)" }}>
        {[
          { label: "Financed", value: `$${financed.toLocaleString()}` },
          { label: "Total interest", value: `$${totalInterest.toLocaleString()}` },
          { label: "Total cost", value: `$${totalPaid.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-xs mb-0.5" style={{ color: "var(--ds-text-4)" }}>{s.label}</p>
            <p className="text-sm font-semibold font-mono" style={{ color: "var(--ds-text-2)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <p className="text-xs mt-3" style={{ color: "var(--ds-text-4)" }}>
        Estimate only. Actual rate depends on credit score and lender.
      </p>
    </div>
  );
}

/* ── Animated score ring ── */
function ScoreRing({ score, size = 180 }: { score: number; size?: number }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showDot, setShowDot] = useState(false);
  const strokeW = 12;
  const r = size * 0.38;
  const cx = size / 2;
  const startAngle = 215;
  const sweepAngle = 290;

  // Animate the number counting up
  useEffect(() => {
    const delay = setTimeout(() => setRevealed(true), 400);
    const dotTimer = setTimeout(() => setShowDot(true), 2000);
    let raf: number;
    let start: number | null = null;
    const duration = 1600;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      setDisplayScore(Math.round(ease(t) * score));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const kickoff = setTimeout(() => { raf = requestAnimationFrame(tick); }, 400);
    return () => { clearTimeout(delay); clearTimeout(dotTimer); clearTimeout(kickoff); cancelAnimationFrame(raf); };
  }, [score]);

  const color = score >= 72 ? "#34d399" : score >= 48 ? "#fbbf24" : "#f87171";
  const colorEnd = score >= 72 ? "#6ee7b7" : score >= 48 ? "#fde047" : "#fca5a5";
  const glowColor = score >= 72 ? "rgba(52,211,153,0.25)" : score >= 48 ? "rgba(251,191,36,0.25)" : "rgba(248,113,113,0.25)";

  function polar(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cx + r * Math.sin(rad) };
  }
  function arcPath(start: number, sweep: number) {
    const end = start + sweep;
    const s = polar(start);
    const e = polar(end);
    const large = sweep > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const fullPath = arcPath(startAngle, sweepAngle);
  const arcLength = (sweepAngle / 360) * 2 * Math.PI * r;
  const progressRatio = score / 100;
  const visibleLength = arcLength * progressRatio;
  const dashOffset = revealed ? arcLength - visibleLength : arcLength;

  // Dot always at final position — only opacity fades in after arc animation
  const tipPos = polar(startAngle + sweepAngle * progressRatio);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-full pointer-events-none" style={{
        background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
        opacity: revealed ? 1 : 0,
        transition: "opacity 1.2s ease-out 0.3s",
        transform: "scale(1.2)",
      }}/>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-[1]">
        <defs>
          <linearGradient id="scoreGradP" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color}/>
            <stop offset="100%" stopColor={colorEnd}/>
          </linearGradient>
        </defs>
        <path d={fullPath} fill="none" stroke="currentColor" strokeWidth={strokeW} strokeLinecap="round"
          className="text-slate-200 dark:text-white/[0.06]"/>
        <path
          d={fullPath} fill="none" stroke="url(#scoreGradP)" strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 1.6s cubic-bezier(0.22, 1, 0.36, 1)",
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        />
        {showDot && (
          <circle cx={tipPos.x} cy={tipPos.y} r={strokeW / 2 + 1} fill={color}
            style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-[2]">
        <span className="font-heading font-extrabold leading-none tabular-nums" style={{ fontSize: size * 0.26, color: "var(--ds-text-1)" }}>
          {displayScore}
        </span>
        <span className="text-[11px] font-medium mt-1" style={{ color: "var(--ds-text-4)" }}>out of 100</span>
      </div>
    </div>
  );
}

function DeltaPill({ delta, pct }: { delta: number; pct: number }) {
  const abs = Math.abs(delta).toLocaleString();
  const absPct = Math.abs(pct * 100).toFixed(1);
  if (delta > 0) return (
    <div className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold font-mono"
      style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.22)", color: "#f87171" }}>
      <IconTrendUp />${abs} over · +{absPct}%
    </div>
  );
  if (delta < 0) return (
    <div className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold font-mono"
      style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.22)", color: "#34d399" }}>
      <IconTrendDown />${abs} under · −{absPct}%
    </div>
  );
  return (
    <div className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold font-mono"
      style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: "var(--ds-text-2)" }}>
      At market
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: "var(--ds-text-4)" }}>
      {children}
    </p>
  );
}

/* ── Main page ── */
export default function PersistedResultPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [result, setResult] = useState<(AnalysisResult & { savedId: string; createdAt: string; isOwner: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  // PART 3: Confidence explanation dropdown
  const [confOpen, setConfOpen] = useState(false);
  const confRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (confRef.current && !confRef.current.contains(e.target as Node)) setConfOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // PART 1: Feedback system
  const [feedbackState, setFeedbackState] = useState<"idle" | "negative" | "submitted">("idle");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);

  const submitFeedback = useCallback(async (helpful: boolean, comment?: string) => {
    if (!result) return;
    setFeedbackSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          analysisId: result.savedId,
          vin: result.input.vin,
          dealScore: result.score,
          verdict: result.verdict,
          confidenceLevel: result.confidenceLevel,
          helpful,
          comment: comment || undefined,
        }),
      });
    } catch { /* non-fatal */ }
    setFeedbackSending(false);
    setFeedbackState("submitted");
  }, [result]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/results/${id}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Analysis not found");
        } else {
          const data = await res.json();
          setResult(data);
        }
      } catch {
        setError("Failed to load analysis");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers / insecure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;left:-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    }
  }, []);

  const handleCopyLink = useCallback(async () => {
    await copyToClipboard(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [copyToClipboard]);

  const handleCopyScript = useCallback(async (text: string) => {
    await copyToClipboard(text);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 2500);
  }, [copyToClipboard]);

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ds-bg)" }}>
      <div className="flex items-center gap-3 text-sm" style={{ color: "var(--ds-text-3)" }}>
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Loading analysis…
      </div>
    </div>
  );

  /* ── Error ── */
  if (error || !result) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ds-bg)" }}>
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)" }}>
          <span className="text-2xl">🔍</span>
        </div>
        <p className="font-semibold" style={{ color: "var(--ds-text-1)" }}>
          {error || "Analysis not found."}
        </p>
        <p className="text-sm" style={{ color: "var(--ds-text-3)" }}>This link may be invalid or the analysis was removed.</p>
        <Link href="/analyze"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
          Analyze a car
        </Link>
      </div>
    </div>
  );

  const { input, score, verdict, fairValueRange, priceDelta, priceDeltaPct,
          monthlyPayment, reasons, aiSummary, negotiationScript, priceSource, createdAt,
          confidenceLevel, confidenceScore, confidenceBreakdown, vehicleCategory,
          optionDataStatus, valuationWarnings, keyInsights } = result;

  const isVinVerified = typeof priceSource === "string" && priceSource.toLowerCase().includes("vinaudit");

  // Confidence badge styling
  const confidenceColors = {
    High:   { bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.20)", text: "#34d399", icon: "●" },
    Medium: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.20)", text: "#fbbf24", icon: "●" },
    Low:    { bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.20)", text: "#f87171", icon: "●" },
  };
  const confStyle = confidenceColors[confidenceLevel as keyof typeof confidenceColors] ?? confidenceColors.Medium;
  // Avoid duplication when trim starts with model name (e.g. model="M3" trim="M3 Competition")
  const trimSuffix = input.trim
    ? input.trim.toLowerCase().startsWith(input.model.toLowerCase()) ? ` ${input.trim}` : ` ${input.model} ${input.trim}`
    : ` ${input.model}`;
  const vehicleLabel = `${input.year} ${input.make}${trimSuffix}`;

  const scoreColor = score >= 72 ? "#34d399" : score >= 48 ? "#fbbf24" : "#f87171";
  const scoreColorEnd = score >= 72 ? "#6ee7b7" : score >= 48 ? "#fde047" : "#fca5a5";

  const barPct = Math.min(100, Math.max(2, 50 + priceDeltaPct * -150));
  const barColor = priceDelta <= 0 ? "#34d399" : priceDeltaPct < 0.12 ? "#fbbf24" : "#f87171";

  return (
    <div className="min-h-screen" style={{ background: "var(--ds-bg)" }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20"
        style={{ background: "var(--ds-nav-bg)", borderBottom: "1px solid var(--ds-nav-border)", backdropFilter: "blur(20px)" }}>
        <div className="mx-auto max-w-4xl px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="hover:opacity-80 transition-opacity flex-shrink-0">
              <Logo variant="full" size={26} />
            </Link>
            <span style={{ color: "var(--ds-text-4)" }} className="hidden sm:inline">/</span>
            <span className="text-sm truncate hidden sm:inline" style={{ color: "var(--ds-text-3)" }}>{vehicleLabel}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share / copy link */}
            <button
              onClick={handleCopyLink}
              aria-label={copied ? "Link copied to clipboard" : "Copy share link"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: copied ? "rgba(52,211,153,0.10)" : "var(--ds-badge-bg)",
                border: copied ? "1px solid rgba(52,211,153,0.25)" : "1px solid var(--ds-badge-border)",
                color: copied ? "#34d399" : "var(--ds-text-2)",
              }}>
              {copied ? <><IconCheckLg />Copied!</> : <><IconShare />Share</>}
            </button>
            <button
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: "var(--ds-text-2)" }}>
              <IconPrint />Print
            </button>
            <Link href="/analyze"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 0 16px rgba(99,102,241,0.3)" }}>
              Check another deal
            </Link>
            <UserNav />
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-5 pb-20">

        {/* ── Shared banner ── */}
        {!result.isOwner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <div className="flex items-center gap-3">
              <span className="text-indigo-500 text-sm">🔗</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--ds-text-1)" }}>Shared analysis</p>
                <p className="text-xs" style={{ color: "var(--ds-text-4)" }}>
                  Analyzed on {new Date(createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
            <Link href="/analyze"
              className="text-xs font-semibold px-4 py-2 rounded-xl text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
              Check your own car →
            </Link>
          </motion.div>
        )}

        {/* ── Score hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="rounded-3xl"
          style={{
            background: "var(--ds-card-bg)",
            border: "1px solid var(--ds-card-border)",
            boxShadow: "var(--ds-card-shadow)",
          }}
        >
          {/* Score accent stripe */}
          <div className="rounded-t-3xl" style={{ height: 3, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColorEnd})` }} />

          {/* Vehicle header */}
          <div className="px-6 sm:px-8 pt-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-heading text-xl font-bold" style={{ color: "var(--ds-text-1)" }}>{vehicleLabel}</p>
                <p className="text-sm font-mono mt-1 flex items-center gap-1.5" style={{ color: "var(--ds-text-3)" }}>
                  {input.mileage.toLocaleString()} mi · ZIP {input.zipCode || "—"}
                  {input.vin ? ` · VIN …${input.vin.slice(-6)}` : ""}
                  {input.zipCode && <USMapPin zipCode={input.zipCode} />}
                </p>
              </div>
              <DeltaPill delta={priceDelta} pct={priceDeltaPct} />
            </div>
          </div>

          {/* Divider */}
          <div className="mx-6 sm:mx-8 my-5" style={{ height: 1, background: "var(--ds-divider)" }} />

          {/* Score + verdict + summary */}
          <div className="px-6 sm:px-8 pb-8 flex flex-col sm:flex-row items-center gap-8 sm:gap-10">
            <div className="flex-shrink-0">
              <ScoreRing score={score} size={180} />
            </div>

            <div className="flex-1 min-w-0 space-y-4 text-center sm:text-left">
              {/* Verdict */}
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <div className="w-1 h-10 rounded-full" style={{ background: scoreColor }} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: "var(--ds-text-4)" }}>Verdict</p>
                  <p className="font-heading text-3xl font-extrabold tracking-tight leading-none" style={{ color: scoreColor }}>{verdict}</p>
                </div>
              </div>

              {/* AI Summary */}
              <p className="text-[15px] leading-relaxed" style={{ color: "var(--ds-text-2)", maxWidth: 460 }}>
                {aiSummary}
              </p>

              {/* Badges — confidence + data source */}
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start pt-1">
                {/* Confidence badge — clickable with explanation dropdown (PART 3) */}
                <div className="relative" ref={confRef}>
                  <button
                    onClick={() => setConfOpen(o => !o)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:brightness-110 cursor-pointer"
                    style={{ background: confStyle.bg, border: `1px solid ${confStyle.border}`, color: confStyle.text }}>
                    <span style={{ fontSize: 8 }}>{confStyle.icon}</span>
                    {confidenceLevel ?? "Medium"} confidence
                    {confidenceScore != null && <span className="opacity-60 ml-0.5">({confidenceScore})</span>}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className={`w-3 h-3 transition-transform duration-200 ${confOpen ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  <AnimatePresence>
                    {confOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-2 w-72 rounded-xl p-4 z-50"
                        style={{
                          background: "var(--ds-dropdown-bg, #fff)",
                          border: "1px solid var(--ds-card-border)",
                          boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
                        }}>
                        <p className="text-xs font-semibold mb-2.5" style={{ color: "var(--ds-text-1)" }}>How confidence is calculated</p>
                        <ul className="space-y-1.5">
                          {[
                            "VIN decode quality and completeness",
                            "Availability of real market transaction data",
                            "How specific the vehicle configuration is",
                            "Whether option-level details are present",
                            "Vehicle category (luxury/performance need more data)",
                            "Regional pricing data availability",
                          ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--ds-text-3)" }}>
                              <span className="mt-1 w-1 h-1 rounded-full flex-shrink-0" style={{ background: "var(--ds-text-4)" }} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {isVinVerified ? (
                  <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.20)", color: "#34d399" }}>
                    <IconShield />VIN-verified data
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: "var(--ds-text-3)" }}>
                    <IconShield />Estimated analysis
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: "var(--ds-text-3)" }}>
                  <IconGauge />{priceSource ?? "Market analysis"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>


        {/* ── Two-column: Price + Loan ── */}
        <FadeSection className="grid sm:grid-cols-2 gap-5">

          {/* Price analysis */}
          <motion.div variants={fadeUp} className="rounded-2xl p-6"
            style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
            <SectionLabel>Price Analysis</SectionLabel>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--ds-text-4)" }}>Asking price</p>
                <p className="font-heading text-2xl font-extrabold" style={{ color: "var(--ds-text-1)" }}>
                  ${input.askingPrice.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--ds-text-4)" }}>Fair value mid</p>
                <p className="font-heading text-2xl font-extrabold" style={{ color: "var(--ds-text-1)" }}>
                  ${fairValueRange.midpoint.toLocaleString()}
                </p>
                <p className="text-xs font-mono mt-0.5" style={{ color: "var(--ds-text-4)" }}>
                  ${fairValueRange.low.toLocaleString()}–${fairValueRange.high.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--ds-divider)" }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                  style={{ background: barColor, boxShadow: `0 0 10px ${barColor}60` }}
                />
              </div>
              <div className="flex justify-between text-xs font-medium" style={{ color: "var(--ds-text-4)" }}>
                <span>Below market</span><span>At market</span><span>Above market</span>
              </div>
            </div>

            {priceDelta !== 0 && (
              <div className="mt-4 rounded-xl px-4 py-3"
                style={{
                  background: priceDelta < 0 ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)",
                  border: `1px solid ${priceDelta < 0 ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)"}`,
                }}>
                <p className="text-sm font-semibold" style={{ color: priceDelta < 0 ? "#34d399" : "#f87171" }}>
                  {priceDelta < 0
                    ? `$${Math.abs(priceDelta).toLocaleString()} below estimated fair value`
                    : `$${priceDelta.toLocaleString()} above estimated fair value`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-3)" }}>
                  {priceDelta < 0
                    ? "This appears competitively priced based on available data."
                    : "Consider negotiating or verifying configuration details."}
                </p>
              </div>
            )}
          </motion.div>

          {/* Loan calculator */}
          <motion.div variants={fadeUp} className="rounded-2xl p-6"
            style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
            <LoanCalculator
              askingPrice={input.askingPrice}
              initialApr={input.loanApr ?? 7.5}
              initialDownPct={input.loanDownPct ?? 10}
              initialTerm={input.loanTermMonths ?? 60} />
          </motion.div>
        </FadeSection>

        {/* ── Valuation Basis (PART 4.2) ── */}
        {confidenceBreakdown && (
          <FadeSection>
            <motion.div variants={fadeUp} className="rounded-2xl p-6"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <SectionLabel>Valuation Basis</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "VIN decoded", value: confidenceBreakdown.vinDecoded ? "Yes" : "No",
                    ok: confidenceBreakdown.vinDecoded },
                  { label: "Trim verified", value: confidenceBreakdown.trimVerified ? "Yes" : "No",
                    ok: confidenceBreakdown.trimVerified },
                  { label: "Option detail", value: (optionDataStatus ?? "missing").replace("_", " "),
                    ok: optionDataStatus === "complete" },
                  { label: "Market data", value: confidenceBreakdown.marketDataSpecificity?.replace("_", " ") ?? "statistical",
                    ok: confidenceBreakdown.marketDataSpecificity === "transaction" || confidenceBreakdown.marketDataSpecificity === "listings" },
                  { label: "Region data", value: confidenceBreakdown.regionDataAvailable ? "Available" : "Limited",
                    ok: confidenceBreakdown.regionDataAvailable },
                  { label: "Vehicle category", value: vehicleCategory ?? "mainstream",
                    ok: true },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl px-3 py-2.5"
                    style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)" }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--ds-text-4)" }}>{item.label}</p>
                    <p className="text-xs font-semibold capitalize flex items-center gap-1.5"
                      style={{ color: item.ok ? "var(--ds-text-2)" : "var(--ds-text-3)" }}>
                      <span style={{ fontSize: 7, color: item.ok ? "#34d399" : "#f87171" }}>●</span>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </FadeSection>
        )}

        {/* ── Warnings (PART 4.3) — only shown when relevant ── */}
        {valuationWarnings && valuationWarnings.length > 0 && (
          <FadeSection>
            <motion.div variants={fadeUp} className="rounded-2xl px-6 py-5"
              style={{
                background: "rgba(251,191,36,0.05)",
                border: "1px solid rgba(251,191,36,0.18)",
              }}>
              <div className="flex items-start gap-3">
                <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
                <div className="space-y-1.5">
                  {valuationWarnings.map((w, i) => (
                    <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--ds-text-2)" }}>{w}</p>
                  ))}
                </div>
              </div>
            </motion.div>
          </FadeSection>
        )}

        {/* ── Key insights ── */}
        {reasons && reasons.length > 0 && (
          <FadeSection>
            <motion.div variants={fadeUp} className="rounded-2xl p-6"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <SectionLabel>Key Insights</SectionLabel>
              <ul className="space-y-3.5">
                {reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-bold text-indigo-500 dark:text-indigo-400 mt-0.5"
                      style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.20)" }}>
                      {i + 1}
                    </div>
                    <p className="text-sm leading-relaxed pt-0.5" style={{ color: "var(--ds-text-2)" }}>{r}</p>
                  </li>
                ))}
              </ul>
            </motion.div>
          </FadeSection>
        )}

        {/* ── Negotiation / closing script ── */}
        {negotiationScript && (
          <FadeSection>
            <motion.div variants={fadeUp} className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(99,102,241,0.25)", boxShadow: "0 0 40px rgba(99,102,241,0.08)" }}>
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ background: "rgba(99,102,241,0.08)", borderBottom: "1px solid rgba(99,102,241,0.15)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"/>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">
                    {verdict === "Buy" ? "Your Closing Script"
                      : verdict === "Walk Away" ? "Your Walk-Away Script"
                      : verdict === "Needs Option Review" ? "Your Option Inquiry Script"
                      : verdict === "Possibly Overpriced" ? "Your Inquiry Script"
                      : verdict === "Fair Deal" ? "Your Closing Script"
                      : "Your Negotiation Script"}
                  </p>
                </div>
                <button
                  onClick={() => handleCopyScript(negotiationScript)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: scriptCopied ? "rgba(52,211,153,0.12)" : "rgba(99,102,241,0.10)",
                    border: scriptCopied ? "1px solid rgba(52,211,153,0.30)" : "1px solid rgba(99,102,241,0.22)",
                    color: scriptCopied ? "#34d399" : "#818cf8",
                  }}>
                  {scriptCopied ? <><IconCheckLg />Copied!</> : <><IconCopy />Copy script</>}
                </button>
              </div>
              <div className="px-6 py-5" style={{ background: "var(--ds-card-bg)" }}>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ds-text-1)", fontStyle: "italic", lineHeight: 1.85 }}>
                  &ldquo;{negotiationScript}&rdquo;
                </p>
                <p className="text-xs mt-4 pt-4" style={{ color: "var(--ds-text-4)", borderTop: "1px solid var(--ds-divider)" }}>
                  {verdict === "Buy" || verdict === "Fair Deal"
                    ? "💡 This car is priced well — focus on confirming out-the-door fees, not pushing the price lower."
                    : verdict === "Walk Away"
                    ? "💡 Be prepared to actually walk. Sellers often come back with a lower number when they see you mean it."
                    : verdict === "Needs Option Review"
                    ? "💡 Ask for a full option/package list before discussing price. Configuration can shift the fair value significantly."
                    : verdict === "Possibly Overpriced"
                    ? "💡 This may be overpriced, but verify the full configuration first — some options can justify a premium."
                    : "💡 Be ready to show your data. Sellers respond better when you can cite comparable listings."}
                </p>
              </div>
            </motion.div>
          </FadeSection>
        )}

        {/* ── Depreciation chart ── */}
        <FadeSection>
          <motion.div variants={fadeUp} className="rounded-2xl p-6"
            style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
            <SectionLabel>Value Over Time</SectionLabel>
            <DepreciationChart
              purchasePrice={input.askingPrice}
              currentMarketValue={fairValueRange.midpoint}
              year={input.year}
              make={input.make}
              model={input.model}
              mileage={input.mileage}
            />
          </motion.div>
        </FadeSection>

        {/* ── CTA (non-owners only) ── */}
        {!result.isOwner && (
          <FadeSection>
            <motion.div variants={fadeUp} className="rounded-3xl p-8 text-center"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)" }}>
              <p className="text-2xl mb-2">🚗</p>
              <p className="font-heading text-xl font-bold mb-2" style={{ color: "var(--ds-text-1)" }}>
                Don&apos;t overpay on your next car.
              </p>
              <p className="text-sm mb-6" style={{ color: "var(--ds-text-3)", maxWidth: 360, margin: "0 auto 24px" }}>
                Paste a VIN, get a Deal Score, fair value range, and a negotiation script — in under a minute. Free during early access.
              </p>
              <Link href="/analyze"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 0 20px rgba(99,102,241,0.35)" }}>
                Get my Deal Score →
              </Link>
            </motion.div>
          </FadeSection>
        )}

        {/* ── Feedback (PART 1) ── */}
        {result.isOwner && (
          <FadeSection>
            <motion.div variants={fadeUp} className="rounded-2xl p-6 text-center"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              {feedbackState === "submitted" ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base">✓</span>
                  <p className="text-sm font-medium" style={{ color: "var(--ds-text-2)" }}>Thanks for your feedback!</p>
                </div>
              ) : feedbackState === "negative" ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium" style={{ color: "var(--ds-text-2)" }}>What was off or missing?</p>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="e.g. Price seemed too low, missing option data..."
                    rows={2}
                    className="w-full max-w-md mx-auto rounded-xl border px-4 py-2.5 text-sm resize-none transition-all"
                    style={{
                      background: "var(--ds-input-bg)",
                      border: "1px solid var(--ds-input-border)",
                      color: "var(--ds-text-1)",
                    }}
                  />
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => submitFeedback(false, feedbackComment)}
                      disabled={feedbackSending}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                      {feedbackSending ? "Sending…" : "Submit"}
                    </button>
                    <button
                      onClick={() => { setFeedbackState("idle"); setFeedbackComment(""); }}
                      className="px-4 py-2 rounded-xl text-xs font-medium"
                      style={{ color: "var(--ds-text-3)" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-sm font-medium" style={{ color: "var(--ds-text-2)" }}>Was this analysis helpful?</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => submitFeedback(true)}
                      disabled={feedbackSending}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
                      style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.20)", color: "#34d399" }}>
                      👍 Yes
                    </button>
                    <button
                      onClick={() => setFeedbackState("negative")}
                      disabled={feedbackSending}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 disabled:opacity-50"
                      style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)", color: "#f87171" }}>
                      👎 No
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </FadeSection>
        )}

        {/* ── Disclaimer (PART 8) ── */}
        <div className="text-center px-4 pt-2 pb-4">
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--ds-text-4)", maxWidth: 520, margin: "0 auto" }}>
            Estimates are based on available market data and vehicle configuration. Actual value may vary.
            {(vehicleCategory === "performance" || vehicleCategory === "exotic" || vehicleCategory === "luxury") &&
              " Value may vary significantly based on factory options and packages."}
          </p>
        </div>

      </div>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          nav, button { display: none !important; }
          body { background: white !important; }
          * { color: black !important; border-color: #ccc !important; }
          .rounded-3xl, .rounded-2xl { border: 1px solid #ddd !important; margin-bottom: 16px !important; }
        }
      `}</style>
    </div>
  );
}
