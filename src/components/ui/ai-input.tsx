"use client"

import React from "react"
import { cx } from "class-variance-authority"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"

/* ── Color orb (CSS injected once into <head>) ── */
const ORB_CSS = `
@property --angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
.ds-color-orb {
  display: grid;
  grid-template-areas: "stack";
  overflow: hidden;
  border-radius: 50%;
  position: relative;
  transform: scale(1.1);
}
.ds-color-orb::before,
.ds-color-orb::after {
  content: "";
  display: block;
  grid-area: stack;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  transform: translateZ(0);
}
.ds-color-orb::before {
  background:
    conic-gradient(from calc(var(--angle)*2) at 25% 70%, var(--orb-accent3), transparent 20% 80%, var(--orb-accent3)),
    conic-gradient(from calc(var(--angle)*2) at 45% 75%, var(--orb-accent2), transparent 30% 60%, var(--orb-accent2)),
    conic-gradient(from calc(var(--angle)*-3) at 80% 20%, var(--orb-accent1), transparent 40% 60%, var(--orb-accent1)),
    conic-gradient(from calc(var(--angle)*2) at 15% 5%, var(--orb-accent2), transparent 10% 90%, var(--orb-accent2)),
    conic-gradient(from calc(var(--angle)*1) at 20% 80%, var(--orb-accent1), transparent 10% 90%, var(--orb-accent1)),
    conic-gradient(from calc(var(--angle)*-2) at 85% 10%, var(--orb-accent3), transparent 20% 80%, var(--orb-accent3));
  box-shadow: inset var(--orb-base) 0 0 2px 0.2px;
  filter: blur(var(--orb-blur)) contrast(var(--orb-contrast));
  animation: dsOrbSpin var(--orb-duration) linear infinite;
}
.ds-color-orb::after {
  background-image: radial-gradient(circle at center, var(--orb-base) 0.1px, transparent 0.1px);
  background-size: 0.2px 0.2px;
  backdrop-filter: blur(calc(var(--orb-blur)*2)) contrast(calc(var(--orb-contrast)*2));
  mix-blend-mode: overlay;
  mask-image: radial-gradient(black 25%, transparent 75%);
}
@keyframes dsOrbSpin { to { --angle: 360deg; } }
@media (prefers-reduced-motion: reduce) { .ds-color-orb::before { animation: none; } }
`

let orbStyleInjected = false

function ColorOrb({ dimension = "24px", className }: { dimension?: string; className?: string }) {
  React.useEffect(() => {
    if (orbStyleInjected) return
    const el = document.createElement("style")
    el.textContent = ORB_CSS
    document.head.appendChild(el)
    orbStyleInjected = true
  }, [])

  return (
    <div
      className={cn("ds-color-orb", className)}
      style={{
        width: dimension,
        height: dimension,
        "--orb-base": "oklch(22.64% 0 0)",
        "--orb-accent1": "oklch(75% 0.15 350)",
        "--orb-accent2": "oklch(80% 0.12 200)",
        "--orb-accent3": "oklch(78% 0.14 280)",
        "--orb-blur": "3.6px",
        "--orb-contrast": "1.5",
        "--orb-duration": "20s",
      } as React.CSSProperties}
    />
  )
}

/* ── Dimensions ── */
const FORM_WIDTH = 340
const FORM_HEIGHT = 220
const SPEED = 1

/* ── Context ── */
interface Ctx {
  showForm: boolean
  triggerOpen: () => void
  triggerClose: () => void
}
const FormCtx = React.createContext({} as Ctx)
const useCtx = () => React.useContext(FormCtx)

/* ── Panel state ── */
type PanelState = "idle" | "loading" | "reply"

export function AiInputWidget() {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const [showForm, setShowForm] = React.useState(false)
  const [panelState, setPanelState] = React.useState<PanelState>("idle")
  const [reply, setReply] = React.useState("")

  const triggerClose = React.useCallback(() => {
    setShowForm(false)
    setPanelState("idle")
    setReply("")
    textareaRef.current?.blur()
  }, [])

  const triggerOpen = React.useCallback(() => {
    setShowForm(true)
    setPanelState("idle")
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  React.useEffect(() => {
    function clickHandler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && showForm) {
        triggerClose()
      }
    }
    function keyHandler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        if (showForm) triggerClose()
        else triggerOpen()
      }
    }
    document.addEventListener("mousedown", clickHandler)
    document.addEventListener("keydown", keyHandler)
    return () => {
      document.removeEventListener("mousedown", clickHandler)
      document.removeEventListener("keydown", keyHandler)
    }
  }, [showForm, triggerClose, triggerOpen])

  async function handleSubmit(message: string) {
    if (!message.trim()) return
    setPanelState("loading")
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      setReply(data.reply ?? data.error ?? "Something went wrong.")
      setPanelState("reply")
    } catch {
      setReply("Couldn't reach AI. Check your connection.")
      setPanelState("reply")
    }
  }

  const ctx = React.useMemo(
    () => ({ showForm, triggerOpen, triggerClose }),
    [showForm, triggerOpen, triggerClose]
  )

  const expandedHeight = panelState === "reply" ? 260 : FORM_HEIGHT

  return (
    <div style={{ width: FORM_WIDTH, height: expandedHeight }}>
      <motion.div
        ref={wrapperRef}
        className="relative flex flex-col items-center overflow-hidden"
        initial={false}
        animate={{
          width: showForm ? FORM_WIDTH : "auto",
          height: showForm ? expandedHeight : 44,
          borderRadius: showForm ? 14 : 22,
        }}
        transition={{ type: "spring", stiffness: 550 / SPEED, damping: 45, mass: 0.7 }}
        style={{
          background: "var(--ds-card-bg)",
          border: "1px solid var(--ds-card-border)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(99,102,241,0.08)",
        }}
      >
        <FormCtx.Provider value={ctx}>
          <DockBar />
          <InputForm
            ref={textareaRef}
            panelState={panelState}
            reply={reply}
            onSubmit={handleSubmit}
            onNewQuestion={() => {
              setPanelState("idle")
              setReply("")
              setTimeout(() => textareaRef.current?.focus(), 50)
            }}
          />
        </FormCtx.Provider>
      </motion.div>
    </div>
  )
}

