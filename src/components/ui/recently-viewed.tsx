"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getRecentlyViewed } from "@/lib/recentlyViewed";
import type { RecentlyViewedItem } from "@/lib/types";

const ease = [0.22, 1, 0.36, 1] as const;

function MiniRing({ score }: { score: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 72 ? "var(--ds-success)" : score >= 48 ? "var(--ds-warn)" : "var(--ds-danger)";

  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--ds-divider)" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold" style={{ color: "var(--ds-text-1)" }}>{score}</span>
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const isGood = verdict === "Buy" || verdict === "Fair Deal";
  const isWarn = verdict === "Negotiate" || verdict === "Needs Option Review";
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{
        background: isGood ? "var(--ds-success-bg)" : isWarn ? "var(--ds-warn-bg)" : "var(--ds-danger-bg)",
        color: isGood ? "var(--ds-success)" : isWarn ? "var(--ds-warn)" : "var(--ds-danger)",
      }}>
      {verdict}
    </span>
  );
}

export function RecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease }}
      className="mt-8"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ds-text-3)" }}>
          Recently Viewed
        </h3>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.vin}
            href={item.analysisId ? `/results/${item.analysisId}` : "#"}
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all"
            style={{
              background: "var(--ds-card-bg)",
              border: "1px solid var(--ds-card-border)",
            }}
          >
            <MiniRing score={item.dealScore} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--ds-text-1)" }}>
                {item.year} {item.make} {item.model} {item.trim ?? ""}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--ds-text-3)" }}>
                ${item.askingPrice.toLocaleString()} · {item.mileage.toLocaleString()} mi
              </p>
            </div>
            <VerdictBadge verdict={item.verdict} />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
