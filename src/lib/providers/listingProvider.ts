import type { ListingExtraction } from "@/lib/types";
import { listingCache, LISTING_CACHE_TTL } from "@/lib/cache";

/** Matches a 17-char VIN (excludes I, O, Q per NHTSA standard) */
const VIN_RE = /\b([A-HJ-NPR-Z0-9]{17})\b/g;

// ── Utilities ─────────────────────────────────────────────────────────

/** Parse __NEXT_DATA__ embedded by Next.js SSR */
function parseNextData(html: string): Record<string, unknown> | null {
  const match = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Recursively find ALL values for a given key anywhere in a nested object.
 * Returns them in discovery order (breadth-first-ish).
 */
function deepFindAll(
  obj: unknown,
  targetKey: string,
  maxDepth = 12,
  depth = 0,
): unknown[] {
  const results: unknown[] = [];
  if (depth > maxDepth || !obj || typeof obj !== "object") return results;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      results.push(...deepFindAll(item, targetKey, maxDepth, depth + 1));
    }
  } else {
    const record = obj as Record<string, unknown>;
    for (const [key, val] of Object.entries(record)) {
      if (key === targetKey && val !== undefined && val !== null) {
        results.push(val);
      }
      if (val && typeof val === "object") {
        results.push(...deepFindAll(val, targetKey, maxDepth, depth + 1));
      }
    }
  }
  return results;
}

/** Try to parse a numeric value from various representations */
function toNumber(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[,$\s]/g, "");
    const n = parseFloat(cleaned);
    if (!isNaN(n)) return n;
  }
  return null;
}

// ── Site-specific: CarGurus ───────────────────────────────────────────

function extractCarGurusData(html: string): Partial<ListingExtraction> {
  const result: Partial<ListingExtraction> = {};

  // 1. __NEXT_DATA__ (CarGurus is a Next.js app)
  const nextData = parseNextData(html);
  if (nextData) {
    const root = nextData;

    // VIN — search for any 17-char VIN string in the data
    for (const v of deepFindAll(root, "vin")) {
      if (typeof v === "string" && /^[A-HJ-NPR-Z0-9]{17}$/i.test(v)) {
        result.vin = v.toUpperCase();
        break;
      }
    }

    // Collect savings/discount amounts so we can exclude them from price
    const savingsKeys = [
      "priceDropAmount",
      "savingsAmount",
      "belowMarketPrice",
      "priceDrop",
      "savings",
      "belowMarketPriceValue",
      "instantMarketValue",
    ];
    const savingsAmounts = new Set<number>();
    for (const sk of savingsKeys) {
      for (const v of deepFindAll(root, sk)) {
        const n = toNumber(v);
        if (n && n > 0) savingsAmounts.add(Math.round(n));
      }
    }

    // Price — prefer listing/asking price fields, exclude savings
    const priceKeys = [
      "price",
      "expectedPrice",
      "listedPrice",
      "askingPrice",
      "listPrice",
      "displayPrice",
    ];
    const priceCandidates: number[] = [];
    for (const pk of priceKeys) {
      for (const v of deepFindAll(root, pk)) {
        const n = toNumber(v);
        if (n && n > 500 && n < 500_000 && !savingsAmounts.has(Math.round(n))) {
          priceCandidates.push(Math.round(n));
        }
      }
    }
    // Pick the highest plausible price (savings amounts are always smaller)
    if (priceCandidates.length > 0) {
      result.price = Math.max(...priceCandidates);
    }

    // Mileage
    const mileageKeys = [
      "mileage",
      "mileageFromOdometer",
      "odometer",
      "miles",
    ];
    for (const mk of mileageKeys) {
      for (const v of deepFindAll(root, mk)) {
        const n = toNumber(v);
        if (n && n > 0 && n < 1_000_000) {
          result.mileage = Math.round(n);
          break;
        }
      }
      if (result.mileage) break;
    }

    // ZIP / postal code
    for (const key of ["zip", "zipCode", "postalCode", "dealerZip"]) {
      for (const v of deepFindAll(root, key)) {
        const m = String(v).match(/(\d{5})/);
        if (m) {
          result.zipCode = m[1];
          break;
        }
      }
      if (result.zipCode) break;
    }
  }

  // 2. Fallback: scan <script> tags for embedded JSON with VIN / price
  if (!result.vin || !result.price) {
    const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = scriptRe.exec(html)) !== null) {
      const content = m[1];
      if (content.includes("__NEXT_DATA__")) continue;

      if (!result.vin) {
        const vinM = content.match(
          /["']vin["']\s*:\s*["']([A-HJ-NPR-Z0-9]{17})["']/i,
        );
        if (vinM?.[1]) result.vin = vinM[1].toUpperCase();
      }

      if (!result.price) {
        // Match "price":73045 or "listPrice":"73,045"
        const priceM = content.match(
          /["'](?:list|asking|expected)?[Pp]rice["']\s*:\s*["']?\$?\s*([\d,]+)["']?/,
        );
        if (priceM?.[1]) {
          const p = parseFloat(priceM[1].replace(/,/g, ""));
          if (p > 500 && p < 500_000) result.price = Math.round(p);
        }
      }
    }
  }

  return result;
}

