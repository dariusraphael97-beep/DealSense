"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { CarInput, VinDecodeResult } from "@/lib/types";
import { ALL_MAKES, getModels, getTrims } from "@/lib/carData";
import Link from "next/link";
import { UserNav } from "@/components/ui/user-nav";
import { Logo } from "@/components/ui/logo";
import { useSettings } from "@/contexts/settings-context";
import { useCredits } from "@/contexts/credits-context";
import { PaywallModal } from "@/components/ui/paywall-modal";
import { RecentlyViewed } from "@/components/ui/recently-viewed";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

const defaultForm: CarInput = {
  year: CURRENT_YEAR - 3, make: "", model: "", trim: "",
  mileage: 0, askingPrice: 0, zipCode: "", vin: "",
};

/* ── Icons ── */
function IconArrow() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
}
function IconVin() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
}
function IconCheck() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12" /></svg>;
}
function IconSpinner() {
  return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>;
}
function IconAlert() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}
function IconChevron({ open }: { open?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 pointer-events-none flex-shrink-0 transition-transform duration-200" style={{ color: "var(--ds-text-4)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}><polyline points="6 9 12 15 18 9" /></svg>;
}
function IconX() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function IconLink() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
}
function IconShield() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function IconMapPin() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function IconCar() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
}
function IconDoor() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"><path d="M3 3h18v18H3z"/><circle cx="15" cy="12" r="1"/></svg>;
}

/* ── Shared input styles ── */
const inputCls = "w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-150 disabled:opacity-40";
const iStyle = { background: "var(--ds-input-bg)", border: "1px solid var(--ds-input-border)", color: "var(--ds-text-1)" } as const;
const iFocus = { background: "var(--ds-input-bg)", border: "1px solid var(--ds-input-focus)", boxShadow: "0 0 0 3px var(--ds-input-ring)", color: "var(--ds-text-1)" } as const;
const glassCard = { background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" } as const;

/* ── Combobox ── */
interface ComboboxProps {
  value: string; onChange: (v: string) => void; options: string[];
  placeholder: string; disabled?: boolean; id?: string;
}
function Combobox({ value, onChange, options, placeholder, disabled = false, id }: ComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const filtered = query.trim() ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())) : options;
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setQuery(""); setFocused(false); }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[highlighted] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);
  function select(opt: string) { onChange(opt); setQuery(""); setOpen(false); setHighlighted(0); }
  function handleKey(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { setOpen(true); setHighlighted(0); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]); }
    if (e.key === "Escape")    { setOpen(false); setQuery(""); }
  }
  const dropStyle = { background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "0 8px 32px var(--ds-shadow-heavy)", backdropFilter: "blur(16px)" };
  return (
    <div ref={containerRef} className="relative">
      <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
        <input ref={inputRef} id={id} type="text"
          value={open ? query : value}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlighted(0); }}
          onFocus={() => { setOpen(true); setHighlighted(0); setFocused(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKey}
          placeholder={disabled ? "Select make first" : placeholder}
          disabled={disabled} autoComplete="off"
          className={inputCls + " pr-16 placeholder:opacity-50"}
          style={focused ? iFocus : iStyle}
          aria-expanded={open} aria-haspopup="listbox" role="combobox"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(""); setQuery(""); inputRef.current?.focus(); }}
              className="p-0.5 rounded transition-colors cursor-pointer"
              style={{ color: "var(--ds-text-4)" }}><IconX /></button>
          )}
          <IconChevron />
        </div>
      </div>
      {open && !disabled && filtered.length > 0 && (
        <ul ref={listRef} role="listbox"
          className="absolute z-50 mt-1.5 w-full max-h-56 overflow-y-auto rounded-xl py-1.5"
          style={dropStyle}>
          {filtered.map((opt, i) => (
            <li key={opt} role="option" aria-selected={opt === value}
              onMouseDown={(e) => { e.preventDefault(); select(opt); }}
              onMouseEnter={() => setHighlighted(i)}
              className="flex items-center justify-between px-3.5 py-2.5 text-sm cursor-pointer select-none transition-colors"
              style={{ color: i === highlighted || opt === value ? "var(--ds-text-1)" : "var(--ds-text-2)", fontWeight: opt === value ? 600 : undefined, background: i === highlighted ? "var(--ds-gold-bg)" : undefined }}>
              {opt}
              {opt === value && <span style={{ color: "var(--ds-gold)" }} className="flex-shrink-0"><IconCheck /></span>}
            </li>
          ))}
        </ul>
      )}
      {open && !disabled && filtered.length === 0 && query && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl px-4 py-3 text-sm" style={{ ...dropStyle, color: "var(--ds-text-3)" }}>
          No matches for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}

