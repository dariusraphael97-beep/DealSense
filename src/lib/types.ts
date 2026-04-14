export interface CarInput {
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  askingPrice: number;
  zipCode: string;
  vin?: string;
  // User's loan preferences — passed from settings at submit time
  loanApr?: number;       // e.g. 7.5 (%)
  loanDownPct?: number;   // e.g. 10 (%)
  loanTermMonths?: number; // e.g. 60
}

/* ── Vehicle category buckets ────────────────────────────────────────────
 * Used to vary scoring sensitivity, confidence thresholds, and range width.
 * High-variance categories (luxury/performance/exotic) get wider ranges,
 * softer verdicts, and lower confidence when option data is incomplete. */
export type VehicleCategory =
  | "economy"
  | "mainstream"
  | "truck"
  | "luxury"
  | "performance"
  | "exotic";

/* ── Confidence system ───────────────────────────────────────────────────
 * Every analysis carries a confidence level so the UI can communicate
 * how much trust to place in the estimate. */
export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface ConfidenceBreakdown {
  vinDecoded: boolean;
  trimVerified: boolean;
  optionDataStatus: "complete" | "partial" | "missing";
  marketDataSpecificity: "transaction" | "listings" | "broad_model" | "statistical";
  vehicleCategory: VehicleCategory;
  regionDataAvailable: boolean;
  trimConfidence?: "high" | "medium" | "low";
}

/* ── Option / equipment data decoded from VIN ────────────────────────── */
export interface VehicleEquipment {
  drivetrain?: string;
  engine?: string;
  transmission?: string;
  bodyStyle?: string;
  fuelType?: string;
  cylinders?: string;
  displacement?: string;
  // Package-level detail (when available from extended VIN decode)
  performancePackage?: boolean;
  luxuryPackage?: boolean;
  technologyPackage?: boolean;
  carbonPackage?: boolean;
  premiumInterior?: boolean;
  // Raw list of decoded options for display
  decodedOptions?: string[];
}

/* ── Expanded verdict set ────────────────────────────────────────────────
 * Replaces the old "Buy | Negotiate | Walk Away" with context-aware labels.
 * "Needs Option Review" is used when confidence is low on high-variance cars.
 * "Possibly Overpriced" is the softer version of "Walk Away" for low confidence. */
export type Verdict =
  | "Buy"
  | "Fair Deal"
  | "Negotiate"
  | "Needs Option Review"
  | "Possibly Overpriced"
  | "Walk Away";

export interface PriceRange {
  low: number;
  high: number;
  midpoint: number;
}

export interface ScoreResult {
  score: number;          // 0–100
  verdict: Verdict;
  fairValueRange: PriceRange;
  priceDelta: number;     // negative = below market, positive = above market
  priceDeltaPct: number;
  monthlyPayment: number;
  reasons: string[];

  // ── New: confidence & category context ──
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;            // 0–100
  confidenceBreakdown: ConfidenceBreakdown;
  vehicleCategory: VehicleCategory;
  optionDataStatus: "complete" | "partial" | "missing";
  valuationWarnings: string[];
  keyInsights: string[];
  trimValidation?: TrimValidation;
  compMetadata?: CompMetadata;
}

/* ── Negotiation scripts ─────────────────────────────────────────────────────
 * Each analysis now returns 3 tone variations, each broken into 5 sections.
 * The legacy `negotiationScript` string is kept for backwards compatibility
 * with analyses stored before this schema change. */
export interface NegotiationScriptVariant {
  opening: string;       // First line — establishes position
  valuePosition: string; // How you reference market data naturally
  justification: string; // Why the price should move, or why you act fast
  ask: string;           // The specific thing you want
  close: string;         // Commit to buy or signal walk-away
}

export interface NegotiationScripts {
  confident:  NegotiationScriptVariant; // Direct, data-backed, gets to the point
  calm:       NegotiationScriptVariant; // Friendly, collaborative, leaves room for dialogue
  aggressive: NegotiationScriptVariant; // Max leverage, references walk-away power
  keyPoints:  string[];                 // 4–5 bullet talking points (≤8 words each)
  priceAnchor: string | null;           // e.g. "Target: $22,500–$23,000" (overpriced only)
  contextNote: string | null;           // Low/medium confidence caveat
}

