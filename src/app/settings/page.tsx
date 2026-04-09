"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EtherealShadow } from "@/components/ui/etheral-shadow";
import { UserNav } from "@/components/ui/user-nav";
import { useSettings } from "@/contexts/settings-context";
import type { Theme, LoanTerm, DistanceUnit } from "@/lib/settings";
import { createClient } from "@/lib/supabase/client";
import { useCredits } from "@/contexts/credits-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ── Easing ── */
const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };

/* ── Segment control ── */
function Segment<T extends string | number>({
  options, value, onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--ds-input-border)", background: "var(--ds-badge-bg)" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className="flex-1 px-3 py-2.5 text-sm font-medium transition-all"
            style={active
              ? { background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "#fff", boxShadow: "0 0 16px rgba(99,102,241,0.3)" }
              : { color: "var(--ds-text-3)", background: "transparent" }
            }
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Toggle switch ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
      style={{
        background: checked
          ? "linear-gradient(135deg,#4f46e5,#6366f1)"
          : "var(--ds-badge-bg)",
        border: "1px solid var(--ds-input-border)",
        boxShadow: checked ? "0 0 12px rgba(99,102,241,0.35)" : "none",
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200"
        style={{
          background: checked ? "#fff" : "var(--ds-text-3)",
          transform: checked ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

/* ── Section header ── */
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.20)" }}>
        <span className="text-indigo-500">{icon}</span>
      </div>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--ds-text-1)" }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-3)" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

/* ── Row ── */
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4" style={{ borderTop: "1px solid var(--ds-divider)" }}>
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--ds-text-1)" }}>{label}</p>
        {hint && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--ds-text-3)" }}>{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/* ── Icons ── */
function IconPalette() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;
}
function IconCalc() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>;
}
function IconGlobe() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
}
function IconUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const { referralCode } = useCredits();
  const [email, setEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refCopied, setRefCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  const copyEmail = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRefLink = async () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/ref/${referralCode}`;
    await navigator.clipboard.writeText(link);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2500);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ds-bg)", position: "relative" }}>
      {/* Background */}
      <EtherealShadow
        color="rgba(79, 70, 229, 1)"
        animation={{ scale: 50, speed: 80 }}
        noise={{ opacity: 0.5, scale: 1.2 }}
        sizing="fill"
        style={{ position: "fixed", inset: 0, zIndex: 0 }}
      />
      <div className="fixed inset-0 z-0" style={{ background: "var(--ds-overlay)" }} />

      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: "var(--ds-nav-bg)", borderBottom: "1px solid var(--ds-nav-border)", backdropFilter: "blur(20px)" }}>
        <div className="mx-auto max-w-2xl px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/"
              className="font-heading text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-white/70 hover:opacity-80 transition-opacity">
              DealSense
            </Link>
            <span style={{ color: "var(--ds-text-4)" }}>/</span>
            <span className="text-sm" style={{ color: "var(--ds-text-3)" }}>Settings</span>
          </div>
          <UserNav />
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10">
        <motion.div initial="hidden" animate="show" variants={stagger}>

          {/* Header */}
          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="font-heading text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">
              Settings
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--ds-text-3)" }}>Manage your preferences and account.</p>
          </motion.div>

          <div className="space-y-4">

            {/* ── Appearance ── */}
            <motion.div variants={fadeUp} className="rounded-2xl p-6" style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <SectionHeader icon={<IconPalette />} title="Appearance" subtitle="Choose how DealSense looks to you" />

              <Row label="Theme" hint="Controls the color scheme across the app">
                <Segment<Theme>
                  value={settings.theme}
                  onChange={(v) => update("theme", v)}
                  options={[
                    { label: "Dark", value: "dark" },
                    { label: "System", value: "system" },
                    { label: "Light", value: "light" },
                  ]}
                />
              </Row>
            </motion.div>

            {/* ── Analysis Defaults ── */}
            <motion.div variants={fadeUp} className="rounded-2xl p-6" style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <SectionHeader
                icon={<IconCalc />}
                title="Analysis Defaults"
                subtitle="Pre-fill values used when estimating monthly payments on results"
              />

              {/* APR */}
              <div className="py-4" style={{ borderTop: "1px solid var(--ds-divider)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--ds-text-1)" }}>Default APR</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-3)" }}>Annual interest rate used for payment estimates</p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-indigo-500">
                    {settings.defaultAPR.toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={3} max={15} step={0.5}
                  value={settings.defaultAPR}
                  onChange={(e) => update("defaultAPR", parseFloat(e.target.value))}
                  className="range-slider w-full"
                />
                <div className="flex justify-between text-xs mt-1.5 font-mono" style={{ color: "var(--ds-text-4)" }}>
                  <span>3%</span><span>15%</span>
                </div>
              </div>

              {/* Down Payment */}
              <div className="py-4" style={{ borderTop: "1px solid var(--ds-divider)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--ds-text-1)" }}>Down Payment</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-3)" }}>Assumed down payment percentage</p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-indigo-500">
                    {settings.defaultDownPayment}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0} max={50} step={5}
                  value={settings.defaultDownPayment}
                  onChange={(e) => update("defaultDownPayment", parseInt(e.target.value))}
                  className="range-slider w-full"
                />
                <div className="flex justify-between text-xs mt-1.5 font-mono" style={{ color: "var(--ds-text-4)" }}>
                  <span>0%</span><span>50%</span>
                </div>
              </div>

              {/* Loan Term */}
              <Row label="Loan Term" hint="Default repayment period in months">
                <Segment<LoanTerm>
                  value={settings.defaultLoanTerm}
                  onChange={(v) => update("defaultLoanTerm", v)}
                  options={[36, 48, 60, 72, 84].map((m) => ({ label: `${m}`, value: m as LoanTerm }))}
                />
              </Row>
            </motion.div>

            {/* ── Display ── */}
            <motion.div variants={fadeUp} className="rounded-2xl p-6" style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <SectionHeader icon={<IconGlobe />} title="Display" />

              <Row label="Distance unit" hint="Used when showing mileage figures">
                <Segment<DistanceUnit>
                  value={settings.distanceUnit}
                  onChange={(v) => update("distanceUnit", v)}
                  options={[
                    { label: "Miles", value: "miles" },
                    { label: "Km", value: "km" },
                  ]}
                />
              </Row>
            </motion.div>

            {/* ── Referral ── */}
            {referralCode && (
              <motion.div variants={fadeUp} className="rounded-2xl p-6" style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
                <SectionHeader
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
                  title="Referral"
                  subtitle="Earn 1 free credit for every friend who signs up with your link."
                />

                <Row label="Your referral link" hint="Share this link — you both get a free credit when they sign up.">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono truncate max-w-[140px]" style={{ color: "var(--ds-text-3)" }}>
                      /ref/{referralCode}
                    </span>
                    <button
                      onClick={copyRefLink}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all flex-shrink-0"
                      style={{
                        background: refCopied ? "rgba(52,211,153,0.12)" : "var(--ds-badge-bg)",
                        border: refCopied ? "1px solid rgba(52,211,153,0.25)" : "1px solid var(--ds-badge-border)",
                        color: refCopied ? "rgba(52,211,153,0.9)" : "var(--ds-text-2)",
                      }}>
                      {refCopied ? "✓ Copied!" : "Copy link"}
                    </button>
                  </div>
                </Row>
              </motion.div>
            )}

            {/* ── Account ── */}
            <motion.div variants={fadeUp} className="rounded-2xl p-6" style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <SectionHeader icon={<IconUser />} title="Account" />

              {email && (
                <Row label="Email address" hint="Your sign-in email">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono truncate max-w-[180px]" style={{ color: "var(--ds-text-2)" }}>{email}</span>
                    <button
                      onClick={copyEmail}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all"
                      style={{
                        background: copied ? "rgba(52,211,153,0.12)" : "var(--ds-badge-bg)",
                        border: copied ? "1px solid rgba(52,211,153,0.25)" : "1px solid var(--ds-badge-border)",
                        color: copied ? "rgba(52,211,153,0.9)" : "var(--ds-text-2)",
                      }}
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </Row>
              )}

              <div className="pt-4 mt-1" style={{ borderTop: "1px solid var(--ds-divider)" }}>
                <button
                  onClick={signOut}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.18)",
                    color: "rgba(220,38,38,0.9)",
                  }}
                >
                  Sign out
                </button>
              </div>
            </motion.div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
