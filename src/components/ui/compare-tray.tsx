"use client";

import { useCompare } from "@/contexts/compare-context";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function CompareTray() {
  const { items, removeItem, clearAll } = useCompare();

  if (items.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.35, ease }}
        className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      >
        <div className="mx-auto max-w-3xl px-4 pb-4 pointer-events-auto">
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{
              background: "var(--ds-card-bg)",
              border: "1px solid var(--ds-card-border)",
              boxShadow: "0 -4px 32px var(--ds-shadow-heavy), 0 0 0 1px var(--ds-card-border)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Car pills */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0">
              {items.map((item) => {
                const key = item.vin ?? `${item.year}-${item.make}-${item.model}`;
                return (
                  <div key={key}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)" }}
                  >
                    <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: "var(--ds-text-2)" }}>
                      {item.year} {item.make} {item.model}
                    </span>
                    <button onClick={() => removeItem(key)}
                      className="w-3.5 h-3.5 flex items-center justify-center rounded-full transition-colors"
                      style={{ color: "var(--ds-text-4)" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="w-2 h-2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {items.length > 0 && (
                <button onClick={clearAll}
                  className="text-[11px] font-medium transition-colors px-2 py-1"
                  style={{ color: "var(--ds-text-4)" }}>
                  Clear
                </button>
              )}
              <Link href="/compare"
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all ${
                  items.length < 2 ? "opacity-50 pointer-events-none" : "hover:brightness-110"
                }`}
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                  boxShadow: items.length >= 2 ? "0 0 16px var(--ds-accent-glow)" : "none",
                }}
              >
                Compare {items.length}
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
