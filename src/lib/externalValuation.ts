/**
 * External Valuation Abstraction — VinAudit readiness layer.
 *
 * This module provides a clean interface for integrating external pricing
 * providers (VinAudit, Kelley Blue Book, etc.) without coupling the scoring
 * engine to any specific API.
 *
 * Currently implements a stub that returns null (no external data available).
 * When VinAudit or another provider is ready, implement getExternalMarketValue()
 * with real API calls and the rest of the system will work unchanged.
 */

import type { CarInput, PriceRange, NormalizedValuation, VehicleCategory } from "./types";

/* ── Provider interface ──────────────────────────────────────────────── */

export interface ExternalValuationProvider {
  name: string;
  /** Fetch market value for a vehicle. Returns null if unavailable. */
  getValuation(input: CarInput): Promise<NormalizedValuation | null>;
}

/* ── Stub provider (replace with real implementation) ────────────────── */

const stubProvider: ExternalValuationProvider = {
  name: "stub",
  async getValuation(_input: CarInput): Promise<NormalizedValuation | null> {
    // TODO: Replace with VinAudit API call
    // Example implementation:
    //
    // const res = await fetch(`https://api.vinaudit.com/v2/marketvalue?vin=${input.vin}&key=${API_KEY}`);
    // const data = await res.json();
    // if (!data.success) return null;
    // return {
    //   range: { low: data.prices.below, midpoint: data.prices.average, high: data.prices.above },
    //   source: "VinAudit Market Value",
    //   sourceType: "transaction",
    //   timestamp: Date.now(),
    // };
    return null;
  },
};

/* ── Registry of providers ───────────────────────────────────────────── */

const providers: ExternalValuationProvider[] = [stubProvider];

export function registerValuationProvider(provider: ExternalValuationProvider): void {
  providers.push(provider);
}

/* ── Main entry points ───────────────────────────────────────────────── */

/**
 * Attempt to get external market value from all registered providers.
 * Returns the first successful result, or null if none available.
 */
export async function getExternalMarketValue(
  input: CarInput
): Promise<NormalizedValuation | null> {
  for (const provider of providers) {
    try {
      const result = await provider.getValuation(input);
      if (result) return result;
    } catch {
      // Provider failed — try next
      continue;
    }
  }
  return null;
}

/**
 * Combine internal statistical valuation with external market data.
 * External data takes priority when available, with blending based on
 * source type reliability.
 *
 * @param internal - Fair value range from internal depreciation model
 * @param external - External provider data (if available)
 * @param category - Vehicle category for weighting decisions
 * @returns Combined fair value range and the source description
 */
export function combineValuationSources(
  internal: PriceRange,
  external: NormalizedValuation | null,
  category: VehicleCategory
): { range: PriceRange; source: string; sourceType: NormalizedValuation["sourceType"] } {
  // No external data — use internal only
  if (!external) {
    return {
      range: internal,
      source: "Statistical model (depreciation data)",
      sourceType: "statistical",
    };
  }

  // Weight external data based on its source type
  const weights: Record<NormalizedValuation["sourceType"], number> = {
    transaction: 0.85,  // Real sales data — strongly prefer
    listings: 0.70,     // Active listings — good but not sales
    broad_model: 0.50,  // Broad model data — blend equally
    statistical: 0.40,  // Their statistical model vs ours — slight preference
  };

  const extWeight = weights[external.sourceType];
  const intWeight = 1 - extWeight;

  const blended: PriceRange = {
    low: Math.round((external.range.low * extWeight + internal.low * intWeight) / 100) * 100,
    midpoint: Math.round((external.range.midpoint * extWeight + internal.midpoint * intWeight) / 100) * 100,
    high: Math.round((external.range.high * extWeight + internal.high * intWeight) / 100) * 100,
  };

  return {
    range: blended,
    source: `${external.source} + statistical model`,
    sourceType: external.sourceType,
  };
}
