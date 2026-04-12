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
}

export interface AnalysisResult extends ScoreResult {
  aiSummary: string;
  negotiationScript: string;
  input: CarInput;
  priceSource: string; // describes which pricing layer was used
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
