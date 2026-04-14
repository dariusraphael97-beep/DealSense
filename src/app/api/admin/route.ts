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

/** GET /api/admin — list users + today's operational stats */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = serviceClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Run all queries in parallel for speed
  const [
    profilesRes,
    countsRes,
    signupsTodayRes,
    analysesTodayRes,
    purchasesTodayRes,
    recentPurchasesRes,
    creditsFulfilledRes,
  ] = await Promise.all([
    sb.from("profiles")
      .select("id, email, credits, role, referral_code, created_at")
      .order("created_at", { ascending: false }),

    sb.from("analyses")
      .select("user_id, count:user_id.count()", { count: "exact" })
      .not("user_id", "is", null),

    sb.from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since24h),

    sb.from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "analysis_used")
      .gte("created_at", since24h),

    sb.from("purchases")
      .select("amount_cents, credits_granted")
      .gte("created_at", since24h),

    sb.from("purchases")
      .select("id, plan_name, credits_granted, amount_cents, customer_email, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(25),

    sb.from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "purchase_completed")
      .gte("created_at", since24h),
  ]);

  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });

  const countMap: Record<string, number> = {};
  (countsRes.data ?? []).forEach((r: { user_id: string; count: number }) => {
    countMap[r.user_id] = r.count;
  });

  const users = (profilesRes.data ?? []).map((p) => ({
    ...p,
    analysis_count: countMap[p.id] ?? 0,
  }));

  // Aggregate purchase totals for today
  const purchasesTodayData = purchasesTodayRes.data ?? [];
  const revenueToday = purchasesTodayData.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const creditsGrantedToday = purchasesTodayData.reduce((s, p) => s + (p.credits_granted ?? 0), 0);

  const stats = {
    signups_today:          signupsTodayRes.count   ?? 0,
    analyses_today:         analysesTodayRes.count  ?? 0,
    purchases_today:        purchasesTodayData.length,
    revenue_today_cents:    revenueToday,
    credits_granted_today:  creditsGrantedToday,
    // Gap detection: if purchases_today > credits_fulfilled_today, webhook may have missed some
    credits_fulfilled_today: creditsFulfilledRes.count ?? 0,
  };

  return NextResponse.json({
    users,
    stats,
    recent_purchases: recentPurchasesRes.data ?? [],
  });
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