// ── Site-specific: AutoTrader ─────────────────────────────────────────

function extractAutoTraderData(html: string): Partial<ListingExtraction> {
  const result: Partial<ListingExtraction> = {};

  // 1. __NEXT_DATA__
  const nextData = parseNextData(html);
  if (nextData) {
    // VIN
    for (const v of deepFindAll(nextData, "vin")) {
      if (typeof v === "string" && /^[A-HJ-NPR-Z0-9]{17}$/i.test(v)) {
        result.vin = v.toUpperCase();
        break;
      }
    }

    // Price
    const priceKeys = [
      "price",
      "listPrice",
      "askingPrice",
      "displayPrice",
      "primaryPrice",
      "internetPrice",
    ];
    const priceCandidates: number[] = [];
    for (const pk of priceKeys) {
      for (const v of deepFindAll(nextData, pk)) {
        const n = toNumber(v);
        if (n && n > 500 && n < 500_000) priceCandidates.push(Math.round(n));
      }
    }
    if (priceCandidates.length > 0) {
      result.price = Math.max(...priceCandidates);
    }

    // Mileage
    for (const mk of [
      "mileage",
      "mileageFromOdometer",
      "odometer",
      "miles",
      "mileageString",
    ]) {
      for (const v of deepFindAll(nextData, mk)) {
        const n = toNumber(v);
        if (n && n > 0 && n < 1_000_000) {
          result.mileage = Math.round(n);
          break;
        }
      }
      if (result.mileage) break;
    }

    // ZIP
    for (const key of ["zip", "zipCode", "postalCode", "dealerZip"]) {
      for (const v of deepFindAll(nextData, key)) {
        const m = String(v).match(/(\d{5})/);
        if (m) {
          result.zipCode = m[1];
          break;
        }
      }
      if (result.zipCode) break;
    }
  }

  // 2. Fallback: scan all <script> tags for embedded vehicle data
  if (!result.vin) {
    const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = scriptRe.exec(html)) !== null) {
      const content = m[1];
      if (content.includes("__NEXT_DATA__")) continue;

      // Look for VIN in any embedded JSON
      const vinM = content.match(
        /["']vin["']\s*:\s*["']([A-HJ-NPR-Z0-9]{17})["']/i,
      );
      if (vinM?.[1]) {
        result.vin = vinM[1].toUpperCase();
        break;
      }
    }
  }

  // 3. Meta tag fallback for VIN
  if (!result.vin) {
    const metaVin =
      html.match(
        /<meta[^>]+(?:name|property)=["'][^"']*vin[^"']*["'][^>]+content=["']([A-HJ-NPR-Z0-9]{17})["']/i,
      ) ??
      html.match(
        /<meta[^>]+content=["']([A-HJ-NPR-Z0-9]{17})["'][^>]+(?:name|property)=["'][^"']*vin[^"']*["']/i,
      );
    if (metaVin?.[1]) result.vin = metaVin[1].toUpperCase();
  }

  return result;
}

// ── VIN extraction (generic) ──────────────────────────────────────────

