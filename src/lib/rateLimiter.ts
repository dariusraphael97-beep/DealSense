/**
 * DealSense — Rate limiter, API quota tracker, and timeout helper.
 *
 * On Vercel serverless each function instance has its own memory, so this
 * provides per-instance protection which handles the most common abuse patterns
 * (rapid resubmission, parallel tabs, bots on a single edge node). For strict
 * global enforcement across all instances you'd add an Upstash Redis layer.
 */

// ── User rate limit config ─────────────────────────────────────────────────
const USER_LIMIT_MAX    = 10;               // max analyses per window
const USER_LIMIT_WINDOW = 60 * 60 * 1000;  // 1 hour in ms

// ── API quota warning threshold ────────────────────────────────────────────
const QUOTA_WARN_THRESHOLD = 800;           // warn at 800 calls/hr
const QUOTA_WINDOW_MS      = 60 * 60 * 1000;

// ── Stores ─────────────────────────────────────────────────────────────────
// userId → sorted list of analysis timestamps within the current window
const userTimestamps = new Map<string, number[]>();

interface QuotaEntry { count: number; windowStart: number }
const providerQuotas = new Map<string, QuotaEntry>();


// ── User rate limiting ─────────────────────────────────────────────────────

/**
 * Check if the user is within their hourly analysis limit.
 * Records the attempt on success so the next call sees the updated count.
 *
 * Returns:
 *   { allowed: true }                       — proceed normally
 *   { allowed: false, retryAfterMs: number } — reject and tell them when to retry
 */
export function checkUserRateLimit(
  userId: string
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now         = Date.now();
  const windowStart = now - USER_LIMIT_WINDOW;

  // Prune expired entries
  let ts = (userTimestamps.get(userId) ?? []).filter(t => t > windowStart);

  if (ts.length >= USER_LIMIT_MAX) {
    const retryAfterMs = Math.max(0, ts[0] + USER_LIMIT_WINDOW - now);
    userTimestamps.set(userId, ts);
    return { allowed: false, retryAfterMs };
  }

  ts.push(now);
  userTimestamps.set(userId, ts);
  return { allowed: true };
}

/** How many analyses the user has submitted in the current window. */
export function getUserUsage(userId: string): number {
  const now = Date.now();
  return (userTimestamps.get(userId) ?? []).filter(t => t > now - USER_LIMIT_WINDOW).length;
}


// ── External API quota tracking ────────────────────────────────────────────

/**
 * Record one external API call for a named provider and return usage stats.
 * The window resets automatically after 1 hour.
 */
export function recordApiCall(provider: string): { count: number; nearLimit: boolean } {
  const now   = Date.now();
  let entry   = providerQuotas.get(provider);

  if (!entry || now - entry.windowStart > QUOTA_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
  }

  entry.count += 1;
  providerQuotas.set(provider, entry);

  return { count: entry.count, nearLimit: entry.count >= QUOTA_WARN_THRESHOLD };
}

/** True if the provider has hit the warning threshold this hour. */
export function isNearQuotaLimit(provider: string): boolean {
  const now   = Date.now();
  const entry = providerQuotas.get(provider);
  if (!entry || now - entry.windowStart > QUOTA_WINDOW_MS) return false;
  return entry.count >= QUOTA_WARN_THRESHOLD;
}

/** Quota usage snapshot (for logging/monitoring). Returns null if window expired. */
export function getQuotaUsage(provider: string): { count: number; windowStart: number } | null {
  const now   = Date.now();
  const entry = providerQuotas.get(provider);
  if (!entry || now - entry.windowStart > QUOTA_WINDOW_MS) return null;
  return { count: entry.count, windowStart: entry.windowStart };
}


// ── Timeout helper ─────────────────────────────────────────────────────────

/**
 * Race a promise against a timeout.
 * Resolves to null if the deadline is exceeded — never rejects.
 *
 * Usage:
 *   const result = await withTimeout(fetchValuation(input), 8000);
 *   if (!result) { /* timed out — use fallback *\/ }
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  const deadline = new Promise<null>(resolve => setTimeout(() => resolve(null), ms));
  return Promise.race([promise.catch(() => null), deadline]);
}
