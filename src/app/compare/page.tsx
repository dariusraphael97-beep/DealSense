"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCompare } from "@/contexts/compare-context";
import { UserNav } from "@/components/ui/user-nav";
import { Logo } from "@/components/ui/logo";
import type { CompareItem } from "@/lib/types";

/* ── Easing ── */
const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

/* ── Verdict styles ── */
const VERDICT_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  "Buy":                  { bg: "var(--ds-success-bg)", border: "var(--ds-success-border)", text: "var(--ds-success)" },
  "Fair Deal":            { bg: "var(--ds-success-bg)", border: "var(--ds-success-border)", text: "var(--ds-success)" },
  "Negotiate":            { bg: "var(--ds-warn-bg)",    border: "var(--ds-warn-border)",    text: "var(--ds-warn)" },
  "Needs Option Review":  { bg: "var(--ds-warn-bg)",    border: "var(--ds-warn-border)",    text: "var(--ds-warn)" },
  "Possibly Overpriced":  { bg: "var(--ds-danger-bg)",  border: "var(--ds-danger-border)",  text: "var(--ds-danger)" },
  "Walk Away":            { bg: "var(--ds-danger-bg)",  border: "var(--ds-danger-border)",  text: "var(--ds-danger)" },
};

function getVerdictStyle(verdict: string) {
  return VERDICT_STYLE[verdict] ?? { bg: "var(--ds-badge-bg)", border: "var(--ds-badge-border)", text: "var(--ds-text-3)" };
}

/* ── Icons ── */
function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconExternalLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
function IconSparkles() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
    </svg>
  );
}
function IconTrendUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IconTrendDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
    </svg>
  );
}

/* ── Mini score ring ── */
function MiniRing({ score }: { score: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 72 ? "var(--ds-success)" : score >= 48 ? "var(--ds-warn)" : "var(--ds-danger)";
  return (
    <div className="relative w-14 h-14 flex-shrink-0 mx-auto">
      <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--ds-divider)" strokeWidth="3.5" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3.5" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color: "var(--ds-text-1)" }}>{score}</span>
      </div>
    </div>
  );
}

/* ── Comparison summary (deterministic, no API call) ── */
function generateSummary(items: CompareItem[]): string {
  if (items.length < 2) return "";

  const sentences: string[] = [];

  // Best deal
  const best = items.reduce((a, b) => (a.dealScore > b.dealScore ? a : b));
  sentences.push(
    `The ${best.year} ${best.make} ${best.model}${best.trim ? " " + best.trim : ""} (score ${best.dealScore}) appears to be the strongest deal in this comparison.`
  );

  // Weakest deal
  const worst = items.reduce((a, b) => (a.dealScore < b.dealScore ? a : b));
  if (worst !== best) {
    sentences.push(
      `The ${worst.year} ${worst.make} ${worst.model}${worst.trim ? " " + worst.trim : ""} (score ${worst.dealScore}) ${worst.dealScore < 40 ? "appears most overpriced" : "is the weakest option"} of the group.`
    );
  }

  // Best mileage-per-dollar
  const bestMpd = items.reduce((a, b) => {
    const aRatio = a.mileage / a.askingPrice;
    const bRatio = b.mileage / b.askingPrice;
    // Lower mileage per dollar is better (fewer miles, lower price)
    return aRatio < bRatio ? a : b;
  });
  if (bestMpd !== best) {
    sentences.push(
      `The ${bestMpd.year} ${bestMpd.make} ${bestMpd.model} has the best mileage for its price at ${bestMpd.mileage.toLocaleString()} miles for $${bestMpd.askingPrice.toLocaleString()}.`
    );
  }

  // Low confidence warning
  const lowConf = items.filter((i) => i.confidenceScore < 50);
  if (lowConf.length > 0) {
    const names = lowConf.map((i) => `${i.year} ${i.make} ${i.model}`).join(" and ");
    sentences.push(
      `Note: the ${names} ${lowConf.length === 1 ? "has" : "have"} a lower confidence estimate, so pricing data may be limited.`
    );
  }

  return sentences.slice(0, 3).join(" ");
}

/* ── Helpers ── */
function fmtPrice(n: number) {
  return "$" + Math.abs(n).toLocaleString();
}
function itemKey(item: CompareItem) {
  return item.vin ?? `${item.year}-${item.make}-${item.model}-${item.askingPrice}`;
}

