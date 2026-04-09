"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TIERS = [
  {
    priceId:   "price_1TKM2PJ5w276rD5y6NBfq0A5",
    name:      "Starter",
    price:     "$6.99",
    credits:   3,
    perCredit: "$2.33 / analysis",
    popular:   false,
    badge:     null,
  },
  {
    priceId:   "price_1TKM2QJ5w276rD5yxetJGqq6",
    name:      "Standard",
    price:     "$14.99",
    credits:   10,
    perCredit: "$1.50 / analysis",
    popular:   true,
    badge:     "Most Popular",
  },
  {
    priceId:   "price_1TKM2RJ5w276rD5y3wqLUg90",
    name:      "Pro",
    price:     "$29.99",
    credits:   25,
    perCredit: "$1.20 / analysis",
    popular:   false,
    badge:     "Best Value",
  },
];

const VALUE_PROPS = [
  "Avoid overpaying by thousands",
  "Know the real market value",
  "Negotiate with data",
  "One good deal pays for this instantly",
];

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleBuy(priceId: string) {
    setLoading(priceId);
    try {
      const res  = await fetch("/api/checkout", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.94, y: 10  }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-3xl p-6"
            style={{
              background: "linear-gradient(145deg, rgba(12,12,22,0.99), rgba(8,8,18,0.99))",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(99,102,241,0.12)",
            }}
          >
            {/* Close button */}
            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Get More Analyses</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Credits never expire · One-time purchase · No subscription
              </p>
            </div>

            {/* Value props */}
            <div className="grid grid-cols-2 gap-1.5 mb-5">
              {VALUE_PROPS.map((v) => (
                <div key={v} className="flex items-start gap-1.5 text-xs px-2.5 py-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0 mt-0.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Pricing tiers */}
            <div className="space-y-2.5">
              {TIERS.map((tier) => (
                <button
                  key={tier.priceId}
                  onClick={() => handleBuy(tier.priceId)}
                  disabled={loading !== null}
                  className="w-full rounded-2xl p-4 text-left transition-all relative overflow-hidden disabled:opacity-60 hover:brightness-110"
                  style={{
                    background: tier.popular
                      ? "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.16))"
                      : "rgba(255,255,255,0.035)",
                    border: tier.popular
                      ? "1px solid rgba(99,102,241,0.45)"
                      : tier.badge === "Best Value"
                      ? "1px solid rgba(52,211,153,0.25)"
                      : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {tier.badge && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={tier.popular
                        ? { background: "rgba(99,102,241,0.3)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.4)" }
                        : { background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}>
                      {tier.badge}
                    </span>
                  )}
                  <div className="flex items-center justify-between pr-20">
                    <div>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-lg font-bold text-white">{tier.price}</span>
                        <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
                          {tier.credits} analyses
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.32)" }}>{tier.perCredit}</span>
                    </div>
                    <div className="flex-shrink-0 absolute right-4 top-1/2 -translate-y-1/2">
                      {loading === tier.priceId ? (
                        <svg className="animate-spin w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke={tier.popular ? "#818cf8" : "rgba(255,255,255,0.25)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.18)" }}>
              Secure payment via Stripe · Credits never expire
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