function Field({ label, required, hint, htmlFor, children }: { label: string; required?: boolean; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ds-text-3)" }}>
        {label}{required && <span className="text-red-400/80 ml-0.5 normal-case font-normal">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs" style={{ color: "var(--ds-text-4)" }}>{hint}</p>}
    </div>
  );
}

/* ── "How to Find Your VIN" collapsible ── */
function HowToFindVin() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--ds-input-border)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors text-left"
        style={{ background: "var(--ds-badge-bg)", color: "var(--ds-text-3)" }}
      >
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" style={{ color: "var(--ds-text-3)" }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          How to find your VIN
        </span>
        <IconChevron open={open} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 py-3 space-y-2.5" style={{ background: "var(--ds-input-bg)", borderTop: "1px solid var(--ds-input-border)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--ds-text-2)" }}>
                The VIN is a 17-character code unique to every vehicle.
              </p>
              <div className="space-y-2">
                {[
                  { icon: <IconLink />, text: 'On car listing sites like CarGurus, AutoTrader, and dealer websites — look for a field labeled "VIN" in the listing details.' },
                  { icon: <IconCar />, text: "On the car itself — visible through the windshield on the driver-side dashboard." },
                  { icon: <IconDoor />, text: "Inside the driver-side door frame on a white sticker." },
                  { icon: <IconMapPin />, text: "In the title, registration, or insurance documents." },
                ].map(({ icon, text }, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span style={{ color: "var(--ds-text-4)", marginTop: "1px" }}>{icon}</span>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--ds-text-3)" }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Loading overlay ── */
const LOADING_STEPS = [
  "Verifying VIN with transaction database…",
  "Calculating real market value…",
  "Scoring the deal…",
  "Writing your negotiation script…",
];

const CIRCUMFERENCE = 2 * Math.PI * 26; // ~163.36

function LoadingOverlay() {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Smooth progress: ramp up within each step, pause briefly, then jump to next
    const stepDurations = [1000, 1200, 1000, 800]; // ms per step
    let cancelled = false;
    let elapsed = 0;

    const tick = () => {
      if (cancelled) return;
      elapsed += 16; // ~60fps
      const totalDuration = stepDurations.reduce((a, b) => a + b, 0);
      const pct = Math.min(elapsed / totalDuration, 1);

      // Ease-out curve for overall progress
      const eased = 1 - Math.pow(1 - pct, 2.5);
      setProgress(eased * 100);

      // Determine which step we're on
      let cumulative = 0;
      for (let i = 0; i < stepDurations.length; i++) {
        cumulative += stepDurations[i];
        if (elapsed < cumulative) { setStep(i); break; }
        if (i === stepDurations.length - 1) setStep(i);
      }

      if (pct < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { cancelled = true; };
  }, []);

  const strokeOffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--ds-overlay)", backdropFilter: "blur(12px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl p-8 max-w-sm w-full mx-4 text-center"
        style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow-lg)" }}
      >
        {/* Progress ring */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64" overflow="visible">
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93C5FD"/>
                <stop offset="50%" stopColor="#3B82F6"/>
                <stop offset="100%" stopColor="#1D4ED8"/>
              </linearGradient>
              <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {/* Track */}
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--ds-divider)" strokeWidth="4"/>
            {/* Progress arc — smoothly sweeps around */}
            <motion.circle
              cx="32" cy="32" r="26" fill="none"
              stroke="url(#progressGrad)" strokeWidth="4.5" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              filter="url(#arcGlow)"
              style={{ transition: "stroke-dashoffset 0.08s linear" }}
            />
          </svg>
          {/* Center percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              key={Math.round(progress)}
              className="font-heading text-sm font-bold tabular-nums"
              style={{ color: "var(--ds-text-1)" }}
            >
              {Math.round(progress)}%
            </motion.span>
          </div>
          {/* Glow dot at the tip of the arc */}
          <div className="absolute inset-0" style={{ transform: `rotate(${(progress / 100) * 360}deg)` }}>
            <div
              className="absolute rounded-full"
              style={{
                width: 8, height: 8, top: 2, left: "50%", marginLeft: -4,
                background: "#93C5FD",
                boxShadow: "0 0 12px 3px rgba(59,130,246,0.7)",
                opacity: progress > 2 && progress < 98 ? 1 : 0,
                transition: "opacity 0.3s",
              }}
            />
          </div>
        </div>

        <p className="font-heading text-base font-semibold mb-5" style={{ color: "var(--ds-text-1)" }}>Analyzing your deal</p>

        {/* Step list */}
        <div className="space-y-2.5 text-left">
          {LOADING_STEPS.map((s, i) => {
            const isDone = i < step || (i === step && progress >= 98);
            const isActive = i === step && progress < 98;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12, duration: 0.35 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                  style={{
                    background: isDone ? "var(--ds-success-bg)" : isActive ? "var(--ds-gold-bg)" : "var(--ds-badge-bg)",
                    border: `1px solid ${isDone ? "var(--ds-success-border)" : isActive ? "var(--ds-gold-border)" : "var(--ds-badge-border)"}`,
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                  }}>
                  {isDone ? (
                    <motion.svg
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      viewBox="0 0 24 24" fill="none" stroke="var(--ds-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"
                    ><polyline points="20 6 9 17 4 12"/></motion.svg>
                  ) : isActive ? (
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--ds-gold)" }}/>
                  ) : null}
                </div>
                <span className="text-xs transition-all duration-300"
                  style={{
                    color: isDone ? "var(--ds-success)" : isActive ? "var(--ds-text-1)" : "var(--ds-text-4)",
                    fontWeight: isActive ? 500 : 400,
                  }}>
                  {s}
                </span>
              </motion.div>
            );
          })}
        </div>
        <p className="text-xs mt-5" style={{ color: "var(--ds-text-4)" }}>Takes about 3–5 seconds</p>
      </motion.div>
    </div>
  );
}

