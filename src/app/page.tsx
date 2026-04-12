"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FloatingPaths } from "@/components/ui/background-paths";
import { UserNav } from "@/components/ui/user-nav";
import { Logo } from "@/components/ui/logo";

/* ── Easing ── */
const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.6, ease } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1,        transition: { duration: 0.55, ease } },
};
const staggerContainer = (stagger = 0.1, delayChildren = 0) => ({
  hidden: {},
  show:   { transition: { staggerChildren: stagger, delayChildren } },
});
const cardVariant = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,     transition: { duration: 0.55, ease } },
};
const slideLeft = {
  hidden: { opacity: 0, x: -20 },
  show:   { opacity: 1, x: 0,  transition: { duration: 0.5, ease } },
};

function ScrollSection({ children, className = "", delay = 0, style }: {
  children: React.ReactNode; className?: string; delay?: number; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });
  return (
    <motion.div
      ref={ref}
      variants={staggerContainer(0.1, delay)}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ── Icons ── */
function IconTarget() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function IconBarChart() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
}
function IconChat() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IconCheck() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconArrow() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
}
function IconShield() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function IconDatabase() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
}
function IconTrendingUp() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
function IconMapPin() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function IconBullet() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="4"/></svg>;
}

/* ── Gradient heading — flips between dark/light ── */
function GlassHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:via-white/90 dark:to-white/60 ${className}`}>
      {children}
    </span>
  );
}

/* ── Mini score card ── */
function MiniScoreCard({ score, verdict, car, delta }: { score: number; verdict: string; car: string; delta: string }) {
  const circum = 2 * Math.PI * 22;
  const offset = circum - (score / 100) * circum;
  const colors = {
    Buy:         { stroke: "#34d399", glow: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.20)",  label: "rgba(52,211,153,0.9)"  },
    Negotiate:   { stroke: "#fbbf24", glow: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.20)",  label: "rgba(251,191,36,0.9)"  },
    "Walk Away": { stroke: "#f87171", glow: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.20)", label: "rgba(248,113,113,0.9)" },
  } as const;
  const c = colors[verdict as keyof typeof colors] ?? colors["Negotiate"];

  return (
    <div className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 backdrop-blur-sm transition-colors"
      style={{
        background: "var(--ds-card-bg)",
        border: `1px solid ${c.border}`,
        boxShadow: `0 0 24px ${c.glow}`,
      }}>
      <div className="relative w-11 h-11 flex-shrink-0">
        <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
          <circle cx="24" cy="24" r="22" fill="none" stroke="var(--ds-divider)" strokeWidth="4"/>
          <circle cx="24" cy="24" r="22" fill="none" stroke={c.stroke} strokeWidth="4"
            strokeDasharray={circum} strokeDashoffset={offset} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 3px ${c.stroke}60)` }}/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color: "var(--ds-text-1)" }}>{score}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs truncate mb-0.5" style={{ color: "var(--ds-text-3)" }}>{car}</p>
        <p className="text-sm font-semibold" style={{ color: c.label }}>{verdict}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-4)" }}>{delta}</p>
      </div>
    </div>
  );
}

const features = [
  { icon: <IconTarget />, title: "Deal Score", desc: "0–100 score that tells you: buy, negotiate, or walk away. No guessing." },
  { icon: <IconBarChart />, title: "Fair value range", desc: "See what similar cars actually sell for in your area — backed by real data." },
  { icon: <IconChat />, title: "Negotiation script", desc: "A word-for-word script built from your deal. Copy it. Walk in prepared." },
];

const steps = [
  ["Paste the VIN", "Grab it from the listing — we auto-decode year, make, model, trim, and options instantly."],
  ["Add the asking price", "Enter the listed price, current mileage, and your ZIP code. Takes 10 seconds."],
  ["Get your Deal Score", "Fair value range from real data. Score out of 100. A clear verdict: buy, negotiate, or walk."],
  ["Walk in prepared", "Copy the negotiation script built from your numbers. Use it at the dealership or in your reply."],
];

