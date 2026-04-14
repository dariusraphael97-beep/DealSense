"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const PLANS = [
  { key: "starter",  label: "Starter",  price: "$6.99",  credits: 3,  href: "https://buy.stripe.com/test_8x2cN64QnbvVbEWfjsaAw00" },
  { key: "standard", label: "Standard", price: "$14.99", credits: 10, href: "https://buy.stripe.com/test_14A28s4Qn8jJ4cu1sCaAw01", popular: true },
  { key: "pro",      label: "Pro",      price: "$29.99", credits: 25, href: "https://buy.stripe.com/test_eVq4gA82z9nN38q2wGaAw02" },
];

function buildStripeLink(baseUrl: string, userId: string | null): string {
  if (!userId) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}client_reference_id=${userId}`;
}

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

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

  return (
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
            {/* Top accent line */}
            <div className="absolute top-0 left-6 right-6 h-[2px] rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, #6366f1, transparent)" }} />

            {/* Close button */}
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "var(--ds-glass-bg)", color: "var(--ds-text-4)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h2 id="paywall-title" className="text-xl font-bold text-white mb-1.5">
                You&apos;re out of credits
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Pick a pack to keep checking deals.
              </p>
            </div>

            {/* Pricing options */}
            <div className="space-y-2.5 mb-5">
              {PLANS.map((plan) => (
                <a
                  key={plan.key}
                  href={buildStripeLink(plan.href, userId)}
                  onClick={onClose}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: plan.popular
                      ? "linear-gradient(135deg, rgba(79,70,229,0.25), rgba(99,102,241,0.25))"
                      : "rgba(255,255,255,0.04)",
                    border: plan.popular
                      ? "1px solid rgba(99,102,241,0.45)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-3">
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
                        {plan.credits} analyses
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{plan.price}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </div>
                </a>
              ))}
            </div>

            <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
              Secure checkout via Stripe · Credits never expire
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
