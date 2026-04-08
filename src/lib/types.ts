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

export type Verdict = "Buy" | "Negotiate" | "Walk Away";

export interface PriceRange {
  low: number;
  high: number;
  midpoint: number;
}

export interface ScoreResult {
  score: number; // 0–100
  verdict: Verdict;
  fairValueRange: PriceRange;
  priceDelta: number; // negative = below market, positive = above market
  priceDeltaPct: number;
  monthlyPayment: number; // estimated at 7.5% APR, 60 months, 10% down
  reasons: string[];
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
