"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { UserNav } from "@/components/ui/user-nav";
import { Logo } from "@/components/ui/logo";

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

const VERDICT_STYLE = {
  "Buy":        { bg: "var(--ds-success-bg)",  border: "var(--ds-success-border)",  text: "var(--ds-success)" },
  "Negotiate":  { bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.25)",  text: "var(--ds-warn)" },
  "Walk Away":  { bg: "var(--ds-danger-bg)", border: "var(--ds-danger-border)", text: "var(--ds-danger)" },
};

export default function HistoryPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }

      const { data, error: err } = await supabase
        .from("analyses")
        .select("id,year,make,model,trim,mileage,asking_price,deal_score,verdict,price_delta,vin,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (err) setError(err.message);
      else setAnalyses(data ?? []);
      setLoading(false);
    })();
  }, [router]);

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
            <span className="text-sm" style={{ color: "var(--ds-text-3)" }}>History</span>
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

      <div className="mx-auto max-w-4xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-heading text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">
            Analysis history
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ds-text-3)" }}>Your last 50 analyses. Click any row to see the full report.</p>
        </motion.div>

        {loading && (
          <div className="flex items-center gap-3 text-sm py-20 justify-center" style={{ color: "var(--ds-text-3)" }}>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
            Loading…
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && !error && analyses.length === 0 && (
          <div className="rounded-2xl p-12 text-center" style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)" }}>
            <p className="text-4xl mb-4">🔍</p>
            <p className="font-semibold mb-1" style={{ color: "var(--ds-text-1)" }}>No analyses yet</p>
            <p className="text-sm mb-6" style={{ color: "var(--ds-text-3)" }}>Run your first analysis and it'll appear here.</p>
            <Link href="/analyze" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
              Analyze a car
            </Link>
          </div>
        )}

        {!loading && analyses.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
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
                  transition={{ delay: i * 0.04 }}
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
          </motion.div>
        )}
      </div>
    </div>
  );
}