const trustSources = [
  {
    icon: <IconDatabase />,
    title: "NHTSA VIN Data",
    desc: "Decoded against the US government\u2019s official vehicle database. No scrapers, no guesswork.",
  },
  {
    icon: <IconTrendingUp />,
    title: "Depreciation Models",
    desc: "Value curves calibrated against real transaction data. Category-specific for luxury, trucks, and more.",
  },
  {
    icon: <IconMapPin />,
    title: "Local Market Comps",
    desc: "Pricing reflects real listings near your ZIP — not national averages that miss local demand.",
  },
];

const faqs = [
  { q: "How accurate is the fair value estimate?", a: "We use calibrated depreciation models, mileage benchmarks, and live market data when available. It\u2019s a strong, data-backed starting point — not a certified appraisal. We show you a confidence level so you know how much data is behind each estimate." },
  { q: "Why is a VIN required?", a: "A VIN locks in the exact vehicle — year, make, model, trim, drivetrain, and options. Without it, we\u2019d be guessing. With it, you get the most accurate fair value we can calculate." },
  { q: "Is it really free?", a: "Yes. During early access, founding members get free analyses. We\u2019re prioritizing real feedback over revenue right now. When paid plans launch, founders keep special perks. Early access won\u2019t last forever." },
  { q: "Do I need an account?", a: "Yes — free account, takes 30 seconds. Your analysis history, saved reports, and negotiation scripts stay tied to your account." },
  { q: "How is the monthly payment calculated?", a: "Default: 10% down, 7.5% APR, 60-month term. You can adjust all three on the results page. Your actual rate depends on credit and lender." },
  { q: "Can I paste a listing URL instead?", a: "We\u2019re building that. For now, grab the VIN from the listing page and paste it in — takes 5 seconds and gives better results than URL scraping would." },
];

