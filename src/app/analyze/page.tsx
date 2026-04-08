"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { CarInput, VinDecodeResult } from "@/lib/types";
import { ALL_MAKES, getModels, getTrims } from "@/lib/carData";
import Link from "next/link";
import { UserNav } from "@/components/ui/user-nav";
import { EtherealShadow } from "@/components/ui/etheral-shadow";
import { useSettings } from "@/contexts/settings-context";

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
function IconChevron() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 pointer-events-none flex-shrink-0" style={{ color: "var(--ds-text-4)" }}><polyline points="6 9 12 15 18 9" /></svg>;
}
function IconX() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}

/* ── Shared input styles ── */
const inputCls = "w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-150 disabled:opacity-40";
const iStyle = {
  background: "var(--ds-input-bg)",
  border: "1px solid var(--ds-input-border)",
  color: "var(--ds-text-1)",
} as const;
const iFocus = {
  background: "var(--ds-input-bg)",
  border: "1px solid var(--ds-input-focus)",
  boxShadow: "0 0 0 3px var(--ds-input-ring)",
  color: "var(--ds-text-1)",
} as const;

const glassCard = {
  background: "var(--ds-card-bg)",
  border: "1px solid var(--ds-card-border)",
  boxShadow: "var(--ds-card-shadow)",
} as const;

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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery(""); setFocused(false);
      }
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

  const dropdownStyle = {
    background: "var(--ds-card-bg)",
    border: "1px solid var(--ds-card-border)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    backdropFilter: "blur(16px)",
  };

  return (
    <div ref={containerRef} className="relative">
      <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
        <input
          ref={inputRef} id={id} type="text"
          value={open ? query : value}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlighted(0); }}
          onFocus={() => { setOpen(true); setHighlighted(0); setFocused(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKey}
          placeholder={disabled ? "Select make first" : placeholder}
          disabled={disabled} autoComplete="off"
          className={inputCls + " pr-16 placeholder:opacity-40"}
          style={focused ? iFocus : iStyle}
          aria-expanded={open} aria-haspopup="listbox" role="combobox"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(""); setQuery(""); inputRef.current?.focus(); }}
              className="p-0.5 rounded transition-colors cursor-pointer"
              style={{ color: "var(--ds-text-4)" }}
              aria-label="Clear">
              <IconX />
            </button>
          )}
          <IconChevron />
        </div>
      </div>

      {open && !disabled && filtered.length > 0 && (
        <ul ref={listRef} role="listbox"
          className="absolute z-50 mt-1.5 w-full max-h-56 overflow-y-auto rounded-xl py-1.5"
          style={dropdownStyle}>
          {filtered.map((opt, i) => (
            <li key={opt} role="option" aria-selected={opt === value}
              onMouseDown={(e) => { e.preventDefault(); select(opt); }}
              onMouseEnter={() => setHighlighted(i)}
              className="flex items-center justify-between px-3.5 py-2.5 text-sm cursor-pointer select-none transition-colors"
              style={{
                color: i === highlighted || opt === value ? "var(--ds-text-1)" : "var(--ds-text-2)",
                fontWeight: opt === value ? 600 : undefined,
                background: i === highlighted ? "rgba(99,102,241,0.12)" : undefined,
              }}>
              {opt}
              {opt === value && <span className="text-indigo-500 flex-shrink-0"><IconCheck /></span>}
            </li>
          ))}
        </ul>
      )}
      {open && !disabled && filtered.length === 0 && query && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
          style={{ ...dropdownStyle, color: "var(--ds-text-3)" }}>
          No matches for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ds-text-3)" }}>
        {label}{required && <span className="text-red-400/80 ml-0.5 normal-case font-normal">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs" style={{ color: "var(--ds-text-4)" }}>{hint}</p>}
    </div>
  );
}

const LOADING_STEPS = [
  "Gathering market comparables…",
  "Calculating fair value range…",
  "Scoring the deal…",
  "Writing your negotiation script…",
];

