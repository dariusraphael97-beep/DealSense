"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DealSense — Payment Success Page
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This page is shown after a successful Stripe Checkout purchase.
 *
 * STRIPE DASHBOARD CONFIGURATION:
 * ───────────────────────────────────────────────────────────────────────────
 *   For each Payment Link in your Stripe Dashboard, set:
 *
 *   Success URL:  https://dealsense.space/payment-success
 *   Cancel URL:   https://dealsense.space/#pricing
 *
 *   (Replace dealsense.space with your actual domain if different.)
 *
 *   To configure:
 *   1. Go to https://dashboard.stripe.com/test/payment-links
 *   2. Click each payment link (Starter, Standard, Pro)
 *   3. Under "After payment" → set the success URL above
 *   4. Under "If customer cancels" → set the cancel URL above
 *
 *   When you switch to LIVE mode, update the URLs to your production domain.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";

const ease = [0.22, 1, 0.36, 1] as const;

function IconCheckCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-16 h-16">
      <circle cx="12" cy="12" r="11" stroke="var(--ds-success)" strokeWidth="1.5" />
      <path d="M7.5 12.5L10.5 15.5L16.5 9" stroke="var(--ds-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ background: "var(--ds-bg)" }}>

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: "var(--ds-nav-bg)",
          borderBottom: "1px solid var(--ds-nav-border)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-3.5 flex items-center justify-between">
          <Logo variant="full" size={28} />
          <Link href="/analyze"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
            style={{ boxShadow: "0 0 20px var(--ds-accent-glow), 0 4px 12px var(--ds-shadow-heavy)" }}>
            Check a Deal
          </Link>
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease }}
          className="w-full max-w-md rounded-2xl p-8 sm:p-10 text-center"
          style={{
            background: "var(--ds-card-bg)",
            border: "1px solid var(--ds-card-border)",
            boxShadow: "0 0 60px var(--ds-success-glow), 0 8px 32px var(--ds-shadow-heavy)",
          }}
        >
          {/* Animated check icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="flex justify-center mb-6"
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "var(--ds-success-bg)", border: "1px solid var(--ds-success-border)" }}>
              <IconCheckCircle />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease }}
            className="font-heading text-2xl sm:text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:via-white/90 dark:to-white/60"
          >
            Payment successful
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease }}
            className="text-sm leading-relaxed mb-2"
            style={{ color: "var(--ds-text-2)" }}
          >
            Your purchase was completed successfully.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease }}
            className="text-sm leading-relaxed mb-8"
            style={{ color: "var(--ds-text-3)" }}
          >
            Your credits will be added shortly.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55, ease }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link href="/analyze"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                boxShadow: "0 0 20px var(--ds-accent-glow)",
              }}>
              Analyze a car <IconArrow />
            </Link>
            <Link href="/history"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-95 active:scale-[0.98]"
              style={{
                background: "var(--ds-badge-bg)",
                border: "1px solid var(--ds-badge-border)",
                color: "var(--ds-text-2)",
              }}>
              Go to dashboard
            </Link>
          </motion.div>

          {/* Fine print */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.7, ease }}
            className="text-[11px] mt-6"
            style={{ color: "var(--ds-text-4)" }}
          >
            A receipt has been sent to your email. If credits don&apos;t appear within a few minutes, contact support.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
