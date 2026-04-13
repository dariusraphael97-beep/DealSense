"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { UserNav } from "@/components/ui/user-nav";
import { Logo } from "@/components/ui/logo";

/* ── Easing ── */
const ease = [0.22, 1, 0.36, 1] as const;

/* ── Types ── */
interface SavedCar {
  id: string;
  analysis_id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  asking_price: number;
  mileage: number;
  deal_score: number;
  verdict: string;
  price_delta: number;
  created_at: string;
}

/* ── Verdict styling ── */
function verdictStyle(verdict: string) {
  const v = verdict.toLowerCase();
  if (v === "buy" || v === "fair deal") {
    return { bg: "var(--ds-success-bg)", text: "var(--ds-success)" };
  }
  if (v === "negotiate" || v === "needs option review") {
    return { bg: "var(--ds-warn-bg)", text: "var(--ds-warn)" };
  }
  return { bg: "var(--ds-danger-bg)", text: "var(--ds-danger)" };
}

/* ── Mini score ring ── */
function MiniRing({ score }: { score: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color =
    score >= 72
      ? "var(--ds-success)"
      : score >= 48
        ? "var(--ds-warn)"
        : "var(--ds-danger)";
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="var(--ds-divider)"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-xs font-bold"
          style={{ color: "var(--ds-text-1)" }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function SavedCarsPage() {
  const [cars, setCars] = useState<SavedCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchCars = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-cars");
      if (!res.ok) throw new Error("Failed to load saved cars");
      const data = await res.json();
      setCars(data.cars ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      fetchCars();
    })();
  }, [fetchCars]);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/saved-cars?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove");
      setCars((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Failed to remove car. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  /* ── Not authenticated ── */
  if (!authed && !loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--ds-bg)" }}>
        <Nav />
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: "var(--ds-card-bg)",
              border: "1px solid var(--ds-card-border)",
            }}
          >
            <p className="text-4xl mb-4">🔒</p>
            <p
              className="font-semibold mb-1"
              style={{ color: "var(--ds-text-1)" }}
            >
              Sign in to view saved cars
            </p>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--ds-text-3)" }}
            >
              You need to be logged in to save and revisit car analyses.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{
                background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                boxShadow: "0 0 16px rgba(99,102,241,0.3)",
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--ds-bg)" }}>
      <Nav />

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-6"
        >
          <h1 className="font-heading text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">
            Saved cars
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ds-text-3)" }}>
            Cars you&apos;ve bookmarked for later review.
          </p>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div
            className="flex items-center gap-3 text-sm py-20 justify-center"
            style={{ color: "var(--ds-text-3)" }}
          >
            <svg
              className="animate-spin w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            Loading&hellip;
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm mb-4" style={{ color: "var(--ds-danger)" }}>
            {error}
          </p>
        )}

        {/* Empty state */}
        {!loading && !error && cars.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="rounded-2xl p-12 text-center"
            style={{
              background: "var(--ds-card-bg)",
              border: "1px solid var(--ds-card-border)",
            }}
          >
            <p className="text-4xl mb-4">🚗</p>
            <p
              className="font-semibold mb-1"
              style={{ color: "var(--ds-text-1)" }}
            >
              You haven&apos;t saved any cars yet
            </p>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--ds-text-3)" }}
            >
              Analyze a car and save it to revisit later.
            </p>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{
                background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                boxShadow: "0 0 16px rgba(99,102,241,0.3)",
              }}
            >
              Analyze a car
            </Link>
          </motion.div>
        )}

        {/* Card grid */}
        {!loading && cars.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {cars.map((car, i) => {
                const vs = verdictStyle(car.verdict);
                const delta = Math.abs(car.price_delta);
                const isOver = car.price_delta > 0;
                const label = `${car.year} ${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`;

                return (
                  <motion.div
                    key={car.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04, duration: 0.4, ease }}
                    className="rounded-2xl p-5 flex flex-col gap-4"
                    style={{
                      background: "var(--ds-card-bg)",
                      border: "1px solid var(--ds-card-border)",
                      boxShadow: "var(--ds-card-shadow)",
                    }}
                  >
                    {/* Top row: ring + title + verdict */}
                    <div className="flex items-start gap-3">
                      <MiniRing score={car.deal_score} />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--ds-text-1)" }}
                        >
                          {label}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: vs.bg,
                              color: vs.text,
                            }}
                          >
                            {car.verdict}
                          </span>
                          <span
                            className="text-xs font-mono"
                            style={{
                              color: isOver
                                ? "var(--ds-danger)"
                                : "var(--ds-success)",
                            }}
                          >
                            {isOver ? "+" : "\u2212"}${delta.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Details row */}
                    <div
                      className="flex items-center gap-4 text-xs"
                      style={{ color: "var(--ds-text-3)" }}
                    >
                      <span className="flex items-center gap-1">
                        <svg
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          className="w-3.5 h-3.5"
                          style={{ color: "var(--ds-text-4)" }}
                        >
                          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm-.25 2v3.5l2.5 1.5.75-1.25-2-1.2V4.5h-1.25z" />
                        </svg>
                        ${car.asking_price.toLocaleString()}
                      </span>
                      <span
                        className="w-px h-3"
                        style={{ background: "var(--ds-divider)" }}
                      />
                      <span>{car.mileage.toLocaleString()} mi</span>
                      <span
                        className="w-px h-3"
                        style={{ background: "var(--ds-divider)" }}
                      />
                      <span>
                        Saved{" "}
                        {new Date(car.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Divider */}
                    <div
                      className="w-full h-px"
                      style={{ background: "var(--ds-divider)" }}
                    />

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/results/${car.analysis_id}`}
                        className="flex-1 text-center text-sm font-semibold py-2 rounded-xl transition-all hover:brightness-110"
                        style={{
                          background:
                            "linear-gradient(135deg,#4f46e5,#6366f1)",
                          color: "#fff",
                          boxShadow: "0 0 12px rgba(99,102,241,0.2)",
                        }}
                      >
                        View Analysis
                      </Link>
                      <button
                        onClick={() => handleRemove(car.id)}
                        disabled={removingId === car.id}
                        className="px-4 py-2 text-sm font-medium rounded-xl transition-all hover:brightness-110 disabled:opacity-50"
                        style={{
                          background: "var(--ds-badge-bg)",
                          border: "1px solid var(--ds-card-border)",
                          color: "var(--ds-text-2)",
                        }}
                      >
                        {removingId === car.id ? "Removing\u2026" : "Remove"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── Shared nav ── */
function Nav() {
  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "var(--ds-nav-bg)",
        borderBottom: "1px solid var(--ds-nav-border)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="mx-auto max-w-4xl px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo variant="full" size={26} />
          </Link>
          <span style={{ color: "var(--ds-text-4)" }}>/</span>
          <span className="text-sm" style={{ color: "var(--ds-text-3)" }}>
            Saved
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/analyze"
            className="text-sm px-4 py-2 rounded-xl font-semibold text-white"
            style={{
              background: "linear-gradient(135deg,#4f46e5,#6366f1)",
              boxShadow: "0 0 16px rgba(99,102,241,0.3)",
            }}
          >
            New analysis
          </Link>
          <UserNav />
        </div>
      </div>
    </nav>
  );
}
