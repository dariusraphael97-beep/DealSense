import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

const PRICE_CREDITS: Record<string, { credits: number; label: string }> = {
  "price_1TKM2PJ5w276rD5y6NBfq0A5": { credits: 3,  label: "Starter Pack"  },
  "price_1TKM2QJ5w276rD5yxetJGqq6": { credits: 10, label: "Standard Pack" },
  "price_1TKM2RJ5w276rD5y3wqLUg90": { credits: 25, label: "Pro Pack"      },
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { priceId } = await req.json();
  if (!PRICE_CREDITS[priceId]) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? "https://dealsense.space";

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/analyze?credits_added=true`,
    cancel_url:  `${origin}/analyze`,
    metadata: {
      userId:  user.id,
      priceId,
      credits: String(PRICE_CREDITS[priceId].credits),
    },
    client_reference_id: user.id,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
