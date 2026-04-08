"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { User, LogOut, ChevronDown, Settings } from "lucide-react"

export function UserNav() {
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
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
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.80)",
        }}
      >
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}>
          {initials}
        </span>
        <span className="hidden sm:inline max-w-[140px] truncate">{shortEmail}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "rgba(255,255,255,0.35)" }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-58 rounded-xl overflow-hidden z-50"
            style={{
              width: 220,
              background: "rgba(12,12,20,0.96)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.06)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Account info */}
            <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Signed in as</p>
              <p className="text-sm font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{email}</p>
            </div>

            {/* Menu items */}
            <div className="p-1.5 space-y-0.5">
              <Link href="/settings" onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ color: "rgba(255,255,255,0.65)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>

              <button
                onClick={signOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{ color: "rgba(239,68,68,0.85)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
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
