"use client";

import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DepreciationChartProps {
  purchasePrice: number;
  currentMarketValue: number;
  year: number;
  make: string;
  model: string;
  mileage: number;
  vehicleType?: "economy" | "luxury" | "sports" | "truck" | "suv" | "ev" | "minivan";
}

type ViewMode = "dollar" | "percent";

interface DataPoint {
  label: string;
  value: number;
  pctLost: number;
  dollarLost: number;
  isNow: boolean;
}

// ─── Depreciation engine ────────────────────────────────────────────────────
// Base rates: each year's depreciation applied to CURRENT market value
// (not original price), then adjusted for vehicle type + mileage.

const BASE_RATES = [0.15, 0.12, 0.10, 0.08, 0.07];

const TYPE_ADJUSTMENTS: Record<string, number> = {
  luxury:   0.025,   // depreciates harder
  sports:   0.010,
  ev:       0.018,
  economy: -0.015,   // holds better
  truck:   -0.020,
  suv:     -0.012,
  minivan:  0.005,
};

function getMileageAdjustment(mileage: number): number {
  if (mileage > 100000) return 0.018;
  if (mileage > 80000)  return 0.010;
  if (mileage > 60000)  return 0.005;
  if (mileage < 20000)  return -0.010;
  if (mileage < 40000)  return -0.005;
  return 0;
}

function buildDepreciationData(
  currentMarketValue: number,
  vehicleType: DepreciationChartProps["vehicleType"],
  mileage: number
): DataPoint[] {
  const typeAdj = TYPE_ADJUSTMENTS[vehicleType ?? "economy"] ?? 0;
  const mileAdj = getMileageAdjustment(mileage);

  const points: DataPoint[] = [
    {
      label: "Now",
      value: currentMarketValue,
      pctLost: 0,
      dollarLost: 0,
      isNow: true,
    },
  ];

  let runningValue = currentMarketValue;
  for (let i = 0; i < BASE_RATES.length; i++) {
    const rate = Math.min(0.40, Math.max(0.03, BASE_RATES[i] + typeAdj + mileAdj));
    runningValue = runningValue * (1 - rate);
    const dollarLost = currentMarketValue - runningValue;
    const pctLost = (dollarLost / currentMarketValue) * 100;
    points.push({
      label: `Yr ${i + 1}`,
      value: Math.round(runningValue / 50) * 50,
      pctLost: Math.round(pctLost * 10) / 10,
      dollarLost: Math.round(dollarLost / 100) * 100,
      isNow: false,
    });
  }

  return points;
}

// ─── Custom tooltip ─────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  mode,
  currentMarketValue,
}: {
  active?: boolean;
  payload?: { payload: DataPoint }[];
  mode: ViewMode;
  currentMarketValue: number;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl min-w-[160px]"
    >
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {d.isNow ? "Today" : d.label}
      </p>
      <p className="font-heading text-xl font-bold text-white mb-1">
        ${d.value.toLocaleString()}
      </p>
      {!d.isNow && (
        <>
          <p className="text-xs text-red-400 font-medium">
            −${d.dollarLost.toLocaleString()} lost
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {d.pctLost.toFixed(1)}% of current value
          </p>
        </>
      )}
      {d.isNow && (
        <p className="text-xs text-blue-400 font-medium">Current market value</p>
      )}
    </motion.div>
  );
}

