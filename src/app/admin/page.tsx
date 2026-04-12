"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCredits } from "@/contexts/credits-context";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

interface User {
  id: string;
  email: string;
  credits: number;
  role: "user" | "staff" | "admin";
  referral_code: string | null;
  created_at: string;
  analysis_count: number;
}

const ROLE_COLORS = {
  admin: { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)", text: "#c084fc" },
  staff: { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", text: "#818cf8" },
  user:  { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "var(--ds-text-3)" },
};
const ROLE_CYCLE: Record<string, "user" | "staff" | "admin"> = { user: "staff", staff: "admin", admin: "user" };

export default function AdminPage() {
  const router = useRouter();
  const { role, loading: credLoading } = useCredits();
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [editing, setEditing]   = useState<{ id: string; credits: string } | null>(null);
  const [saving, setSaving]     = useState<string | null>(null);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (!credLoading && role !== "admin") router.replace("/");
  }, [role, credLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin");
      const data = await res.json();
      if (res.ok) setUsers(data.users ?? []);
      else setError(data.error ?? "Failed to load");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (role === "admin") load(); }, [role, load]);

  async function patchUser(userId: string, updates: { role?: string; credits?: number }) {
    setSaving(userId);
    try {
      await fetch("/api/admin", {
        method:  "PATCH",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ userId, ...updates }),
      });
      await load();
    } finally { setSaving(null); setEditing(null); }
  }

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.referral_code ?? "").includes(search.toLowerCase())
  );

  if (credLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ds-bg)" }}>
      <div className="flex items-center gap-3 text-sm" style={{ color: "var(--ds-text-3)" }}>
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
        Loading admin panel…
      </div>
    </div>
  );

  if (role !== "admin") return null;

  const totalUsers     = users.length;
  const totalAnalyses  = users.reduce((s, u) => s + u.analysis_count, 0);
  const staffCount     = users.filter((u) => u.role !== "user").length;

  return (
    <div className="min-h-screen" style={{ background: "var(--ds-bg)" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50" style={{ background: "var(--ds-nav-bg)", borderBottom: "1px solid var(--ds-nav-border)", backdropFilter: "blur(20px)" }}>
        <div className="mx-auto max-w-6xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Logo variant="full" size={26} />
            </Link>
            <span style={{ color: "var(--ds-text-4)" }}>/</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: "#c084fc" }}>
              Admin
            </span>
          </div>
          <Link href="/analyze" className="text-sm px-4 py-2 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
            Analyze
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* Stats row */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Users",    value: totalUsers },
            { label: "Total Analyses", value: totalAnalyses },
            { label: "Staff / Admin",  value: staffCount },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)" }}>
              <p className="text-3xl font-extrabold font-heading" style={{ color: "var(--ds-text-1)" }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--ds-text-4)" }}>{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Header + search */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--ds-text-1)" }}>Users</h2>
          <input
            type="text" placeholder="Search by email or referral code…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl px-4 py-2.5 text-sm w-72 focus:outline-none"
            style={{ background: "var(--ds-input-bg)", border: "1px solid var(--ds-input-border)", color: "var(--ds-text-1)" }}
          />
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {/* User table */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--ds-card-border)" }}>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider"
            style={{ background: "var(--ds-badge-bg)", color: "var(--ds-text-4)", borderBottom: "1px solid var(--ds-card-border)" }}>
            <span>User</span><span>Role</span><span>Credits</span><span>Analyses</span><span>Actions</span>
          </div>

          <AnimatePresence>
            {filtered.map((user, i) => {
              const rc = ROLE_COLORS[user.role];
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4"
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--ds-divider)" : undefined, background: "var(--ds-card-bg)" }}
                >
                  {/* Email + meta */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--ds-text-1)" }}>{user.email}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-4)" }}>
                      Joined {new Date(user.created_at).toLocaleDateString()}
                      {user.referral_code && <> · ref: <span className="font-mono">{user.referral_code}</span></>}
                    </p>
                  </div>

                  {/* Role badge — click to cycle */}
                  <button
                    onClick={() => patchUser(user.id, { role: ROLE_CYCLE[user.role] })}
                    disabled={saving === user.id}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full transition-all hover:brightness-125 disabled:opacity-50"
                    style={{ background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text }}>
                    {saving === user.id ? "…" : user.role}
                  </button>

                  {/* Credits — click to edit */}
                  {editing?.id === user.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" value={editing.credits}
                        onChange={(e) => setEditing({ id: user.id, credits: e.target.value })}
                        className="w-16 rounded-lg px-2 py-1 text-sm text-center focus:outline-none"
                        style={{ background: "var(--ds-input-bg)", border: "1px solid var(--ds-input-focus)", color: "var(--ds-text-1)" }}
                      />
                      <button onClick={() => patchUser(user.id, { credits: parseInt(editing.credits) })}
                        className="text-xs px-2 py-1 rounded-lg font-semibold text-white"
                        style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditing({ id: user.id, credits: String(user.credits) })}
                      className="text-sm font-mono font-semibold px-3 py-1 rounded-lg transition-all hover:brightness-125 text-left"
                      style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: user.role !== "user" ? "#818cf8" : "var(--ds-text-2)", minWidth: 40 }}>
                      {user.role !== "user" ? "∞" : user.credits}
                    </button>
                  )}

                  {/* Analysis count */}
                  <span className="text-sm text-center" style={{ color: "var(--ds-text-3)" }}>{user.analysis_count}</span>

                  {/* Quick actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => patchUser(user.id, { credits: (user.credits ?? 0) + 5 })}
                      title="Add 5 credits"
                      className="text-xs px-2.5 py-1.5 rounded-lg transition-all hover:brightness-125"
                      style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}>
                      +5
                    </button>
                    <button
                      onClick={() => patchUser(user.id, { credits: 0 })}
                      title="Zero out credits"
                      className="text-xs px-2.5 py-1.5 rounded-lg transition-all hover:brightness-125"
                      style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", color: "#f87171" }}>
                      0
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--ds-text-4)", background: "var(--ds-card-bg)" }}>
              No users found.
            </div>
          )}
        </div>

        <p className="text-xs mt-4 text-center" style={{ color: "var(--ds-text-4)" }}>
          Click a role badge to cycle user → staff → admin · Click a credit number to edit it
        </p>
      </div>
    </div>
  );
}
