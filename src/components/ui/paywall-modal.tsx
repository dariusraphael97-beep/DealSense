"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FOUNDER_PERKS = [
  "Free analyses during early access",
  "Deal Score + fair value + negotiation script",
  "Your feedback shapes the product",
  "Founding member perks — kept when pricing launches",
];

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const modalRef  = useRef<HTMLDivElement>(null);
  const closeRef  = useRef<HTMLButtonElement>(null);

  // ── Focus trap + Escape handler ────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key !== "Tab" || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);

    // Auto-focus the close button when modal opens
    requestAnimationFrame(() => closeRef.current?.focus());

    // Lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, handleKeyDown]);

  // Clear state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setClaiming(false);
      setClaimed(false);
    }
  }, [open]);

  async function handleClaim() {
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch("/api/founders-credits", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setClaiming(false);
        return;
      }
      setClaimed(true);
      // Reload the page after a short delay so credits refresh
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setClaiming(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-title"
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
            <div className="absolute top-0 left-6 right-6 h-[2px] rounded-full" style={{ background: "linear-gradient(90deg, transparent, #6366f1, transparent)" }} />

            {/* Close button */}
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "var(--ds-glass-bg)", color: "var(--ds-text-4)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mb-4"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "white", boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                Founders Deal
              </div>
              <h2 id="paywall-title" className="text-xl font-bold text-white mb-1">
                {claimed ? "You\u2019re all set!" : "You\u2019ve used your analyses"}
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                {claimed
                  ? "Credits added — reloading now\u2026"
                  : "Early access is still free. Claim 5 more analyses and keep checking deals."}
              </p>
            </div>

            {/* Perks */}
            {!claimed && (
              <div className="space-y-2 mb-5">
                {FOUNDER_PERKS.map((v) => (
                  <div key={v} className="flex items-center gap-2.5 text-sm px-3 py-2 rounded-xl"
                    style={{ background: "var(--ds-glass-bg)", border: "1px solid var(--ds-badge-border)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--ds-accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span style={{ color: "rgba(255,255,255,0.55)" }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Error feedback */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-3 rounded-xl px-3 py-2.5 text-xs font-medium flex items-center gap-2"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#fca5a5",
                }}
                role="alert"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </motion.div>
            )}

            {/* CTA */}
            {claimed ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <svg className="animate-spin w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span className="text-sm text-indigo-300">Refreshing credits&hellip;</span>
              </div>
            ) : (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-center transition-all hover:brightness-110 active:scale-[0.98] text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}
              >
                {claiming ? "Claiming\u2026" : "Claim 5 free analyses"}
              </button>
            )}

            <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.18)" }}>
              No credit card needed · Paid plans launching soon · Founders keep perks
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
