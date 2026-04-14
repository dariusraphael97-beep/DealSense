"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";

function SuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [plan, setPlan] = useState<string>("");

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setStatus("error");
      return;
    }

    fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === "complete") {
          setPlan(d.plan ?? "");
          setStatus("success");
        } else {
          // Payment may still be processing — show success anyway since
          // the webhook will handle credit fulfillment
          setStatus("success");
        }
      })
      .catch(() => setStatus("success")); // Err on the side of showing success
  }, [params]);

  // Auto-redirect to analyze after 4 seconds
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => router.push("/analyze"), 4000);
    return () => clearTimeout(t);
  }, [status, router]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: "var(--ds-text-3)" }}>Confirming your payment…</p>
        </div>
      )}

      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-sm"
        >
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              background: "var(--ds-success-bg)",
              border: "2px solid var(--ds-success-border)",
              boxShadow: "0 0 40px var(--ds-success-glow)",
            }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ds-success)"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <h1 className="font-heading text-3xl font-bold mb-2" style={{ color: "var(--ds-text-1)" }}>
            You&apos;re all set.
          </h1>

          {plan && (
            <p className="text-sm font-medium mb-2" style={{ color: "var(--ds-text-2)" }}>{plan}</p>
          )}

          <p className="text-sm mb-8" style={{ color: "var(--ds-text-3)" }}>
            Your credits are ready. Taking you to the analyzer now…
          </p>

          {/* Progress bar */}
          <div className="w-full h-1 rounded-full mb-8 overflow-hidden"
            style={{ background: "var(--ds-divider)" }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 4, ease: "linear" }}
              style={{ background: "linear-gradient(90deg, #4f46e5, #6366f1)" }}
            />
          </div>

          <Link href="/analyze"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg,#4f46e5,#6366f1)",
              boxShadow: "0 0 24px rgba(99,102,241,0.4)",
            }}>
            Check a deal
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </motion.div>
      )}

      {status === "error" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center max-w-sm space-y-4"
        >
          <p className="font-heading text-xl font-bold" style={{ color: "var(--ds-text-1)" }}>
            Payment received
          </p>
          <p className="text-sm" style={{ color: "var(--ds-text-3)" }}>
            Your payment went through, but we couldn&apos;t confirm the credit update right now. Credits are fulfilled automatically — check your balance in a moment.
          </p>
          <Link href="/analyze"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
            Go to analyzer
          </Link>
        </motion.div>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--ds-bg)" }}>
      <nav className="px-5 py-4 flex items-center"
        style={{ borderBottom: "1px solid var(--ds-divider)", background: "var(--ds-nav-bg)", backdropFilter: "blur(20px)" }}>
        <Link href="/">
          <Logo variant="full" size={26} />
        </Link>
      </nav>
      <Suspense fallback={null}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
