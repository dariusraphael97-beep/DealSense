"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EtherealShadow } from "@/components/ui/etheral-shadow";
import { UserNav } from "@/components/ui/user-nav";
import { Logo } from "@/components/ui/logo";
import { CheckoutModal, type CheckoutPlan } from "@/components/ui/checkout-modal";

// Register once at module scope — never inside useEffect
gsap.registerPlugin(ScrollTrigger);

/* ── Hero dark-section color constants ─────────────────────────────────── */
const H = {
  bg:          "#08080A",
  text1:       "rgba(255,255,255,0.95)",
  text2:       "rgba(255,255,255,0.62)",
  text3:       "rgba(255,255,255,0.42)",
  gold:        "#C8941A",
  goldBg:      "rgba(200,148,26,0.12)",
  goldBorder:  "rgba(200,148,26,0.25)",
  cardBg:      "rgba(255,255,255,0.055)",
  cardBorder:  "rgba(255,255,255,0.09)",
  divider:     "rgba(255,255,255,0.07)",
  ctaBg:       "#EDE9DF",
  ctaText:     "#0A0908",
  ctaShadow:   "0 4px 20px rgba(200,148,26,0.30), 0 1px 4px rgba(0,0,0,0.25)",
  ghostBorder: "rgba(255,255,255,0.16)",
  ghostText:   "rgba(255,255,255,0.65)",
};

/* ── Cycling headline word ──────────────────────────────────────────────── */
const WORDS = ["sign.", "negotiate.", "buy right."];

function CyclingWord() {
  const ref = useRef<HTMLSpanElement>(null);
  const idxRef = useRef(0);
  const [word, setWord] = useState(WORDS[0]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const cycle = () => {
      gsap.to(el, {
        y: -44, opacity: 0, duration: 0.42, ease: "power2.in",
        onComplete() {
          idxRef.current = (idxRef.current + 1) % WORDS.length;
          setWord(WORDS[idxRef.current]);
          gsap.fromTo(el,
            { y: 52, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.52, ease: "power3.out" }
          );
        },
      });
    };

    const id = setInterval(cycle, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      ref={ref}
      className="italic font-editorial"
      style={{ display: "inline-block", color: H.gold }}
    >
      {word}
    </span>
  );
}

/* ── Icons ──────────────────────────────────────────────────────────────── */
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
function IconScale() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IconSliders() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
}

/* ── Mini score card (hero) ─────────────────────────────────────────────── */
function MiniScoreCard({ score, verdict, car, delta }: {
  score: number; verdict: string; car: string; delta: string;
}) {
  const circ = 2 * Math.PI * 22;
  const off  = circ - (score / 100) * circ;
  const cols = {
    Buy:         { stroke: "#059669", border: "rgba(5,150,105,0.35)",  label: "#059669"  },
    Negotiate:   { stroke: "#d97706", border: "rgba(217,119,6,0.35)",  label: "#d97706"  },
    "Walk Away": { stroke: "#dc2626", border: "rgba(220,38,38,0.35)",  label: "#dc2626"  },
  } as const;
  const c = cols[verdict as keyof typeof cols] ?? cols["Negotiate"];

  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
      style={{ background: H.cardBg, border: `1px solid ${c.border}` }}>
      <div className="relative w-11 h-11 flex-shrink-0">
        <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
          <circle cx="24" cy="24" r="22" fill="none" stroke={H.divider} strokeWidth="4"/>
          <circle cx="24" cy="24" r="22" fill="none" stroke={c.stroke} strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color: H.text1 }}>{score}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs truncate mb-0.5" style={{ color: H.text3 }}>{car}</p>
        <p className="text-sm font-semibold" style={{ color: c.label }}>{verdict}</p>
        <p className="text-xs mt-0.5" style={{ color: H.text3 }}>{delta}</p>
      </div>
    </div>
  );
}