export interface AnalysisResult extends ScoreResult {
  aiSummary: string;
  negotiationScript: string;           // Legacy — assembled from confident variant
  negotiationScripts?: NegotiationScripts; // New structured format
  input: CarInput;
  priceSource: string;
  /** True when live market data was unavailable and the statistical model was used as fallback. */
  isStatisticalFallback?: boolean;
  /** True when this result was served from the server-side analysis cache (no credit consumed). */
  fromCache?: boolean;
}

export interface VinDecodeResult {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyClass?: string;
  driveType?: string;
  fuelType?: string;
  engineCylinders?: string;
  displacement?: string;
  error?: string;
}

/* ══════════════════════════════════════════════════════════════════════
   Normalized provider types — decoupled from any specific API response
   ══════════════════════════════════════════════════════════════════════ */

/** Normalized vehicle identity from VIN decode */
export interface NormalizedVehicle {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyClass?: string;
  driveType?: string;
  fuelType?: string;
  engineCylinders?: string;
  displacement?: string;
  transmission?: string;
}

/** Data extracted from a listing URL */
export interface ListingExtraction {
  vin: string | null;
  price: number | null;
  mileage: number | null;
  zipCode: string | null;
  title: string | null;
  source: string;
}

/* ── Comp metadata — tracks quality of comparable listings ────────────── */
export interface CompMetadata {
  compCount: number;
  compMedianPrice: number;
  compAveragePrice: number;
  compLowPrice: number;
  compHighPrice: number;
  /** (high - low) / median — lower = tighter comps = more reliable */
  compSpreadPct: number;
  compQuality: "strong" | "moderate" | "weak";
  source: string;
}

/** Normalized valuation from any pricing provider */
export interface NormalizedValuation {
  range: PriceRange;
  source: string;
  sourceType: "transaction" | "listings" | "broad_model" | "statistical";
  timestamp: number;
  compMetadata?: CompMetadata;
}

/** Window sticker availability */
export interface StickerResult {
  available: boolean;
  url?: string;
  provider?: string;
}

/** Standardized provider error */
export interface ProviderError {
  provider: string;
  message: string;
  code: "network" | "auth" | "not_found" | "rate_limit" | "parse" | "unknown";
}

/** Trim validation result — distinguishes decoded vs validated trim */
export interface TrimValidation {
  decodedTrim: string | null;
  userTrim: string | null;
  validatedTrim: string | null;
  trimConfidence: "high" | "medium" | "low";
  trimValidationNotes: string[];
  isHighRiskModel: boolean;
}

/* ── Score Breakdown types ─────────────────────────────────────────────── */
export type FactorSentiment = "positive" | "neutral" | "negative";

export interface ScoreBreakdownFactor {
  id: string;
  label: string;
  description: string;
  sentiment: FactorSentiment;
  /** 0–100 visual bar value */
  barValue: number;
  /** Points added/subtracted to the deal score */
  scoreDelta: number;
}

export interface ScoreBreakdown {
  factors: ScoreBreakdownFactor[];
  baseScore: number;
  finalScore: number;
  summary: string;
}

/* ── Saved Cars ────────────────────────────────────────────────────────── */
export interface SavedCar {
  id: string;
  userId: string;
  analysisId?: string;
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  askingPrice: number;
  dealScore: number;
  verdict: string;
  priceDelta: number;
  fairValueMid: number;
  confidenceLevel?: string;
  resultJson?: AnalysisResult;
  savedAt: string;
}

/* ── Recently Viewed ───────────────────────────────────────────────────── */
export interface RecentlyViewedItem {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  askingPrice: number;
  mileage: number;
  dealScore: number;
  verdict: string;
  priceDelta: number;
  confidenceLevel?: string;
  analysisId?: string;
  viewedAt: number;
}

/* ── Compare ───────────────────────────────────────────────────────────── */
export interface CompareItem {
  analysisId?: string;
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  askingPrice: number;
  mileage: number;
  dealScore: number;
  verdict: string;
  priceDelta: number;
  priceDeltaPct: number;
  fairValueLow: number;
  fairValueMid: number;
  fairValueHigh: number;
  confidenceLevel: string;
  confidenceScore: number;
  vehicleCategory: string;
  monthlyPayment: number;
  keyInsights: string[];
  optionDataStatus: string;
  resultJson?: AnalysisResult;
}