/* ── Card component ── */
function CompareCard({
  item,
  isBest,
  onRemove,
}: {
  item: CompareItem;
  isBest: boolean;
  onRemove: () => void;
}) {
  const vs = getVerdictStyle(item.verdict);
  const deltaPositive = item.priceDelta <= 0; // negative delta = under fair value = good
  const deltaLabel = item.priceDelta <= 0
    ? `${fmtPrice(item.priceDelta)} under`
    : `${fmtPrice(item.priceDelta)} over`;
  const deltaColor = deltaPositive ? "var(--ds-success)" : "var(--ds-danger)";

  return (
    <motion.div
      variants={fadeUp}
      layout
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "var(--ds-card-bg)",
        border: isBest ? "1.5px solid var(--ds-accent-text)" : "1px solid var(--ds-card-border)",
        boxShadow: isBest
          ? "var(--ds-card-shadow), 0 0 24px var(--ds-accent-glow)"
          : "var(--ds-card-shadow)",
      }}
    >
      {/* Best value badge */}
      {isBest && (
        <div
          className="text-center py-1.5 text-xs font-semibold tracking-wide uppercase"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))",
            color: "var(--ds-accent-text)",
            borderBottom: "1px solid var(--ds-accent-glow)",
          }}
        >
          Best Value
        </div>
      )}

      <div className="p-5 flex flex-col flex-1 gap-5">
        {/* Header: Vehicle info */}
        <div className="text-center">
          <h3
            className="text-base font-bold leading-tight"
            style={{ color: "var(--ds-text-1)" }}
          >
            {item.year} {item.make} {item.model}
          </h3>
          {item.trim && (
            <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-4)" }}>
              {item.trim}
            </p>
          )}
        </div>

        {/* Score ring */}
        <MiniRing score={item.dealScore} />

        {/* Verdict badge */}
        <div className="flex justify-center">
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              background: vs.bg,
              border: `1px solid ${vs.border}`,
              color: vs.text,
            }}
          >
            {item.verdict}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--ds-divider)" }} />

        {/* Data rows */}
        <div className="space-y-3.5">
          <DataRow label="Asking Price" value={fmtPrice(item.askingPrice)} />
          <DataRow
            label="Fair Value Range"
            value={`${fmtPrice(item.fairValueLow)} \u2013 ${fmtPrice(item.fairValueHigh)}`}
            sub={`Mid: ${fmtPrice(item.fairValueMid)}`}
          />
          <DataRow
            label="Price Delta"
            value={deltaLabel}
            valueColor={deltaColor}
            icon={deltaPositive ? <IconTrendDown /> : <IconTrendUp />}
            iconColor={deltaColor}
          />
          <DataRow
            label="Mileage"
            value={`${item.mileage.toLocaleString()} mi`}
          />
          <DataRow
            label="Monthly Payment"
            value={`${fmtPrice(item.monthlyPayment)}/mo`}
            sub="est."
          />
          <DataRow
            label="Confidence"
            value={item.confidenceLevel}
            valueColor={
              item.confidenceScore >= 70
                ? "var(--ds-success)"
                : item.confidenceScore >= 40
                ? "var(--ds-warn)"
                : "var(--ds-danger)"
            }
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--ds-divider)" }} />

        {/* Key Insights */}
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--ds-text-4)" }}
          >
            Key Insights
          </p>
          <ul className="space-y-1.5">
            {item.keyInsights.slice(0, 3).map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: "var(--ds-text-2)" }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--ds-accent-text)" }}>&#x2022;</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Spacer to push actions to bottom */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-1">
          {item.analysisId && (
            <Link
              href={`/results/${item.analysisId}`}
              className="flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl transition-all hover:opacity-80"
              style={{
                background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                color: "#fff",
                boxShadow: "0 0 16px rgba(99,102,241,0.25)",
              }}
            >
              View Analysis
              <IconExternalLink />
            </Link>
          )}
          <button
            onClick={onRemove}
            className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl transition-all hover:opacity-80"
            style={{
              background: "var(--ds-badge-bg)",
              border: "1px solid var(--ds-card-border)",
              color: "var(--ds-text-3)",
            }}
          >
            <IconX />
            Remove
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Data row ── */
function DataRow({
  label,
  value,
  sub,
  valueColor,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  icon?: React.ReactNode;
  iconColor?: string;
}) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: "var(--ds-text-4)" }}>
        {label}
      </p>
      <div className="flex items-center gap-1.5">
        {icon && (
          <span style={{ color: iconColor ?? "var(--ds-text-2)" }}>{icon}</span>
        )}
        <span
          className="text-sm font-semibold"
          style={{ color: valueColor ?? "var(--ds-text-1)" }}
        >
          {value}
        </span>
      </div>
      {sub && (
        <p className="text-[11px] mt-0.5" style={{ color: "var(--ds-text-4)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function ComparePage() {
  const { items, removeItem, clearAll } = useCompare();

  const bestIdx =
    items.length >= 2
      ? items.reduce((bi, item, i, arr) => (item.dealScore > arr[bi].dealScore ? i : bi), 0)
      : -1;

  const summary = generateSummary(items);

  return (
    <div className="min-h-screen" style={{ background: "var(--ds-bg)" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: "var(--ds-nav-bg)",
          borderBottom: "1px solid var(--ds-nav-border)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Logo variant="full" size={26} />
            </Link>
            <span style={{ color: "var(--ds-text-4)" }}>/</span>
            <span className="text-sm" style={{ color: "var(--ds-text-3)" }}>
              Compare
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

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: "var(--ds-text-1)" }}
              >
                Compare Vehicles
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--ds-text-3)" }}>
                {items.length} of 4 slots used
              </p>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                style={{
                  background: "var(--ds-badge-bg)",
                  border: "1px solid var(--ds-card-border)",
                  color: "var(--ds-text-3)",
                }}
              >
                Clear all
              </button>
            )}
          </div>
        </motion.div>

        {/* Empty state */}
        {items.length < 2 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease }}
            className="rounded-2xl p-12 text-center"
            style={{
              background: "var(--ds-card-bg)",
              border: "1px solid var(--ds-card-border)",
              boxShadow: "var(--ds-card-shadow)",
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{
                background: "var(--ds-badge-bg)",
                border: "1px solid var(--ds-badge-border)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-7 h-7"
                style={{ color: "var(--ds-text-4)" }}
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--ds-text-1)" }}
            >
              Nothing to compare yet
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--ds-text-3)" }}>
              Add 2 or more cars to compare them side-by-side.
            </p>
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 text-sm font-medium px-5 py-2.5 rounded-xl transition-all hover:opacity-80"
              style={{
                background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                color: "#fff",
                boxShadow: "0 0 16px rgba(99,102,241,0.25)",
              }}
            >
              Browse your analyses
            </Link>

            {/* Show the single card if 1 item exists */}
            {items.length === 1 && (
              <div className="mt-8 max-w-xs mx-auto">
                <p
                  className="text-xs mb-3 font-medium"
                  style={{ color: "var(--ds-text-4)" }}
                >
                  Currently added:
                </p>
                <div
                  className="rounded-xl p-4 flex items-center justify-between"
                  style={{
                    background: "var(--ds-badge-bg)",
                    border: "1px solid var(--ds-card-border)",
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--ds-text-2)" }}
                  >
                    {items[0].year} {items[0].make} {items[0].model}
                  </span>
                  <button
                    onClick={() =>
                      removeItem(
                        items[0].vin ??
                          `${items[0].year}-${items[0].make}-${items[0].model}`
                      )
                    }
                    className="p-1 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ color: "var(--ds-text-4)" }}
                  >
                    <IconX />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Comparison grid */}
        {items.length >= 2 && (
          <>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid gap-5"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              }}
            >
              <AnimatePresence mode="popLayout">
                {items.map((item, i) => (
                  <CompareCard
                    key={itemKey(item)}
                    item={item}
                    isBest={i === bestIdx}
                    onRemove={() =>
                      removeItem(
                        item.vin ??
                          `${item.year}-${item.make}-${item.model}`
                      )
                    }
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Comparison summary */}
            {summary && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease, delay: 0.3 }}
                className="mt-8 rounded-2xl p-6"
                style={{
                  background: "var(--ds-glass-bg)",
                  border: "1px solid var(--ds-card-border)",
                  boxShadow: "var(--ds-card-shadow)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: "var(--ds-accent-text)" }}>
                    <IconSparkles />
                  </span>
                  <h2
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: "var(--ds-text-1)" }}
                  >
                    Comparison Summary
                  </h2>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--ds-text-2)" }}
                >
                  {summary}
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
