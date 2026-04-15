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

// ── Site-specific: CARFAX ─────────────────────────────────────────────
//
// CARFAX pages have two sources of vehicle data that conflict:
//
//   A) <title> / og:description / meta tags — server-rendered, reflects the
//      CURRENT DEALER LISTING ("27,555 mi near Whippany, NJ")
//
//   B) JSON-LD / __NEXT_DATA__ — reflects CARFAX's vehicle history database,
//      which can lag behind (e.g. last service record was 23,184 miles)
//
// We always trust source A for mileage and ZIP.
// We use source B only for VIN and price, which don't change between sources.
//
// Known failure modes fixed here:
//   1. CARFAX titles use "mi" not "miles" — regex must match both
//   2. HTML-encoded commas: "27&#44;555" or "&amp;#44;" in attributes
//   3. Non-breaking spaces: "&nbsp;" between number and unit
//   4. Bare mileage figures in body (near icon, no "mi" text) — targeted patterns

/** Decode common HTML character entities so regexes match consistently */
function decodeEntities(s: string): string {
  return s
    .replace(/&#44;|&#x2[Cc];/g, ",")        // comma
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")   // non-breaking space
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

/** Extract a mileage value from a short string like "27,555 mi" or "27555 miles" */
function parseMileageStr(s: string): number | null {
  // Match "27,555 mi", "27,555 miles", "27555 mi.", "27,555 mi " etc.
  const m = s.match(/([\d,]+)\s*(?:miles?|mi)[\s.,;|<]/i)
    ?? s.match(/([\d,]+)\s*(?:miles?|mi)$/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return n > 100 && n < 1_000_000 ? Math.round(n) : null;
}

function extractCarfaxData(html: string): Partial<ListingExtraction> {
  const result: Partial<ListingExtraction> = {};

  // ── 1. <title> and meta tags — primary source for listing mileage/ZIP ──
  //
  // Typical CARFAX title:
  //   "Used 2023 BMW X3 xDrive30i - $34,900 - 27,555 mi near Whippany, NJ | CARFAX"
  // og:description:
  //   "Find a used 2023 BMW X3 xDrive30i... $34,900, 27,555 mi... Whippany, NJ"

  const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogDescM =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
  const descM =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

  const metaSources = [
    titleM?.[1] ?? "",
    ogDescM?.[1] ?? "",
    descM?.[1] ?? "",
  ].map(decodeEntities);  // decode HTML entities before matching

  console.log("[carfax] meta sources:", metaSources.map(s => s.slice(0, 120)));

  for (const src of metaSources) {
    if (!src) continue;

    // Mileage: handles "27,555 mi", "27,555 miles", "27555 mi", "27,555 mi."
    if (!result.mileage) {
      const n = parseMileageStr(src + " ");  // append space so end-of-string variant works
      if (n) result.mileage = n;
    }

    // ZIP: require a 2-letter US state abbreviation before the 5-digit code
    // e.g. "Whippany, NJ 07981" — prevents mileage like "23184" matching as ZIP
    if (!result.zipCode) {
      const zipM = src.match(/\b[A-Z]{2}\s+(\d{5})\b/);
      if (zipM) result.zipCode = zipM[1];
    }

    // Price from meta
    if (!result.price) {
      const priceM = src.match(/\$\s?([\d,]+)/);
      if (priceM) {
        const n = parseFloat(priceM[1].replace(/,/g, ""));
        if (n > 500 && n < 500_000) result.price = Math.round(n);
      }
    }

    if (result.mileage && result.zipCode) break;
  }

  // ── 1b. CARFAX-specific body patterns — targeted DOM structures ──
  //    Runs only when meta didn't yield mileage. CARFAX renders the listing
  //    odometer in specific elements we can target before the broad fallback.
  if (!result.mileage) {
    const bodyPatterns = [
      // data-qa / data-testid attribute on an element containing mileage
      /data-(?:qa|testid)=["'][^"']*(?:odometer|mileage)[^"']*["'][^>]*>\s*<[^>]*>\s*([\d,]+)/i,
      // aria-label with "mileage" or "odometer"
      /aria-label=["'][^"']*(?:odometer|mileage)[^"']*["'][^>]*>([\d,]+)/i,
      // JSON-like "odometer" key in page JS (not inside script tags that hold history)
      /"(?:odometer|mileage)"\s*:\s*"?([\d,]+)"?/,
      // CARFAX listing detail rows: number immediately before or after "mi" in small context
      />\s*([\d,]+)\s*mi\s*</i,
    ];

    for (const pat of bodyPatterns) {
      const m = html.match(pat);
      if (m) {
        const raw = (m[1] ?? "").replace(/,/g, "");
        const n = parseFloat(raw);
        if (n > 100 && n < 500_000) { result.mileage = Math.round(n); break; }
      }
    }
  }

  // ── 2. JSON-LD — use ONLY for VIN (stable) and price refinement ──
  //    Do NOT use for mileage: CARFAX JSON-LD reflects their history database,
  //    which may show a stale odometer reading from a prior service record.
  const jsonLdData = parseJsonLd(html);
  for (const obj of jsonLdData) {
    const rec = obj as Record<string, unknown>;

    if (!result.vin && typeof rec.vehicleIdentificationNumber === "string") {
      const v = rec.vehicleIdentificationNumber.trim().toUpperCase();
      if (/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) result.vin = v;
    }

    if (!result.price) {
      const offers = rec.offers as Record<string, unknown> | undefined;
      if (offers) {
        const p = toNumber(offers.price ?? offers.lowPrice);
        if (p && p > 500 && p < 500_000) result.price = Math.round(p);
      }
    }

    // ZIP from structured address (dealer address is reliable)
    if (!result.zipCode) {
      const zip = extractNestedAddress(obj);
      if (zip) result.zipCode = zip;
    }
  }

  // ── 3. __NEXT_DATA__ — VIN, price, and mileage (MAX strategy) ──
  //
  // CARFAX NEXT_DATA contains BOTH the current dealer listing mileage AND
  // historical odometer readings from service records. We can't distinguish
  // them by key name alone. However, the current listing odometer is always
  // >= any past service record, so taking the MAX of all mileage-like values
  // reliably gives us the current listing mileage.
  //
  // Example: listing says 27,555 mi; last service record was at 23,184 mi.
  //   deepFindAll finds both → Math.max → 27,555 ✓
  const nextData = parseNextData(html);
  if (nextData) {
    if (!result.vin) {
      for (const v of deepFindAll(nextData, "vin")) {
        if (typeof v === "string" && /^[A-HJ-NPR-Z0-9]{17}$/i.test(v)) {
          result.vin = v.toUpperCase();
          break;
        }
      }
    }

    if (!result.price) {
      for (const pk of ["price", "listPrice", "askingPrice", "salePrice"]) {
        for (const v of deepFindAll(nextData, pk)) {
          const n = toNumber(v);
          if (n && n > 500 && n < 500_000) { result.price = Math.round(n); break; }
        }
        if (result.price) break;
      }
    }

    // Mileage: take MAX across all odometer-like keys.
    // Current listing mileage ≥ any historical service record odometer.
    if (!result.mileage) {
      const mileageCandidates: number[] = [];
      for (const mk of ["mileage", "odometer", "mileageFromOdometer", "miles", "currentMileage", "listingMileage"]) {
        const found = deepFindAll(nextData, mk);
        if (found.length) console.log(`[carfax] NEXT_DATA key="${mk}" values=`, found.slice(0, 5));
        for (const v of found) {
          const n = toNumber(v);
          if (n && n > 100 && n < 500_000) mileageCandidates.push(Math.round(n));
        }
      }
      console.log("[carfax] mileage candidates from NEXT_DATA:", mileageCandidates);
      if (mileageCandidates.length > 0) {
        result.mileage = Math.max(...mileageCandidates);
      }
    }
    console.log("[carfax] final result:", result);

    // ZIP from NEXT_DATA — reject if it equals the mileage (common false positive)
    if (!result.zipCode) {
      for (const key of ["zip", "zipCode", "postalCode", "dealerZip"]) {
        for (const v of deepFindAll(nextData, key)) {
          const m = String(v).match(/\b(\d{5})\b/);
          if (m && m[1] !== String(result.mileage)) {
            result.zipCode = m[1];
            break;
          }
        }
        if (result.zipCode) break;
      }
    }
  }

  // ── 4. HTML regex fallback for mileage ──
  //    Collect ALL "X,XXX mi/miles" patterns from the full HTML and take
  //    the largest. The listing odometer is almost always the biggest.
  //    Only runs if all prior steps failed.
  if (!result.mileage) {
    // Also handles entity-encoded commas (&#44;) and nbsp before unit
    const decoded = decodeEntities(html);
    const mileageRe = /([\d]{1,3}(?:,\d{3})+|[\d]{4,6})[\s\u00a0]*(?:miles?|mi)[\s.,;|<\b]/gi;
    const candidates: number[] = [];
    let mm;
    while ((mm = mileageRe.exec(decoded)) !== null) {
      const n = parseFloat(mm[1].replace(/,/g, ""));
      if (n > 100 && n < 500_000) candidates.push(n);
    }
    if (candidates.length > 0) result.mileage = Math.round(Math.max(...candidates));
  }

  // ── 5. ZIP regex fallback — require state abbreviation context ──
  if (!result.zipCode) {
    const zipCtx = html.match(/\b[A-Z]{2}\s+(\d{5})\b/);
    if (zipCtx?.[1]) result.zipCode = zipCtx[1];
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

  // 4. Regex patterns — collect ALL "XX,XXX mi" matches, take the largest.
  //    First-match-wins misses the odometer when ancillary figures appear
  //    earlier in the HTML (e.g. "2,274 mi/yr" average on CARFAX).
  {
    const candidates: number[] = [];

    // Contextual: "mileage: 27,555 miles" — high confidence, add first
    const ctxRe = /(?:mileage|odometer)[^0-9]{1,30}([\d,]+)\s*(?:mi|miles)/gi;
    let cm;
    while ((cm = ctxRe.exec(html)) !== null) {
      const n = parseFloat(cm[1].replace(/,/g, ""));
      if (n > 100 && n < 1_000_000) candidates.push(n);
    }

    // Generic: any "X,XXX mi" or "XXXXX mi" pattern
    const genericRe = /([\d]{1,3}(?:,\d{3})+|[\d]{4,6})\s*(?:mi(?:les)?)\b/gi;
    let gm;
    while ((gm = genericRe.exec(html)) !== null) {
      const n = parseFloat(gm[1].replace(/,/g, ""));
      if (n > 100 && n < 1_000_000) candidates.push(n);
    }

    if (candidates.length > 0) {
      // The actual odometer reading is almost always the largest mileage
      // figure on a listing page — larger than annual averages, service
      // intervals, or other incidental mileage numbers.
      return Math.round(Math.max(...candidates));
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
  } else if (sourceHost.includes("carfax")) {
    siteData = extractCarfaxData(html);
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
