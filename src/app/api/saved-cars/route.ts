import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/** GET /api/saved-cars — list user's saved cars */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Optional: check if a specific analysis is saved
  const analysisId = request.nextUrl.searchParams.get("analysis_id");
  if (analysisId) {
    const { data } = await supabase
      .from("saved_cars")
      .select("id")
      .eq("user_id", user.id)
      .eq("analysis_id", analysisId)
      .maybeSingle();
    return NextResponse.json({ saved: !!data, savedId: data?.id ?? null });
  }

  const { data, error } = await supabase
    .from("saved_cars")
    .select("id, analysis_id, vin, year, make, model, trim, mileage, asking_price, deal_score, verdict, price_delta, fair_value_mid, confidence_level, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cars: data });
}

/** POST /api/saved-cars — save a car */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const { data, error } = await supabase
    .from("saved_cars")
    .insert({
      user_id: user.id,
      analysis_id: body.analysisId ?? null,
      vin: body.vin ?? null,
      year: body.year,
      make: body.make,
      model: body.model,
      trim: body.trim ?? null,
      mileage: body.mileage,
      asking_price: body.askingPrice,
      deal_score: body.dealScore,
      verdict: body.verdict,
      price_delta: body.priceDelta,
      fair_value_mid: body.fairValueMid,
      confidence_level: body.confidenceLevel ?? null,
      result_json: body.resultJson ?? null,
    })
    .select("id")
    .single();

  if (error) {
    // Duplicate constraint (already saved)
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already saved", alreadySaved: true }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, saved: true });
}

/** DELETE /api/saved-cars — remove a saved car */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  const analysisId = request.nextUrl.searchParams.get("analysis_id");

  if (id) {
    await supabase.from("saved_cars").delete().eq("id", id).eq("user_id", user.id);
  } else if (analysisId) {
    await supabase.from("saved_cars").delete().eq("analysis_id", analysisId).eq("user_id", user.id);
  } else {
    return NextResponse.json({ error: "Missing id or analysis_id" }, { status: 400 });
  }

  return NextResponse.json({ removed: true });
}
