"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ease = [0.22, 1, 0.36, 1] as const;

interface PurchaseInfo {
  plan_name: string | null;
  credits_granted: number;
  amount_cents: number;
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
      <circle cx="12" cy="12" r="11" stroke="var(--ds-success)" strokeWidth="1.5" />
      <path d="M7.5 12.5L10.5 15.5L16.5 9" stroke="var(--ds-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function PaymentSuccessPage() {
  const [purchase, setPurchase] = useState<PurchaseInfo | null>(null);
  const [credits, setCredits]   = useState<number | null>(null);
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }

      // Fetch most recent purchase + current balance in parallel
      const [purchaseRes, profileRes] = await Promise.all([
        supabase
          .from("purchases")
          .select("plan_name, credits_granted, amount_cents")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("credits")
          .eq("id", user.id)
          .single(),
      ]);

      if (purchaseRes.data) setPurchase(purchaseRes.data);
      if (profileRes.data) setCredits(profileRes.data.credits);
      setLoaded(true);
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ background: "var(--ds-bg)" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: "var(--ds-nav-bg)", borderBottom: "1px solid var(--ds-nav-border)", backdropFilter: "blur(20px)" }}>
        <div className="mx-auto max-w-6xl px-4 py-3.5 flex items-center justify-between">
          <Logo variant="full" size={28} />
          <Link href="/analyze"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
            style={{ boxShadow: "0 0 20px var(--ds-accent-glow), 0 4px 12px var(--ds-shadow-heavy)" }}>
            Check a Deal
          </Link>
        </div>
      </nav>

      {/* Content */}
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
          {/* Check icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="flex justify-center mb-6"
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "var(--ds-success-bg)", border: "1px solid var(--ds-success-border)" }}>
              <IconCheck />
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

          {/* Purchase details — shown once loaded */}
          {loaded && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease }}
            >
              {purchase ? (
                <div className="rounded-xl p-4 mb-6 text-left space-y-2.5"
                  style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)" }}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--ds-text-3)" }}>Plan</span>
                    <span className="font-semibold" style={{ color: "var(--ds-text-1)" }}>
                      {purchase.plan_name ?? "Credit pack"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--ds-text-3)" }}>Credits added</span>
                    <span className="font-semibold" style={{ color: "var(--ds-success)" }}>
                      +{purchase.credits_granted} credits
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--ds-text-3)" }}>Amount paid</span>
                    <span className="font-semibold" style={{ color: "var(--ds-text-1)" }}>
                      ${(purchase.amount_cents / 100).toFixed(2)}
                    </span>
                  </div>
                  {credits !== null && (
                    <>
                      <div style={{ borderTop: "1px solid var(--ds-divider)", paddingTop: "10px", marginTop: "4px" }} />
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: "var(--ds-text-3)" }}>Total balance</span>
                        <span className="font-bold" style={{ color: "var(--ds-text-1)" }}>
                          {credits} {credits === 1 ? "credit" : "credits"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-sm mb-1" style={{ color: "var(--ds-text-2)" }}>
                    Your purchase was completed successfully.
                  </p>
                  <p className="text-sm" style={{ color: "var(--ds-text-3)" }}>
                    Credits will appear in your account shortly.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Loading skeleton */}
          {!loaded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl p-4 mb-6 space-y-3 animate-pulse"
              style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)" }}
            >
              {[1,2,3].map(i => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 rounded w-20" style={{ background: "var(--ds-divider)" }} />
                  <div className="h-4 rounded w-16" style={{ background: "var(--ds-divider)" }} />
                </div>
              ))}
            </motion.div>
          )}

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link href="/analyze"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow: "0 0 20px var(--ds-accent-glow)" }}>
              Analyze a car <IconArrow />
            </Link>
            <Link href="/history"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:brightness-95 active:scale-[0.98]"
              style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: "var(--ds-text-2)" }}>
              View dashboard
            </Link>
          </motion.div>

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
