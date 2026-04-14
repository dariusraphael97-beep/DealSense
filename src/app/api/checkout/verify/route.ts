import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const AMOUNT_TO_PLAN: Record<number, string> = {
  699:  "Starter — 3 credits added",
  1499: "Standard — 10 credits added",
  2999: "Pro — 25 credits added",
};

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      return NextResponse.json({
        status: "complete",
        plan: AMOUNT_TO_PLAN[session.amount_total ?? 0] ?? "Credits added",
      });
    }

    return NextResponse.json({ status: session.payment_status });
  } catch (err) {
    console.error("Session verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
