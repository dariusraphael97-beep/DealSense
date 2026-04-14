"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { createClient } from "@/lib/supabase/client";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PLAN_INFO = {
  starter: {
    label: "Starter",
    price: "$6.99",
    credits: 3,
    perCredit: "$2.33",
    context: "Best for checking 1–2 cars before buying",
    socialProof: "Most users start here to test their first deal",
  },
  standard: {
    label: "Standard",
    price: "$14.99",
    credits: 10,
    perCredit: "$1.50",
    context: "Best for comparing a few options side by side",
    socialProof: "Most popular — covers your whole car search",
  },
  pro: {
    label: "Pro",
    price: "$29.99",
    credits: 25,
    perCredit: "$1.20",
    context: "Best for serious shoppers or car flippers",
    socialProof: "Best value per analysis — stock up before you shop",
  },
} as const;

export type CheckoutPlan = keyof typeof PLAN_INFO;

interface Props {
  plan: CheckoutPlan | null;
  onClose: () => void;
}

function IconZap() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
function IconClose() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function IconCheck() {
  return (
    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 flex-shrink-0">
      <path d="M2 6l3 3 5-5" stroke="rgba(99,102,241,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const FEATURES = [
  "Deal Score + clear buy/skip verdict",
  "Fair value range from real listings",
  "Negotiation script you can actually use",
  "Depreciation & risk insights",
];

const TRUST_ITEMS = [
  "Secure payment powered by Stripe",
  "One-time purchase — no subscription",
  "Credits never expire",
];

export function CheckoutModal({ plan, onClose }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plan) { setClientSecret(null); setError(null); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setClientSecret(null);

    (async () => {
      let userId: string | null = null;
      try {
        const { data } = await createClient().auth.getUser();
        userId = data.user?.id ?? null;
      } catch { /* non-fatal */ }

      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, userId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setError(data.error ?? "Could not load checkout. Please try again.");
      } catch {
        if (!cancelled) setError("Network error — please check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [plan]);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (plan) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [plan, onClose]);

  const info = plan ? PLAN_INFO[plan] : null;

  return (
    <AnimatePresence>
      {plan && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto py-6 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ background: "rgba(2,2,8,0.88)", backdropFilter: "blur(16px)" }}
          onClick={handleBackdrop}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: 20,  scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg"
            style={{ marginTop: "auto", marginBottom: "auto" }}
          >
            {/* Glow behind card */}
            <div className="absolute -inset-px rounded-[28px] opacity-60 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.25), transparent 70%)" }} />

            <div className="relative rounded-[26px] overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #111127 0%, #0a0a18 100%)",
                border: "1px solid rgba(99,102,241,0.22)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 48px 120px rgba(0,0,0,0.8), 0 0 80px rgba(99,102,241,0.06)",
              }}
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.7) 40%, rgba(139,92,246,0.5) 60%, transparent)" }} />

              {/* ── Header ── */}
              <div className="px-7 pt-7 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">

                    {/* Label */}
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3"
                      style={{ color: "rgba(99,102,241,0.7)" }}>
                      Secure Checkout
                    </p>

                    {/* Plan — credits — price (single consolidated line) */}
                    <div className="flex items-baseline gap-2 flex-wrap mb-1">
                      <span className="font-heading text-2xl font-extrabold tracking-tight text-white">
                        {info?.label} — {info?.credits} credits
                      </span>
                      <span className="font-heading text-2xl font-extrabold tracking-tight"
                        style={{ color: "#818cf8" }}>
                        {info?.price}
                      </span>
                    </div>

                    {/* Context */}
                    <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.38)" }}>
                      {info?.context}
                    </p>

                    {/* 1 credit = 1 full deal analysis */}
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg"
                      style={{
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.18)",
                        color: "rgba(165,180,252,0.85)",
                      }}>
                      <IconZap />
                      1 credit = 1 full deal analysis
                    </div>
                  </div>

                  {/* Close */}
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:brightness-150"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    <IconClose />
                  </button>
                </div>

                {/* What you're getting */}
                <div className="mt-4 rounded-xl px-4 py-3"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                  <p className="text-[11px] font-medium mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Each credit includes
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {FEATURES.map(f => (
                      <div key={f} className="flex items-start gap-1.5 text-xs leading-snug" style={{ color: "rgba(255,255,255,0.6)" }}>
                        <div className="w-1 h-1 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#6366f1" }} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Divider ── */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 28px" }} />

              {/* ── Value reinforcement ── */}
              <div className="px-7 pt-4 pb-1 text-center space-y-1.5">
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.28)", fontStyle: "italic" }}>
                  &ldquo;Used to avoid overpaying by thousands on real car deals&rdquo;
                </p>
                <p className="text-[11px]" style={{ color: "rgba(99,102,241,0.55)" }}>
                  {info?.socialProof}
                </p>
              </div>

              {/* ── Stripe form area ── */}
              <div className="px-5 pt-3 pb-5" style={{ minHeight: 220 }}>

                {/* Loading */}
                {loading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                    </div>
                    <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Loading secure checkout…
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && !loading && (
                  <div className="flex flex-col items-center gap-5 py-8 text-center px-2">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.75"
                        strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">Checkout couldn&apos;t load</p>
                      <p className="text-xs max-w-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {error}
                      </p>
                    </div>
                    <button
                      onClick={() => { setError(null); setLoading(false); setClientSecret(null); }}
                      className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 0 20px rgba(99,102,241,0.35)" }}
                    >
                      Try again
                    </button>
                  </div>
                )}

                {/* Stripe Embedded Checkout */}
                {clientSecret && !loading && (
                  <EmbeddedCheckoutProvider
                    stripe={stripePromise}
                    options={{ clientSecret }}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                )}
              </div>

              {/* ── Trust footer ── */}
              <div className="px-7 pb-6 pt-1">
                <div className="flex flex-col gap-1.5">
                  {TRUST_ITEMS.map(item => (
                    <div key={item} className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                      <IconCheck />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