function LoadingOverlay() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timings = [900, 1800, 2700];
    const timers = timings.map((t, i) => setTimeout(() => setStep(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--ds-overlay)", backdropFilter: "blur(12px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl p-8 max-w-sm w-full mx-4 text-center"
        style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}
      >
        {/* Spinner ring */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <svg className="w-16 h-16 -rotate-90 animate-spin" viewBox="0 0 64 64" style={{ animationDuration: "1.4s" }}>
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="5"/>
            <circle cx="32" cy="32" r="26" fill="none" stroke="#6366f1" strokeWidth="5"
              strokeDasharray="164" strokeDashoffset="120" strokeLinecap="round"/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-indigo-500" style={{ boxShadow: "0 0 12px rgba(99,102,241,0.8)" }}/>
          </div>
        </div>

        <p className="font-heading text-base font-semibold mb-5" style={{ color: "var(--ds-text-1)" }}>
          Analyzing your listing
        </p>

        {/* Step list */}
        <div className="space-y-2.5 text-left">
          {LOADING_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                style={{
                  background: i < step ? "rgba(52,211,153,0.15)" : i === step ? "rgba(99,102,241,0.15)" : "var(--ds-badge-bg)",
                  border: `1px solid ${i < step ? "rgba(52,211,153,0.35)" : i === step ? "rgba(99,102,241,0.35)" : "var(--ds-badge-border)"}`,
                }}>
                {i < step ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : i === step ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
                ) : null}
              </div>
              <span className="text-xs transition-all duration-300"
                style={{ color: i < step ? "#34d399" : i === step ? "var(--ds-text-1)" : "var(--ds-text-4)" }}>
                {s}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs mt-5" style={{ color: "var(--ds-text-4)" }}>Takes about 3–5 seconds</p>
      </motion.div>
    </div>
  );
}

export default function AnalyzePage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [form, setForm] = useState<CarInput>(defaultForm);
  const [vinInput, setVinInput] = useState("");
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState("");
  const [vinSuccess, setVinSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function setField<K extends keyof CarInput>(k: K, v: CarInput[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const modelOptions = form.make ? getModels(form.make).map((m) => m.name) : [];
  const trimOptions  = form.make && form.model ? getTrims(form.make, form.model) : [];

  function handleMakeChange(make: string)  { setForm((p) => ({ ...p, make, model: "", trim: "" })); }
  function handleModelChange(model: string) { setForm((p) => ({ ...p, model, trim: "" })); }

  const handleVinDecode = useCallback(async () => {
    if (vinInput.trim().length < 11) { setVinError("VIN must be at least 11 characters."); return; }
    setVinError(""); setVinSuccess(false); setVinLoading(true);
    try {
      const res = await fetch(`/api/vin?vin=${encodeURIComponent(vinInput.trim())}`);
      const data: VinDecodeResult = await res.json();
      if (data.error) { setVinError(data.error); return; }
      setForm((p) => ({ ...p, vin: vinInput.trim(), year: data.year ?? p.year, make: data.make ?? p.make, model: data.model ?? p.model, trim: data.trim ?? p.trim }));
      setVinSuccess(true);
    } catch { setVinError("Failed to decode VIN. Check your connection."); }
    finally { setVinLoading(false); }
  }, [vinInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitError("");
    if (!form.make || !form.model) { setSubmitError("Make and model are required."); return; }
    if (form.mileage <= 0 || form.askingPrice <= 0) { setSubmitError("Mileage and asking price must be greater than 0."); return; }
    if (!/^\d{5}$/.test(form.zipCode)) { setSubmitError("ZIP code must be 5 digits."); return; }
    setSubmitting(true);
    try {
      const payload: CarInput = {
        ...form,
        loanApr: settings.defaultAPR,
        loanDownPct: settings.defaultDownPayment,
        loanTermMonths: settings.defaultLoanTerm,
      };
      const res = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Something went wrong."); return; }
      router.push(`/results?data=${encodeURIComponent(JSON.stringify(data))}`);
    } catch { setSubmitError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ds-bg)", position: "relative" }}>
      {/* Loading overlay */}
      <AnimatePresence>
        {submitting && <LoadingOverlay />}
      </AnimatePresence>

      {/* Ethereal background */}
      <EtherealShadow
        color="rgba(79, 70, 229, 1)"
        animation={{ scale: 60, speed: 90 }}
        noise={{ opacity: 0.6, scale: 1.2 }}
        sizing="fill"
        style={{ position: "fixed", inset: 0, zIndex: 0 }}
      />
      {/* Overlay adapts to theme */}
      <div className="fixed inset-0 z-0" style={{ background: "var(--ds-overlay)" }} />

      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: "var(--ds-nav-bg)", borderBottom: "1px solid var(--ds-nav-border)", backdropFilter: "blur(20px)" }}>
        <div className="mx-auto max-w-3xl px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/"
              className="font-heading text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-white/70 hover:opacity-80 transition-opacity">
              DealSense
            </Link>
            <span style={{ color: "var(--ds-text-4)" }}>/</span>
            <span className="text-sm" style={{ color: "var(--ds-text-3)" }}>Analyze a listing</span>
          </div>
          <UserNav />
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8">
          <h1 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">
            Analyze a car
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
            Enter the listing details — we&apos;ll score the deal and write your negotiation script.
          </p>
        </motion.div>

        {/* VIN decode */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl p-5 mb-4" style={glassCard}>
          <div className="flex items-center gap-2 text-sm font-semibold mb-4" style={{ color: "var(--ds-text-2)" }}>
            <span className="text-indigo-500"><IconVin /></span>
            Decode a VIN
            <span className="font-normal" style={{ color: "var(--ds-text-4)" }}>(optional — auto-fills year, make &amp; model)</span>
          </div>
          <div className="flex gap-3">
            <input type="text" placeholder="e.g. 1HGBH41JXMN109186"
              value={vinInput}
              onChange={(e) => { setVinInput(e.target.value.toUpperCase()); setVinSuccess(false); setVinError(""); }}
              maxLength={17}
              className={inputCls + " font-mono tracking-wider flex-1 placeholder:opacity-40"}
              style={iStyle}
              onFocus={(e) => Object.assign(e.target.style, iFocus)}
              onBlur={(e) => Object.assign(e.target.style, iStyle)}
              aria-label="VIN number"
            />
            <button type="button" onClick={handleVinDecode}
              disabled={vinLoading || vinInput.trim().length < 11}
              className="flex-shrink-0 px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--ds-badge-bg)",
                border: "1px solid var(--ds-badge-border)",
                color: "var(--ds-text-2)",
              }}>
              {vinLoading ? <span className="flex items-center gap-2"><IconSpinner />Decoding…</span> : "Decode VIN"}
            </button>
          </div>
          {vinError && (
            <p className="mt-2.5 text-xs text-red-500 flex items-center gap-1.5"><IconAlert />{vinError}</p>
          )}
          {vinSuccess && (
            <p className="mt-2.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
                <IconCheck />
              </span>
              VIN decoded — fields updated below. Enter the mileage and asking price from the listing.
            </p>
          )}
        </motion.div>

        {/* Form */}
        <motion.form onSubmit={handleSubmit} noValidate
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>
          <div className="rounded-2xl p-6 space-y-6" style={glassCard}>

            {/* Year + Make */}
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Year" required>
                <div className="relative">
                  <select value={form.year} onChange={(e) => setField("year", parseInt(e.target.value, 10))}
                    required className={inputCls + " cursor-pointer appearance-none pr-10"} style={iStyle}>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><IconChevron /></div>
                </div>
              </Field>
              <Field label="Make" required>
                <Combobox id="make" value={form.make} onChange={handleMakeChange} options={ALL_MAKES} placeholder="e.g. Toyota" />
              </Field>
            </div>

            {/* Model + Trim */}
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Model" required hint={form.make && modelOptions.length === 0 ? "Type any model name" : undefined}>
                <Combobox id="model" value={form.model} onChange={handleModelChange} options={modelOptions} placeholder="e.g. Camry" disabled={!form.make} />
              </Field>
              <Field label="Trim" hint={form.model && trimOptions.length === 0 ? "Type any trim name" : undefined}>
                <Combobox id="trim" value={form.trim ?? ""} onChange={(v) => setField("trim", v)} options={trimOptions} placeholder="e.g. XLE, Sport…" disabled={!form.model} />
              </Field>
            </div>

            <div className="h-px" style={{ background: "var(--ds-divider)" }} />

            {/* Mileage + Price + ZIP */}
            <div className="grid sm:grid-cols-3 gap-5">
              <Field label="Mileage" required>
                <div className="relative">
                  <input type="number" value={form.mileage || ""} onChange={(e) => setField("mileage", parseInt(e.target.value, 10) || 0)}
                    placeholder="45,000" min={1} required className={inputCls + " pr-9 placeholder:opacity-40"} style={iStyle}
                    onFocus={(e) => Object.assign(e.target.style, iFocus)}
                    onBlur={(e) => Object.assign(e.target.style, iStyle)} />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: "var(--ds-text-4)" }}>mi</span>
                </div>
              </Field>
              <Field label="Asking Price" required>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "var(--ds-text-3)" }}>$</span>
                  <input type="number" value={form.askingPrice || ""} onChange={(e) => setField("askingPrice", parseInt(e.target.value, 10) || 0)}
                    placeholder="18,500" min={1} required className={inputCls + " pl-7 placeholder:opacity-40"} style={iStyle}
                    onFocus={(e) => Object.assign(e.target.style, iFocus)}
                    onBlur={(e) => Object.assign(e.target.style, iStyle)} />
                </div>
              </Field>
              <Field label="ZIP Code" required>
                <input type="text" value={form.zipCode}
                  onChange={(e) => setField("zipCode", e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="90210" pattern="\d{5}" required
                  className={inputCls + " font-mono tracking-widest placeholder:opacity-40"} style={iStyle}
                  onFocus={(e) => Object.assign(e.target.style, iFocus)}
                  onBlur={(e) => Object.assign(e.target.style, iStyle)}
                  aria-label="ZIP code" />
              </Field>
            </div>

            {submitError && (
              <div className="rounded-xl px-4 py-3 text-sm text-red-500 flex items-center gap-2"
                style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)" }}>
                <IconAlert />{submitError}
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow: "0 0 24px rgba(99,102,241,0.35), 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)" }}>
              Score this deal <IconArrow />
            </button>

            <p className="text-center text-xs" style={{ color: "var(--ds-text-4)" }}>Analysis takes ~3 seconds</p>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