function extractVinFromHtml(html: string): string | null {
  // Ordered from most specific to most general
  const patterns: RegExp[] = [
    /["']vin["']\s*:\s*["']([A-HJ-NPR-Z0-9]{17})["']/i,
    /data-vin=["']([A-HJ-NPR-Z0-9]{17})["']/i,
    /vin=([A-HJ-NPR-Z0-9]{17})/i,
    /\bvin\b[^A-Z0-9]{1,10}([A-HJ-NPR-Z0-9]{17})/i,
    /vehicle.{1,30}identification.{1,30}([A-HJ-NPR-Z0-9]{17})/i,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].toUpperCase();
  }

  // Also check __NEXT_DATA__ for any Next.js site (generic)
  const nextData = parseNextData(html);
  if (nextData) {
    for (const v of deepFindAll(nextData, "vin")) {
      if (typeof v === "string" && /^[A-HJ-NPR-Z0-9]{17}$/i.test(v)) {
        return v.toUpperCase();
      }
    }
  }

  // Fallback: any 17-char VIN pattern
  const generic = html.match(VIN_RE);
  if (generic?.[0]) return generic[0].toUpperCase();

  return null;
}

// ── Price extraction (generic) ────────────────────────────────────────

function extractPriceFromHtml(
  html: string,
  jsonLdData: Record<string, unknown>[],
): number | null {
  const candidates: number[] = [];

  // Identify "savings / below-market" dollar amounts so we can skip them
  const savingsRe =
    /(?:below\s+market|savings?|price\s*drop|reduced\s+by|you\s+save|discount)[^$]{0,30}\$\s?([\d,]+)/gi;
  const savingsAmounts = new Set<number>();
  let sm;
  while ((sm = savingsRe.exec(html)) !== null) {
    const val = parseFloat(sm[1].replace(/,/g, ""));
    if (val > 0) savingsAmounts.add(Math.round(val));
  }
  // Also match the reverse: "$5,173 below market"
  const savingsRe2 = /\$\s?([\d,]+)\s*(?:below\s+market|savings?|off|less)/gi;
  while ((sm = savingsRe2.exec(html)) !== null) {
    const val = parseFloat(sm[1].replace(/,/g, ""));
    if (val > 0) savingsAmounts.add(Math.round(val));
  }

  const isSavings = (n: number) => savingsAmounts.has(Math.round(n));

  // 1. JSON-LD structured data
  for (const obj of jsonLdData) {
    const offers = (obj as Record<string, unknown>).offers as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined;
    if (offers) {
      const offerObj = Array.isArray(offers) ? offers[0] : offers;
      const price = offerObj?.price ?? offerObj?.lowPrice;
      if (price) {
        const parsed = parseFloat(String(price).replace(/[,$]/g, ""));
        if (parsed > 500 && parsed < 500_000 && !isSavings(parsed))
          candidates.push(Math.round(parsed));
      }
    }
    const directPrice = (obj as Record<string, unknown>).price;
    if (directPrice) {
      const parsed = parseFloat(String(directPrice).replace(/[,$]/g, ""));
      if (parsed > 500 && parsed < 500_000 && !isSavings(parsed))
        candidates.push(Math.round(parsed));
    }
  }

  // 2. Meta tags
  const metaPrice =
    html.match(
      /<meta[^>]+(?:property|name)=["'](?:og:price:amount|product:price:amount|price)["'][^>]+content=["']([^"']+)["']/i,
    ) ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:price:amount|product:price:amount|price)["']/i,
    );
  if (metaPrice?.[1]) {
    const parsed = parseFloat(metaPrice[1].replace(/[,$]/g, ""));
    if (parsed > 500 && parsed < 500_000 && !isSavings(parsed))
      candidates.push(Math.round(parsed));
  }

  // 3. Data attributes
  const dataPrice = html.match(/data-price=["'](\d[\d,.]+)["']/i);
  if (dataPrice?.[1]) {
    const parsed = parseFloat(dataPrice[1].replace(/[,$]/g, ""));
    if (parsed > 500 && parsed < 500_000 && !isSavings(parsed))
      candidates.push(Math.round(parsed));
  }

  // 4. __NEXT_DATA__ price (generic)
  const nextData = parseNextData(html);
  if (nextData) {
    for (const pk of ["price", "listPrice", "askingPrice"]) {
      for (const v of deepFindAll(nextData, pk)) {
        const n = toNumber(v);
        if (n && n > 500 && n < 500_000 && !isSavings(n))
          candidates.push(Math.round(n));
      }
    }
  }

  // 5. Regex patterns in visible text
  const pricePatterns = [
    /(?:asking|our\s+price|internet\s+price|sale\s+price|price|listed\s+at|your\s+price)[^$]{0,40}\$\s?([\d,]+)/i,
    /\$\s?([\d]{1,3}(?:,\d{3})+)(?:\s|<)/,
    /\$\s?([\d]{4,6})(?:\s|<)/,
  ];

  for (const re of pricePatterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const parsed = parseFloat(m[1].replace(/,/g, ""));
      if (parsed > 500 && parsed < 500_000 && !isSavings(parsed))
        candidates.push(Math.round(parsed));
    }
  }

  if (candidates.length === 0) return null;

  // Return the highest candidate — the actual car price is nearly always
  // larger than ancillary amounts (savings, fees, monthly payments, etc.)
  return Math.max(...candidates);
}

// ── Mileage extraction (generic) ──────────────────────────────────────

function extractMileageFromHtml(
  html: string,
  jsonLdData: Record<string, unknown>[],
): number | null {
  // 1. JSON-LD
  for (const obj of jsonLdData) {
    const mileage = (obj as Record<string, unknown>).mileageFromOdometer as
      | Record<string, unknown>
      | string
      | undefined;
    if (mileage) {
      const val =
        typeof mileage === "object"
          ? String(mileage.value ?? "")
          : String(mileage);
      const parsed = parseFloat(val.replace(/[,\s]/g, ""));
      if (parsed > 0 && parsed < 1_000_000) return Math.round(parsed);
    }
    const vehicleMileage = (obj as Record<string, unknown>).vehicleMileage;
    if (vehicleMileage) {
      const parsed = parseFloat(String(vehicleMileage).replace(/[,\s]/g, ""));
      if (parsed > 0 && parsed < 1_000_000) return Math.round(parsed);
    }
  }

  // 2. __NEXT_DATA__ mileage (generic)
  const nextData = parseNextData(html);
  if (nextData) {
    for (const mk of ["mileage", "mileageFromOdometer", "odometer", "miles"]) {
      for (const v of deepFindAll(nextData, mk)) {
        const n = toNumber(v);
        if (n && n > 0 && n < 1_000_000) return Math.round(n);
      }
    }
  }

  // 3. Data attributes
  const dataMiles = html.match(
    /data-(?:mileage|miles|odometer)=["'](\d[\d,]+)["']/i,
  );
  if (dataMiles?.[1]) {
    const parsed = parseFloat(dataMiles[1].replace(/,/g, ""));
    if (parsed > 0 && parsed < 1_000_000) return Math.round(parsed);
  }

  // 4. Regex patterns — "XX,XXX miles" or "XX,XXX mi"
  const milePatterns = [
    /(?:mileage|odometer)[^0-9]{1,30}([\d,]+)\s*(?:mi|miles)/i,
    /([\d]{1,3}(?:,\d{3})+)\s*(?:mi(?:les)?)\b/i,
    /([\d]{4,6})\s*(?:mi(?:les)?)\b/i,
  ];

  for (const re of milePatterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const parsed = parseFloat(m[1].replace(/,/g, ""));
      if (parsed > 0 && parsed < 1_000_000) return Math.round(parsed);
    }
  }

  return null;
}

// ── Location / ZIP extraction ─────────────────────────────────────────

function extractLocationFromHtml(
  html: string,
  jsonLdData: Record<string, unknown>[],
): string | null {
  // 1. JSON-LD address
  for (const obj of jsonLdData) {
    const address = extractNestedAddress(obj);
    if (address) return address;
  }

  // 2. Data attributes
  const dataZip = html.match(
    /data-(?:zip|zipcode|zip-code|postal)=["'](\d{5})["']/i,
  );
  if (dataZip?.[1]) return dataZip[1];

  // 3. Meta tags with geo information
  const geoZip =
    html.match(
      /<meta[^>]+(?:name|property)=["'](?:geo\.postal|zipcode|og:postal_code)["'][^>]+content=["'](\d{5})["']/i,
    ) ??
    html.match(
      /<meta[^>]+content=["'](\d{5})["'][^>]+(?:name|property)=["'](?:geo\.postal|zipcode|og:postal_code)["']/i,
    );
  if (geoZip?.[1]) return geoZip[1];

  // 4. Regex: 5-digit ZIP near location/dealer/address keywords
  const zipPatterns = [
    /(?:dealer|location|address|located|zip)[^0-9]{1,50}(?:[A-Z]{2}\s+)?(\d{5})(?:\b|-)/i,
    /,\s*[A-Z]{2}\s+(\d{5})\b/, // "City, ST 12345" pattern
  ];

  for (const re of zipPatterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }

  return null;
}

/** Recursively search a JSON-LD object for a postal code in an address */
function extractNestedAddress(obj: unknown, depth = 0): string | null {
  if (depth > 4 || !obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;

  if (typeof record.postalCode === "string") {
    const zip = record.postalCode.match(/(\d{5})/);
    if (zip) return zip[1];
  }

  if (record.address && typeof record.address === "object") {
    const result = extractNestedAddress(record.address, depth + 1);
    if (result) return result;
  }

  if (record.offers && typeof record.offers === "object") {
    const result = extractNestedAddress(record.offers, depth + 1);
    if (result) return result;
  }
  if (record.availableAtOrFrom && typeof record.availableAtOrFrom === "object") {
    const result = extractNestedAddress(record.availableAtOrFrom, depth + 1);
    if (result) return result;
  }

  if (record.seller && typeof record.seller === "object") {
    const result = extractNestedAddress(record.seller, depth + 1);
    if (result) return result;
  }

  return null;
}

// ── JSON-LD parser ────────────────────────────────────────────────────

function parseJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else if (typeof parsed === "object" && parsed !== null) {
        results.push(parsed);
      }
    } catch {
      // Malformed JSON-LD — skip silently
    }
  }
  return results;
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Extract listing data from HTML content.
 * Uses site-specific extractors first, then falls back to generic parsing.
 */
export function extractFromHtml(
  html: string,
  sourceHost: string,
): ListingExtraction {
  // Try site-specific extraction first for known sites
  let siteData: Partial<ListingExtraction> = {};

  if (sourceHost.includes("cargurus")) {
    siteData = extractCarGurusData(html);
  } else if (sourceHost.includes("autotrader")) {
    siteData = extractAutoTraderData(html);
  }

  // Generic extraction as fallback for any missing fields
  const jsonLdData = parseJsonLd(html);

  return {
    vin: siteData.vin ?? extractVinFromHtml(html),
    price: siteData.price ?? extractPriceFromHtml(html, jsonLdData),
    mileage: siteData.mileage ?? extractMileageFromHtml(html, jsonLdData),
    zipCode: siteData.zipCode ?? extractLocationFromHtml(html, jsonLdData),
    title: siteData.title ?? extractTitleFromHtml(html, jsonLdData),
    source: sourceHost,
  };
}

/** Extract title from JSON-LD or meta tags */
function extractTitleFromHtml(
  html: string,
  jsonLdData: Record<string, unknown>[],
): string | null {
  // JSON-LD name
  for (const obj of jsonLdData) {
    if (typeof (obj as Record<string, unknown>).name === "string") {
      return (obj as Record<string, unknown>).name as string;
    }
  }

  // OG title
  const ogTitle =
    html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    ) ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    );
  if (ogTitle?.[1]) return ogTitle[1];

  // HTML title
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTag?.[1]) return titleTag[1].trim();

  return null;
}

/**
 * Extract listing data from a URL (with caching).
 * The caller should handle fetching the HTML and pass it here,
 * or use this convenience wrapper that checks the cache.
 */
export function getCachedListing(url: string): ListingExtraction | null {
  return listingCache.get<ListingExtraction>(url);
}

export function cacheListing(url: string, data: ListingExtraction): void {
  listingCache.set(url, data, LISTING_CACHE_TTL);
}
