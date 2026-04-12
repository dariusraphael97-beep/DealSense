"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { EtherealShadow } from "@/components/ui/etheral-shadow"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"

// ─── Icons ───────────────────────────────────────────────────────────────────
function IconEye({ off }: { off?: boolean }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  )
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function IconLoader() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 animate-spin">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
    </svg>
  )
}

// ─── Password strength ────────────────────────────────────────────────────────
function getStrength(pw: string) {
  if (pw.length === 0) return 0
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"]
const STRENGTH_COLOR = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-emerald-400"]

// ─── Input field ──────────────────────────────────────────────────────────────
function GlassInput({ label, type = "text", value, onChange, error, suffix }: {
  label: string; type?: string; value: string
  onChange: (v: string) => void; error?: string; suffix?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0
  return (
    <div className="relative">
      <div className={`relative rounded-xl border transition-all duration-200 ${
        error ? "border-red-400/60 bg-red-500/5" :
        focused ? "border-blue-400/70 bg-white/10" : "border-white/20 bg-white/5"
      }`}>
        <label className={`absolute left-4 transition-all duration-200 pointer-events-none select-none ${
          floated ? "top-2 text-[10px] font-semibold tracking-wider uppercase text-blue-300"
                  : "top-1/2 -translate-y-1/2 text-sm text-white/40"
        }`}>{label}</label>
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "off"}
          className="w-full bg-transparent pt-6 pb-2 px-4 text-sm text-white outline-none rounded-xl pr-10"
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-400 mt-1.5 ml-1">
          {error}
        </motion.p>
      )}
    </div>
  )
}

