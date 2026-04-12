import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars for service client");
  return createServiceClient(url, key);
}

/** GET /api/results/[id] — fetch a saved analysis by ID */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // Try to get the current user (optional — public results are viewable by anyone)
  let currentUserId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;
  } catch { /* non-fatal */ }

  // Use service client to bypass RLS — anyone with the ID can view
  const sb = serviceClient();
  const { data, error } = await sb
    .from("analyses")
    .select("id, user_id, result_json, year, make, model, trim, mileage, asking_price, deal_score, verdict, price_delta, vin, created_at, ai_summary, negotiation_script, price_source, estimated_value_low, estimated_value_high")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  // If result_json is stored, return it directly (full AnalysisResult)
  if (data.result_json) {
    return NextResponse.json({
      ...data.result_json,
      savedId: data.id,
      createdAt: data.created_at,
      isOwner: currentUserId === data.user_id,
    });
  }

  // Fallback: reconstruct from flat columns (older rows without result_json)
  const reconstructed = {
    score: data.deal_score,
    verdict: data.verdict,
    priceDelta: data.price_delta,
    priceDeltaPct: data.estimated_value_low
      ? (data.price_delta / Math.round((data.estimated_value_low + data.estimated_value_high) / 2))
      : 0,
    fairValueRange: {
      low: data.estimated_value_low ?? 0,
      high: data.estimated_value_high ?? 0,
      midpoint: Math.round(((data.estimated_value_low ?? 0) + (data.estimated_value_high ?? 0)) / 2),
    },
    monthlyPayment: 0,
    reasons: [],
    aiSummary: data.ai_summary ?? "",
    negotiationScript: data.negotiation_script ?? "",
    priceSource: data.price_source ?? "Market analysis",
    input: {
      year: data.year,
      make: data.make,
      model: data.model,
      trim: data.trim ?? undefined,
      mileage: data.mileage,
      askingPrice: data.asking_price,
      zipCode: "",
      vin: data.vin ?? undefined,
    },
    savedId: data.id,
    createdAt: data.created_at,
    isOwner: currentUserId === data.user_id,
  };

  return NextResponse.json(reconstructed);
}
