import type { CarInput, PriceRange, NormalizedValuation, ProviderError, CompMetadata } from "@/lib/types";
import { valuationCache, VALUATION_CACHE_TTL } from "@/lib/cache";
import { AutoDev } from "@auto.dev/sdk";

// ── Cache key builder ──────────────────────────────────────────────────

function cacheKey(input: CarInput): string {
  return `${input.vin || ""}:${input.year}:${input.make}:${input.model}:${input.mileage}:${input.zipCode}`;
}

// ── Individual provider fetchers ───────────────────────────────────────

/**
 * VinAudit Market Value API — most accurate when a VIN is provided.
 * Uses 90-day rolling window of real transaction data.
 * Sign up at vinaudit.com/market-value-api (pay-per-use, ~$0.40/lookup).
 */
export async function fetchVinAuditValue(input: CarInput): Promise<PriceRange | null> {
  const apiKey = process.env.VINAUDIT_API_KEY;
  if (!apiKey || !input.vin) return null;

  try {
    const params = new URLSearchParams({
      key: apiKey,
      vin: input.vin,
      format: "json",
      period: "90",
    });
    const res = await fetch(
      `https://api.vinaudit.com/query.php?${params}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data?.prices?.average) return null;

    const { average, below, above } = data.prices as {
      average: number;
      below: number;
      above: number;
    };
    if (!average || average < 500) return null;

    return {
      low: below ?? Math.round(average * 0.93),
      high: above ?? Math.round(average * 1.07),
      midpoint: average,
    };
  } catch {
    return null;
  }
}

/**
 * MarketCheck Price Prediction API — uses ML model trained on live listings.
 * More accurate than raw listing search. Set MARKETCHECK_API_KEY in env.
 */
export async function fetchMarketCheckValue(input: CarInput): Promise<PriceRange | null> {
  const apiKey = process.env.MARKETCHECK_API_KEY;
  if (!apiKey) return null;

  // Build mileage range filter — compare to similar-mileage vehicles only
  const miles = input.mileage;
  const milesMin = Math.max(0, Math.round(miles * 0.4));
  const milesMax = Math.round(miles * 2.5 + 15000); // generous upper bound

  for (const radius of ["100", "500", "2000"]) {
    try {
      const params = new URLSearchParams({
        api_key:   apiKey,
        year:      String(input.year),
        make:      input.make,
        model:     input.model,
        ...(input.trim ? { trim: input.trim } : {}),
        zip:       input.zipCode,
        radius,
        rows:      "50",
        miles_min: String(milesMin),
        miles_max: String(milesMax),
      });
      const res = await fetch(
        `https://mc-api.marketcheck.com/v2/search/car/active?${params}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        // If radius restriction on free tier, still try without mileage filter
        const params2 = new URLSearchParams({
          api_key: apiKey,
          year:    String(input.year),
          make:    input.make,
          model:   input.model,
          ...(input.trim ? { trim: input.trim } : {}),
          zip:     input.zipCode,
          radius,
          rows:    "50",
        });
        params2.set("radius", "100");
        const res2 = await fetch(
          `https://mc-api.marketcheck.com/v2/search/car/active?${params2}`,
          { cache: "no-store" }
        );
        if (!res2.ok) continue;
        const data2 = await res2.json();
        const listings2: { price: number; miles: number }[] = data2?.listings ?? [];
        // Filter by mileage client-side
        const filtered2 = listings2.filter((l) => l.miles >= milesMin && l.miles <= milesMax);
        const src = filtered2.length >= 3 ? filtered2 : listings2;
        const prices2 = src.map((l) => l.price).filter((p) => p > 500).sort((a, b) => a - b);
        if (prices2.length < 3) continue;
        const tc2 = Math.floor(prices2.length * 0.1);
        const tr2 = prices2.slice(tc2, prices2.length - tc2);
        return { low: tr2[0], high: tr2[tr2.length - 1], midpoint: tr2[Math.floor(tr2.length / 2)] };
      }

      const data = await res.json();
      const listings: { price: number; miles: number }[] = data?.listings ?? [];
      if (listings.length < 3) continue;

      const prices = listings.map((l) => l.price).filter((p) => p > 500).sort((a, b) => a - b);
      const trimCount = Math.floor(prices.length * 0.1);
      const trimmed = prices.slice(trimCount, prices.length - trimCount);
      return {
        low:      trimmed[0],
        high:     trimmed[trimmed.length - 1],
        midpoint: trimmed[Math.floor(trimmed.length / 2)],
      };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Auto.dev Listings API — searches real dealer listings to derive fair value.
 * Free tier: 1,000 calls/mo. Uses median of comparable listings as anchor.
 * Set AUTODEV_API_KEY in env (get one at auto.dev/pricing).
 *
 * Returns both a PriceRange and CompMetadata so the confidence system can
 * adjust based on how many comps were found and how tight the spread is.
 */
export interface AutoDevResult {
  range: PriceRange;
  compMetadata: CompMetadata;
}

export async function fetchAutoDevValue(input: CarInput): Promise<AutoDevResult | null> {
  const apiKey = process.env.AUTODEV_API_KEY;
  if (!apiKey) return null;

  try {
    const auto = new AutoDev({ apiKey });

    // Build mileage bounds for filtering (±50% of input mileage, min 5k window)
    const milesLow = Math.max(0, Math.round(input.mileage * 0.5));
    const milesHigh = Math.max(milesLow + 5000, Math.round(input.mileage * 1.8));

    const result = await auto.listings({
      "vehicle.make": input.make,
      "vehicle.model": input.model,
      "vehicle.year": String(input.year),
      ...(input.trim ? { "vehicle.trim": input.trim } : {}),
      ...(input.zipCode ? { zip: input.zipCode, radius: "150" } : {}),
    });

    // SDK types result.data as {} — cast to array
    const listings = (Array.isArray(result?.data) ? result.data : []) as Record<string, unknown>[];
    if (listings.length < 3) return null;

    // Extract prices, filter to valid range and mileage window
    const prices = listings
      .filter((l: Record<string, unknown>) => {
        const p = Number(l.price ?? l.askingPrice ?? 0);
        const m = Number(l.mileage ?? l.miles ?? 0);
        return p > 2000 && (m === 0 || (m >= milesLow && m <= milesHigh));
      })
      .map((l: Record<string, unknown>) => Number(l.price ?? l.askingPrice))
      .sort((a: number, b: number) => a - b);

    if (prices.length < 3) return null;

    // Trim outliers (10% from each end) and take median
    const trimCount = Math.floor(prices.length * 0.1);
    const trimmed = prices.slice(trimCount, prices.length - trimCount);
    const median = trimmed[Math.floor(trimmed.length / 2)];
    const average = Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
    const low = trimmed[0];
    const high = trimmed[trimmed.length - 1];
    const spread = high - low;
    const spreadPct = median > 0 ? spread / median : 1;

    // Evaluate comp quality based on count and price consistency
    let compQuality: CompMetadata["compQuality"] = "weak";
    if (trimmed.length >= 10 && spreadPct < 0.25) {
      compQuality = "strong";  // Many comps, tight pricing
    } else if (trimmed.length >= 5 && spreadPct < 0.40) {
      compQuality = "moderate"; // Decent sample, reasonable spread
    }
    // else: weak (few comps or wide spread)

    const compMetadata: CompMetadata = {
      compCount: trimmed.length,
      compMedianPrice: median,
      compAveragePrice: average,
      compLowPrice: low,
      compHighPrice: high,
      compSpreadPct: Math.round(spreadPct * 1000) / 1000, // 3 decimal places
      compQuality,
      source: "Auto.dev dealer listings",
    };

    return {
      range: { low, high, midpoint: median },
      compMetadata,
    };
  } catch (err) {
    console.error("[Auto.dev] error:", err);
    return null;
  }
}

// ── Orchestrator ───────────────────────────────────────────────────────

interface ValuationResult {
  valuation: NormalizedValuation | null;
  /** Comp metadata from listing-based providers (auto.dev, MarketCheck).
   *  Available even when VinAudit is the primary source — useful for
   *  cross-validation and confidence scoring. */
  compMetadata: CompMetadata | null;
  errors: ProviderError[];
}

/**
 * Run all valuation providers in parallel and return the first hit
 * in priority order:
 *   1. VinAudit (transaction data, most accurate)
 *   2. Auto.dev (dealer listings)
 *   3. MarketCheck (live listings)
 *
 * Comp metadata is always collected from auto.dev (when available)
 * regardless of which provider wins — this feeds confidence scoring.
 *
 * Results are cached for 1 hour to avoid redundant API calls.
 */
export async function fetchValuation(input: CarInput): Promise<ValuationResult> {
  const key = cacheKey(input);

  // Check cache first
  const cached = valuationCache.get<ValuationResult>(key);
  if (cached) return cached;

  const errors: ProviderError[] = [];

  // Run all providers in parallel
  const [vinAuditValue, autoDevResult, marketCheckValue] = await Promise.all([
    fetchVinAuditValue(input).catch((err) => {
      errors.push({ provider: "VinAudit", message: String(err), code: "unknown" });
      return null;
    }),
    fetchAutoDevValue(input).catch((err) => {
      errors.push({ provider: "Auto.dev", message: String(err), code: "unknown" });
      return null;
    }),
    fetchMarketCheckValue(input).catch((err) => {
      errors.push({ provider: "MarketCheck", message: String(err), code: "unknown" });
      return null;
    }),
  ]);

  // Always capture comp metadata from auto.dev (even if it's not the primary source)
  const compMetadata: CompMetadata | null = autoDevResult?.compMetadata ?? null;

  // Pick the first hit in priority order for the primary valuation
  let valuation: NormalizedValuation | null = null;

  if (vinAuditValue) {
    valuation = {
      range: vinAuditValue,
      source: "VinAudit transaction data",
      sourceType: "transaction",
      timestamp: Date.now(),
      compMetadata: compMetadata ?? undefined,
    };
  } else if (autoDevResult) {
    valuation = {
      range: autoDevResult.range,
      source: "Auto.dev dealer listings",
      sourceType: "listings",
      timestamp: Date.now(),
      compMetadata: compMetadata ?? undefined,
    };
  } else if (marketCheckValue) {
    valuation = {
      range: marketCheckValue,
      source: "MarketCheck live listings",
      sourceType: "listings",
      timestamp: Date.now(),
    };
  }

  const result: ValuationResult = { valuation, compMetadata, errors };
  valuationCache.set(key, result, VALUATION_CACHE_TTL);
  return result;
}
