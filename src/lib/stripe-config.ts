/**
 * Single source of truth for all Stripe payment links.
 *
 * These are read from environment variables so no URLs are hardcoded.
 * Set the corresponding env vars in .env.local (dev) and Vercel (production).
 *
 * Required env vars:
 *   NEXT_PUBLIC_STRIPE_LINK_STARTER   — payment link for Starter ($6.99 / 3 credits)
 *   NEXT_PUBLIC_STRIPE_LINK_STANDARD  — payment link for Standard ($14.99 / 10 credits)
 *   NEXT_PUBLIC_STRIPE_LINK_PRO       — payment link for Pro ($29.99 / 25 credits)
 *
 * Get these from: Stripe Dashboard → Payment Links (make sure you're in LIVE mode)
 */

export const STRIPE_LINKS = {
  starter:  process.env.NEXT_PUBLIC_STRIPE_LINK_STARTER  ?? "",
  standard: process.env.NEXT_PUBLIC_STRIPE_LINK_STANDARD ?? "",
  pro:      process.env.NEXT_PUBLIC_STRIPE_LINK_PRO       ?? "",
};

/** Appends client_reference_id so the webhook can identify the buyer. */
export function buildStripeLink(baseUrl: string, userId: string | null): string {
  if (!baseUrl) return "";
  if (!userId)  return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}client_reference_id=${userId}`;
}

/** Returns true when all links are set (use to hide/show pricing UI). */
export function stripeLinksConfigured(): boolean {
  return !!(STRIPE_LINKS.starter && STRIPE_LINKS.standard && STRIPE_LINKS.pro);
}
