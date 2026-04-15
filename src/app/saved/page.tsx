"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { UserNav } from "@/components/ui/user-nav";
import { Logo } from "@/components/ui/logo";
import type { BuyTimingStatus } from "@/lib/buyTiming";
import { relativeTime, eventTypeLabel } from "@/lib/buyTiming";

const ease = [0.22, 1, 0.36, 1] as const;

// Auto-refresh cars not checked in the last 4 hours on page load
const AUTO_REFRESH_THRESHOLD_MS = 4 * 60 * 60 * 1000;
const AUTO_REFRESH_STAGGER_MS   = 1500;

/* ─────────────────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────────────────── */

interface TrackedCar {
  id: string;
  analysis_id: string | null;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  asking_price: number;
  deal_score: number;
  verdict: string;
  price_delta: number;
  fair_value_mid: number | null;
  confidence_level: string | null;
  created_at: string;
  is_tracking: boolean;
  latest_fair_value_low: number | null;
  latest_fair_value_mid: number | null;
  latest_fair_value_high: number | null;
  latest_deal_score: number | null;
  last_checked_at: string | null;
  last_price_change_at: string | null;
  fair_value_change_amount: number | null;
  fair_value_change_percent: number | null;
  buy_timing_status: BuyTimingStatus | null;
  buy_timing_summary: string | null;
  market_data_available: boolean | null;
  vehicle_category: string | null;
}

interface RecentEvent {
  id: string;
  event_type: string;
  delta_amount: number | null;
  delta_percent: number | null;
  new_fair_value_mid: number | null;
  asking_price: number | null;
  deal_score: number | null;
  buy_timing_status: BuyTimingStatus | null;
  confidence_level: string | null;
  insight_summary: string | null;
  created_at: string;
  saved_cars: {
    id: string;
    year: number;
    make: string;
    model: string;
    trim: string | null;
    vehicle_category: string | null;
  } | null;
}

