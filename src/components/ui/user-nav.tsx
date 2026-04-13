"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { LogOut, ChevronDown, Settings, Clock, Shield, Bookmark, BarChart3 } from "lucide-react"
import { useCredits } from "@/contexts/credits-context"

export function UserNav() {
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const { role } = useCredits()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const signOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth")
    router.refresh()
  }

  if (!email) return null

  const initials = email[0].toUpperCase()
  const shortEmail = email.length > 22 ? email.slice(0, 20) + "…" : email

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all"
        style={{
          background: "var(--ds-badge-bg)",
          border: "1px solid var(--ds-badge-border)",
          color: "var(--ds-text-2)",
        }}
      >
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}>
          {initials}
        </span>
        <span className="hidden sm:inline max-w-[140px] truncate">{shortEmail}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--ds-text-4)" }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="menu"
            className="absolute right-0 mt-2 w-58 rounded-xl overflow-hidden z-50"
            style={{
              width: 220,
              background: "var(--ds-dropdown-bg, #ffffff)",
              border: "1px solid var(--ds-card-border)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(99,102,241,0.06)",
            }}
          >
            {/* Account info */}
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--ds-divider)" }}>
              <p className="text-xs font-medium mb-0.5" style={{ color: "var(--ds-text-4)" }}>Signed in as</p>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--ds-text-1)" }}>{email}</p>
            </div>

            {/* Menu items */}
            <div className="p-1.5 space-y-0.5" role="none">
              <Link href="/saved" onClick={() => setOpen(false)} role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                style={{ color: "var(--ds-text-3)" }}
              >
                <Bookmark className="w-4 h-4" />
                Saved Cars
              </Link>

              <Link href="/compare" onClick={() => setOpen(false)} role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                style={{ color: "var(--ds-text-3)" }}
              >
                <BarChart3 className="w-4 h-4" />
                Compare
              </Link>

              <Link href="/history" onClick={() => setOpen(false)} role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                style={{ color: "var(--ds-text-3)" }}
              >
                <Clock className="w-4 h-4" />
                History
              </Link>

              {role === "admin" && (
                <Link href="/admin" onClick={() => setOpen(false)} role="menuitem"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-purple-500/[0.08]"
                  style={{ color: "rgba(168,85,247,0.85)" }}
                >
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </Link>
              )}

              <Link href="/settings" onClick={() => setOpen(false)} role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                style={{ color: "var(--ds-text-3)" }}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>

              <button
                onClick={signOut}
                disabled={signingOut}
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 hover:bg-red-500/[0.08]"
                style={{ color: "rgba(239,68,68,0.85)" }}
              >
                <LogOut className="w-4 h-4" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
