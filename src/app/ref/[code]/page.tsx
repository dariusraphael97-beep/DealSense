import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Referral redirect: /ref/[code]
 * Validates the referral code exists, then sends the user to /auth?ref=[code]
 * The auth page stores the code in localStorage so it can be applied on signup.
 */
export default async function ReferralRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  if (!code || code.length < 6) {
    redirect("/auth");
  }

  // Verify the referral code actually exists
  try {
    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await sb
      .from("profiles")
      .select("id")
      .eq("referral_code", code.toLowerCase())
      .single();

    if (!data) {
      redirect("/auth");
    }
  } catch {
    redirect("/auth");
  }

  redirect(`/auth?ref=${encodeURIComponent(code.toLowerCase())}`);
}
