import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

/** GET /api/admin — list all users */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = serviceClient();
  const { data: profiles, error } = await sb
    .from("profiles")
    .select("id, email, credits, role, referral_code, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get analysis counts per user
  const { data: counts } = await sb
    .from("analyses")
    .select("user_id")
    .not("user_id", "is", null);

  const countMap: Record<string, number> = {};
  (counts ?? []).forEach((r: { user_id: string }) => {
    countMap[r.user_id] = (countMap[r.user_id] ?? 0) + 1;
  });

  const users = (profiles ?? []).map((p) => ({
    ...p,
    analysis_count: countMap[p.id] ?? 0,
  }));

  return NextResponse.json({ users });
}

/** PATCH /api/admin — update a user's role or credits */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, role, credits } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const sb = serviceClient();
  const updates: Record<string, unknown> = {};
  if (role !== undefined)    updates.role    = role;
  if (credits !== undefined) updates.credits = credits;

  const { error } = await sb.from("profiles").update(updates).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
