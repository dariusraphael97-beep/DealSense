"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckoutModal, type CheckoutPlan } from "@/components/ui/checkout-modal";

const PLANS: { key: CheckoutPlan; label: string; price: string; credits: number; perCredit: string; popular?: true }[] = [
  { key: "starter",  label: "Starter",  price: "$9.99",  credits: 3,  perCredit: "$3.33" },
  { key: "standard", label: "Standard", price: "$19.99", credits: 10, perCredit: "$2.00", popular: true },
  { key: "pro",      label: "Pro",      price: "$39.99", credits: 25, perCredit: "$1.60" },
];

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => closeRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, handleKeyDown]);

  function selectPlan(plan: CheckoutPlan) {
    onClose();           // close paywall
    setCheckoutPlan(plan); // open checkout
  }

  return (
    <>
      {/* ── Plan selection modal ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog" aria-modal="true" aria-labelledby="paywall-title"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)" }}
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Modal */}
            <motion.div
              ref={modalRef}
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
              {/* Top accent */}
              <div className="absolute top-0 left-6 right-6 h-[2px] rounded-full"
                style={{ background: "linear-gradient(90deg, transparent, #6366f1, transparent)" }} />

              {/* Close */}
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ background: "var(--ds-glass-bg)", color: "var(--ds-text-4)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <h2 id="paywall-title" className="text-xl font-bold text-white mb-1.5">
                  You&apos;re out of credits
                </h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                  1 credit = 1 Quick Check. Pick a pack to continue.
                </p>
              </div>

              {/* Plans */}
              <div className="space-y-2.5 mb-5">
                {PLANS.map((plan) => (
                  <button
                    key={plan.key}
                    onClick={() => selectPlan(plan.key)}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all hover:brightness-110 active:scale-[0.98] text-left"
                    style={{
                      background: plan.popular
                        ? "linear-gradient(135deg, rgba(79,70,229,0.25), rgba(99,102,241,0.25))"
                        : "rgba(255,255,255,0.04)",
                      border: plan.popular
                        ? "1px solid rgba(99,102,241,0.45)"
                        : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{plan.label}</span>
                        {plan.popular && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
                            Most popular
                          </span>
                        )}
                      </div>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {plan.credits} Quick Checks · {plan.perCredit} each · never expire
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{plan.price}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"
                        style={{ color: "rgba(255,255,255,0.3)" }}>
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
                🔒 Secure checkout via Stripe · Credits never expire
              </p>
              <p className="text-center text-[10.5px] mt-2 leading-snug" style={{ color: "rgba(255,255,255,0.28)" }}>
                By continuing you agree to our{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">Terms</a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">Privacy Policy</a>.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Embedded checkout — opens after plan is selected ── */}
      <CheckoutModal
        plan={checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
      />
    </>
  );
}