interface CarEvent {
  id: string;
  event_type: string;
  old_fair_value_mid: number | null;
  new_fair_value_mid: number | null;
  asking_price: number;
  delta_amount: number | null;
  delta_percent: number | null;
  deal_score: number | null;
  buy_timing_status: BuyTimingStatus | null;
  confidence_level: string | null;
  insight_summary: string | null;
  created_at: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Buy timing presentation
 * ───────────────────────────────────────────────────────────────────────────── */

const TIMING_STYLES: Record<BuyTimingStatus, { bg: string; border: string; text: string; dot: string }> = {
  buy_now:            { bg: "rgba(16,185,129,0.14)",  border: "rgba(16,185,129,0.32)",  text: "#10b981", dot: "#10b981" },
  strong_opportunity: { bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.24)",  text: "#34d399", dot: "#34d399" },
  worth_watching:     { bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.24)",  text: "#818cf8", dot: "#818cf8" },
  wait:               { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.24)",   text: "#f87171", dot: "#f87171" },
  no_change:          { bg: "var(--ds-badge-bg)",      border: "var(--ds-badge-border)", text: "var(--ds-text-3)", dot: "var(--ds-text-4)" },
  needs_review:       { bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.24)",  text: "#fbbf24", dot: "#fbbf24" },
};

const TIMING_LABELS: Record<BuyTimingStatus, string> = {
  buy_now:            "Buy Now",
  strong_opportunity: "Strong Opportunity",
  worth_watching:     "Worth Watching",
  wait:               "Wait",
  no_change:          "No Change",
  needs_review:       "Needs Review",
};

// Brief explanation for why a status was assigned — surfaces in the card
const TIMING_EXPLANATIONS: Record<BuyTimingStatus, string> = {
  buy_now:            "Asking price is well below fair value with high confidence",
  strong_opportunity: "Asking price is below the current fair value estimate",
  worth_watching:     "Priced near fair value — market is stable",
  wait:               "Asking price is above the current fair value estimate",
  no_change:          "Fair value estimate is essentially unchanged",
  needs_review:       "Limited market data — treat as directional only",
};

/* ─────────────────────────────────────────────────────────────────────────────
 * Small components
 * ───────────────────────────────────────────────────────────────────────────── */

function BuyTimingBadge({ status, size = "default" }: { status: BuyTimingStatus; size?: "default" | "large" }) {
  const s = TIMING_STYLES[status];
  const isLarge = size === "large";
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full flex-shrink-0 ${
        isLarge ? "text-[12px] px-3 py-1.5" : "text-[11px] px-2.5 py-1"
      }`}
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      <span className={`rounded-full flex-shrink-0 ${isLarge ? "w-2 h-2" : "w-1.5 h-1.5"}`}
        style={{ background: s.dot }} />
      {TIMING_LABELS[status]}
    </span>
  );
}

function ConfidencePill({ level }: { level: string }) {
  const color = level === "High"
    ? "var(--ds-success)"
    : level === "Medium"
    ? "var(--ds-warn)"
    : "var(--ds-text-4)";
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: "var(--ds-badge-bg)",
        border: "1px solid var(--ds-badge-border)",
        color,
      }}>
      {level} confidence
    </span>
  );
}

function FairValueBar({ low, mid, high, asking }: { low: number; mid: number; high: number; asking: number }) {
  const rangeMin = Math.min(low * 0.9, asking * 0.97);
  const rangeMax = Math.max(high * 1.1, asking * 1.03);
  const totalSpan = rangeMax - rangeMin;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - rangeMin) / totalSpan) * 100));

  const lowPct    = pct(low);
  const highPct   = pct(high);
  const midPct    = pct(mid);
  const askingPct = pct(asking);

  const isBelow  = asking < low;
  const isAbove  = asking > high;
  const askColor = isBelow ? "#10b981" : isAbove ? "#f87171" : "#818cf8";

  const diffAmt  = Math.abs(Math.round(asking - mid)).toLocaleString();
  const diffPct  = Math.abs(Math.round(((asking - mid) / mid) * 100));
  const posLabel = asking > mid
    ? `$${diffAmt} (${diffPct}%) above fair value`
    : `$${diffAmt} (${diffPct}%) below fair value`;
  const posColor = asking > mid ? "var(--ds-danger)" : "var(--ds-success)";

  return (
    <div className="w-full">
      <div className="relative h-2 rounded-full w-full" style={{ background: "var(--ds-divider)" }}>
        <div className="absolute h-full rounded-full"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%`, background: "rgba(99,102,241,0.22)" }} />
        <div className="absolute w-0.5 h-3 rounded-full -translate-y-0.5 -translate-x-1/2"
          style={{ left: `${midPct}%`, background: "rgba(99,102,241,0.55)" }} />
        <div className="absolute w-3 h-3 rounded-full -translate-y-0.5 -translate-x-1/2 border-2"
          style={{ left: `${askingPct}%`, background: askColor, borderColor: "var(--ds-card-bg)", boxShadow: `0 0 8px ${askColor}80` }} />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10px]" style={{ color: "var(--ds-text-4)" }}>
        <span>${low.toLocaleString()}</span>
        <span style={{ color: "var(--ds-text-3)" }}>Fair value: <span className="font-semibold">${mid.toLocaleString()}</span></span>
        <span>${high.toLocaleString()}</span>
      </div>
      {/* Price position text */}
      <p className="text-[11px] mt-1" style={{ color: posColor }}>
        Asking price is {posLabel}
      </p>
    </div>
  );
}

function MiniRing({ score }: { score: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 72 ? "var(--ds-success)" : score >= 48 ? "var(--ds-warn)" : "var(--ds-danger)";
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--ds-divider)" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color: "var(--ds-text-1)" }}>{score}</span>
      </div>
    </div>
  );
}