// ─── Auth form ────────────────────────────────────────────────────────────────
function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [step, setStep] = useState<"form" | "verify">("form")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState("")
  const pwStrength = getStrength(password)

  // Capture referral code from URL (?ref=xxxx) or localStorage
  const refCode = searchParams.get("ref") ?? (typeof window !== "undefined" ? localStorage.getItem("ds_ref") : null) ?? ""

  useEffect(() => {
    // Persist referral code in localStorage so it survives page reloads
    const ref = searchParams.get("ref")
    if (ref && typeof window !== "undefined") {
      localStorage.setItem("ds_ref", ref)
    }
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get("error") === "verification_failed")
      setGlobalError("Email verification failed. Please try signing in again.")
  }, [searchParams])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Enter a valid email address"
    if (password.length < 8) e.password = "Password must be at least 8 characters"
    if (mode === "signup" && fullName.trim().length < 2) e.fullName = "Enter your full name"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const supabaseAvailable =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http")

  const handleSubmit = useCallback(async () => {
    if (!validate()) return
    setLoading(true)
    setGlobalError("")

    if (!supabaseAvailable) {
      await new Promise(r => setTimeout(r, 1200))
      setLoading(false)
      router.push("/")
      return
    }

    const supabase = createClient()
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setGlobalError(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message)
        setLoading(false)
        return
      }
      router.push("/")
      router.refresh()
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: {
            full_name: fullName,
            ...(refCode ? { referred_by_code: refCode } : {}),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      // Clear referral code from localStorage after use
      if (typeof window !== "undefined") localStorage.removeItem("ds_ref")
      if (error) { setGlobalError(error.message); setLoading(false); return }
      setStep("verify")
      setResendTimer(60)
    }
    setLoading(false)
  }, [email, password, fullName, mode, router, supabaseAvailable, refCode])

  const switchMode = (m: "signin" | "signup") => {
    setMode(m); setErrors({}); setGlobalError(""); setPassword("")
  }

  if (step === "verify") {
    return (
      <motion.div key="verify" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-sm mx-auto">
        <div className="backdrop-blur-2xl bg-white/[0.06] border border-white/[0.12] rounded-3xl p-8 shadow-2xl text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mx-auto mb-6 text-blue-300">
            <IconMail />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Verification link sent to<br /><span className="text-white/80 font-medium">{email}</span>
          </p>
          <div className="space-y-3 mb-6">
            {["Open the email from DealSense", "Click the verification link", "You'll be signed in automatically"].map((s, i) => (
              <motion.div key={s} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }} className="flex items-center gap-3 text-left">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 flex-shrink-0"><IconCheck /></span>
                <span className="text-white/60 text-sm">{s}</span>
              </motion.div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-5 space-y-3">
            <button onClick={async () => {
              if (!supabaseAvailable || resendTimer > 0) return
              await createClient().auth.resend({ type: "signup", email })
              setResendTimer(60)
            }} disabled={resendTimer > 0}
              className="w-full text-sm text-white/50 hover:text-white/80 transition-colors disabled:cursor-not-allowed">
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend verification email"}
            </button>
            <button onClick={() => { setStep("form"); setMode("signin") }}
              className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Back to sign in
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div key="form" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-sm mx-auto">
      <div className="backdrop-blur-2xl bg-white/[0.06] border border-white/[0.12] rounded-3xl p-8 shadow-2xl">

        {/* Tab switcher */}
        <div className="relative flex bg-white/5 rounded-xl p-1 mb-7">
          <motion.span layout layoutId="signin-tab-bg"
            className="absolute top-1 bottom-1 rounded-lg bg-white/10 border border-white/15"
            style={{ width: "calc(50% - 4px)", left: mode === "signin" ? 4 : "calc(50%)" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          />
          {(["signin", "signup"] as const).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${mode === m ? "text-white" : "text-white/40 hover:text-white/70"}`}>
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Headline */}
        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mb-6">
            <h2 className="text-2xl font-bold text-white leading-tight">
              {mode === "signin" ? "Welcome back" : "Check your first deal free"}
            </h2>
            <p className="text-white/40 text-sm mt-1">
              {mode === "signin" ? "Sign in to your DealSense account" : "Free during early access — no credit card needed"}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Fields */}
        <form onSubmit={e => { e.preventDefault(); handleSubmit() }} className="space-y-3">
          <AnimatePresence mode="popLayout">
            {mode === "signup" && (
              <motion.div key="fullname" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
                <GlassInput label="Full name" value={fullName} onChange={setFullName} error={errors.fullName} />
              </motion.div>
            )}
          </AnimatePresence>

          <GlassInput label="Email address" type="email" value={email} onChange={setEmail} error={errors.email} />
          <GlassInput label="Password" type={showPass ? "text" : "password"} value={password} onChange={setPassword}
            error={errors.password}
            suffix={<button type="button" onClick={() => setShowPass(s => !s)} className="cursor-pointer"><IconEye off={showPass} /></button>}
          />

          <AnimatePresence>
            {mode === "signup" && password.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= pwStrength ? STRENGTH_COLOR[pwStrength] : "bg-white/10"}`} />
                  ))}
                </div>
                <p className="text-xs text-white/40 mt-1">
                  Strength: <span className={`font-medium ${pwStrength === 4 ? "text-emerald-400" : pwStrength === 3 ? "text-blue-400" : pwStrength === 2 ? "text-amber-400" : "text-red-400"}`}>{STRENGTH_LABEL[pwStrength]}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {globalError && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-xl bg-red-500/10 border border-red-400/20 px-4 py-3">
                <p className="text-sm text-red-400">{globalError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-600/25">
            {loading ? (<><IconLoader />{mode === "signin" ? "Signing in…" : "Creating account…"}</>) : (mode === "signin" ? "Sign in" : "Create account")}
          </motion.button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10">
          {!supabaseAvailable ? (
            <p className="text-xs text-white/30 text-center">Demo mode — connect Supabase in <code className="text-white/50">.env.local</code> for real auth</p>
          ) : (
            <p className="text-xs text-white/30 text-center">
              {mode === "signin" ? "No account? " : "Already have one? "}
              <button onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
                {mode === "signin" ? "Create one free" : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="flex items-center justify-center gap-5 mt-6 text-xs text-white/20">
        <span>🔒 256-bit encryption</span><span>·</span>
        <span>No credit card required</span><span>·</span>
        <span>Free to start</span>
      </motion.div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SignInPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#030303]">
      {/* Ethereal shadow as full-screen background */}
      <EtherealShadow
        color="rgba(79, 70, 229, 1)"
        animation={{ scale: 100, speed: 90 }}
        noise={{ opacity: 0.8, scale: 1.2 }}
        sizing="fill"
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Form centered on top */}
      <div className="relative z-20 flex items-center justify-center min-h-screen px-4 py-16">
        <Suspense>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  )
}
