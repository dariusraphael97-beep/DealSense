import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Disable body parsing — Stripe needs the raw body for signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, priceId, credits } = session.metadata ?? {};
    if (!userId || !credits) return NextResponse.json({ ok: true });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const creditsToAdd = parseInt(credits, 10);

    // Atomically add credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, total_purchased")
      .eq("id", userId)
      .single();

    if (profile) {
      await supabase.from("profiles").update({
        credits:         profile.credits + creditsToAdd,
        total_purchased: profile.total_purchased + creditsToAdd,
      }).eq("id", userId);
    }

    // Record purchase
    await supabase.from("purchases").insert({
      user_id:          userId,
      stripe_session_id: session.id,
      stripe_price_id:  priceId ?? "",
      credits_granted:  creditsToAdd,
      amount_cents:     session.amount_total ?? 0,
    });
  }

  return NextResponse.json({ ok: true });
}