function DockBar() {
  const { showForm, triggerOpen } = useCtx()
  return (
    <footer className="mt-auto flex h-[44px] items-center justify-center whitespace-nowrap select-none flex-shrink-0">
      <div className="flex items-center gap-2 px-3">
        <AnimatePresence mode="wait">
          {!showForm && (
            <motion.div
              key="orb"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ColorOrb dimension="22px" />
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={triggerOpen}
          className="flex h-fit items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium transition-colors"
          style={{ color: "var(--ds-text-2)" }}
        >
          <span>Ask AI</span>
          {!showForm && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: "var(--ds-text-4)", background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)" }}>
              ⌘K
            </span>
          )}
        </button>
      </div>
    </footer>
  )
}

interface InputFormProps {
  ref: React.Ref<HTMLTextAreaElement>
  panelState: PanelState
  reply: string
  onSubmit: (msg: string) => void
  onNewQuestion: () => void
}

function InputForm({ ref, panelState, reply, onSubmit, onNewQuestion }: InputFormProps) {
  const { triggerClose, showForm } = useCtx()
  const [value, setValue] = React.useState("")
  const btnRef = React.useRef<HTMLButtonElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value.trim() && panelState === "idle") {
      onSubmit(value)
      setValue("")
    }
  }

  function handleKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") triggerClose()
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      btnRef.current?.click()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute bottom-0 w-full"
      style={{ width: FORM_WIDTH, pointerEvents: showForm ? "all" : "none" }}
    >
      <AnimatePresence mode="wait">
        {showForm && panelState !== "reply" && (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 550 / SPEED, damping: 45, mass: 0.7 }}
            className="flex flex-col p-2"
            style={{ height: FORM_HEIGHT }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-2">
                <ColorOrb dimension="18px" />
                <span className="text-xs font-semibold" style={{ color: "var(--ds-text-2)" }}>
                  DealSense AI
                </span>
              </div>
              <div className="flex items-center gap-1">
                {panelState === "loading" && (
                  <span className="text-xs" style={{ color: "var(--ds-text-3)" }}>Thinking…</span>
                )}
                <button
                  type="button"
                  onClick={triggerClose}
                  className="p-1 rounded-lg transition-colors text-xs"
                  style={{ color: "var(--ds-text-4)" }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              ref={ref}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ask about this deal, negotiation, reliability…"
              name="message"
              className="flex-1 w-full resize-none rounded-lg p-3 text-sm outline-none"
              style={{
                background: "var(--ds-input-bg)",
                border: "1px solid var(--ds-input-border)",
                color: "var(--ds-text-1)",
              }}
              disabled={panelState === "loading"}
              required
              onKeyDown={handleKeys}
              spellCheck={false}
            />

            {/* Footer */}
            <div className="flex items-center justify-between px-1 pt-1.5">
              <span className="text-xs" style={{ color: "var(--ds-text-4)" }}>
                Esc to close
              </span>
              <button
                ref={btnRef}
                type="submit"
                disabled={panelState === "loading" || !value.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
              >
                {panelState === "loading" ? (
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
                <KeyHint>⌘↵</KeyHint>
              </button>
            </div>
          </motion.div>
        )}

        {showForm && panelState === "reply" && (
          <motion.div
            key="reply"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col p-3"
            style={{ height: 260 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ColorOrb dimension="18px" />
                <span className="text-xs font-semibold" style={{ color: "var(--ds-text-2)" }}>DealSense AI</span>
              </div>
              <button
                type="button"
                onClick={triggerClose}
                className="text-xs p-1 rounded"
                style={{ color: "var(--ds-text-4)" }}
              >✕</button>
            </div>

            {/* Reply */}
            <div
              className="flex-1 overflow-y-auto rounded-lg p-3 text-sm leading-relaxed"
              style={{
                background: "var(--ds-input-bg)",
                border: "1px solid var(--ds-input-border)",
                color: "var(--ds-text-1)",
              }}
            >
              {reply}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onNewQuestion}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)", color: "var(--ds-text-2)" }}
              >
                Ask another
              </button>
              <button
                type="button"
                onClick={triggerClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}

function KeyHint({ children }: { children: string }) {
  return (
    <kbd
      className="flex h-5 items-center justify-center rounded px-1 font-sans text-xs"
      style={{ border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.8)" }}
    >
      {children}
    </kbd>
  )
}