// ─── Stat tile ──────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  accent,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay ?? 0, ease: "easeOut" }}
      className="flex flex-col gap-1 p-4 rounded-xl bg-slate-50 border border-slate-100"
    >
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={`font-heading text-xl font-bold ${accent ?? "text-slate-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </motion.div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function DepreciationChart({
  purchasePrice,
  currentMarketValue,
  year,
  make,
  model,
  mileage,
  vehicleType = "economy",
}: DepreciationChartProps) {
  const [mode, setMode] = useState<ViewMode>("dollar");

  const data = useMemo(
    () => buildDepreciationData(currentMarketValue, vehicleType, mileage),
    [currentMarketValue, vehicleType, mileage]
  );

  const fiveYearValue  = data[data.length - 1].value;
  const threeYearValue = data[3].value;
  const totalLoss      = currentMarketValue - fiveYearValue;
  const totalLossPct   = ((totalLoss / currentMarketValue) * 100).toFixed(1);

  // For percent view — convert to % remaining
  const chartData = data.map((d) => ({
    ...d,
    display:
      mode === "dollar"
        ? d.value
        : Math.round(((d.value / currentMarketValue) * 100) * 10) / 10,
  }));

  const yMin =
    mode === "dollar"
      ? Math.floor((fiveYearValue * 0.9) / 1000) * 1000
      : Math.floor(((fiveYearValue / currentMarketValue) * 100) * 0.9);

  const yMax =
    mode === "dollar"
      ? Math.ceil((currentMarketValue * 1.05) / 1000) * 1000
      : 105;

  const formatY = (v: number) =>
    mode === "dollar" ? `$${(v / 1000).toFixed(0)}k` : `${v}%`;

  const retentionClass =
    parseFloat(totalLossPct) < 30
      ? "text-emerald-600"
      : parseFloat(totalLossPct) < 45
      ? "text-amber-600"
      : "text-red-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="card overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Projected Depreciation
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Estimated value of your{" "}
            <span className="font-semibold text-slate-700">
              {year} {make} {model}
            </span>{" "}
            over the next 5 years
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 flex-shrink-0 ml-4">
          {(["dollar", "percent"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`relative px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                mode === m
                  ? "text-slate-900"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {mode === m && (
                <motion.span
                  layoutId="toggle-pill"
                  className="absolute inset-0 bg-white rounded-md shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                />
              )}
              <span className="relative z-10">
                {m === "dollar" ? "$ Value" : "% Loss"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="mt-6 -mx-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="depGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F1F5F9"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "#94A3B8", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tickFormatter={formatY}
                  tick={{ fontSize: 11, fill: "#CBD5E1" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  content={
                    <CustomTooltip
                      mode={mode}
                      currentMarketValue={currentMarketValue}
                    />
                  }
                  cursor={{
                    stroke: "#E2E8F0",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                {/* "Now" reference line */}
                <ReferenceLine
                  x="Now"
                  stroke="#3B82F6"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  opacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="display"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fill="url(#depGradient)"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.isNow) {
                      return (
                        <g key={`dot-now-${cx}`}>
                          <circle cx={cx} cy={cy} r={6} fill="#3B82F6" stroke="white" strokeWidth={2} />
                          <circle cx={cx} cy={cy} r={10} fill="#3B82F6" fillOpacity={0.15} />
                        </g>
                      );
                    }
                    return (
                      <circle
                        key={`dot-${cx}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="white"
                        stroke="#3B82F6"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#3B82F6",
                    stroke: "white",
                    strokeWidth: 2,
                    filter: "drop-shadow(0 2px 6px rgba(59,130,246,0.45))",
                  }}
                  isAnimationActive={true}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        <StatTile
          label="Value after 3 yrs"
          value={`$${threeYearValue.toLocaleString()}`}
          sub="estimated"
          delay={0.05}
        />
        <StatTile
          label="Value after 5 yrs"
          value={`$${fiveYearValue.toLocaleString()}`}
          sub="estimated"
          delay={0.1}
        />
        <StatTile
          label="Total 5-yr loss"
          value={`−$${totalLoss.toLocaleString()}`}
          accent="text-red-500"
          sub="in value"
          delay={0.15}
        />
        <StatTile
          label="% lost over 5 yrs"
          value={`${totalLossPct}%`}
          accent={retentionClass}
          sub={
            parseFloat(totalLossPct) < 30
              ? "holds value well"
              : parseFloat(totalLossPct) < 45
              ? "average retention"
              : "depreciates fast"
          }
          delay={0.2}
        />
      </div>

      {/* ── Disclaimer ── */}
      <p className="text-xs text-slate-400 mt-5 pt-4 border-t border-slate-100 leading-relaxed">
        Depreciation estimates are based on general market trends and vehicle
        type, and may vary based on condition, mileage, and future market demand.
        Not a guarantee of future value.
      </p>
    </motion.div>
  );
}
