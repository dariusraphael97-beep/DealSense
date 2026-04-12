import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FOUNDERS_GRANT = 5; // credits per claim
const MAX_FOUNDERS_CLAIMS = 3; // max times a user can claim

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, founders_claims")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Could not load profile." },
        { status: 500 }
      );
    }

    const claimsSoFar = profile.founders_claims ?? 0;

    if (claimsSoFar >= MAX_FOUNDERS_CLAIMS) {
      return NextResponse.json(
        {
          error:
            "You\u2019ve already claimed your founders credits. Paid plans are coming soon!",
        },
        { status: 429 }
      );
    }

    // Grant credits
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        credits: (profile.credits ?? 0) + FOUNDERS_GRANT,
        founders_claims: claimsSoFar + 1,
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to add credits. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      credits: (profile.credits ?? 0) + FOUNDERS_GRANT,
      claimed: claimsSoFar + 1,
      maxClaims: MAX_FOUNDERS_CLAIMS,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