function IconRefresh({ spinning }: { spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={`w-3.5 h-3.5 ${spinning ? "animate-spin" : ""}`}>
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconTrendDown() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
}
function IconTrendUp() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Event timeline (per-card history)
 * ───────────────────────────────────────────────────────────────────────────── */

const EVENT_TYPE_COLORS: Record<string, string> = {
  first_check:      "var(--ds-text-3)",
  no_change:        "var(--ds-text-4)",
  fair_value_up:    "var(--ds-danger)",
  fair_value_down:  "var(--ds-success)",
  high_opportunity: "#10b981",
  watch_only:       "var(--ds-text-3)",
};

function EventTimeline({ events, loading }: { events: CarEvent[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 gap-2"
        style={{ color: "var(--ds-text-4)" }}>
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <span className="text-xs">Loading history…</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-xs py-4 text-center" style={{ color: "var(--ds-text-4)" }}>
        No history yet — market estimates update when you refresh.
      </p>
    );
  }

  return (
    <div className="space-y-0 relative">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: "var(--ds-divider)" }} />

      {events.map((event, idx) => {
        const dotColor = event.buy_timing_status
          ? TIMING_STYLES[event.buy_timing_status]?.dot ?? "var(--ds-text-4)"
          : EVENT_TYPE_COLORS[event.event_type] ?? "var(--ds-text-4)";

        const hasChange = event.delta_amount !== null && Math.abs(event.delta_amount) >= 100;
        const isUp      = (event.delta_amount ?? 0) > 0;

        return (
          <div key={event.id} className={`flex gap-4 ${idx < events.length - 1 ? "pb-4" : ""}`}>
            {/* Dot */}
            <div className="flex-shrink-0 w-3.5 h-3.5 rounded-full border-2 mt-0.5 z-10"
              style={{
                background: dotColor,
                borderColor: "var(--ds-card-bg)",
                boxShadow: `0 0 6px ${dotColor}60`,
              }} />

            <div className="flex-1 min-w-0 pb-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold" style={{ color: "var(--ds-text-2)" }}>
                  {eventTypeLabel(event.event_type)}
                </span>
                <span className="text-[10px] flex-shrink-0" style={{ color: "var(--ds-text-4)" }}>
                  {relativeTime(event.created_at)}
                </span>
              </div>

              {/* Market value change */}
              {hasChange && (
                <div className={`flex items-center gap-1 mt-0.5 text-[10px]`}
                  style={{ color: isUp ? "var(--ds-danger)" : "var(--ds-success)" }}>
                  {isUp ? <IconTrendUp /> : <IconTrendDown />}
                  <span>Market est. {isUp ? "up" : "down"} ${Math.abs(event.delta_amount!).toLocaleString()}</span>
                  {event.buy_timing_status && (
                    <span className="ml-1" style={{ color: "var(--ds-text-4)" }}>·</span>
                  )}
                  {event.buy_timing_status && (
                    <span style={{ color: TIMING_STYLES[event.buy_timing_status]?.text ?? "var(--ds-text-4)" }}>
                      {TIMING_LABELS[event.buy_timing_status]}
                    </span>
                  )}
                </div>
              )}

              {/* No change row */}
              {!hasChange && event.buy_timing_status && (
                <span className="text-[10px]" style={{ color: TIMING_STYLES[event.buy_timing_status]?.text ?? "var(--ds-text-4)" }}>
                  {TIMING_LABELS[event.buy_timing_status]}
                </span>
              )}

              {/* New fair value shown */}
              {event.new_fair_value_mid != null && event.event_type !== "no_change" && (
                <p className="text-[10px] mt-0.5" style={{ color: "var(--ds-text-4)" }}>
                  Fair value estimate: ${event.new_fair_value_mid.toLocaleString()}
                  {event.confidence_level && ` · ${event.confidence_level} confidence`}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Recent updates feed (cross-car, top of page)
 * ───────────────────────────────────────────────────────────────────────────── */

function UpdatesFeedRow({ event }: { event: RecentEvent }) {
  const car = event.saved_cars;
  if (!car) return null;

  const carName = `${car.year} ${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`;
  const hasChange = event.delta_amount != null && Math.abs(event.delta_amount) >= 100;
  const isUp = (event.delta_amount ?? 0) > 0;
  const changeColor = hasChange ? (isUp ? "var(--ds-danger)" : "var(--ds-success)") : "var(--ds-text-3)";

  return (
    <div className="flex items-center gap-3 py-2.5 px-5"
      style={{ borderBottom: "1px solid var(--ds-divider)" }}>
      {/* Status dot */}
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: event.buy_timing_status
            ? TIMING_STYLES[event.buy_timing_status]?.dot ?? "var(--ds-text-4)"
            : "var(--ds-text-4)",
        }} />

      {/* Car name */}
      <span className="text-[12px] font-semibold flex-shrink-0" style={{ color: "var(--ds-text-2)" }}>
        {carName}
      </span>

      {/* Separator */}
      <span style={{ color: "var(--ds-text-4)" }}>·</span>

      {/* Change description */}
      <span className="text-[11px] flex-1 min-w-0 truncate" style={{ color: changeColor }}>
        {hasChange
          ? `Market estimate ${isUp ? "up" : "down"} $${Math.abs(event.delta_amount!).toLocaleString()}`
          : eventTypeLabel(event.event_type)
        }
      </span>

      {/* Status badge (small) */}
      {event.buy_timing_status && (
        <BuyTimingBadge status={event.buy_timing_status} />
      )}

      {/* Time */}
      <span className="text-[10px] flex-shrink-0" style={{ color: "var(--ds-text-4)" }}>
        {relativeTime(event.created_at)}
      </span>
    </div>
  );
}

function UpdatesFeed({ events }: { events: RecentEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  if (events.length === 0) return null;

  const visible = expanded ? events : events.slice(0, 4);
  const hasMore = events.length > 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className="mb-5 rounded-2xl overflow-hidden"
      style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid var(--ds-divider)" }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-4)" }}>
          Recent Updates
        </p>
        <p className="text-[10px]" style={{ color: "var(--ds-text-4)" }}>
          Market value changes since you last visited
        </p>
      </div>

      {/* Rows */}
      {visible.map((event) => (
        <UpdatesFeedRow key={event.id} event={event} />
      ))}

      {/* Show more */}
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full py-2.5 text-[11px] font-medium transition-all hover:brightness-110"
          style={{ color: "var(--ds-text-4)", borderTop: "1px solid var(--ds-divider)" }}>
          {expanded ? "Show less" : `Show ${events.length - 4} more`}
        </button>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Tracked car card
 * ───────────────────────────────────────────────────────────────────────────── */

function TrackedCarCard({
  car,
  onRefresh,
  onRemove,
  onToggleHistory,
  isRefreshing,
  isRemoving,
  historyOpen,
  historyEvents,
  historyLoading,
}: {
  car: TrackedCar;
  onRefresh: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleHistory: (id: string) => void;
  isRefreshing: boolean;
  isRemoving: boolean;
  historyOpen: boolean;
  historyEvents: CarEvent[];
  historyLoading: boolean;
}) {
  const label       = `${car.year} ${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ""}`;
  const score       = car.latest_deal_score ?? car.deal_score;
  const fvLow       = car.latest_fair_value_low;
  const fvMid       = car.latest_fair_value_mid ?? car.fair_value_mid;
  const fvHigh      = car.latest_fair_value_high;
  const hasRange    = fvLow != null && fvMid != null && fvHigh != null;
  const timing      = car.buy_timing_status;
  const fvChange    = car.fair_value_change_amount ?? 0;
  const fvChangePct = car.fair_value_change_percent ?? 0;
  const neverChecked = !car.last_checked_at;
  const confidence  = car.confidence_level;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--ds-card-bg)",
        border: "1px solid var(--ds-card-border)",
        boxShadow: "var(--ds-card-shadow)",
      }}
    >
      {/* Refresh shimmer */}
      {isRefreshing && (
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-pulse" />
      )}

      <div className="p-5 space-y-4">

        {/* ── Row 1: Buy timing status (lead signal) ── */}
        {(timing && !neverChecked) && (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <BuyTimingBadge status={timing} size="large" />
              {confidence && <ConfidencePill level={confidence} />}
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--ds-text-4)" }}>
              {TIMING_EXPLANATIONS[timing]}
            </p>
          </div>
        )}

        {/* Checking state (never checked yet) */}
        {neverChecked && isRefreshing && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[11px]" style={{ color: "var(--ds-text-3)" }}>
              Checking market data for the first time…
            </span>
          </div>
        )}

        {/* ── Row 2: Car name + score ── */}
        <div className="flex items-center gap-3">
          <MiniRing score={score} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--ds-text-1)" }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-3)" }}>
              {car.mileage.toLocaleString()} mi · ${car.asking_price.toLocaleString()} asked
            </p>
          </div>
        </div>

        {/* ── Row 3: Market value change — clearly labeled ── */}
        {!neverChecked && Math.abs(fvChange) >= 100 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--ds-text-4)" }}>
              Market Value Change
            </p>
            <div className="flex items-center gap-2 text-xs"
              style={{ color: fvChange > 0 ? "var(--ds-danger)" : "var(--ds-success)" }}>
              {fvChange > 0 ? <IconTrendUp /> : <IconTrendDown />}
              <span>
                Market estimate {fvChange > 0 ? "up" : "down"}{" "}
                <strong>${Math.abs(fvChange).toLocaleString()}</strong>
                {" "}({Math.abs(fvChangePct).toFixed(1)}%) since you saved this
              </span>
            </div>
          </div>
        )}

        {/* No change since saved */}
        {!neverChecked && Math.abs(fvChange) < 100 && Math.abs(fvChange) >= 0 && hasRange && (
          <p className="text-[11px]" style={{ color: "var(--ds-text-4)" }}>
            Market estimate unchanged since saved
          </p>
        )}

        {/* ── Row 4: Fair value range bar ── */}
        {hasRange && !neverChecked && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--ds-text-4)" }}>
              Fair Value Estimate
              {" "}
              <span className="normal-case font-normal" style={{ color: "var(--ds-text-4)" }}>
                {car.market_data_available ? "· live market data" : "· statistical model"}
              </span>
            </p>
            <FairValueBar low={fvLow!} mid={fvMid!} high={fvHigh!} asking={car.asking_price} />
          </div>
        )}

        {/* ── Row 5: AI buy timing insight ── */}
        {car.buy_timing_summary && !neverChecked && (
          <p className="text-xs leading-relaxed" style={{ color: "var(--ds-text-2)" }}>
            {car.buy_timing_summary}
          </p>
        )}

        {/* ── Row 6: Not yet checked state ── */}
        {neverChecked && !isRefreshing && (
          <div className="rounded-xl px-4 py-3 text-xs"
            style={{ background: "var(--ds-badge-bg)", border: "1px solid var(--ds-badge-border)" }}>
            <p className="font-semibold mb-0.5" style={{ color: "var(--ds-text-2)" }}>
              Market check pending
            </p>
            <p style={{ color: "var(--ds-text-4)" }}>
              Original score: {car.deal_score}/100 · {car.verdict}
            </p>
          </div>
        )}

        {/* ── Footer: last updated + actions ── */}
        <div className="flex items-center justify-between gap-3 pt-1"
          style={{ borderTop: "1px solid var(--ds-divider)" }}>
          <span className="text-[11px]" style={{ color: "var(--ds-text-4)" }}>
            {neverChecked
              ? "Not yet checked"
              : `Updated ${relativeTime(car.last_checked_at)}`}
          </span>
          <div className="flex items-center gap-1.5">
            {/* History toggle */}
            <button
              onClick={() => onToggleHistory(car.id)}
              title="View check history"
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all hover:brightness-110"
              style={{
                background: historyOpen ? "rgba(99,102,241,0.12)" : "var(--ds-badge-bg)",
                border: `1px solid ${historyOpen ? "rgba(99,102,241,0.3)" : "var(--ds-badge-border)"}`,
                color: historyOpen ? "#818cf8" : "var(--ds-text-3)",
              }}>
              History
              <IconChevron open={historyOpen} />
            </button>

            {/* Refresh */}
            <button
              onClick={() => onRefresh(car.id)}
              disabled={isRefreshing}
              title="Refresh market estimate"
              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all hover:brightness-110 disabled:opacity-40"
              style={{
                background: "var(--ds-badge-bg)",
                border: "1px solid var(--ds-badge-border)",
                color: "var(--ds-text-3)",
              }}>
              <IconRefresh spinning={isRefreshing} />
              {isRefreshing ? "Checking…" : "Refresh"}
            </button>

            {/* View analysis */}
            {car.analysis_id && (
              <Link
                href={`/results/${car.analysis_id}`}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                  color: "#fff",
                  boxShadow: "0 0 10px rgba(99,102,241,0.2)",
                }}>
                View →
              </Link>
            )}

            {/* Remove */}
            <button
              onClick={() => onRemove(car.id)}
              disabled={isRemoving}
              className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all hover:brightness-110 disabled:opacity-40"
              style={{
                background: "var(--ds-badge-bg)",
                border: "1px solid var(--ds-badge-border)",
                color: "var(--ds-text-4)",
              }}>
              {isRemoving ? "…" : "Remove"}
            </button>
          </div>
        </div>

        {/* ── Inline event history (lazy-loaded) ── */}
        <AnimatePresence>
          {historyOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease }}
              className="overflow-hidden"
            >
              <div className="pt-3" style={{ borderTop: "1px solid var(--ds-divider)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-3"
                  style={{ color: "var(--ds-text-4)" }}>
                  Check History
                </p>
                <EventTimeline events={historyEvents} loading={historyLoading} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Main page
 * ───────────────────────────────────────────────────────────────────────────── */

export default function SavedCarsPage() {
  const [cars,              setCars]              = useState<TrackedCar[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState("");
  const [authed,            setAuthed]            = useState(true);
  const [removingId,        setRemovingId]        = useState<string | null>(null);
  const [refreshingIds,     setRefreshingIds]     = useState<Set<string>>(new Set());
  const [refreshAllRunning, setRefreshAllRunning] = useState(false);
  const [recentEvents,      setRecentEvents]      = useState<RecentEvent[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [carEvents,         setCarEvents]         = useState<Record<string, CarEvent[]>>({});
  const [historyLoadingIds, setHistoryLoadingIds] = useState<Set<string>>(new Set());
  const autoRefreshDone = useRef(false);

  /* ── Fetch cars ── */
  const fetchCars = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-cars");
      if (!res.ok) throw new Error("Failed to load tracked cars");
      const data = await res.json();
      setCars(data.cars ?? []);
      return data.cars as TrackedCar[];
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch recent events for the updates feed ── */
  const fetchRecentEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-cars/events");
      if (!res.ok) return;
      const data = await res.json();
      setRecentEvents(data.events ?? []);
    } catch { /* non-critical */ }
  }, []);

  /* ── Refresh a single car ── */
  const refreshCar = useCallback(async (id: string) => {
    setRefreshingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/saved-cars/${id}/refresh`, { method: "POST" });
      if (!res.ok) return; // rate limited — silent skip
      const data = await res.json();
      if (data.car) {
        setCars((prev) => prev.map((c) => (c.id === id ? data.car : c)));
        // Invalidate cached events for this car so history reloads fresh
        setCarEvents((prev) => { const n = { ...prev }; delete n[id]; return n; });
      }
    } catch { /* silent */ }
    finally {
      setRefreshingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, []);

  /* ── Refresh all ── */
  const handleRefreshAll = useCallback(async () => {
    if (refreshAllRunning || cars.length === 0) return;
    setRefreshAllRunning(true);
    for (const car of cars) {
      await refreshCar(car.id);
      await new Promise<void>((r) => setTimeout(r, AUTO_REFRESH_STAGGER_MS));
    }
    // Refresh the events feed after all cars update
    await fetchRecentEvents();
    setRefreshAllRunning(false);
  }, [cars, refreshCar, refreshAllRunning, fetchRecentEvents]);

  /* ── Auto-refresh stale cars on mount ── */
  const autoRefresh = useCallback(async (loadedCars: TrackedCar[]) => {
    if (autoRefreshDone.current) return;
    autoRefreshDone.current = true;

    const staleCars = loadedCars.filter((c) => {
      if (!c.last_checked_at) return true;
      return Date.now() - new Date(c.last_checked_at).getTime() > AUTO_REFRESH_THRESHOLD_MS;
    });

    for (const car of staleCars) {
      await refreshCar(car.id);
      await new Promise<void>((r) => setTimeout(r, AUTO_REFRESH_STAGGER_MS));
    }

    if (staleCars.length > 0) await fetchRecentEvents();
  }, [refreshCar, fetchRecentEvents]);

  /* ── Toggle history per card ── */
  const handleToggleHistory = useCallback(async (carId: string) => {
    if (expandedHistoryId === carId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(carId);

    // Lazy-load events if not already loaded
    if (!carEvents[carId]) {
      setHistoryLoadingIds((prev) => new Set(prev).add(carId));
      try {
        const res = await fetch(`/api/saved-cars/${carId}/events`);
        const data = await res.json();
        setCarEvents((prev) => ({ ...prev, [carId]: data.events ?? [] }));
      } catch { /* silent */ }
      finally {
        setHistoryLoadingIds((prev) => { const n = new Set(prev); n.delete(carId); return n; });
      }
    }
  }, [expandedHistoryId, carEvents]);

  /* ── Remove ── */
  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await fetch(`/api/saved-cars?id=${id}`, { method: "DELETE" });
      setCars((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Failed to remove car. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  /* ── Auth + load ── */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthed(false); setLoading(false); return; }

      const [loadedCars] = await Promise.all([fetchCars(), fetchRecentEvents()]);
      requestAnimationFrame(() => autoRefresh(loadedCars));
    })();
  }, [fetchCars, fetchRecentEvents, autoRefresh]);

  /* ── Derived counts ── */
  const opportunityCount = cars.filter(
    (c) => c.buy_timing_status === "buy_now" || c.buy_timing_status === "strong_opportunity",
  ).length;

  const mostRecentCheck = cars.reduce<string | null>((best, c) => {
    if (!c.last_checked_at) return best;
    if (!best || c.last_checked_at > best) return c.last_checked_at;
    return best;
  }, null);

  const updatedTodayCount = recentEvents.filter((e) => {
    if (!e.created_at) return false;
    return Date.now() - new Date(e.created_at).getTime() < 24 * 60 * 60 * 1000;
  }).length;

  /* ── Not authenticated ── */
  if (!authed && !loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--ds-bg)" }}>
        <Nav />
        <div className="mx-auto max-w-4xl px-4 py-12 text-center">
          <div className="rounded-2xl p-12 inline-block"
            style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)" }}>
            <p className="text-4xl mb-4">🔒</p>
            <p className="font-semibold mb-1" style={{ color: "var(--ds-text-1)" }}>Sign in to track cars</p>
            <p className="text-sm mb-6" style={{ color: "var(--ds-text-3)" }}>You need to be logged in to track car market value.</p>
            <Link href="/auth"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 0 16px rgba(99,102,241,0.3)" }}>
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

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-600 dark:from-white dark:to-white/70">
                Market Watch
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--ds-text-3)" }}>
                Track whether the market is moving in your favor.
              </p>
            </div>

            {cars.length > 0 && (
              <button
                onClick={handleRefreshAll}
                disabled={refreshAllRunning || refreshingIds.size > 0}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{
                  background: "var(--ds-badge-bg)",
                  border: "1px solid var(--ds-badge-border)",
                  color: "var(--ds-text-2)",
                }}>
                <IconRefresh spinning={refreshAllRunning} />
                {refreshAllRunning ? "Refreshing…" : "Refresh All"}
              </button>
            )}
          </div>

          {/* ── Summary stat bar (retention cue) ── */}
          {!loading && cars.length > 0 && (
            <div className="flex items-center gap-3 mt-3 flex-wrap text-[11px]"
              style={{ color: "var(--ds-text-4)" }}>
              <span>{cars.length} tracked</span>

              {opportunityCount > 0 && (
                <>
                  <span>·</span>
                  <span style={{ color: "#10b981", fontWeight: 600 }}>
                    {opportunityCount} {opportunityCount === 1 ? "opportunity" : "opportunities"}
                  </span>
                </>
              )}

              {updatedTodayCount > 0 && (
                <>
                  <span>·</span>
                  <span>{updatedTodayCount} updated today</span>
                </>
              )}

              {mostRecentCheck && (
                <>
                  <span>·</span>
                  <span>Last checked {relativeTime(mostRecentCheck)}</span>
                </>
              )}

              <span>·</span>
              <span style={{ color: "var(--ds-text-4)", fontStyle: "italic" }}>
                Fair value estimates only — not live listing prices
              </span>
            </div>
          )}
        </motion.div>

        {/* ── Strong opportunity banner ── */}
        <AnimatePresence>
          {opportunityCount > 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease }}
              className="mb-5 rounded-2xl px-5 py-3.5 flex items-center gap-3"
              style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.20)" }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"
                style={{ boxShadow: "0 0 8px #10b98180" }} />
              <p className="text-sm" style={{ color: "#10b981" }}>
                <span className="font-semibold">
                  {opportunityCount} {opportunityCount === 1 ? "car" : "cars"}
                </span>
                {" "}showing a strong buy timing signal based on current market estimates.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Recent updates feed ── */}
        {recentEvents.length > 0 && !loading && (
          <UpdatesFeed events={recentEvents} />
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center gap-3 text-sm py-20 justify-center" style={{ color: "var(--ds-text-3)" }}>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Loading…
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl px-4 py-3 mb-4 text-sm"
            style={{ background: "var(--ds-danger-bg)", border: "1px solid var(--ds-danger-border)", color: "var(--ds-danger)" }}>
            {error}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && cars.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="rounded-2xl p-14 text-center"
            style={{ background: "var(--ds-card-bg)", border: "1px solid var(--ds-card-border)" }}
          >
            <div className="text-5xl mb-5">📡</div>
            <p className="font-semibold mb-1" style={{ color: "var(--ds-text-1)" }}>No tracked cars yet</p>
            <p className="text-sm mb-1.5" style={{ color: "var(--ds-text-3)" }}>
              Analyze a car and click{" "}
              <strong style={{ color: "var(--ds-text-2)" }}>Track Price</strong>{" "}
              to start monitoring whether the market moves in your favor.
            </p>
            <p className="text-xs mb-7" style={{ color: "var(--ds-text-4)" }}>
              We track fair value estimate movement — not live listing prices from dealers.
              No credits used for ongoing tracking.
            </p>
            <Link href="/analyze"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 0 16px rgba(99,102,241,0.3)" }}>
              Analyze a car
            </Link>
          </motion.div>
        )}

        {/* ── Cards ── */}
        {!loading && cars.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease }}
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {cars.map((car) => (
                <TrackedCarCard
                  key={car.id}
                  car={car}
                  onRefresh={refreshCar}
                  onRemove={handleRemove}
                  onToggleHistory={handleToggleHistory}
                  isRefreshing={refreshingIds.has(car.id)}
                  isRemoving={removingId === car.id}
                  historyOpen={expandedHistoryId === car.id}
                  historyEvents={carEvents[car.id] ?? []}
                  historyLoading={historyLoadingIds.has(car.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Data honesty footer ── */}
        {!loading && cars.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-center text-xs mt-8"
            style={{ color: "var(--ds-text-4)" }}
          >
            Market estimates use VinAudit, Auto.dev, and MarketCheck data.
            We track fair value estimate movement for your saved vehicle's specs —
            not live listing prices from dealers. The asking price shown is the
            original price you saved.
          </motion.p>
        )}
      </div>
    </div>
  );
}

/* ── Nav ── */
function Nav() {
  return (
    <nav className="sticky top-0 z-50"
      style={{ background: "var(--ds-nav-bg)", borderBottom: "1px solid var(--ds-nav-border)", backdropFilter: "blur(20px)" }}>
      <div className="mx-auto max-w-4xl px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo variant="full" size={26} />
          </Link>
          <span style={{ color: "var(--ds-text-4)" }}>/</span>
          <span className="text-sm" style={{ color: "var(--ds-text-3)" }}>Market Watch</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/analyze"
            className="text-sm px-4 py-2 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 0 16px rgba(99,102,241,0.3)" }}>
            New analysis
          </Link>
          <UserNav />
        </div>
      </div>
    </nav>
  );
}
