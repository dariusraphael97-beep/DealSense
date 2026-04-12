import type { CarInput, PriceRange, NormalizedValuation, ProviderError } from "@/lib/types";
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
 * Edmunds True Market Value (TMV) API — transaction-based pricing, no VIN required.
 * Uses real closed-sale data, not just listing prices. More accurate than listing-based APIs.
 * Sign up at developer.edmunds.com (free tier available).
 *
 * Flow: year/make/model → styleId lookup → TMV call with mileage + zip
 */
export async function fetchEdmundsTMV(input: CarInput): Promise<PriceRange | null> {
  const apiKey = process.env.EDMUNDS_API_KEY;
  if (!apiKey) return null;

  try {
    // Edmunds uses "niceId" format: lowercase, spaces → hyphens, strip special chars
    const toNiceId = (s: string) =>
      s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const makeNiceId  = toNiceId(input.make);
    const modelNiceId = toNiceId(input.model);

    // Step 1: Get all styles (trim levels) for this year/make/model
    const stylesRes = await fetch(
      `https://api.edmunds.com/api/vehicle/v2/${makeNiceId}/${modelNiceId}/${input.year}/styles?view=basic&api_key=${apiKey}`,
      { cache: "no-store" }
    );
    if (!stylesRes.ok) return null;

    const stylesData = await stylesRes.json();
    const styles: Array<{ id: number; name: string }> = stylesData?.styles ?? [];
    if (styles.length === 0) return null;

    // Step 2: Find best matching style for the given trim
    let bestStyle = styles[0];
    if (input.trim) {
      const trimLower = input.trim.toLowerCase();
      const exact   = styles.find(s => s.name.toLowerCase() === trimLower);
      const partial = styles.find(s =>
        s.name.toLowerCase().includes(trimLower) || trimLower.includes(s.name.toLowerCase())
      );
      bestStyle = exact ?? partial ?? styles[0];
    }

    // Step 3: Get TMV for this style + mileage + zip
    const tmvRes = await fetch(
      `https://api.edmunds.com/v1/api/tmv/tmvservice/calculateusedtmv?styleid=${bestStyle.id}&condition=Good&mileage=${input.mileage}&zip=${input.zipCode}&api_key=${apiKey}`,
      { cache: "no-store" }
    );
    if (!tmvRes.ok) return null;

    const tmvData = await tmvRes.json();
    const base = tmvData?.tmv?.nationalBasePrice;
    if (!base) return null;

    // Edmunds returns three price points — use private party as midpoint (most relevant for buyers)
    const privateParty = base.usedPrivateParty as number | undefined;
    const retail       = base.usedTmvRetail    as number | undefined;
    const tradeIn      = base.usedTradeIn      as number | undefined;

    const midpoint = privateParty ?? retail;
    if (!midpoint || midpoint < 500) return null;

    return {
      low:      tradeIn      ?? Math.round(midpoint * 0.88),
      high:     retail       ?? Math.round(midpoint * 1.08),
      midpoint: midpoint,
    };
  } catch (err) {
    console.error("[Edmunds] error:", err);
    return null;
  }
}

/**
 * Auto.dev Listings API — searches real dealer listings to derive fair value.
 * Free tier: 1,000 calls/mo. Uses median of comparable listings as anchor.
 * Set AUTODEV_API_KEY in env (get one at auto.dev/pricing).
 */
export async function fetchAutoDevValue(input: CarInput): Promise<PriceRange | null> {
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
    const mid = trimmed[Math.floor(trimmed.length / 2)];

    return {
      low: trimmed[0],
      high: trimmed[trimmed.length - 1],
      midpoint: mid,
    };
  } catch (err) {
    console.error("[Auto.dev] error:", err);
    return null;
  }
}

// ── Orchestrator ───────────────────────────────────────────────────────

interface ValuationResult {
  valuation: NormalizedValuation | null;
  errors: ProviderError[];
}

/**
 * Run all valuation providers in parallel and return the first hit
 * in priority order:
 *   1. VinAudit (transaction data, most accurate)
 *   2. Auto.dev (dealer listings)
 *   3. Edmunds TMV (transaction-based fallback)
 *   4. MarketCheck (live listings)
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
  const [vinAuditValue, autoDevValue, edmundsValue, marketCheckValue] = await Promise.all([
    fetchVinAuditValue(input).catch((err) => {
      errors.push({ provider: "VinAudit", message: String(err), code: "unknown" });
      return null;
    }),
    fetchAutoDevValue(input).catch((err) => {
      errors.push({ provider: "Auto.dev", message: String(err), code: "unknown" });
      return null;
    }),
    fetchEdmundsTMV(input).catch((err) => {
      errors.push({ provider: "Edmunds", message: String(err), code: "unknown" });
      return null;
    }),
    fetchMarketCheckValue(input).catch((err) => {
      errors.push({ provider: "MarketCheck", message: String(err), code: "unknown" });
      return null;
    }),
  ]);

  // Pick the first hit in priority order
  let valuation: NormalizedValuation | null = null;

  if (vinAuditValue) {
    valuation = {
      range: vinAuditValue,
      source: "VinAudit transaction data",
      sourceType: "transaction",
      timestamp: Date.now(),
    };
  } else if (autoDevValue) {
    valuation = {
      range: autoDevValue,
      source: "Auto.dev dealer listings",
      sourceType: "listings",
      timestamp: Date.now(),
    };
  } else if (edmundsValue) {
    valuation = {
      range: edmundsValue,
      source: "Edmunds True Market Value (TMV)",
      sourceType: "transaction",
      timestamp: Date.now(),
    };
  } else if (marketCheckValue) {
    valuation = {
      range: marketCheckValue,
      source: "MarketCheck live listings",
      sourceType: "listings",
      timestamp: Date.now(),
    };
  }

  const result: ValuationResult = { valuation, errors };
  valuationCache.set(key, result, VALUATION_CACHE_TTL);
  return result;
}
