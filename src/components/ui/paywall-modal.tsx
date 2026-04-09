"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TIERS = [
  {
    priceId:     "price_1TK6MGJ5w276rD5yy4QjjsP8",
    name:        "Starter",
    price:       "$4.99",
    credits:     3,
    perCredit:   "$1.66 / report",
    popular:     false,
    description: "Try it out",
  },
  {
    priceId:     "price_1TK6MLJ5w276rD5yqPV0eCom",
    name:        "Standard",
    price:       "$9.99",
    credits:     10,
    perCredit:   "$1.00 / report",
    popular:     true,
    description: "Most popular",
  },
  {
    priceId:     "price_1TK6MQJ5w276rD5yqpR1sVEo",
    name:        "Pro",
    price:       "$19.99",
    credits:     25,
    perCredit:   "$0.80 / report",
    popular:     false,
    description: "Best value",
  },
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-3xl p-6"
            style={{
              background: "linear-gradient(145deg, rgba(15,15,25,0.98), rgba(10,10,20,0.98))",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)",
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Get more analyses</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                One good decision pays for this instantly.
              </p>
            </div>

            {/* Value props */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {["Avoid overpaying", "Know the real value", "Negotiate with data"].map((v) => (
                <span key={v} className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span className="text-emerald-400">✓</span> {v}
                </span>
              ))}
            </div>

            {/* Tiers */}
            <div className="space-y-2.5">
              {TIERS.map((tier) => (
                <button
                  key={tier.priceId}
                  onClick={() => handleBuy(tier.priceId)}
                  disabled={loading !== null}
                  className="w-full rounded-2xl p-4 text-left transition-all relative overflow-hidden disabled:opacity-60"
                  style={{
                    background: tier.popular
                      ? "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))"
                      : "rgba(255,255,255,0.04)",
                    border: tier.popular
                      ? "1px solid rgba(99,102,241,0.4)"
                      : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {tier.popular && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(99,102,241,0.3)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.4)" }}>
                      Most Popular
                    </span>
                  )}
                  <div className="flex items-center justify-between pr-20">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-white">{tier.price}</span>
                        <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                          {tier.credits} analyses
                        </span>
                      </div>
                      <span className="text-xs mt-0.5 block" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {tier.perCredit}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      {loading === tier.priceId ? (
                        <svg className="animate-spin w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke={tier.popular ? "#818cf8" : "rgba(255,255,255,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
              Secure payment via Stripe · No subscription · Credits never expire
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
