import type { ListingExtraction } from "@/lib/types";
import { listingCache, LISTING_CACHE_TTL } from "@/lib/cache";

/** Matches a 17-char VIN (excludes I, O, Q per NHTSA standard) */
const VIN_RE = /\b([A-HJ-NPR-Z0-9]{17})\b/g;

// ── VIN extraction ─────────────────────────────────────────────────────

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

  // Fallback: any 17-char VIN pattern
  const generic = html.match(VIN_RE);
  if (generic?.[0]) return generic[0].toUpperCase();

  return null;
}

// ── Price extraction ───────────────────────────────────────────────────

function extractPriceFromHtml(html: string, jsonLdData: Record<string, unknown>[]): number | null {
  // 1. JSON-LD structured data
  for (const obj of jsonLdData) {
    // schema.org/Product, schema.org/Car, schema.org/Vehicle
    const offers = (obj as Record<string, unknown>).offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
    if (offers) {
      const offerObj = Array.isArray(offers) ? offers[0] : offers;
      const price = offerObj?.price ?? offerObj?.lowPrice;
      if (price) {
        const parsed = parseFloat(String(price).replace(/[,$]/g, ""));
        if (parsed > 500 && parsed < 500000) return Math.round(parsed);
      }
    }
    // Direct price field
    const directPrice = (obj as Record<string, unknown>).price;
    if (directPrice) {
      const parsed = parseFloat(String(directPrice).replace(/[,$]/g, ""));
      if (parsed > 500 && parsed < 500000) return Math.round(parsed);
    }
  }

  // 2. Meta tags
  const metaPrice = html.match(/<meta[^>]+(?:property|name)=["'](?:og:price:amount|product:price:amount|price)["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:price:amount|product:price:amount|price)["']/i);
  if (metaPrice?.[1]) {
    const parsed = parseFloat(metaPrice[1].replace(/[,$]/g, ""));
    if (parsed > 500 && parsed < 500000) return Math.round(parsed);
  }

  // 3. Data attributes
  const dataPrice = html.match(/data-price=["'](\d[\d,.]+)["']/i);
  if (dataPrice?.[1]) {
    const parsed = parseFloat(dataPrice[1].replace(/[,$]/g, ""));
    if (parsed > 500 && parsed < 500000) return Math.round(parsed);
  }

  // 4. Regex patterns in visible text — look for dollar amounts near price-related keywords
  // Match prices like $24,995 or $24995 that appear near price keywords
  const pricePatterns = [
    /(?:asking|our\s+price|internet\s+price|sale\s+price|price|listed\s+at|your\s+price)[^$]{0,40}\$\s?([\d,]+)/i,
    /\$\s?([\d]{1,3}(?:,\d{3})+)(?:\s|<)/,
    /\$\s?([\d]{4,6})(?:\s|<)/,
  ];

  for (const re of pricePatterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const parsed = parseFloat(m[1].replace(/,/g, ""));
      if (parsed > 500 && parsed < 500000) return Math.round(parsed);
    }
  }

  return null;
}

// ── Mileage extraction ─────────────────────────────────────────────────

function extractMileageFromHtml(html: string, jsonLdData: Record<string, unknown>[]): number | null {
  // 1. JSON-LD
  for (const obj of jsonLdData) {
    const mileage = (obj as Record<string, unknown>).mileageFromOdometer as Record<string, unknown> | string | undefined;
    if (mileage) {
      const val = typeof mileage === "object" ? String(mileage.value ?? "") : String(mileage);
      const parsed = parseFloat(val.replace(/[,\s]/g, ""));
      if (parsed > 0 && parsed < 1000000) return Math.round(parsed);
    }
    // Also check vehicleMileage (some sites use this)
    const vehicleMileage = (obj as Record<string, unknown>).vehicleMileage;
    if (vehicleMileage) {
      const parsed = parseFloat(String(vehicleMileage).replace(/[,\s]/g, ""));
      if (parsed > 0 && parsed < 1000000) return Math.round(parsed);
    }
  }

  // 2. Data attributes
  const dataMiles = html.match(/data-(?:mileage|miles|odometer)=["'](\d[\d,]+)["']/i);
  if (dataMiles?.[1]) {
    const parsed = parseFloat(dataMiles[1].replace(/,/g, ""));
    if (parsed > 0 && parsed < 1000000) return Math.round(parsed);
  }

  // 3. Regex patterns — "XX,XXX miles" or "XX,XXX mi"
  const milePatterns = [
    /(?:mileage|odometer)[^0-9]{1,30}([\d,]+)\s*(?:mi|miles)/i,
    /([\d]{1,3}(?:,\d{3})+)\s*(?:mi(?:les)?)\b/i,
    /([\d]{4,6})\s*(?:mi(?:les)?)\b/i,
  ];

  for (const re of milePatterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const parsed = parseFloat(m[1].replace(/,/g, ""));
      if (parsed > 0 && parsed < 1000000) return Math.round(parsed);
    }
  }

  return null;
}

// ── Location / ZIP extraction ──────────────────────────────────────────

function extractLocationFromHtml(html: string, jsonLdData: Record<string, unknown>[]): string | null {
  // 1. JSON-LD address
  for (const obj of jsonLdData) {
    // Check offers.availableAtOrFrom.address or direct address
    const address = extractNestedAddress(obj);
    if (address) return address;
  }

  // 2. Data attributes
  const dataZip = html.match(/data-(?:zip|zipcode|zip-code|postal)=["'](\d{5})["']/i);
  if (dataZip?.[1]) return dataZip[1];

  // 3. Meta tags with geo information
  const geoZip = html.match(/<meta[^>]+(?:name|property)=["'](?:geo\.postal|zipcode|og:postal_code)["'][^>]+content=["'](\d{5})["']/i)
    ?? html.match(/<meta[^>]+content=["'](\d{5})["'][^>]+(?:name|property)=["'](?:geo\.postal|zipcode|og:postal_code)["']/i);
  if (geoZip?.[1]) return geoZip[1];

  // 4. Regex: 5-digit ZIP near location/dealer/address keywords
  const zipPatterns = [
    /(?:dealer|location|address|located|zip)[^0-9]{1,50}(?:[A-Z]{2}\s+)?(\d{5})(?:\b|-)/i,
    /,\s*[A-Z]{2}\s+(\d{5})\b/,  // "City, ST 12345" pattern
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

  // Direct postalCode field
  if (typeof record.postalCode === "string") {
    const zip = record.postalCode.match(/(\d{5})/);
    if (zip) return zip[1];
  }

  // Check address sub-object
  if (record.address && typeof record.address === "object") {
    const result = extractNestedAddress(record.address, depth + 1);
    if (result) return result;
  }

  // Check offers.availableAtOrFrom
  if (record.offers && typeof record.offers === "object") {
    const result = extractNestedAddress(record.offers, depth + 1);
    if (result) return result;
  }
  if (record.availableAtOrFrom && typeof record.availableAtOrFrom === "object") {
    const result = extractNestedAddress(record.availableAtOrFrom, depth + 1);
    if (result) return result;
  }

  // Check seller/dealer
  if (record.seller && typeof record.seller === "object") {
    const result = extractNestedAddress(record.seller, depth + 1);
    if (result) return result;
  }

  return null;
}

// ── JSON-LD parser ─────────────────────────────────────────────────────

function parseJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
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

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Extract listing data from HTML content.
 * Tries JSON-LD first, then meta tags, then regex patterns.
 */
export function extractFromHtml(html: string, sourceHost: string): ListingExtraction {
  const jsonLdData = parseJsonLd(html);

  return {
    vin: extractVinFromHtml(html),
    price: extractPriceFromHtml(html, jsonLdData),
    mileage: extractMileageFromHtml(html, jsonLdData),
    zipCode: extractLocationFromHtml(html, jsonLdData),
    title: extractTitleFromHtml(html, jsonLdData),
    source: sourceHost,
  };
}

/** Extract title from JSON-LD or meta tags */
function extractTitleFromHtml(html: string, jsonLdData: Record<string, unknown>[]): string | null {
  // JSON-LD name
  for (const obj of jsonLdData) {
    if (typeof (obj as Record<string, unknown>).name === "string") {
      return (obj as Record<string, unknown>).name as string;
    }
  }

  // OG title
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
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
