import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({
        step: "auth",
        error: authErr?.message ?? "No user session",
        loggedIn: false
      });
    }

    // Check profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, email, credits, role, referral_code")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      loggedIn: true,
      userId: user.id,
      userEmail: user.email,
      profile: profile,
      profileError: profileErr?.message ?? null,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) });
  }
}
