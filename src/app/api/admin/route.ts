import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const VALID_ROLES = ["user", "staff", "admin"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars for service client");
  return createServiceClient(url, key);
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

/** GET /api/admin — list all users with analysis counts */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = serviceClient();
  const { data: profiles, error } = await sb
    .from("profiles")
    .select("id, email, credits, role, referral_code, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Use GROUP BY via RPC-style query to count analyses per user efficiently
  // instead of fetching every row and counting in JS
  const { data: counts } = await sb
    .from("analyses")
    .select("user_id, count:user_id.count()", { count: "exact" })
    .not("user_id", "is", null);

  const countMap: Record<string, number> = {};
  (counts ?? []).forEach((r: { user_id: string; count: number }) => {
    countMap[r.user_id] = r.count;
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

  let body: { userId?: string; role?: string; credits?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, role, credits } = body;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId required (string)" }, { status: 400 });
  }

  // Validate role against allowlist
  if (role !== undefined) {
    if (typeof role !== "string" || !VALID_ROLES.includes(role as ValidRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Validate credits as a non-negative integer
  if (credits !== undefined) {
    if (typeof credits !== "number" || !Number.isInteger(credits) || credits < 0 || credits > 100000) {
      return NextResponse.json(
        { error: "credits must be an integer between 0 and 100,000" },
        { status: 400 }
      );
    }
  }

  if (role === undefined && credits === undefined) {
    return NextResponse.json({ error: "Nothing to update (provide role and/or credits)" }, { status: 400 });
  }

  const sb = serviceClient();
  const updates: Record<string, unknown> = {};
  if (role !== undefined)    updates.role    = role;
  if (credits !== undefined) updates.credits = credits;

  const { error } = await sb.from("profiles").update(updates).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
