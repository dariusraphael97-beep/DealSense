/**
 * Lightweight TTL-based in-memory cache.
 * On Vercel serverless, each cold start gets a fresh cache — this is fine.
 * The cache prevents redundant API calls within a single instance's lifetime.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

// Named cache instances with purpose-specific TTLs
const ONE_HOUR         = 60 * 60 * 1000;
const FOUR_HOURS       = 4 * 60 * 60 * 1000;
const FIFTEEN_MIN      = 15 * 60 * 1000;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/** VIN decode results — vehicle identity doesn't change */
export const vinCache = new MemoryCache();
export const VIN_CACHE_TTL = TWENTY_FOUR_HOURS;

/** Listing extraction results — listings are ephemeral */
export const listingCache = new MemoryCache();
export const LISTING_CACHE_TTL = FIFTEEN_MIN;

/** Valuation results — pricing changes slowly */
export const valuationCache = new MemoryCache();
export const VALUATION_CACHE_TTL = ONE_HOUR;

/** Sticker availability — stable over time */
export const stickerCache = new MemoryCache();
export const STICKER_CACHE_TTL = TWENTY_FOUR_HOURS;

/**
 * Full analysis results — keyed by VIN + mileage bucket + price bucket.
 * Cache hits skip all external API calls and credit deduction, returning
 * the stored result instantly. TTL is 4 hours (pricing data stays fresh
 * enough within that window for most consumer purchase decisions).
 */
export const analysisCache = new MemoryCache();
export const ANALYSIS_CACHE_TTL = FOUR_HOURS;