/* ── Large hero score ring ───────────────────────────────────────────────── */
function HeroScoreRing({ score, verdict, car, delta }: {
  score: number; verdict: string; car: string; delta: string;
}) {
  const circ   = 2 * Math.PI * 54;
  const offset = circ - (score / 100) * circ;
  const numRef = useRef<HTMLSpanElement>(null);

  const cols = {
    Buy:        { stroke: "#059669", bg: "rgba(5,150,105,0.10)", border: "rgba(5,150,105,0.30)", text: "#059669" },
    Negotiate:  { stroke: "#d97706", bg: "rgba(217,119,6,0.10)", border: "rgba(217,119,6,0.30)", text: "#d97706" },
    "Walk Away":{ stroke: "#dc2626", bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.30)", text: "#dc2626" },
  } as const;
  const c = cols[verdict as keyof typeof cols] ?? cols["Negotiate"];

  useEffect(() => {
    if (!numRef.current) return;
    const obj = { n: 0 };
    const t = gsap.to(obj, {
      n: score, duration: 1.6, delay: 1.3, ease: "power2.out",
      onUpdate() { if (numRef.current) numRef.current.textContent = String(Math.round(obj.n)); },
    });
    return () => { t.kill(); };
  }, [score]);

  return (
    <div className="rounded-3xl p-6 flex flex-col items-center"
      style={{
        background: H.cardBg,
        border: `1px solid ${c.border}`,
        boxShadow: `0 0 60px ${c.bg}`,
        width: 280,
      }}>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: H.text3 }}>
        Sample Analysis
      </span>
      <div className="relative w-36 h-36 mb-4">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <defs>
            <filter id="ringGlow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="64" cy="64" r="54" fill="none" stroke={H.divider} strokeWidth="6"/>
          <circle
            cx="64" cy="64" r="54" fill="none"
            stroke={c.stroke} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circ}
            className="ring-draw"
            style={{
              "--full-circ": circ,
              "--target-offset": offset,
            } as React.CSSProperties}
            filter="url(#ringGlow)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span ref={numRef} className="font-editorial text-5xl font-bold tabular-nums" style={{ color: H.text1 }}>0</span>
          <span className="text-[10px] uppercase tracking-[0.12em] mt-0.5" style={{ color: H.text3 }}>Score</span>
        </div>
      </div>
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-3"
        style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
        {verdict}
      </span>
      <p className="text-sm font-semibold mb-1 text-center" style={{ color: H.text1 }}>{car}</p>
      <p className="text-xs text-center" style={{ color: H.text3 }}>{delta}</p>
    </div>
  );
}

/* ── Sample analysis card (body) ────────────────────────────────────────── */
function SampleAnalysisCard({ vehicle, askingPrice, fairValueLow, fairValueHigh, verdict, score, summary, verdictColor }: {
  vehicle: string; askingPrice: string; fairValueLow: string; fairValueHigh: string;
  verdict: string; score: number; summary: string; verdictColor: "success" | "warn" | "danger";
}) {
  const circ = 2 * Math.PI * 28;
  const off  = circ - (score / 100) * circ;
  const cm = {
    success: { stroke: "var(--ds-success)", bg: "var(--ds-success-bg)", border: "var(--ds-success-border)", text: "var(--ds-success)" },
    warn:    { stroke: "var(--ds-warn)",    bg: "var(--ds-warn-bg)",    border: "var(--ds-warn-border)",    text: "var(--ds-warn)"    },
    danger:  { stroke: "var(--ds-danger)",  bg: "var(--ds-danger-bg)",  border: "var(--ds-danger-border)",  text: "var(--ds-danger)"  },
  };
  const c = cm[verdictColor];

  return (
    <div className="rounded-2xl p-6 flex flex-col h-full"
      style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] px-2 py-0.5 rounded-md"
          style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: "var(--ds-text-4)" }}>
          Sample
        </span>
        <div className="relative w-10 h-10">
          <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90">
            <circle cx="30" cy="30" r="28" fill="none" stroke="var(--ds-divider)" strokeWidth="4"/>
            <circle cx="30" cy="30" r="28" fill="none" stroke={c.stroke} strokeWidth="4"
              strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold" style={{ color: "var(--ds-text-1)" }}>{score}</span>
          </div>
        </div>
      </div>
      <p className="font-heading text-sm font-semibold mb-3" style={{ color: "var(--ds-text-1)" }}>{vehicle}</p>
      <div className="mb-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
          style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
          {verdict}
        </span>
      </div>
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
      <p className="text-xs leading-relaxed mt-auto" style={{ color: "var(--ds-text-3)" }}>{summary}</p>
    </div>
  );
}

/* ── Static data ────────────────────────────────────────────────────────── */
const features = [
  { icon: <IconTarget />, title: "Deal Score (0–100)", desc: "One number tells you: Buy, Negotiate, or Walk Away." },
  { icon: <IconBarChart />, title: "Fair value range", desc: "Asking price vs. what comparable cars actually sell for near your ZIP." },
  { icon: <IconChat />, title: "Negotiation script", desc: "Word-for-word lines built from your specific deal — not a template." },
];

