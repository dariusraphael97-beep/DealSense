import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

// ── Plan definitions — amounts must match the webhook's AMOUNT_TO_PLAN map ──
const PLANS = {
  starter:  { amount: 699,  credits: 3,  name: "Starter — 3 DealSense Credits",   desc: "3 analysis credits · Never expire" },
  standard: { amount: 1499, credits: 10, name: "Standard — 10 DealSense Credits", desc: "10 analysis credits · Never expire" },
  pro:      { amount: 2999, credits: 25, name: "Pro — 25 DealSense Credits",       desc: "25 analysis credits · Never expire" },
} as const;

type PlanKey = keyof typeof PLANS;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  // Pin to a stable API version known to support embedded checkout
  return new Stripe(key, { apiVersion: "2023-10-16" as any });
}

export async function POST(req: NextRequest) {
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let plan: PlanKey;
  let userId: string | null = null;

  try {
    const body = await req.json();
    if (!body.plan || !(body.plan in PLANS)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    plan = body.plan as PlanKey;
    userId = typeof body.userId === "string" ? body.userId : null;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const planData = PLANS[plan];
  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://dealsense.space";

  try {
    const session = await (stripe.checkout.sessions.create as any)({
      ui_mode: "embedded",
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planData.name,
              description: planData.desc,
            },
            unit_amount: planData.amount,
          },
          quantity: 1,
        },
      ],
      ...(userId ? { client_reference_id: userId } : {}),
      return_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    if (!session.client_secret) {
      console.error("Stripe session missing client_secret:", session);
      return NextResponse.json({ error: "Checkout session did not return a client secret." }, { status: 500 });
    }

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Checkout session creation failed:", message);
    // Return the actual Stripe error so we can debug it on the client
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
