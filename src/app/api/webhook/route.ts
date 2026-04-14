import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DealSense — Stripe Webhook Handler
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Handles `checkout.session.completed` events from Stripe Payment Links.
 *
 * How it works:
 *   1. Stripe sends a webhook when a customer completes checkout
 *   2. We identify the user via `client_reference_id` (their Supabase user ID)
 *      — falls back to matching customer email against the profiles table
 *   3. We determine credits from the amount paid:
 *      - $6.99  (699 cents)  → 3 credits  (Starter)
 *      - $14.99 (1499 cents) → 10 credits (Standard)
 *      - $29.99 (2999 cents) → 25 credits (Pro)
 *   4. Credits are added to the user's profile
 *   5. Purchase is recorded in the `purchases` table for idempotency
 *
 * STRIPE DASHBOARD SETUP:
 *   1. Go to Developers → Webhooks → Add endpoint
 *   2. Endpoint URL: https://dealsense.space/api/webhook
 *   3. Events to listen for: checkout.session.completed
 *   4. Copy the webhook signing secret → set as STRIPE_WEBHOOK_SECRET env var
 * ═══════════════════════════════════════════════════════════════════════════
 */

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

// ── Map amount (cents) to credits and plan name ─────────────────────────
const AMOUNT_TO_PLAN: Record<number, { credits: number; plan: string }> = {
  699:  { credits: 3,  plan: "Starter"  },
  1499: { credits: 10, plan: "Standard" },
  2999: { credits: 25, plan: "Pro"      },
};

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = "nodejs";

/** GET /api/webhook — env var health check (safe: shows presence, not values) */
export async function GET() {
  const keyPrefix = process.env.STRIPE_SECRET_KEY?.slice(0, 7) ?? "missing";
  const mode = keyPrefix === "sk_live" ? "LIVE ✅" : keyPrefix === "sk_test" ? "TEST ⚠️" : "UNKNOWN ❌";
  return NextResponse.json({
    stripe_mode:            mode,
    STRIPE_SECRET_KEY:      !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET:  !!process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_LINK_STARTER:    !!process.env.NEXT_PUBLIC_STRIPE_LINK_STARTER,
    STRIPE_LINK_STANDARD:   !!process.env.NEXT_PUBLIC_STRIPE_LINK_STANDARD,
    STRIPE_LINK_PRO:        !!process.env.NEXT_PUBLIC_STRIPE_LINK_PRO,
    SUPABASE_URL:           !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_KEY:   !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    KEY_PREFIX:             keyPrefix,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature verification failed:", message);
    console.error("Check that STRIPE_WEBHOOK_SECRET on Vercel matches the signing secret in Stripe Dashboard → Webhooks.");
    return NextResponse.json({ error: "Invalid signature", detail: message }, { status: 400 });
  }

  // ── Only handle checkout completions ────────────────────────────────────
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true });
  }

  // ── Log live vs test mode (safe — no secrets exposed) ──────────────────
  console.log(`Webhook: event ${event.id} | livemode=${event.livemode} | type=${event.type}`);

  const session = event.data.object as Stripe.Checkout.Session;

  // ── Supabase admin client ──────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars in webhook");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Idempotency: skip if this session was already processed ────────────
  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existing) {
    console.log(`Webhook: session ${session.id} already processed, skipping`);
    return NextResponse.json({ ok: true });
  }

  // ── Determine credits from amount ──────────────────────────────────────
  const amountPaid = session.amount_total ?? 0;
  const planInfo = AMOUNT_TO_PLAN[amountPaid];

  if (!planInfo) {
    console.error(`Webhook: unrecognized amount ${amountPaid} cents — cannot map to credits`);
    // Still return 200 so Stripe doesn't retry, but log the error
    return NextResponse.json({ ok: true, warning: "Unrecognized amount" });
  }

  const { credits: creditsToAdd, plan: planName } = planInfo;

  // ── Identify the user ──────────────────────────────────────────────────
  // Priority 1: client_reference_id (Supabase user ID passed in the payment link URL)
  // Priority 2: Match customer email against profiles table
  let userId: string | null = session.client_reference_id ?? null;
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;

  if (!userId && customerEmail) {
    // Fall back to email matching
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .maybeSingle();

    if (profile) {
      userId = profile.id;
    }
  }

  if (!userId) {
    console.error(
      `Webhook: cannot identify user for session ${session.id}. ` +
      `client_reference_id=${session.client_reference_id}, email=${customerEmail}`
    );
    // Record the purchase anyway for manual resolution
    await supabase.from("purchases").insert({
      user_id:             null,
      stripe_session_id:   session.id,
      stripe_payment_link: typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id ?? null,
      plan_name:           planName,
      credits_granted:     creditsToAdd,
      amount_cents:        amountPaid,
      customer_email:      customerEmail,
    });
    return NextResponse.json({ ok: true, warning: "User not identified — credits pending manual assignment" });
  }

  // ── Add credits to user profile ────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, total_purchased")
    .eq("id", userId)
    .single();

  if (profile) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        credits:         profile.credits + creditsToAdd,
        total_purchased: (profile.total_purchased ?? 0) + creditsToAdd,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Webhook: failed to update credits:", updateError);
      return NextResponse.json({ error: "Credit update failed" }, { status: 500 });
    }

    console.log(`Webhook: added ${creditsToAdd} credits (${planName}) to user ${userId}`);

    // ── Referral reward ──────────────────────────────────────────────────
    // If this buyer was referred, give the referrer 1 bonus credit (first purchase only)
    const referredBy = (profile as Record<string, unknown>).referred_by as string | null ?? null;
    if (referredBy) {
      // Only reward on first purchase (total_purchased was 0 before this)
      const wasFirstPurchase = (profile.total_purchased ?? 0) === 0;
      if (wasFirstPurchase) {
        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", referredBy)
          .maybeSingle();

        if (referrerProfile) {
          await supabase
            .from("profiles")
            .update({ credits: referrerProfile.credits + 1 })
            .eq("id", referredBy);

          console.log(`Webhook: referral reward — 1 credit added to referrer ${referredBy}`);

          supabase.from("events").insert({
            user_id:    referredBy,
            event_type: "referral_reward",
            properties: { referee_id: userId, credits_added: 1 },
          }).then(() => {}, () => {});
        }
      }
    }

    // Fire-and-forget event log
    supabase.from("events").insert({
      user_id:    userId,
      event_type: "purchase_completed",
      properties: { plan: planName, credits: creditsToAdd, amount_cents: amountPaid },
    }).then(() => {}, () => {});
  } else {
    console.error(`Webhook: no profile found for user ${userId}`);
  }

  // ── Record purchase for audit trail ────────────────────────────────────
  const { error: insertError } = await supabase.from("purchases").insert({
    user_id:             userId,
    stripe_session_id:   session.id,
    stripe_payment_link: typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id ?? null,
    plan_name:           planName,
    credits_granted:     creditsToAdd,
    amount_cents:        amountPaid,
    customer_email:      customerEmail,
  });

  if (insertError) {
    console.error("Webhook: failed to record purchase:", insertError);
  }

  return NextResponse.json({ ok: true });
}
