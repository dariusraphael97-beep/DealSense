import { NextResponse } from "next/server";

// ── Paid plans disabled during early access (founders deal) ──
// The full Stripe checkout flow is preserved in git history and can be
// re-enabled when pricing launches.  For now, all users get free analyses.

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Paid plans are coming soon! During early access, founding members get free analyses.",
    },
    { status: 503 }
  );
}