function CreditsAddedDetector({ onDetected }: { onDetected: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("credits_added") === "true") onDetected();
  }, [searchParams, onDetected]);
  return null;
}

/* ══════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════ */
export default function AnalyzePage() {
  const router = useRouter();
  const { settings } = useSettings();
  const { credits, isStaff, refresh: refreshCredits } = useCredits();

  const [form, setForm]           = useState<CarInput>(defaultForm);
  const [vinInput, setVinInput]   = useState("");
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError]   = useState("");
  const [vinSuccess, setVinSuccess] = useState(false);

  const [listingUrl, setListingUrl]   = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError]     = useState("");
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkExtracted, setLinkExtracted] = useState<string[]>([]);

  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [creditsBanner, setCreditsBanner] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Show welcome banner for first-time visitors
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("ds_welcome_seen");
    if (!seen) setShowWelcome(true);
  }, []);

  function dismissWelcome() {
    setShowWelcome(false);
    localStorage.setItem("ds_welcome_seen", "1");
  }

  const handleCreditsAdded = useCallback(() => {
    setCreditsBanner(true);
    refreshCredits();
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = setTimeout(() => setCreditsBanner(false), 5000);
  }, [refreshCredits]);

  // Cleanup banner timeout on unmount
  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, []);

  function setField<K extends keyof CarInput>(k: K, v: CarInput[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const modelOptions = form.make ? getModels(form.make).map((m) => m.name) : [];
  const trimOptions  = form.make && form.model ? getTrims(form.make, form.model, form.year) : [];

  function handleMakeChange(make: string)  { setForm((p) => ({ ...p, make, model: "", trim: "" })); }
  function handleModelChange(model: string) { setForm((p) => ({ ...p, model, trim: "" })); }

  // Core decode logic — accepts an explicit VIN string so it can be called
  // after listing-link extraction without waiting for state to settle.
  const decodeVin = useCallback(async (vin: string) => {
    if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim())) { setVinError("VIN must be exactly 17 characters (letters A-H, J-N, P, R-Z and digits)."); return; }
    setVinError(""); setVinSuccess(false); setVinLoading(true);
    try {
      const res = await fetch(`/api/vin?vin=${encodeURIComponent(vin)}`);
      const data: VinDecodeResult = await res.json();
      if (data.error) { setVinError(data.error); return; }
      if (!data.make && !data.model) { setVinError("We couldn't find vehicle data for this VIN. Double-check it or enter details manually below."); return; }
      setVinInput(vin);
      setForm((p) => ({
        ...p, vin,
        year:  data.year  ?? p.year,
        make:  data.make  ?? p.make,
        model: data.model ?? p.model,
        trim:  data.trim  ?? p.trim,
      }));
      setVinSuccess(true);
    } catch { setVinError("Failed to decode VIN. Check your connection."); }
    finally   { setVinLoading(false); }
  }, []);

  const handleVinDecode = useCallback(() => decodeVin(vinInput.trim()), [vinInput, decodeVin]);

  // Auto-decode when the user types exactly 17 chars
  useEffect(() => {
    if (vinInput.trim().length === 17 && !vinSuccess && !vinLoading) {
      decodeVin(vinInput.trim());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vinInput]);

  // Extract VIN + listing data from a link
  const handleListingLink = useCallback(async () => {
    if (!listingUrl.trim()) return;
    setLinkError(""); setLinkSuccess(false); setLinkExtracted([]); setLinkLoading(true);
    try {
      const res  = await fetch("/api/extract-vin", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ url: listingUrl.trim() }),
      });
      const data = await res.json();
      if (data.vin) {
        const filled: string[] = ["VIN"];

        // Autofill price, mileage, and ZIP when the listing provides them
        setForm((prev) => {
          const updates: Partial<CarInput> = {};
          if (typeof data.price === "number" && data.price > 0) { updates.askingPrice = data.price; filled.push("price"); }
          if (typeof data.mileage === "number" && data.mileage > 0) { updates.mileage = data.mileage; filled.push("mileage"); }
          if (typeof data.zipCode === "string" && /^\d{5}$/.test(data.zipCode)) { updates.zipCode = data.zipCode; filled.push("ZIP"); }
          return { ...prev, ...updates };
        });

        setListingUrl("");
        setLinkExtracted(filled);
        setLinkSuccess(true);
        setTimeout(() => setLinkSuccess(false), 5000);
        await decodeVin(data.vin);
      } else {
        setLinkError(data.error ?? "VIN not found. Please enter it manually.");
      }
    } catch { setLinkError("Could not process link. Please enter VIN manually."); }
    finally   { setLinkLoading(false); }
  }, [listingUrl, decodeVin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitError("");
    if (!form.vin || !/^[A-HJ-NPR-Z0-9]{17}$/i.test(form.vin.trim())) {
      setSubmitError("A valid 17-character VIN is required. Enter your VIN and click Decode before submitting.");
      return;
    }
    if (!form.make || !form.model) {
      setSubmitError("Make and model are required. Use the VIN decoder above or fill them in manually.");
      return;
    }
    if (form.mileage <= 0 || form.askingPrice <= 0) {
      setSubmitError("Mileage and asking price must be greater than 0.");
      return;
    }
    if (!/^\d{5}$/.test(form.zipCode)) {
      setSubmitError("ZIP code must be 5 digits.");
      return;
    }
    if (!isStaff && credits !== null && credits <= 0) { setShowPaywall(true); return; }

    setSubmitting(true);
    try {
      const payload: CarInput = {
        ...form,
        loanApr:        settings.defaultAPR,
        loanDownPct:    settings.defaultDownPayment,
        loanTermMonths: settings.defaultLoanTerm,
      };
      const res  = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) { setShowPaywall(true); return; }
        if (res.status === 401) { setSubmitError("Please sign in to analyze a vehicle."); return; }
        if (res.status >= 500) { setSubmitError("Our servers are having trouble right now. Please try again in a moment."); return; }
        setSubmitError(data.error ?? "Something went wrong. Please check your inputs and try again."); return;
      }
      refreshCredits();
      router.push(`/results?data=${encodeURIComponent(JSON.stringify(data))}`);
    } catch { setSubmitError("Network error — check your connection and try again."); }
    finally   { setSubmitting(false); }
  };

  const creditsColor =
    isStaff                            ? "var(--ds-accent-text)"
    : credits === null                 ? "var(--ds-text-4)"
    : credits === 0                    ? "var(--ds-danger)"
    : credits !== null && credits <= 3 ? "var(--ds-warn)"
    : "var(--ds-success)";
  const isLow = !isStaff && credits !== null && credits > 0 && credits <= 3;

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <div className="min-h-screen" style={{ background: "var(--ds-bg)", position: "relative" }}>
      <Suspense fallback={null}>
        <CreditsAddedDetector onDetected={handleCreditsAdded} />
      </Suspense>

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />

      {/* Credits added banner */}
      <AnimatePresence>
        {creditsBanner && (
          <motion.div
            initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] px-5 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2"
            style={{ background: "var(--ds-success-bg)", border: "1px solid var(--ds-success-border)", color: "var(--ds-success)", backdropFilter: "blur(12px)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>
            Credits added — ready to analyze!
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {submitting && <LoadingOverlay />}
      </AnimatePresence>

      {/* Background — pure CSS, no JS animation loop */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <div className="orb-float absolute" style={{
          top: "-10%", right: "-10%", width: "60%", height: "60%", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(37,99,235,0.12) 0%, transparent 70%)",
          filter: "blur(80px)", willChange: "transform",
        }} />
        <div className="orb-float-r absolute" style={{
          bottom: "10%", left: "-5%", width: "45%", height: "45%", borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(96,165,250,0.08) 0%, transparent 70%)",
          filter: "blur(60px)", willChange: "transform",
        }} />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: "var(--ds-nav-bg)", borderBottom: "1px solid var(--ds-nav-border)", backdropFilter: "blur(20px)" }}>
        <div className="mx-auto max-w-3xl px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Logo variant="full" size={26} />
            </Link>
            <span style={{ color: "var(--ds-text-4)" }}>/</span>
            <span className="text-sm" style={{ color: "var(--ds-text-3)" }}>Analyze</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => (credits === 0 || isLow) ? setShowPaywall(true) : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: "var(--ds-glass-bg)", border: `1px solid ${creditsColor}40`, color: creditsColor, cursor: (credits === 0 || isLow) ? "pointer" : "default" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                {isStaff ? "Unlimited" : credits === null ? "—" : credits === 0 ? "Out of credits" : `${credits} credit${credits !== 1 ? "s" : ""} left`}
              </button>
              {!isStaff && credits === 0 && (
                <button onClick={() => setShowPaywall(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110"
                  style={{ background: "var(--ds-cta-bg)", color: "var(--ds-cta-text)", boxShadow: "var(--ds-cta-shadow)" }}>
                  Buy Credits
                </button>
              )}
              {isLow && (
                <button onClick={() => setShowPaywall(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
                  style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "var(--ds-warn)" }}>
                  Running low
                </button>
              )}
            </div>
            <UserNav />
          </div>
        </div>
      </nav>

      {/* Page content */}
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10">

        {/* Welcome banner for first-time users */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.4, ease }}
              className="mb-6 rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: "var(--ds-gold-bg)",
                border: "1px solid var(--ds-gold-border)",
              }}
            >
              <button
                onClick={dismissWelcome}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full transition-colors"
                style={{ background: "var(--ds-glass-bg)", color: "var(--ds-text-4)" }}
                aria-label="Dismiss welcome banner"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--ds-gold-bg)", border: "1px solid var(--ds-gold-border)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--ds-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--ds-text-1)" }}>
                    You have 1 credit — your first analysis is on us
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
                    Paste a VIN and get your Deal Score, fair value range, and a negotiation script. Each analysis uses 1 credit.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="mb-8">
          <h1 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">
            Check this deal
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
            Paste a VIN or listing link. Get a Deal Score, estimated fair value, and a negotiation script — in under a minute.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--ds-text-4)" }}>
            <IconShield />
            <span style={{ color: "var(--ds-success)" }}>One check can save you thousands</span>
            <span>— backed by real market data</span>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Step 1: VIN ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06, ease }} className="mb-3">
            <div className="rounded-2xl p-5"
              style={vinSuccess
                ? { ...glassCard, border: "1px solid var(--ds-success-border)", boxShadow: "0 0 24px var(--ds-success-glow)" }
                : glassCard}>

              {/* Step label */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={vinSuccess
                      ? { background: "var(--ds-success-bg)", border: "1px solid var(--ds-success-border)", color: "var(--ds-success)" }
                      : { background: "var(--ds-gold-bg)", border: "1px solid var(--ds-gold-border)", color: "var(--ds-gold)" }}>
                    {vinSuccess ? <IconCheck /> : "1"}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--ds-text-1)" }}>
                    Enter VIN
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium"
                    style={{ background: "var(--ds-gold-bg)", color: "var(--ds-gold)", border: "1px solid var(--ds-gold-border)" }}>
                    Required
                  </span>
                </div>
                {vinSuccess && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: "var(--ds-success-bg)", border: "1px solid var(--ds-success-border)", color: "var(--ds-success)" }}>
                    <IconCheck /> Verified
                  </span>
                )}
              </div>

              {/* VIN input row */}
              <div className="flex gap-2.5">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="e.g. 1HGBH41JXMN109186"
                    value={vinInput}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, "");
                      setVinInput(v); setVinSuccess(false); setVinError("");
                    }}
                    maxLength={17}
                    className={inputCls + " font-mono tracking-widest placeholder:opacity-50 placeholder:tracking-normal pr-14"}
                    style={iStyle}
                    onFocus={(e) => Object.assign(e.target.style, iFocus)}
                    onBlur={(e)  => Object.assign(e.target.style, iStyle)}
                    aria-label="VIN number"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs tabular-nums pointer-events-none"
                    style={{ color: vinInput.length === 17 ? "var(--ds-success)" : "var(--ds-text-4)" }}>
                    {vinInput.length}/17
                  </span>
                </div>
                <button type="button" onClick={handleVinDecode}
                  disabled={vinLoading || vinInput.trim().length < 11}
                  className="flex-shrink-0 px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={vinInput.trim().length >= 11 && !vinSuccess
                    ? { background: "var(--ds-cta-bg)", color: "var(--ds-cta-text)", boxShadow: "var(--ds-cta-shadow)", border: "none" }
                    : { background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: "var(--ds-text-2)" }}>
                  {vinLoading ? <span className="flex items-center gap-2"><IconSpinner />Decoding…</span> : "Decode"}
                </button>
              </div>

              {/* VIN error / success */}
              {vinError && (
                <p className="mt-2.5 text-xs text-red-500 flex items-center gap-1.5"><IconAlert />{vinError}</p>
              )}
              {vinSuccess && (
                <div className="mt-2.5 flex items-center gap-2 text-xs" style={{ color: "var(--ds-success)" }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--ds-success-bg)", border: "1px solid var(--ds-success-border)" }}>
                    <IconCheck />
                  </span>
                  VIN verified — {form.year} {form.make} {form.model}{form.trim ? ` ${form.trim}` : ""}. Confirm details below.
                </div>
              )}

              {/* "How to find your VIN" collapsible */}
              <HowToFindVin />
            </div>
          </motion.div>

          {/* ── OR divider + listing link ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease }} className="mb-3">
            {/* OR divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px" style={{ background: "var(--ds-divider)" }} />
              <span className="text-xs font-medium px-2" style={{ color: "var(--ds-text-4)" }}>or auto-detect from a listing</span>
              <div className="flex-1 h-px" style={{ background: "var(--ds-divider)" }} />
            </div>

            {/* Listing link card */}
            <div className="rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: "var(--ds-text-3)" }}>
                <span style={{ color: "var(--ds-text-3)" }}><IconLink /></span>
                Paste a listing link
                <span style={{ color: "var(--ds-text-4)" }}>— we&apos;ll autofill the details when available</span>
              </div>
              <div className="flex gap-2.5">
                <input
                  type="url"
                  placeholder="https://cargurus.com/... or autotrader.com/..."
                  value={listingUrl}
                  onChange={(e) => { setListingUrl(e.target.value); setLinkError(""); setLinkSuccess(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleListingLink(); } }}
                  className={inputCls + " flex-1 placeholder:opacity-50 text-xs"}
                  style={iStyle}
                  onFocus={(e) => Object.assign(e.target.style, iFocus)}
                  onBlur={(e)  => Object.assign(e.target.style, iStyle)}
                />
                <button type="button" onClick={handleListingLink}
                  disabled={linkLoading || !listingUrl.trim()}
                  className="flex-shrink-0 px-4 py-3 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: "var(--ds-text-2)" }}>
                  {linkLoading ? <span className="flex items-center gap-1.5"><IconSpinner />Extracting…</span> : "Extract VIN"}
                </button>
              </div>
              {linkError && (
                <p className="mt-2 text-xs text-amber-500 flex items-center gap-1.5"><IconAlert />{linkError}</p>
              )}
              {linkSuccess && (
                <p className="mt-2 text-xs flex items-center gap-1.5" style={{ color: "var(--ds-success)" }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--ds-success-bg)", border: "1px solid var(--ds-success-border)" }}>
                    <IconCheck />
                  </span>
                  {linkExtracted.length > 1
                    ? `Extracted ${linkExtracted.join(", ")} from listing`
                    : "VIN extracted from listing!"}
                </p>
              )}
            </div>
          </motion.div>

          {/* ── Step 2: Car Details ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.14, ease }}>
            <div className="rounded-2xl p-6 space-y-6" style={glassCard}>

              {/* Step label */}
              <div className="flex items-center gap-2.5 -mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "var(--ds-gold-bg)", border: "1px solid var(--ds-gold-border)", color: "var(--ds-gold)" }}>
                  2
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--ds-text-1)" }}>Confirm details</span>
                {vinSuccess && (
                  <span className="text-xs" style={{ color: "var(--ds-text-4)" }}>— auto-filled from VIN</span>
                )}
              </div>

              {/* Year + Make */}
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Year" required htmlFor="field-year">
                  <div className="relative">
                    <select id="field-year" value={form.year} onChange={(e) => {
                      const newYear = parseInt(e.target.value, 10);
                      setForm((p) => ({ ...p, year: newYear, trim: "" }));
                    }}
                      required className={inputCls + " cursor-pointer appearance-none pr-10"} style={iStyle}>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><IconChevron /></div>
                  </div>
                </Field>
                <Field label="Make" required htmlFor="make">
                  <Combobox id="make" value={form.make} onChange={handleMakeChange} options={ALL_MAKES} placeholder="e.g. Toyota" />
                </Field>
              </div>

              {/* Model + Trim */}
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Model" required htmlFor="model" hint={form.make && modelOptions.length === 0 ? "Type any model name" : undefined}>
                  <Combobox id="model" value={form.model} onChange={handleModelChange} options={modelOptions} placeholder="e.g. Camry" disabled={!form.make} />
                </Field>
                <Field label="Trim" htmlFor="trim" hint={form.model && trimOptions.length === 0 ? "Type any trim name" : undefined}>
                  <Combobox id="trim" value={form.trim ?? ""} onChange={(v) => setField("trim", v)} options={trimOptions} placeholder="e.g. XLE, Sport…" disabled={!form.model} />
                </Field>
              </div>

              <div className="h-px" style={{ background: "var(--ds-divider)" }} />

              {/* Mileage + Price + ZIP */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <Field label="Mileage" required htmlFor="field-mileage">
                  <div className="relative">
                    <input id="field-mileage" type="number" value={form.mileage || ""} onChange={(e) => setField("mileage", parseInt(e.target.value, 10) || 0)}
                      placeholder="45,000" min={1} required className={inputCls + " pr-9 placeholder:opacity-50"} style={iStyle}
                      onFocus={(e) => Object.assign(e.target.style, iFocus)}
                      onBlur={(e)  => Object.assign(e.target.style, iStyle)} />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "var(--ds-text-4)" }}>mi</span>
                  </div>
                </Field>
                <Field label="Asking Price" required htmlFor="field-price">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "var(--ds-text-3)" }}>$</span>
                    <input id="field-price" type="number" value={form.askingPrice || ""} onChange={(e) => setField("askingPrice", parseInt(e.target.value, 10) || 0)}
                      placeholder="18,500" min={1} required className={inputCls + " pl-7 placeholder:opacity-50"} style={iStyle}
                      onFocus={(e) => Object.assign(e.target.style, iFocus)}
                      onBlur={(e)  => Object.assign(e.target.style, iStyle)} />
                  </div>
                </Field>
                <div className="col-span-2 sm:col-span-1"><Field label="ZIP Code" required htmlFor="field-zip">
                  <input id="field-zip" type="text" value={form.zipCode}
                    onChange={(e) => setField("zipCode", e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="90210" pattern="\d{5}" required
                    className={inputCls + " font-mono tracking-widest placeholder:opacity-50"} style={iStyle}
                    onFocus={(e) => Object.assign(e.target.style, iFocus)}
                    onBlur={(e)  => Object.assign(e.target.style, iStyle)} />
                </Field></div>
              </div>

              {/* Error */}
              {submitError && (
                <div className="rounded-xl px-4 py-3 text-sm text-red-500 flex items-center gap-2"
                  style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)" }}>
                  <IconAlert />{submitError}
                </div>
              )}

              {/* Submit */}
              {!isStaff && credits === 0 ? (
                <button type="button" onClick={() => setShowPaywall(true)}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.99]"
                  style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", boxShadow: "0 0 24px rgba(239,68,68,0.3), 0 4px 16px var(--ds-shadow-heavy)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Out of credits — buy more to continue
                </button>
              ) : (
                <button type="submit" disabled={submitting}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.99]"
                  style={{ background: "var(--ds-cta-bg)", color: "var(--ds-cta-text)", boxShadow: "var(--ds-cta-shadow)" }}>
                  Get my Deal Score <IconArrow />
                </button>
              )}

              <div className="flex items-center justify-center gap-4 text-xs" style={{ color: "var(--ds-text-4)" }}>
                <span className="flex items-center gap-1"><IconShield />VIN-verified data</span>
                <span>·</span>
                <span>Results in ~3 seconds</span>
                <span>·</span>
                <span>1 credit per analysis</span>
              </div>
            </div>
          </motion.div>

        </form>

        {/* Recently Viewed */}
        <RecentlyViewed />
      </div>
    </div>
  );
}
