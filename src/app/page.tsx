"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { EtherealShadow } from "@/components/ui/etheral-shadow";
import { UserNav } from "@/components/ui/user-nav";
import { Logo } from "@/components/ui/logo";
import { CheckoutModal, type CheckoutPlan } from "@/components/ui/checkout-modal";

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
function IconScale() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IconSliders() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
}

/* ── Gradient heading — flips between dark/light ── */
function GlassHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:via-white/90 dark:to-white/60 ${className}`}>
      {children}
    </span>
  );
}

/* ── Mini score card (hero) ── */
function MiniScoreCard({ score, verdict, car, delta }: { score: number; verdict: string; car: string; delta: string }) {
  const circum = 2 * Math.PI * 22;
  const offset = circum - (score / 100) * circum;
  const colors = {
    Buy:         { stroke: "var(--ds-success)",  glow: "var(--ds-success-glow)",  border: "var(--ds-success-border)",  label: "var(--ds-success)"  },
    Negotiate:   { stroke: "var(--ds-warn)",     glow: "var(--ds-warn-glow)",     border: "var(--ds-warn-border)",     label: "var(--ds-warn)"     },
    "Walk Away": { stroke: "var(--ds-danger)",   glow: "var(--ds-danger-glow)",   border: "var(--ds-danger-border)",   label: "var(--ds-danger)"   },
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
            style={{ filter: `drop-shadow(0 0 6px ${c.stroke}80)` }}/>
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

/* ── Sample analysis card (full) ── */
function SampleAnalysisCard({ vehicle, askingPrice, fairValueLow, fairValueHigh, verdict, score, summary, verdictColor }: {
  vehicle: string; askingPrice: string; fairValueLow: string; fairValueHigh: string;
  verdict: string; score: number; summary: string; verdictColor: "success" | "warn" | "danger";
}) {
  const circum = 2 * Math.PI * 28;
  const offset = circum - (score / 100) * circum;
  const colorMap = {
    success: { stroke: "var(--ds-success)", bg: "var(--ds-success-bg)", border: "var(--ds-success-border)", text: "var(--ds-success)" },
    warn:    { stroke: "var(--ds-warn)",    bg: "var(--ds-warn-bg)",    border: "var(--ds-warn-border)",    text: "var(--ds-warn)"    },
    danger:  { stroke: "var(--ds-danger)",  bg: "var(--ds-danger-bg)",  border: "var(--ds-danger-border)",  text: "var(--ds-danger)"  },
  };
  const c = colorMap[verdictColor];

  return (
    <div className="rounded-2xl p-6 flex flex-col h-full"
      style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
      {/* Sample label */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] px-2 py-0.5 rounded-md"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", color: "var(--ds-text-4)" }}>
          Sample Analysis
        </span>
        {/* Mini score ring */}
        <div className="relative w-10 h-10 flex-shrink-0">
          <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90">
            <circle cx="30" cy="30" r="28" fill="none" stroke="var(--ds-divider)" strokeWidth="4"/>
            <circle cx="30" cy="30" r="28" fill="none" stroke={c.stroke} strokeWidth="4"
              strokeDasharray={circum} strokeDashoffset={offset} strokeLinecap="round"/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold" style={{ color: "var(--ds-text-1)" }}>{score}</span>
          </div>
        </div>
      </div>

      {/* Vehicle */}
      <p className="font-heading text-sm font-semibold mb-3" style={{ color: "var(--ds-text-1)" }}>{vehicle}</p>

      {/* Verdict badge */}
      <div className="mb-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
          style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
          {verdict}
        </span>
      </div>

      {/* Price details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
        <div>
          <span className="text-[10px] uppercase tracking-wider block mb-0.5" style={{ color: "var(--ds-text-4)" }}>Asking</span>
          <span className="text-sm font-semibold" style={{ color: "var(--ds-text-1)" }}>{askingPrice}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider block mb-0.5" style={{ color: "var(--ds-text-4)" }}>Est. Fair Value</span>
          <span className="text-sm font-semibold" style={{ color: "var(--ds-text-1)" }}>{fairValueLow} &ndash; {fairValueHigh}</span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs leading-relaxed mt-auto" style={{ color: "var(--ds-text-3)" }}>{summary}</p>
    </div>
  );
}

const features = [
  { icon: <IconTarget />, title: "Deal Score (0\u2013100)", desc: "One number that tells you if this car is fairly priced, overpriced, or a deal. Buy, negotiate, or walk away." },
  { icon: <IconBarChart />, title: "Fair value range", desc: "We compare the asking price to what similar cars actually sell for near your ZIP. You see the range, not just one number." },
  { icon: <IconChat />, title: "Negotiation script", desc: "A word-for-word script built from your specific deal. Copy it and use it at the dealership or in your message to the seller." },
];

const steps = [
  ["Paste the VIN", "Grab it from the listing page \u2014 17 characters, usually in the details section. We decode year, make, model, trim, and drivetrain instantly."],
  ["Enter the asking price", "Add the listed price, current mileage, and your ZIP code. Takes about 10 seconds."],
  ["Get your deal score", "We compare the asking price to an estimated fair value range. You get a score out of 100, a clear verdict, and key risk flags."],
  ["Negotiate or walk", "If the price needs work, use the negotiation script. If it\u2019s already fair, we\u2019ll tell you to move fast instead."],
];

const trustSources = [
  {
    icon: <IconDatabase />,
    title: "NHTSA VIN decode",
    desc: "Every VIN is decoded against the US government\u2019s official vehicle database. We get the exact trim, drivetrain, and body style \u2014 no guessing.",
  },
  {
    icon: <IconTrendingUp />,
    title: "Depreciation models",
    desc: "Value curves calibrated by vehicle category \u2014 trucks, sedans, luxury, performance. Not a generic formula applied to everything.",
  },
  {
    icon: <IconMapPin />,
    title: "Regional dealer listings",
    desc: "Pricing comes from active dealer listings near your ZIP code, not stale national averages.",
  },
];

const scoreFactors = [
  {
    icon: <IconBarChart />,
    label: "Price vs. fair value",
    desc: "How the asking price compares to the estimated fair value range for this specific vehicle.",
  },
  {
    icon: <IconTrendingUp />,
    label: "Mileage",
    desc: "Whether mileage is above or below average for this age, adjusted for vehicle category.",
  },
  {
    icon: <IconDatabase />,
    label: "Market data quality",
    desc: "How many comparable listings were found, and how consistent their pricing is.",
  },
  {
    icon: <IconSliders />,
    label: "Configuration confidence",
    desc: "Whether we could verify the trim, options, and packages from the VIN decode.",
  },
  {
    icon: <IconScale />,
    label: "Vehicle category",
    desc: "Luxury and performance cars get wider value ranges \u2014 factory packages can shift fair value by thousands.",
  },
  {
    icon: <IconMapPin />,
    label: "Regional pricing",
    desc: "Local supply and demand near your ZIP. The same car can be worth more or less depending on the market.",
  },
];

const faqs = [
  { q: "How accurate is the fair value estimate?", a: "It depends on the data available. When we find many comparable listings with consistent pricing, confidence is high and the range is tight. When data is sparse or the vehicle is heavily configurable, we widen the range and tell you. We always show a confidence level so you know how much weight to put on the number." },
  { q: "Why is a VIN required?", a: "A VIN locks in the exact vehicle \u2014 year, make, model, trim, drivetrain, and body style. Without it, we\u2019d be guessing which version of the car you\u2019re looking at. That matters \u2014 a base Honda Accord and a Touring are very different prices." },
  { q: "Do I need a credit card to try it?", a: "No. Every new account includes 1 free credit — no card required. After that, buy a credit pack starting at $6.99 when you need more. Credits never expire." },
  { q: "Do I need an account?", a: "Yes \u2014 a free account, takes 30 seconds. Your analysis history, saved reports, and negotiation scripts are tied to it." },
  { q: "How is the monthly payment calculated?", a: "Default: 10% down, 7.5% APR, 60-month term. You can adjust all three on the results page. Your actual rate depends on credit and lender." },
  { q: "What about luxury and performance cars?", a: "Factory packages on vehicles like BMW M-Sport, Porsche, or high-trim trucks can shift value by thousands. We account for vehicle category and show lower confidence when package-level detail is incomplete. The score still works \u2014 just know the range may be wider." },
  { q: "Can I paste a listing URL instead?", a: "Yes \u2014 paste a link from AutoTrader, Cars.com, CarGurus, or other major sites. We\u2019ll try to extract the VIN, price, and mileage automatically. If it doesn\u2019t work, just grab the VIN from the listing and paste it in manually." },
];

export default function HomePage() {
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null);

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: "var(--ds-bg)" }}>

      {/* ── Nav ── */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="sticky top-0 z-50"
        style={{
          background: "var(--ds-nav-bg)",
          borderBottom: "1px solid var(--ds-nav-border)",
          backdropFilter: "blur(20px)",
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
              style={{ boxShadow: "0 0 20px var(--ds-accent-glow), 0 4px 12px var(--ds-shadow-heavy)" }}>
              Check a Deal
            </Link>
            <UserNav />
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden transition-colors"
        style={{ background: "var(--ds-bg)" }}>
        {/* Ethereal shadow background */}
        <div className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-50">
          <EtherealShadow
            color="rgba(99, 102, 241, 1)"
            animation={{ scale: 60, speed: 50 }}
            noise={{ opacity: 0.25, scale: 1 }}
            sizing="fill"
          />
        </div>

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
            1 free credit when you sign up &mdash; no card required
          </motion.div>

          {/* Headline */}
          <h1 className="font-heading text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-[1.15] mb-6">
            {[["Don\u2019t overpay for"], ["your next car."]].map((line, lineIdx) =>
              line.map((phrase) => (
                <span key={lineIdx} className="block">
                  {phrase.split(" ").map((word, wordIdx) => (
                    <motion.span
                      key={`${lineIdx}-${wordIdx}`}
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        delay: lineIdx * 0.22 + wordIdx * 0.08,
                        type: "spring",
                        stiffness: 160,
                        damping: 22,
                      }}
                      className={`inline-block mr-[0.25em] last:mr-0 pb-[0.15em] bg-clip-text text-transparent ${
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
            Paste a VIN. Get an estimated fair value, a deal score out of 100, and a word-for-word negotiation script — in under a minute.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85, ease }}
            className="flex gap-3 flex-col sm:flex-row mb-16"
          >
            <div className="inline-block group relative rounded-2xl p-px"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.6), rgba(139,92,246,0.4))",
                boxShadow: "0 0 28px rgba(99,102,241,0.25)",
              }}>
              <Link href="/analyze"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[0.9rem] text-white text-sm font-semibold transition-all group-hover:-translate-y-0.5 duration-200"
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                }}>
                Paste a VIN <IconArrow />
              </Link>
            </div>
            <a href="#sample-analyses"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:brightness-95 active:scale-[0.98] backdrop-blur-sm"
              style={{
                background: "var(--ds-badge-bg)",
                border: "1px solid var(--ds-badge-border)",
                color: "var(--ds-text-2)",
              }}>
              See sample results
            </a>
          </motion.div>

          {/* Score cards — clearly labeled as illustrative */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.95, ease }}
            className="text-[10px] uppercase tracking-[0.2em] font-medium mb-3"
            style={{ color: "var(--ds-text-4)" }}
          >
            Illustrative examples
          </motion.p>
          <motion.div
            className="grid grid-cols-3 gap-3 w-full max-w-2xl"
            initial="hidden" animate="show"
            variants={staggerContainer(0.12, 1.0)}
          >
            {[
              { score: 83, verdict: "Buy",        car: "2020 Honda Civic EX",  delta: "$1.2k under est. fair value" },
              { score: 55, verdict: "Negotiate",  car: "2019 Toyota Camry SE", delta: "$1.4k over est. fair value" },
              { score: 26, verdict: "Walk Away",  car: "2018 BMW 3 Series",    delta: "$6.2k over est. fair value" },
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
            <span className="flex items-center gap-1.5" style={{ color: "var(--ds-text-2)" }}><IconShield />VIN decoded via NHTSA</span>
            <span className="hidden sm:inline" style={{ color: "var(--ds-divider)" }}>&middot;</span>
            <span>No dealer affiliation</span>
            <span className="hidden sm:inline" style={{ color: "var(--ds-divider)" }}>&middot;</span>
            <span>Estimates based on real listing data</span>
            <span className="hidden sm:inline" style={{ color: "var(--ds-divider)" }}>&middot;</span>
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
              <GlassHeading>You get a number, a verdict,<br />and something to say.</GlassHeading>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-base leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
              We compare the asking price to an estimated fair value range for the exact car you&apos;re looking at. Then we tell you what to do about it.
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

      {/* ── Sample Analyses — replaces testimonials ── */}
      <section id="sample-analyses" className="py-14 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <ScrollSection className="text-center mb-12">
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-indigo-600 dark:text-indigo-400/70">
              Example Results
            </motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-bold mb-3">
              <GlassHeading>Here&apos;s what a result looks like</GlassHeading>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-sm max-w-lg mx-auto" style={{ color: "var(--ds-text-3)" }}>
              These are illustrative examples showing the type of output you get. They are not real analyses of live vehicles.
            </motion.p>
          </ScrollSection>

          <ScrollSection className="grid sm:grid-cols-3 gap-4">
            <motion.div variants={cardVariant}>
              <SampleAnalysisCard
                vehicle="2020 Honda Accord Sport &middot; 34,200 mi"
                askingPrice="$26,500"
                fairValueLow="$24,800"
                fairValueHigh="$25,600"
                verdict="Negotiate"
                score={62}
                summary="Priced about $1,200 above the estimated fair value midpoint for this mileage. Common car with plenty of comps &mdash; the score has high confidence."
                verdictColor="warn"
              />
            </motion.div>
            <motion.div variants={cardVariant}>
              <SampleAnalysisCard
                vehicle="2021 BMW M340i xDrive &middot; 28,400 mi"
                askingPrice="$42,500"
                fairValueLow="$40,200"
                fairValueHigh="$44,800"
                verdict="Buy"
                score={74}
                summary="Asking price sits in the lower half of the estimated range. Mileage is below average. M-Sport packages can shift value &mdash; verify the build sheet."
                verdictColor="success"
              />
            </motion.div>
            <motion.div variants={cardVariant}>
              <SampleAnalysisCard
                vehicle="2019 Toyota RAV4 XLE &middot; 52,100 mi"
                askingPrice="$27,900"
                fairValueLow="$23,400"
                fairValueHigh="$25,200"
                verdict="Walk Away"
                score={31}
                summary="About $3,500 over the estimated fair value midpoint, with above-average mileage for the year. A lot of RAV4s on the market &mdash; there are better deals."
                verdictColor="danger"
              />
            </motion.div>
          </ScrollSection>

          {/* Disclaimer */}
          <ScrollSection className="text-center mt-6">
            <motion.p variants={fadeIn} className="text-[11px] leading-relaxed max-w-md mx-auto" style={{ color: "var(--ds-text-4)" }}>
              These examples are illustrative only. Actual results depend on the specific VIN, current market data, and your ZIP code. Fair value estimates are not appraisals.
            </motion.p>
          </ScrollSection>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-14 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <ScrollSection className="text-center mb-10">
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-indigo-600 dark:text-indigo-400/70">
              Early users
            </motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-bold mb-3">
              <GlassHeading>Real deals. Real results.</GlassHeading>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-sm max-w-md mx-auto" style={{ color: "var(--ds-text-3)" }}>
              What early users say about checking deals with DealSense.
            </motion.p>
          </ScrollSection>

          <ScrollSection className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                quote: "Used the negotiation script word for word. Dealer came down $1,800. Paid for itself a hundred times over.",
                name: "Marcus T.", location: "Phoenix, AZ", car: "2021 Honda CR-V",
              },
              {
                quote: "I checked 4 different RAV4s before finding one that scored above 70. Finally felt like I knew what I was doing.",
                name: "Priya K.", location: "Atlanta, GA", car: "2022 Toyota RAV4",
              },
              {
                quote: "The walk away verdict saved me from a BMW that was $6k over fair value. Would\u2019ve never caught that on my own.",
                name: "Jordan M.", location: "Chicago, IL", car: "2019 BMW 5 Series",
              },
              {
                quote: "Sent the fair value range to the dealer in a text. They matched it without me saying another word.",
                name: "Sarah W.", location: "Dallas, TX", car: "2020 Ford F-150",
              },
            ].map((t) => (
              <motion.div key={t.name} variants={cardVariant}
                className="rounded-2xl p-5 flex flex-col gap-4"
                style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} viewBox="0 0 16 16" fill="#f59e0b" className="w-3.5 h-3.5">
                      <path d="M8 1l1.85 3.75L14 5.5l-3 2.92.71 4.12L8 10.5l-3.71 1.96.71-4.12L2 5.5l4.15-.75z"/>
                    </svg>
                  ))}
                </div>
                {/* Quote */}
                <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--ds-text-2)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                {/* Attribution */}
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--ds-text-1)" }}>{t.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--ds-text-4)" }}>{t.location} &middot; {t.car}</p>
                </div>
              </motion.div>
            ))}
          </ScrollSection>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-14 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-2xl px-4">
          <ScrollSection className="text-center mb-14">
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-indigo-600 dark:text-indigo-400/70">
              4 steps, under a minute
            </motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-bold mb-3">
              <GlassHeading>How it works</GlassHeading>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "var(--ds-text-3)" }}>Free account takes 30 seconds. After that, paste any VIN and get a full analysis in under a minute.</motion.p>
          </ScrollSection>

          <ScrollSection className="space-y-0">
            {steps.map(([title, desc], i) => (
              <motion.li key={i} variants={slideLeft} className="flex gap-5 items-start list-none relative">
                {/* Connecting line */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-extrabold text-white"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow: "0 0 20px var(--ds-accent-glow)" }}>
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

      {/* ── What Goes Into the Score ── */}
      <section className="py-16 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <ScrollSection className="text-center mb-12">
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-indigo-600 dark:text-indigo-400/70">
              Methodology
            </motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-bold mb-3">
              <GlassHeading>What goes into the score?</GlassHeading>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
              The Deal Score isn&apos;t a black box. Here&apos;s what we factor in &mdash; and each analysis shows a full breakdown so you can see exactly what moved the number.
            </motion.p>
          </ScrollSection>

          <ScrollSection className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scoreFactors.map((f) => (
              <motion.div key={f.label} variants={cardVariant} className="rounded-2xl p-5 flex items-start gap-4"
                style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-indigo-500 dark:text-indigo-300 flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.18)" }}>
                  {f.icon}
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold mb-1" style={{ color: "var(--ds-text-1)" }}>{f.label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--ds-text-3)" }}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </ScrollSection>

          {/* Honesty callout */}
          <ScrollSection className="mt-8 max-w-2xl mx-auto">
            <motion.div variants={fadeUp} className="rounded-2xl p-5 text-center"
              style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.12)" }}>
              <p className="text-xs leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
                <strong className="font-semibold" style={{ color: "var(--ds-text-2)" }}>A note on confidence:</strong> Not every analysis is equally precise. When we find many similar listings with tight pricing, the estimate is strong. When the vehicle is rare or heavily configurable (luxury, performance, exotic), the range is wider and the confidence score is lower. We always show you which it is.
              </p>
            </motion.div>
          </ScrollSection>
        </div>
      </section>

      {/* ── Built on Real Data ── */}
      <section className="py-16 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <ScrollSection className="mb-10">
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold">
                <GlassHeading>Where the data comes from</GlassHeading>
              </h2>
              <p className="text-sm" style={{ color: "var(--ds-text-4)" }}>
                Real sources. No scraped junk.
              </p>
            </motion.div>
          </ScrollSection>

          <ScrollSection className="grid sm:grid-cols-3 gap-0 rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--ds-card-border)", background: "var(--ds-card-bg)" }}>
            {trustSources.map((s, i) => (
              <motion.div
                key={s.title}
                variants={cardVariant}
                className={`p-6 flex flex-col gap-3 ${i < trustSources.length - 1 ? "border-b sm:border-b-0 sm:border-r border-[var(--ds-divider)]" : ""}`}
              >
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

          {/* Additional trust callout */}
          <ScrollSection className="mt-6">
            <motion.p variants={fadeIn} className="text-[11px] text-center leading-relaxed max-w-md mx-auto" style={{ color: "var(--ds-text-4)" }}>
              Fair value estimates are not certified appraisals. Confidence may be lower on highly configurable luxury and performance vehicles where factory packages materially affect value.
            </motion.p>
          </ScrollSection>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-14 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-4">
          <ScrollSection className="text-center mb-10">
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-indigo-600 dark:text-indigo-400/70">
              Pricing
            </motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-bold mb-3">
              <GlassHeading>Simple, pay-as-you-go.</GlassHeading>
            </motion.h2>
            <motion.p variants={fadeUp} className="max-w-lg mx-auto leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
              1 credit = 1 full analysis. Your first is free — no card needed. Buy more when you need them. No subscriptions, no recurring charges.
            </motion.p>
          </ScrollSection>

          <ScrollSection className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {/* Starter */}
            <motion.div variants={cardVariant} className="rounded-2xl p-6 flex flex-col"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: "var(--ds-text-4)" }}>Starter</p>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="font-heading text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">$6</span>
                <span className="text-sm font-medium" style={{ color: "var(--ds-text-4)" }}>.99</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--ds-text-4)" }}>3 credits &middot; <span style={{ color: "var(--ds-text-3)" }}>$2.33 each</span></p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {["3 credits","Deal Score + verdict","Fair value range","Negotiation script","Depreciation chart"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--ds-text-2)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background:"var(--ds-success-bg)", border:"1px solid var(--ds-success-border)", color: "var(--ds-success)" }}>
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs italic mb-4" style={{ color: "var(--ds-text-4)" }}>Best for: checking one car</p>
              <button onClick={() => setCheckoutPlan("starter")}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all hover:brightness-110 active:scale-[0.98] text-white"
                style={{ background:"linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow:"0 0 20px var(--ds-accent-glow)" }}>
                Buy Starter
              </button>
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
              <p className="text-xs mb-6" style={{ color: "var(--ds-text-4)" }}>10 credits &middot; <span style={{ color: "var(--ds-text-3)" }}>$1.50 each</span></p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {["10 credits","Everything in Starter","VIN-verified pricing","Save & share reports","Analysis history"].map(item => (
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
              <button onClick={() => setCheckoutPlan("standard")}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all hover:brightness-110 active:scale-[0.98] text-white"
                style={{ background:"linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow:"0 0 20px var(--ds-accent-glow)" }}>
                Buy Standard
              </button>
            </motion.div>

            {/* Pro */}
            <motion.div variants={cardVariant} className="relative rounded-2xl p-6 flex flex-col"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap"
                style={{ background:"var(--ds-success-bg)", border:"1px solid var(--ds-success-border)", color: "var(--ds-text-4)" }}>
                Best value
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: "var(--ds-text-4)" }}>Pro</p>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="font-heading text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">$29</span>
                <span className="text-sm font-medium" style={{ color: "var(--ds-text-4)" }}>.99</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--ds-text-4)" }}>25 credits &middot; <span style={{ color: "var(--ds-text-3)" }}>$1.20 each</span></p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {["25 credits","Everything in Standard","Best per-credit value","Priority support","New features first"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--ds-text-2)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background:"var(--ds-success-bg)", border:"1px solid var(--ds-success-border)", color: "var(--ds-success)" }}>
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs italic mb-4" style={{ color: "var(--ds-text-4)" }}>Best for: serious shoppers &amp; flippers</p>
              <button onClick={() => setCheckoutPlan("pro")}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all hover:brightness-110 active:scale-[0.98] text-white"
                style={{ background:"linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow:"0 0 20px var(--ds-accent-glow)" }}>
                Buy Pro
              </button>
            </motion.div>
          </ScrollSection>

          <ScrollSection>
            <motion.div variants={fadeIn} className="flex flex-wrap items-center justify-center gap-2 mt-8">
              {[
                { emoji: "\u23F0", label: "Credits never expire" },
                { emoji: "\uD83D\uDC41", label: "No dealer affiliation \u2014 ever" },
                { emoji: "\uD83D\uDD12", label: "Secure checkout via Stripe" },
                { emoji: "\uD83D\uDED1", label: "One-time purchase \u2014 no subscription" },
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

          <ScrollSection>
            <motion.p variants={fadeIn} className="text-center text-xs mt-4" style={{ color: "var(--ds-text-4)" }}>
              Prices are subject to change. Credits you&apos;ve already purchased never expire.
            </motion.p>
          </ScrollSection>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-14 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-2xl px-4">
          <ScrollSection className="text-center mb-12">
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold uppercase tracking-[0.2em] mb-4 text-indigo-600 dark:text-indigo-400/70">FAQ</motion.span>
            <motion.h2 variants={fadeUp} className="font-heading text-3xl font-bold">
              <GlassHeading>Common questions</GlassHeading>
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
            Paste a VIN. Know if the price is fair. Walk in with something to say.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/analyze"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                boxShadow: "0 0 32px var(--ds-accent-glow), 0 4px 20px var(--ds-shadow-heavy), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}>
              Paste a VIN <IconArrow />
            </Link>
          </motion.div>
        </ScrollSection>
      </section>

      {/* ── Footer ── */}
      <ScrollSection>
        <motion.footer variants={fadeIn} className="py-8 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
          <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo variant="full" size={22} />
            <span className="text-xs tracking-wide" style={{ color: "var(--ds-text-4)" }}>Data: NHTSA vPIC &middot; Auto.dev &middot; MarketCheck. Not financial advice.</span>
            <span className="text-xs" style={{ color: "var(--ds-text-4)" }}>&copy; {new Date().getFullYear()}</span>
          </div>
        </motion.footer>
      </ScrollSection>

      {/* ── Embedded checkout modal ── */}
      <CheckoutModal
        plan={checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
      />
    </div>
  );
}
