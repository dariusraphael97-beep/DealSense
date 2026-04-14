"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { UserNav } from "@/components/ui/user-nav";
import { Logo } from "@/components/ui/logo";
import { useCredits } from "@/contexts/credits-context";

interface Analysis {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  asking_price: number;
  deal_score: number;
  verdict: "Buy" | "Negotiate" | "Walk Away";
  price_delta: number;
  vin: string | null;
  created_at: string;
}

interface Purchase {
  id: string;
  plan_name: string | null;
  credits_granted: number;
  amount_cents: number;
  created_at: string;
  stripe_session_id: string;
}

const VERDICT_STYLE = {
  "Buy":       { bg: "var(--ds-success-bg)", border: "var(--ds-success-border)", text: "var(--ds-success)" },
  "Negotiate": { bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.25)", text: "var(--ds-warn)" },
  "Walk Away": { bg: "var(--ds-danger-bg)", border: "var(--ds-danger-border)", text: "var(--ds-danger)" },
};

export default function HistoryPage() {
  const router = useRouter();
  const { credits, isStaff, loading: creditsLoading } = useCredits();
  const [analyses, setAnalyses]   = useState<Analysis[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }

      const [analysesRes, purchasesRes] = await Promise.all([
        supabase
          .from("analyses")
          .select("id,year,make,model,trim,mileage,asking_price,deal_score,verdict,price_delta,vin,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("purchases")
          .select("id,plan_name,credits_granted,amount_cents,created_at,stripe_session_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (analysesRes.error) setError(analysesRes.error.message);
      else setAnalyses(analysesRes.data ?? []);
      setPurchases(purchasesRes.data ?? []);
      setLoading(false);
    })();
  }, [router]);

  const creditColor = credits === 0
    ? "var(--ds-danger)"
    : credits !== null && credits <= 3
      ? "var(--ds-warn)"
      : "var(--ds-success)";

  return (
    <div className="min-h-screen" style={{ background: "var(--ds-bg)" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: "var(--ds-nav-bg)", borderBottom: "1px solid var(--ds-nav-border)", backdropFilter: "blur(20px)" }}>
        <div className="mx-auto max-w-4xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Logo variant="full" size={26} />
            </Link>
            <span style={{ color: "var(--ds-text-4)" }}>/</span>
            <span className="text-sm" style={{ color: "var(--ds-text-3)" }}>Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/analyze" className="text-sm px-4 py-2 rounded-xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 0 16px rgba(99,102,241,0.3)" }}>
              New analysis
            </Link>
            <UserNav />
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">

        {/* ── Credit balance card ── */}
        {!creditsLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 flex items-center justify-between gap-4"
            style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)", boxShadow: "var(--ds-card-shadow)" }}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.20)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--ds-text-4)" }}>Credit balance</p>
                {isStaff ? (
                  <p className="text-2xl font-extrabold font-heading" style={{ color: "#818cf8" }}>Unlimited
                    <span className="text-sm font-normal ml-1.5" style={{ color: "var(--ds-text-3)" }}>staff access</span>
                  </p>
                ) : (
                  <p className="text-2xl font-extrabold font-heading" style={{ color: creditColor }}>
                    {credits ?? "—"}
                    <span className="text-sm font-normal ml-1.5" style={{ color: "var(--ds-text-3)" }}>
                      {credits === 1 ? "credit remaining" : "credits remaining"}
                    </span>
                  </p>
                )}
              </div>
            </div>
            {!isStaff && (credits === 0 || (credits !== null && credits <= 3)) && (
              <Link href="/#pricing"
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 0 16px rgba(99,102,241,0.3)" }}>
                {credits === 0 ? "Buy credits" : "Get more"}
              </Link>
            )}
          </motion.div>
        )}

        {/* ── Purchase history ── */}
        {purchases.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--ds-text-1)" }}>Purchase history</h2>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--ds-card-border)" }}>
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider"
                style={{ background: "var(--ds-badge-bg)", color: "var(--ds-text-4)", borderBottom: "1px solid var(--ds-card-border)" }}>
                <span>Plan</span>
                <span className="hidden sm:block">Credits</span>
                <span>Amount</span>
                <span>Date</span>
              </div>
              {purchases.map((p, i) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5"
                  style={{
                    background: "var(--ds-card-bg)",
                    borderBottom: i < purchases.length - 1 ? "1px solid var(--ds-divider)" : undefined,
                  }}
                >
                  {/* Plan + status */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.20)" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                        <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--ds-text-1)" }}>
                        {p.plan_name ?? "Credit pack"}
                      </p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: "var(--ds-success-bg)", border: "1px solid var(--ds-success-border)", color: "var(--ds-success)" }}>
                        Paid
                      </span>
                    </div>
                  </div>

                  {/* Credits */}
                  <span className="hidden sm:block text-sm font-mono font-semibold" style={{ color: "var(--ds-text-2)" }}>
                    +{p.credits_granted}
                  </span>

                  {/* Amount */}
                  <span className="text-sm font-semibold" style={{ color: "var(--ds-text-1)" }}>
                    ${(p.amount_cents / 100).toFixed(2)}
                  </span>

                  {/* Date */}
                  <span className="text-xs" style={{ color: "var(--ds-text-4)" }}>
                    {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Analysis history ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--ds-text-1)" }}>Analysis history</h2>
            {analyses.length > 0 && (
              <span className="text-xs" style={{ color: "var(--ds-text-4)" }}>{analyses.length} total</span>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-3 text-sm py-20 justify-center" style={{ color: "var(--ds-text-3)" }}>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading…
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {!loading && !error && analyses.length === 0 && (
            <div className="rounded-2xl p-12 text-center" style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)" }}>
              <p className="text-4xl mb-4">🔍</p>
              <p className="font-semibold mb-1" style={{ color: "var(--ds-text-1)" }}>No analyses yet</p>
              <p className="text-sm mb-6" style={{ color: "var(--ds-text-3)" }}>Run your first analysis and it&apos;ll appear here.</p>
              <Link href="/analyze" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                Analyze a car
              </Link>
            </div>
          )}

          {!loading && analyses.length > 0 && (
            <div className="space-y-2">
              {analyses.map((a, i) => {
                const vs = VERDICT_STYLE[a.verdict];
                const delta = Math.abs(a.price_delta);
                const isOver = a.price_delta > 0;
                const label = `${a.year} ${a.make} ${a.model}${a.trim ? ` ${a.trim}` : ""}`;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link href={`/results/${a.id}`}
                      className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-all hover:brightness-110"
                      style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)" }}>

                      {/* Score ring */}
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                          <circle cx="20" cy="20" r="16" fill="none" stroke="var(--ds-divider)" strokeWidth="3.5"/>
                          <circle cx="20" cy="20" r="16" fill="none" stroke={vs.text} strokeWidth="3.5"
                            strokeDasharray={`${2 * Math.PI * 16}`}
                            strokeDashoffset={`${2 * Math.PI * 16 * (1 - a.deal_score / 100)}`}
                            strokeLinecap="round"
                            style={{ filter: `drop-shadow(0 0 4px ${vs.text}80)` }}/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold" style={{ color: "var(--ds-text-1)" }}>{a.deal_score}</span>
                        </div>
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--ds-text-1)" }}>{label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-4)" }}>
                          {a.mileage.toLocaleString()} mi · ${a.asking_price.toLocaleString()}
                          {a.vin ? ` · ${a.vin.slice(-6)}` : ""}
                        </p>
                      </div>

                      {/* Verdict */}
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 hidden sm:inline-flex"
                        style={{ background: vs.bg, border: `1px solid ${vs.border}`, color: vs.text }}>
                        {a.verdict}
                      </span>

                      {/* Delta */}
                      <span className="text-xs font-mono flex-shrink-0 hidden md:block"
                        style={{ color: isOver ? "var(--ds-danger)" : "var(--ds-success)" }}>
                        {isOver ? "+" : "−"}${delta.toLocaleString()}
                      </span>

                      {/* Date */}
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--ds-text-4)" }}>
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>

                      {/* Arrow */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ds-text-4)" }}>
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