export default function HomePage() {

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: "var(--ds-bg)" }}>

      {/* ── Nav ── */}
      {/* Nav — reduced blur (20→12px) and added containment for Windows stability */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="sticky top-0 z-50"
        style={{
          background: "var(--ds-nav-bg)",
          borderBottom: "1px solid var(--ds-nav-border)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          contain: "layout style",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo variant="full" size={28} />
            <div className="hidden md:flex items-center gap-1">
              {["How it works", "Pricing", "FAQ"].map((label, i) => (
                <a key={label} href={`#${["how-it-works","pricing","faq"][i]}`}
                  className="px-3 py-1.5 text-sm rounded-lg transition-colors text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-white/45 dark:hover:text-white/85 dark:hover:bg-white/[0.04]">
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/analyze"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
              style={{ boxShadow: "0 0 20px rgba(99,102,241,0.3), 0 4px 12px rgba(0,0,0,0.2)" }}>
              Check a Deal
            </Link>
            <UserNav />
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden transition-colors"
        style={{ background: "var(--ds-bg)" }}>
        {/* Flowing path backgrounds */}
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-6xl px-4 w-full py-16 flex flex-col items-center text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium mb-8 transition-colors"
            style={{
              background: "var(--ds-badge-bg)",
              border: "1px solid var(--ds-badge-border)",
              color: "var(--ds-text-3)",
            }}>
            <IconShield />
            Free during early access — no credit card needed
          </motion.div>

          {/* Animated word-by-word headline */}
          <h1 className="font-heading text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-[1.05] mb-6">
            {[["Don\u2019t overpay for"], ["your next car."]].map((line, lineIdx) =>
              line.map((phrase) => (
                <span key={lineIdx} className="block">
                  {phrase.split(" ").map((word, wordIdx) => (
                    <motion.span
                      key={`${lineIdx}-${wordIdx}`}
                      initial={{ y: 48, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        delay: lineIdx * 0.22 + wordIdx * 0.08,
                        duration: 0.6,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className={`inline-block mr-[0.25em] last:mr-0 bg-clip-text text-transparent ${
                        lineIdx === 0
                          ? "bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-white/75"
                          : "bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 dark:from-blue-400 dark:via-indigo-300 dark:to-violet-400"
                      }`}
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
              ))
            )}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease }}
            className="text-lg leading-relaxed mb-10 max-w-lg"
            style={{ color: "var(--ds-text-2)" }}
          >
            Paste a VIN. Get a Deal Score, fair value range, and a ready-to-use negotiation script — before you spend a dime.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85, ease }}
            className="flex gap-3 flex-col sm:flex-row mb-16"
          >
            {/* Primary CTA — wraps in a gradient border like the BackgroundPaths button style */}
            <div className="inline-block group relative rounded-2xl p-px"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.6), rgba(139,92,246,0.4))",
                boxShadow: "0 0 18px rgba(99,102,241,0.20)",
              }}>
              <Link href="/analyze"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[0.9rem] text-white text-sm font-semibold transition-all group-hover:-translate-y-0.5 duration-200"
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                }}>
                Get my Deal Score <IconArrow />
              </Link>
            </div>
            <a href="#how-it-works"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:brightness-95 active:scale-[0.98]"
              style={{
                background: "var(--ds-badge-bg)",
                border: "1px solid var(--ds-badge-border)",
                color: "var(--ds-text-2)",
              }}>
              How it works
            </a>
          </motion.div>

          {/* Score cards */}
          <motion.div
            className="grid sm:grid-cols-3 gap-3 w-full max-w-2xl"
            initial="hidden" animate="show"
            variants={staggerContainer(0.12, 1.0)}
          >
            {[
              { score: 83, verdict: "Buy",        car: "2020 Honda Civic EX",  delta: "$1.2k under fair value" },
              { score: 55, verdict: "Negotiate",  car: "2019 Toyota Camry SE", delta: "$1.4k over fair value" },
              { score: 26, verdict: "Walk Away",  car: "2018 BMW 3 Series",    delta: "$6.2k over fair value" },
            ].map((card) => (
              <motion.div key={card.car} variants={cardVariant}>
                <MiniScoreCard {...card} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <ScrollSection>
        <motion.div variants={fadeIn} className="py-3 transition-colors"
          style={{ borderTop: "1px solid var(--ds-divider)", borderBottom: "1px solid var(--ds-divider)", background: "var(--ds-card-bg)" }}>
          <div className="mx-auto max-w-6xl px-4 flex flex-wrap items-center justify-center text-center gap-x-8 gap-y-1.5 text-xs font-medium tracking-wide" style={{ color: "var(--ds-text-3)" }}>
            <span className="flex items-center gap-1.5" style={{ color: "var(--ds-text-2)" }}><IconShield />NHTSA official VIN data</span>
            <span className="hidden sm:inline" style={{ color: "var(--ds-divider)" }}>·</span>
            <span>AI-powered negotiation scripts</span>
            <span className="hidden sm:inline" style={{ color: "var(--ds-divider)" }}>·</span>
            <span>No dealer affiliation</span>
            <span className="hidden sm:inline" style={{ color: "var(--ds-divider)" }}>·</span>
            <span>Your data is never sold</span>
          </div>
        </motion.div>
      </ScrollSection>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-16 items-center">
          {/* Left — statement */}
          <ScrollSection>
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-5 text-indigo-600 dark:text-indigo-400/70">
              What you get
            </motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-bold leading-tight mb-5">
              <GlassHeading>One smart check<br />can save you thousands.</GlassHeading>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-base leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
              Know whether to buy, negotiate, or walk away — in under 60 seconds.
            </motion.p>
          </ScrollSection>

          {/* Right — feature rows */}
          <ScrollSection className="space-y-0">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={cardVariant}
                className="flex items-start gap-5 py-6 transition-colors"
                style={{
                  borderTop: i === 0 ? "1px solid var(--ds-divider)" : undefined,
                  borderBottom: "1px solid var(--ds-divider)",
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-500 dark:text-indigo-300 flex-shrink-0 mt-0.5"
                  style={{
                    background: "rgba(99,102,241,0.10)",
                    border: "1px solid rgba(99,102,241,0.18)",
                  }}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold mb-1">
                    <GlassHeading>{f.title}</GlassHeading>
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ds-text-3)" }}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </ScrollSection>
        </div>
      </section>

      {/* ── Live Example ── */}
      <section className="py-14 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <ScrollSection className="text-center mb-12">
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-indigo-600 dark:text-indigo-400/70">
              Live Example
            </motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-bold mb-3">
              <GlassHeading>See a real result</GlassHeading>
            </motion.h2>
          </ScrollSection>

          <ScrollSection className="flex justify-center">
            <motion.div
              variants={cardVariant}
              className="w-full max-w-2xl rounded-2xl p-7 sm:p-8"
              style={{
                background: "var(--ds-card-bg)",
                border: "1px solid var(--ds-card-border)",
                boxShadow: "0 0 0 1px var(--ds-card-border), 0 0 24px rgba(99,102,241,0.10), 0 4px 16px rgba(0,0,0,0.12)",
              }}
            >
              {/* Vehicle label */}
              <p className="text-xs font-medium tracking-wide mb-5" style={{ color: "var(--ds-text-4)" }}>
                2021 BMW M340i xDrive · 28,450 mi · 10015
              </p>

              {/* Score + verdict row */}
              <div className="flex items-center gap-6 mb-6">
                {/* Score gauge */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--ds-divider)" strokeWidth="6"/>
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke="#34d399" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - 74/100)}`}
                      strokeLinecap="round"
                      style={{ filter: "drop-shadow(0 0 4px rgba(52,211,153,0.4))" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold" style={{ color: "var(--ds-text-1)" }}>74</span>
                    <span className="text-[9px] font-medium tracking-wider uppercase" style={{ color: "var(--ds-text-4)" }}>/ 100</span>
                  </div>
                </div>

                {/* Verdict + pricing */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: "rgba(52,211,153,0.14)", border: "1px solid rgba(52,211,153,0.28)", color: "#34d399" }}>
                      Buy
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.18)", color: "var(--ds-text-3)" }}>
                      $900 below market
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div>
                      <span className="text-xs block mb-0.5" style={{ color: "var(--ds-text-4)" }}>Asking price</span>
                      <span className="font-semibold" style={{ color: "var(--ds-text-1)" }}>$42,500</span>
                    </div>
                    <div>
                      <span className="text-xs block mb-0.5" style={{ color: "var(--ds-text-4)" }}>Fair value range</span>
                      <span className="font-semibold" style={{ color: "var(--ds-text-1)" }}>$40,200 – $44,800</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs" style={{ color: "var(--ds-text-4)" }}>Mid-range estimate: </span>
                      <span className="text-xs font-medium" style={{ color: "var(--ds-text-3)" }}>$42,500</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px mb-5" style={{ background: "var(--ds-divider)" }} />

              {/* Key insights */}
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "var(--ds-text-4)" }}>Key Insights</p>
              <ul className="space-y-2.5">
                {[
                  "Clean depreciation curve for M-Sport models",
                  "Mileage 12% below avg for this year",
                  "Market comps show strong demand in this zip",
                ].map((insight) => (
                  <li key={insight} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--ds-text-2)" }}>
                    <span className="text-emerald-400 mt-0.5"><IconBullet /></span>
                    {insight}
                  </li>
                ))}
              </ul>
            </motion.div>
          </ScrollSection>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-14 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-2xl px-4">
          <ScrollSection className="text-center mb-14">
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-indigo-600 dark:text-indigo-400/70">
              Process
            </motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-bold mb-3">
              <GlassHeading>How it works</GlassHeading>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "var(--ds-text-3)" }}>Four steps. Under a minute. No commitment.</motion.p>
          </ScrollSection>

          <ScrollSection className="space-y-0">
            {steps.map(([title, desc], i) => (
              <motion.li key={i} variants={slideLeft} className="flex gap-5 items-start list-none relative">
                {/* Connecting line */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-extrabold text-white"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow: "0 0 20px rgba(99,102,241,0.35)" }}>
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex flex-col items-center gap-1 py-2">
                      {Array.from({ length: 4 }).map((_, d) => (
                        <div key={d} className="w-0.5 h-1.5 rounded-full" style={{ background: "rgba(99,102,241,0.25)" }} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="pt-2 pb-6">
                  <p className="font-semibold mb-1" style={{ color: "var(--ds-text-1)" }}>{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ds-text-3)" }}>{desc}</p>
                </div>
              </motion.li>
            ))}
          </ScrollSection>
        </div>
      </section>

      {/* ── Why Trust This? ── */}
      <section className="py-16 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <ScrollSection className="mb-10">
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold">
                <GlassHeading>Built on real data</GlassHeading>
              </h2>
              <p className="text-sm" style={{ color: "var(--ds-text-4)" }}>
                Authoritative sources. No guesses.
              </p>
            </motion.div>
          </ScrollSection>

          <ScrollSection className="grid sm:grid-cols-3 gap-0 rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--ds-card-border)", background: "var(--ds-card-bg)" }}>
            {trustSources.map((s, i) => (
              <motion.div
                key={s.title}
                variants={cardVariant}
                className="p-6 flex flex-col gap-3"
                style={{
                  borderRight: i < trustSources.length - 1 ? "1px solid var(--ds-divider)" : undefined,
                }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-indigo-500 dark:text-indigo-300"
                  style={{
                    background: "rgba(99,102,241,0.10)",
                    border: "1px solid rgba(99,102,241,0.18)",
                  }}>
                  {s.icon}
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold mb-1" style={{ color: "var(--ds-text-1)" }}>{s.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--ds-text-3)" }}>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </ScrollSection>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-14 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <ScrollSection className="text-center mb-12">
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-indigo-600 dark:text-indigo-400/70">
              Testimonials
            </motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-bold mb-3">
              <GlassHeading>What buyers are saying</GlassHeading>
            </motion.h2>
          </ScrollSection>

          <ScrollSection className="grid sm:grid-cols-3 gap-4">
            {[
              { name: "Marcus T.", car: "2021 Camry", quote: "Saved me $2,400. The dealer had no comeback when I pulled up the market data.", score: "78" },
              { name: "Sarah K.", car: "2020 CRV", quote: "I was about to overpay by $3k. DealSense caught it and gave me the script to negotiate.", score: "42" },
              { name: "James R.", car: "2019 F-150", quote: "Used it on 5 trucks before I found the right deal. Worth every penny.", score: "85" },
            ].map((t) => (
              <motion.div key={t.name} variants={cardVariant} className="rounded-2xl p-6"
                style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
                <div className="flex items-center gap-2 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} viewBox="0 0 20 20" fill="#fbbf24" className="w-4 h-4"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--ds-text-2)", fontStyle: "italic" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--ds-text-1)" }}>{t.name}</p>
                    <p className="text-xs" style={{ color: "var(--ds-text-4)" }}>{t.car}</p>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-1 rounded-lg"
                    style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.18)", color: "var(--ds-text-3)" }}>
                    Score: {t.score}
                  </span>
                </div>
              </motion.div>
            ))}
          </ScrollSection>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-14 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <ScrollSection className="text-center mb-4">
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-indigo-600 dark:text-indigo-400/70">
              Early Access
            </motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-bold mb-3">
              <GlassHeading>Free while we build it.</GlassHeading>
            </motion.h2>
            <motion.p variants={fadeUp} className="max-w-lg mx-auto leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
              We&apos;re giving early users free access in exchange for real feedback. Sign up now, analyze cars for free, and help shape the product. Founding members keep special perks when paid plans launch.
            </motion.p>
          </ScrollSection>

          {/* ── Founders Deal card ── */}
          <ScrollSection className="max-w-lg mx-auto mt-10 mb-10">
            <motion.div variants={cardVariant} className="relative rounded-2xl p-7 flex flex-col items-center text-center overflow-hidden"
              style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.22)", boxShadow: "0 0 32px rgba(99,102,241,0.10)" }}>
              <div className="absolute -top-px left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #6366f1, transparent)" }} />
              <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold mb-5"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "white", boxShadow: "0 0 20px rgba(99,102,241,0.5)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                Founders Deal
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-heading text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">Free</span>
              </div>
              <p className="text-sm mb-6" style={{ color: "var(--ds-text-3)" }}>
                Full access during early access — no catch
              </p>
              <ul className="space-y-2.5 mb-7 text-left w-full max-w-xs">
                {[
                  "Deal Score + clear verdict",
                  "Fair value range from real data",
                  "Ready-to-use negotiation script",
                  "Depreciation forecast",
                  "Save & share your reports",
                  "Full analysis history",
                  "Founding member perks — forever",
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--ds-text-2)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-500 dark:text-indigo-300"
                      style={{ background:"rgba(99,102,241,0.10)", border:"1px solid rgba(99,102,241,0.22)" }}>
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/analyze"
                className="w-full max-w-xs py-3 rounded-xl text-sm font-semibold text-center transition-all hover:brightness-110 active:scale-[0.98] text-white block"
                style={{ background:"linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow:"0 0 24px rgba(99,102,241,0.35)" }}>
                Analyze a car free
              </a>
              <p className="text-xs mt-3" style={{ color: "var(--ds-text-4)" }}>
                No credit card · Early access won&apos;t stay free forever
              </p>
            </motion.div>
          </ScrollSection>

          {/* ── Future pricing (coming soon) ── */}
          <ScrollSection>
            <motion.p variants={fadeIn} className="text-center text-xs mb-8 tracking-wide" style={{ color: "var(--ds-text-4)" }}>
              Paid plans launching soon — founding members keep their perks
            </motion.p>
          </ScrollSection>

          <ScrollSection className="hidden sm:grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto opacity-55">
            {/* Starter */}
            <motion.div variants={cardVariant} className="rounded-2xl p-6 flex flex-col"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: "var(--ds-text-4)" }}>Starter</p>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="font-heading text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">$6</span>
                <span className="text-sm font-medium" style={{ color: "var(--ds-text-4)" }}>.99</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--ds-text-4)" }}>3 analyses · <span style={{ color: "var(--ds-text-3)" }}>$2.33 each</span></p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {["3 car analyses","Deal Score + verdict","Fair value range","Negotiation script","Depreciation chart"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--ds-text-2)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400"
                      style={{ background:"rgba(52,211,153,0.10)", border:"1px solid rgba(52,211,153,0.20)" }}>
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs italic mb-4" style={{ color: "var(--ds-text-4)" }}>Best for: checking one car</p>
              <span className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
                style={{ background:"var(--ds-badge-bg)", border:"1px solid var(--ds-badge-border)", color: "var(--ds-text-4)" }}>
                Coming soon
              </span>
            </motion.div>

            {/* Standard */}
            <motion.div variants={cardVariant} className="relative rounded-2xl p-6 flex flex-col"
              style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap"
                style={{ background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.25)", color: "var(--ds-text-4)" }}>
                Most popular
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: "var(--ds-text-4)" }}>Standard</p>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="font-heading text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">$14</span>
                <span className="text-sm font-medium" style={{ color: "var(--ds-text-4)" }}>.99</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--ds-text-4)" }}>10 analyses · <span style={{ color: "var(--ds-text-3)" }}>$1.50 each</span></p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {["10 car analyses","Everything in Starter","VIN-verified pricing","Save & share reports","Analysis history"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--ds-text-2)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-indigo-500 dark:text-indigo-300"
                      style={{ background:"rgba(99,102,241,0.10)", border:"1px solid rgba(99,102,241,0.22)" }}>
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs italic mb-4" style={{ color: "var(--ds-text-4)" }}>Best for: comparing multiple options</p>
              <span className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
                style={{ background:"rgba(99,102,241,0.10)", border:"1px solid rgba(99,102,241,0.15)", color: "var(--ds-text-4)" }}>
                Coming soon
              </span>
            </motion.div>

            {/* Pro */}
            <motion.div variants={cardVariant} className="relative rounded-2xl p-6 flex flex-col"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap"
                style={{ background:"rgba(52,211,153,0.10)", border:"1px solid rgba(52,211,153,0.20)", color: "var(--ds-text-4)" }}>
                Best value
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: "var(--ds-text-4)" }}>Pro</p>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="font-heading text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">$29</span>
                <span className="text-sm font-medium" style={{ color: "var(--ds-text-4)" }}>.99</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--ds-text-4)" }}>25 analyses · <span style={{ color: "var(--ds-text-3)" }}>$1.20 each</span></p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {["25 car analyses","Everything in Standard","Best per-analysis value","Priority support","Early access to new features"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--ds-text-2)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400"
                      style={{ background:"rgba(52,211,153,0.10)", border:"1px solid rgba(52,211,153,0.20)" }}>
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs italic mb-4" style={{ color: "var(--ds-text-4)" }}>Best for: serious shoppers &amp; flippers</p>
              <span className="w-full py-2.5 rounded-xl text-sm font-semibold text-center"
                style={{ background:"var(--ds-badge-bg)", border:"1px solid var(--ds-badge-border)", color: "var(--ds-text-4)" }}>
                Coming soon
              </span>
            </motion.div>
          </ScrollSection>

          <ScrollSection>
            <motion.div variants={fadeIn} className="flex flex-wrap items-center justify-center gap-2 mt-8">
              {[
                { emoji: "⏰", label: "Credits never expire" },
                { emoji: "👁", label: "No dealer affiliation — ever" },
                { emoji: "🎁", label: "Free while in early access" },
                { emoji: "💎", label: "Founders keep perks when pricing launches" },
              ].map(({ emoji, label }) => (
                <span key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: "var(--ds-badge-bg)",
                    border: "1px solid var(--ds-badge-border)",
                    color: "var(--ds-text-3)",
                  }}>
                  <span>{emoji}</span>
                  {label}
                </span>
              ))}
            </motion.div>
          </ScrollSection>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-14 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-2xl px-4">
          <ScrollSection className="text-center mb-12">
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-indigo-600 dark:text-indigo-400/70">FAQ</motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl font-bold">
              <GlassHeading>Frequently asked questions</GlassHeading>
            </motion.h2>
          </ScrollSection>
          <ScrollSection className="space-y-3">
            {faqs.map((faq) => (
              <motion.div key={faq.q} variants={fadeUp} className="rounded-2xl px-6 py-5"
                style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
                <p className="font-semibold text-sm mb-2" style={{ color: "var(--ds-text-1)" }}>{faq.q}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ds-text-3)" }}>{faq.a}</p>
              </motion.div>
            ))}
          </ScrollSection>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-14 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <ScrollSection className="mx-auto max-w-2xl px-4 text-center">
          <motion.h2 variants={fadeUp} className="font-heading text-4xl font-bold mb-4">
            <GlassHeading>Check the deal before you sign.</GlassHeading>
          </motion.h2>
          <motion.p variants={fadeUp} className="mb-8 text-lg leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
            Avoid overpaying in under a minute. Paste a VIN and know where you stand.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/analyze"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                boxShadow: "0 0 20px rgba(99,102,241,0.3), 0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}>
              Get my Deal Score <IconArrow />
            </Link>
          </motion.div>
        </ScrollSection>
      </section>

      {/* ── Footer ── */}
      <ScrollSection>
        <motion.footer variants={fadeIn} className="py-8 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
          <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo variant="full" size={22} />
            <span className="text-xs tracking-wide" style={{ color: "var(--ds-text-4)" }}>Data: NHTSA vPIC · MarketCheck. Not financial advice.</span>
            <span className="text-xs" style={{ color: "var(--ds-text-4)" }}>© {new Date().getFullYear()}</span>
          </div>
        </motion.footer>
      </ScrollSection>
    </div>
  );
}
