import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = "nodejs";

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
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, priceId, credits } = session.metadata ?? {};
    if (!userId || !credits) return NextResponse.json({ ok: true });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase env vars in webhook");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const creditsToAdd = parseInt(credits, 10);

    // Idempotency: skip if this session was already processed
    const { data: existing } = await supabase
      .from("purchases")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (existing) {
      // Already processed — return success without duplicating
      return NextResponse.json({ ok: true });
    }

    // Add credits — use increment expression to avoid race conditions
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, total_purchased")
      .eq("id", userId)
      .single();

    if (profile) {
      const { error: updateError } = await supabase.from("profiles").update({
        credits:         profile.credits + creditsToAdd,
        total_purchased: (profile.total_purchased ?? 0) + creditsToAdd,
      }).eq("id", userId);

      if (updateError) {
        console.error("Failed to update credits:", updateError);
        return NextResponse.json({ error: "Credit update failed" }, { status: 500 });
      }
    } else {
      console.error(`No profile found for user ${userId} — credits not added`);
    }

    // Record purchase
    const { error: insertError } = await supabase.from("purchases").insert({
      user_id:          userId,
      stripe_session_id: session.id,
      stripe_price_id:  priceId ?? "",
      credits_granted:  creditsToAdd,
      amount_cents:     session.amount_total ?? 0,
    });

    if (insertError) {
      console.error("Failed to record purchase:", insertError);
    }
  }

  return NextResponse.json({ ok: true });
}