const steps: [string, string][] = [
  ["Paste the VIN", "17 characters from the listing. We decode make, model, trim, and drivetrain instantly."],
  ["Enter the asking price", "Add the listed price, mileage, and ZIP. About 10 seconds."],
  ["Get your deal score", "Score out of 100, a verdict, and key risk flags."],
  ["Negotiate or walk", "Use the negotiation script if needed — or buy with confidence."],
];

const trustSources = [
  { icon: <IconDatabase />, title: "NHTSA VIN decode", desc: "Decoded against the US government's official vehicle database. Exact trim, drivetrain, and body style — no guessing." },
  { icon: <IconTrendingUp />, title: "Real market data", desc: "Value estimates from active dealer listings and transaction data — calibrated by vehicle category, not a one-size-fits-all formula." },
  { icon: <IconMapPin />, title: "Your ZIP code", desc: "Pricing pulled from listings near you. The same car can be worth meaningfully more or less depending on regional demand." },
];

const faqs = [
  { q: "How accurate is the fair value estimate?", a: "It depends on available data. More comparable listings with consistent pricing = tighter range and higher confidence. Rare or heavily configurable vehicles get wider ranges. We always show a confidence level so you know how much weight to give the number." },
  { q: "Why is a VIN required?", a: "A VIN locks in the exact vehicle — trim, drivetrain, and body style. A base Honda Accord and a Touring are very different prices. Without a VIN, we'd be guessing which version you're looking at." },
  { q: "Do I need an account?", a: "Yes — free, takes 30 seconds. Your analysis history, saved reports, and negotiation scripts are tied to it." },
  { q: "Can I paste a listing URL instead of a VIN?", a: "Yes — paste a link from AutoTrader, Cars.com, CarGurus, or most major sites. We'll extract the VIN, price, and mileage automatically. If it doesn't work, grab the VIN from the listing and paste it directly." },
];

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function HomePage() {
  const pageRef   = useRef<HTMLDivElement>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {

      /* ── Optimization settings ── */
      gsap.ticker.lagSmoothing(500, 33);
      ScrollTrigger.config({ ignoreMobileResize: true });

      /* ── 1. Hero entrance — stagger from multiple directions ── */
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTl
        .fromTo('[data-g="nav"]',    { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 })
        .fromTo('[data-g="eyebrow"]',{ x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, "-=0.2")
        .fromTo('[data-g="h1-0"]',   { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75 }, "-=0.25")
        .fromTo('[data-g="h1-1"]',   { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75 }, "-=0.55")
        .fromTo('[data-g="h1-2"]',   { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75 }, "-=0.55")
        .fromTo('[data-g="hero-sub"]',{ y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.4")
        .fromTo('[data-g="hero-cta"]',{ y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, "-=0.35")
        .fromTo('[data-g="hero-trust"]',{ opacity: 0 }, { opacity: 1, duration: 0.5 }, "-=0.2")
        .fromTo('[data-g="hero-ring"]',
          { x: 50, opacity: 0, scale: 0.92 },
          { x: 0, opacity: 1, scale: 1, duration: 0.85, ease: "power3.out" }, 0.3)
        .fromTo('[data-g="hero-cards"] > *',
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55, stagger: 0.14, ease: "power3.out" }, "-=0.4");

      /* ── 2. Trust bar items — slide in from left ── */
      gsap.from('[data-g="trust-item"]', {
        x: -30, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out",
        scrollTrigger: { trigger: '[data-g="trust-bar"]', start: "top 88%", once: true },
      });

      /* ── 3. Features section header ── */
      gsap.from('[data-g="feat-header"] > *', {
        y: 40, opacity: 0, duration: 0.65, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: '[data-g="feat-header"]', start: "top 82%", once: true },
      });

      /* ── 4. Feature rows — alternating left/right ── */
      gsap.utils.toArray<HTMLElement>('[data-g="feat-row"]').forEach((el, i) => {
        gsap.from(el, {
          x: i % 2 === 0 ? -50 : 50, opacity: 0, duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 84%", once: true },
        });
      });

      /* ── 5. Sample section header ── */
      gsap.from('[data-g="sample-header"] > *', {
        y: 40, opacity: 0, duration: 0.65, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: '[data-g="sample-header"]', start: "top 82%", once: true },
      });

      /* ── 6. Sample cards — batch stagger from below ── */
      ScrollTrigger.batch('[data-g="sample-card"]', {
        onEnter: (els) => gsap.fromTo(els,
          { y: 55, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.12, ease: "power3.out" }
        ),
        start: "top 86%",
        once: true,
      });

      /* ── 7. Testimonials — alternating diagonal ── */
      gsap.utils.toArray<HTMLElement>('[data-g="testimonial"]').forEach((el, i) => {
        const dirs = [
          { x: -40, y: 30 }, { x: 0, y: 50 }, { x: 40, y: 30 }, { x: 0, y: 50 },
        ];
        const d = dirs[i % 4];
        gsap.from(el, {
          x: d.x, y: d.y, opacity: 0, duration: 0.72, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        });
      });

      /* ── 8. How it works steps — slide from left with stagger ── */
      gsap.from('[data-g="step"]', {
        x: -48, opacity: 0, duration: 0.65, stagger: 0.14, ease: "power3.out",
        scrollTrigger: { trigger: '[data-g="steps-list"]', start: "top 80%", once: true },
      });

      /* ── 9. Data sources — scale up ── */
      gsap.from('[data-g="source"]', {
        scale: 0.9, y: 30, opacity: 0, duration: 0.65, stagger: 0.1, ease: "back.out(1.4)",
        scrollTrigger: { trigger: '[data-g="sources-grid"]', start: "top 82%", once: true },
      });

      /* ── 10. Pricing cards — stagger up ── */
      ScrollTrigger.batch('[data-g="price-card"]', {
        onEnter: (els) => gsap.fromTo(els,
          { y: 45, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.65, stagger: 0.1, ease: "power3.out" }
        ),
        start: "top 86%",
        once: true,
      });

      /* ── 11. FAQ items — slide from right ── */
      gsap.from('[data-g="faq-item"]', {
        x: 40, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: '[data-g="faq-list"]', start: "top 82%", once: true },
      });

      /* ── 12. CTA section — dramatic scale reveal ── */
      gsap.from('[data-g="cta-inner"] > *', {
        y: 48, opacity: 0, scale: 0.95, duration: 0.75, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: '[data-g="cta-inner"]', start: "top 80%", once: true },
      });

      /* ── 13. Section headings parallax — subtle depth ── */
      gsap.utils.toArray<HTMLElement>('[data-g="parallax"]').forEach((el) => {
        gsap.to(el, {
          y: -30,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1.5 },
        });
      });

      ScrollTrigger.refresh();
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="min-h-screen" style={{ background: "var(--ds-bg)" }}>

      {/* ══════════════════════════════════════════════════════════════════
          NAV — transparent over dark hero
      ══════════════════════════════════════════════════════════════════ */}
      <nav
        data-g="nav"
        className="sticky top-0 z-50"
        style={{ background: H.bg + "dd", borderBottom: `1px solid ${H.divider}`, backdropFilter: "blur(20px)" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo variant="full" size={28} />
            <div className="hidden md:flex items-center gap-1">
              {(["How it works", "Pricing", "FAQ"] as const).map((label, i) => (
                <a key={label} href={`#${["how-it-works","pricing","faq"][i]}`}
                  className="px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer"
                  style={{ color: "rgba(255,255,255,0.50)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.88)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.50)")}>
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/analyze"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-px active:translate-y-0 cursor-pointer"
              style={{ background: H.ctaBg, color: H.ctaText, boxShadow: H.ctaShadow }}>
              Check a Deal
            </Link>
            <UserNav />
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — Spotify-style dark, cycling headline
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: "100vh", background: H.bg }}>

        {/* Animated gold ambient glow */}
        <EtherealShadow
          color="rgba(200, 148, 26, 0.85)"
          animation={{ scale: 60, speed: 90 }}
          noise={{ opacity: 0.35, scale: 1.1 }}
          sizing="fill"
          style={{ position: "absolute", inset: 0, zIndex: 0 }}
        />

        {/* Dark dot grid texture */}
        <div className="absolute inset-0 z-0 dot-grid-dark opacity-[0.04] pointer-events-none" aria-hidden />

        <div className="relative z-10 mx-auto max-w-6xl px-6" style={{ paddingTop: "14vh", paddingBottom: "12vh" }}>
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-14 lg:gap-8">

            {/* ── Left: Text ── */}
            <div className="flex-1 flex flex-col items-start lg:pt-6">

              {/* Gold eyebrow */}
              <div data-g="eyebrow" className="flex items-center gap-2.5 mb-8">
                <span className="block w-8 h-px flex-shrink-0" style={{ background: H.gold }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: H.gold }}>
                  Deal Intelligence
                </span>
              </div>

              {/* Headline — massive, Spotify-scale */}
              <h1 className="font-editorial font-bold tracking-tight leading-[1.02] mb-2"
                style={{ fontSize: "clamp(3.2rem, 8vw, 7rem)" }}>
                <span data-g="h1-0" className="block" style={{ color: H.text1 }}>Know the deal</span>
                <span data-g="h1-1" className="block" style={{ color: H.text2 }}>before you</span>
                <span data-g="h1-2" className="block overflow-hidden" style={{ lineHeight: 1.15 }}>
                  <CyclingWord />
                </span>
              </h1>

              {/* Description */}
              <p data-g="hero-sub"
                className="text-base sm:text-lg leading-relaxed mb-10 mt-7 max-w-md"
                style={{ color: H.text2 }}>
                Paste a VIN. Get a Deal Score, fair value range, and a word-for-word negotiation script — in under a minute.
              </p>

              {/* CTAs */}
              <div data-g="hero-cta" className="flex gap-3 flex-wrap mb-8">
                <Link href="/analyze"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 cursor-pointer"
                  style={{ background: H.ctaBg, color: H.ctaText, boxShadow: H.ctaShadow }}>
                  Check a Deal <IconArrow />
                </Link>
                <a href="#sample-analyses"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                  style={{ border: `1px solid ${H.ghostBorder}`, color: H.ghostText }}>
                  See sample results
                </a>
              </div>

              {/* Trust signals */}
              <div data-g="hero-trust" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs"
                style={{ color: H.text3 }}>
                <span className="flex items-center gap-1.5"><IconShield />VIN-verified via NHTSA</span>
                <span className="hidden sm:inline">·</span>
                <span>3 checks from $9.99</span>
                <span className="hidden sm:inline">·</span>
                <span>No subscription</span>
              </div>
            </div>

            {/* ── Right: Score ring + mini cards ── */}
            <div className="flex-shrink-0 flex flex-col items-center gap-3 w-full lg:w-auto">
              <div data-g="hero-ring">
                <HeroScoreRing score={73} verdict="Negotiate" car="2019 Toyota Camry SE" delta="$1,400 over est. fair value" />
              </div>
              <div data-g="hero-cards" className="grid grid-cols-2 gap-3 w-full" style={{ maxWidth: 280 }}>
                <MiniScoreCard score={83} verdict="Buy" car="2020 Honda Civic EX" delta="$1.2k under fair value" />
                <MiniScoreCard score={26} verdict="Walk Away" car="2018 BMW 3 Series" delta="$6.2k over fair value" />
              </div>
            </div>

          </div>
        </div>

        {/* Bottom fade to light body */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" aria-hidden
          style={{ background: `linear-gradient(to bottom, transparent, var(--ds-bg))` }} />
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TRUST BAR
      ══════════════════════════════════════════════════════════════════ */}
      <div data-g="trust-bar" className="py-3 transition-colors"
        style={{ borderTop: "1px solid var(--ds-divider)", borderBottom: "1px solid var(--ds-divider)", background: "var(--ds-card-bg)" }}>
        <div className="mx-auto max-w-6xl px-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-1.5 text-xs font-medium tracking-wide">
          {[
            <><IconShield />VIN decoded via NHTSA</>,
            <>No dealer affiliation</>,
            <>Estimates based on real listing data</>,
            <>Your data is never sold</>,
          ].map((item, i) => (
            <span key={i} data-g="trust-item" className="flex items-center gap-1.5" style={{ color: "var(--ds-text-3)" }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-[1fr_1.5fr] gap-16 items-start">

            {/* Left — sticky statement */}
            <div className="lg:sticky lg:top-28">
              <div data-g="feat-header" data-g-parallax="">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="block w-6 h-px flex-shrink-0" style={{ background: "var(--ds-gold)" }} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: "var(--ds-gold)" }}>What you get</span>
                </div>
                <h2 className="font-editorial text-4xl sm:text-5xl font-bold leading-[1.08] tracking-tight mb-5"
                  style={{ color: "var(--ds-text-1)" }}>
                  A number, a verdict,<br />and something to say.
                </h2>
                <p className="text-base leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
                  We compare the asking price to an estimated fair value range, then give you the script to act on it.
                </p>
              </div>
            </div>

            {/* Right — feature rows */}
            <div className="space-y-0">
              {features.map((f, i) => (
                <div key={f.title} data-g="feat-row"
                  className="flex items-start gap-5 py-7 transition-colors"
                  style={{ borderTop: "1px solid var(--ds-divider)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "var(--ds-gold-bg)", border: "1px solid var(--ds-gold-border)", color: "var(--ds-gold)" }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-semibold mb-1.5" style={{ color: "var(--ds-text-1)" }}>{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--ds-text-3)" }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SAMPLE ANALYSES
      ══════════════════════════════════════════════════════════════════ */}
      <section id="sample-analyses" className="py-20 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div data-g="sample-header" className="mb-12">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="block w-6 h-px flex-shrink-0" style={{ background: "var(--ds-gold)" }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: "var(--ds-gold)" }}>Example results</span>
            </div>
            <h2 className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight mb-4"
              style={{ color: "var(--ds-text-1)" }}>
              Here&apos;s what a result looks like
            </h2>
            <p className="text-sm max-w-lg" style={{ color: "var(--ds-text-3)" }}>
              Illustrative examples — not real vehicles. Actual results depend on the specific VIN and current market data.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {([
              {
                vehicle: "2020 Honda Accord Sport · 34,200 mi",
                askingPrice: "$26,500", fairValueLow: "$24,800", fairValueHigh: "$25,600",
                verdict: "Negotiate", score: 62, verdictColor: "warn" as const,
                summary: "Priced about $1,200 above the estimated fair value midpoint. Common car with plenty of comps — the score has high confidence.",
              },
              {
                vehicle: "2021 BMW M340i xDrive · 28,400 mi",
                askingPrice: "$42,500", fairValueLow: "$40,200", fairValueHigh: "$44,800",
                verdict: "Buy", score: 74, verdictColor: "success" as const,
                summary: "Asking price sits in the lower half of the estimated range. Mileage is below average. Verify the build sheet.",
              },
              {
                vehicle: "2019 Toyota RAV4 XLE · 52,100 mi",
                askingPrice: "$27,900", fairValueLow: "$23,400", fairValueHigh: "$25,200",
                verdict: "Walk Away", score: 31, verdictColor: "danger" as const,
                summary: "About $3,500 over the estimated fair value midpoint, with above-average mileage for the year. Better deals are out there.",
              },
            ] as const).map((card) => (
              <div key={card.vehicle} data-g="sample-card" className="h-full">
                <SampleAnalysisCard {...card} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="block w-6 h-px flex-shrink-0" style={{ background: "var(--ds-gold)" }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: "var(--ds-gold)" }}>Early users</span>
            </div>
            <h2 className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight mb-4"
              style={{ color: "var(--ds-text-1)" }}>
              Real deals. Real results.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { quote: "Used the negotiation script word for word. Dealer came down $1,800. Paid for itself a hundred times over.", name: "Marcus T.", location: "Phoenix, AZ", car: "2021 Honda CR-V" },
              { quote: "I checked 4 different RAV4s before finding one that scored above 70. Finally felt like I knew what I was doing.", name: "Priya K.", location: "Atlanta, GA", car: "2022 Toyota RAV4" },
              { quote: "The walk away verdict saved me from a BMW that was $6k over fair value. Would’ve never caught that on my own.", name: "Jordan M.", location: "Chicago, IL", car: "2019 BMW 5 Series" },
              { quote: "Sent the fair value range to the dealer in a text. They matched it without me saying another word.", name: "Sarah W.", location: "Dallas, TX", car: "2020 Ford F-150" },
            ].map((t, i) => (
              <div key={t.name} data-g="testimonial"
                className="rounded-2xl p-5 flex flex-col gap-4"
                style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} viewBox="0 0 16 16" fill="#f59e0b" className="w-3.5 h-3.5">
                      <path d="M8 1l1.85 3.75L14 5.5l-3 2.92.71 4.12L8 10.5l-3.71 1.96.71-4.12L2 5.5l4.15-.75z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--ds-text-2)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--ds-text-1)" }}>{t.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--ds-text-4)" }}>{t.location} · {t.car}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-14">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="block w-6 h-px flex-shrink-0" style={{ background: "var(--ds-gold)" }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: "var(--ds-gold)" }}>4 steps, under a minute</span>
            </div>
            <h2 className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight mb-4"
              style={{ color: "var(--ds-text-1)" }}>
              How it works
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
              Free account takes 30 seconds. Paste any VIN and get a full analysis in under a minute.
            </p>
          </div>

          <div data-g="steps-list" className="space-y-0">
            {steps.map(([title, desc], i) => (
              <div key={i} data-g="step" className="flex gap-5 items-start relative">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold"
                    style={{ background: "var(--ds-gold-bg)", border: "1px solid var(--ds-gold-border)", color: "var(--ds-gold)" }}>
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex flex-col items-center gap-1 py-2">
                      {Array.from({ length: 4 }).map((_, d) => (
                        <div key={d} className="w-0.5 h-1.5 rounded-full" style={{ background: "var(--ds-divider)" }} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="pt-2 pb-7">
                  <p className="font-heading font-semibold mb-1.5" style={{ color: "var(--ds-text-1)" }}>{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ds-text-3)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          DATA SOURCES
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="block w-6 h-px flex-shrink-0" style={{ background: "var(--ds-gold)" }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: "var(--ds-gold)" }}>Data sources</span>
              </div>
              <h2 className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: "var(--ds-text-1)" }}>
                Where the numbers come from
              </h2>
            </div>
            <p className="text-sm" style={{ color: "var(--ds-text-4)" }}>No dealer affiliation. No scraped junk.</p>
          </div>

          <div data-g="sources-grid"
            className="grid sm:grid-cols-3 gap-0 rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--ds-card-border)", background: "var(--ds-card-bg)" }}>
            {trustSources.map((s, i) => (
              <div key={s.title} data-g="source"
                className={`p-6 flex flex-col gap-3 ${i < trustSources.length - 1 ? "border-b sm:border-b-0 sm:border-r" : ""}`}
                style={{ borderColor: "var(--ds-divider)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: "var(--ds-text-2)" }}>
                  {s.icon}
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold mb-1" style={{ color: "var(--ds-text-1)" }}>{s.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--ds-text-3)" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-20 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="block w-6 h-px flex-shrink-0" style={{ background: "var(--ds-gold)" }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: "var(--ds-gold)" }}>Pricing</span>
            </div>
            <h2 className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight mb-4"
              style={{ color: "var(--ds-text-1)" }}>
              Pay as you go.
            </h2>
            <p className="max-w-md leading-relaxed" style={{ color: "var(--ds-text-3)" }}>
              1 credit = 1 Quick Check. No subscriptions. Credits never expire.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {/* Starter */}
            <div data-g="price-card" className="rounded-2xl p-6 flex flex-col"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: "var(--ds-text-4)" }}>Starter</p>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="font-heading text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">$9</span>
                <span className="text-sm font-medium" style={{ color: "var(--ds-text-4)" }}>.99</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--ds-text-4)" }}>3 Quick Checks · <span style={{ color: "var(--ds-text-3)" }}>$3.33 each</span></p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {["Deal score & verdict","Fair value range","Negotiation script","Depreciation chart"].map(item => (
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
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
                style={{ background:"var(--ds-cta-bg)", color:"var(--ds-cta-text)", boxShadow:"var(--ds-cta-shadow)" }}>
                Get Started
              </button>
            </div>

            {/* Standard */}
            <div data-g="price-card" className="relative rounded-2xl p-6 flex flex-col"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap"
                style={{ background:"var(--ds-badge-bg)", border:"1px solid var(--ds-badge-border)", color: "var(--ds-text-3)" }}>
                Most popular
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: "var(--ds-text-4)" }}>Standard</p>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="font-heading text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">$19</span>
                <span className="text-sm font-medium" style={{ color: "var(--ds-text-4)" }}>.99</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--ds-text-4)" }}>10 Quick Checks · <span style={{ color: "var(--ds-text-3)" }}>$2.00 each</span></p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {["Everything in Starter","Better value per check","Save and track cars","Analysis history"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--ds-text-2)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background:"var(--ds-success-bg)", border:"1px solid var(--ds-success-border)", color: "var(--ds-success)" }}>
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs italic mb-4" style={{ color: "var(--ds-text-4)" }}>Best for: comparing a few options</p>
              <button onClick={() => setCheckoutPlan("standard")}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
                style={{ background:"var(--ds-cta-bg)", color:"var(--ds-cta-text)", boxShadow:"var(--ds-cta-shadow)" }}>
                Buy Standard
              </button>
            </div>

            {/* Pro */}
            <div data-g="price-card" className="relative rounded-2xl p-6 flex flex-col"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap"
                style={{ background:"var(--ds-success-bg)", border:"1px solid var(--ds-success-border)", color: "var(--ds-text-4)" }}>
                Best value
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: "var(--ds-text-4)" }}>Pro</p>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="font-heading text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">$39</span>
                <span className="text-sm font-medium" style={{ color: "var(--ds-text-4)" }}>.99</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--ds-text-4)" }}>25 Quick Checks · <span style={{ color: "var(--ds-text-3)" }}>$1.60 each</span></p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {["Everything in Standard","Best value per credit","Priority support","New features first"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--ds-text-2)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background:"var(--ds-success-bg)", border:"1px solid var(--ds-success-border)", color: "var(--ds-success)" }}>
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs italic mb-4" style={{ color: "var(--ds-text-4)" }}>Best for: actively shopping</p>
              <button onClick={() => setCheckoutPlan("pro")}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
                style={{ background:"var(--ds-cta-bg)", color:"var(--ds-cta-text)", boxShadow:"var(--ds-cta-shadow)" }}>
                Buy Pro
              </button>
            </div>

            {/* Full Report — Coming Soon */}
            <div data-g="price-card" className="relative rounded-2xl p-6 flex flex-col"
              style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)", opacity: 0.55 }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap"
                style={{ background:"var(--ds-badge-bg)", border:"1px solid var(--ds-badge-border)", color: "var(--ds-text-4)" }}>
                Coming Soon
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-1" style={{ color: "var(--ds-text-4)" }}>Full Report</p>
              <p className="text-xs mb-4" style={{ color: "var(--ds-text-4)" }}>Verify the car before you buy</p>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="font-heading text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-slate-700 to-slate-500">—</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--ds-text-4)" }}>Per vehicle · pricing TBD</p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {["Accident & title history","Odometer checks","Ownership & risk signals","Verified market data"].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--ds-text-4)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background:"var(--ds-badge-bg)", border:"1px solid var(--ds-badge-border)", color: "var(--ds-text-4)" }}>
                      <IconCheck />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <button disabled
                className="w-full py-2.5 rounded-xl text-sm font-medium text-center cursor-not-allowed"
                style={{ background:"var(--ds-badge-bg)", border:"1px solid var(--ds-badge-border)", color: "var(--ds-text-4)" }}>
                Notify me
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {[
              { label: "Credits never expire" },
              { label: "Secure checkout via Stripe" },
              { label: "No subscription" },
            ].map(({ label }) => (
              <span key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: "var(--ds-text-3)" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-20 transition-colors" style={{ borderTop: "1px solid var(--ds-divider)" }}>
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-12">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="block w-6 h-px flex-shrink-0" style={{ background: "var(--ds-gold)" }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: "var(--ds-gold)" }}>FAQ</span>
            </div>
            <h2 className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ color: "var(--ds-text-1)" }}>
              Common questions
            </h2>
          </div>
          <div data-g="faq-list" className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.q} data-g="faq-item"
                className="rounded-2xl px-6 py-5"
                style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}>
                <p className="font-semibold text-sm mb-2" style={{ color: "var(--ds-text-1)" }}>{faq.q}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ds-text-3)" }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 transition-colors relative overflow-hidden" style={{ background: H.bg }}>
        <EtherealShadow
          color="rgba(200, 148, 26, 0.9)"
          animation={{ scale: 50, speed: 100 }}
          noise={{ opacity: 0.3, scale: 1.1 }}
          sizing="fill"
          style={{ position: "absolute", inset: 0, zIndex: 0 }}
        />
        <div className="absolute inset-0 dot-grid-dark opacity-[0.04] pointer-events-none" aria-hidden />
        <div data-g="cta-inner"
          className="relative z-10 mx-auto max-w-2xl px-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] mb-5"
            style={{ color: H.gold }}>One check can save you thousands</p>
          <h2 className="font-editorial text-5xl sm:text-6xl font-bold tracking-tight mb-5"
            style={{ color: H.text1 }}>
            Know the deal<br />before you sign.
          </h2>
          <p className="mb-10 text-base leading-relaxed max-w-sm mx-auto" style={{ color: H.text2 }}>
            Paste a VIN. Get a fair value, a score, and a negotiation script in under a minute.
          </p>
          <Link href="/analyze"
            className="inline-flex items-center gap-2 rounded-xl px-9 py-4 text-base font-bold transition-all hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
            style={{ background: H.ctaBg, color: H.ctaText, boxShadow: H.ctaShadow }}>
            Check a deal <IconArrow />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="py-8 transition-colors" style={{ borderTop: `1px solid ${H.divider}`, background: H.bg }}>
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="full" size={22} />
          <span className="text-xs tracking-wide" style={{ color: H.text3 }}>
            Data: NHTSA · Auto.dev · MarketCheck · VinAudit. Estimates only — not financial advice.
          </span>
          <span className="text-xs" style={{ color: H.text3 }}>&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>

      <CheckoutModal plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} />
    </div>
  );
}
