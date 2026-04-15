import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// All columns returned for a tracked car
const SELECT_COLS = [
  "id", "analysis_id", "vin", "year", "make", "model", "trim",
  "mileage", "asking_price", "deal_score", "verdict", "price_delta",
  "fair_value_mid", "confidence_level", "created_at", "zip_code",
  "vehicle_category", "is_tracking",
  "latest_fair_value_low", "latest_fair_value_mid", "latest_fair_value_high",
  "latest_deal_score", "last_checked_at", "last_price_change_at",
  "fair_value_change_amount", "fair_value_change_percent",
  "buy_timing_status", "buy_timing_summary", "market_data_available",
].join(", ");

/** GET /api/saved-cars — list tracked cars, or check if one is saved */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if a specific analysis is already saved
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
    .select(SELECT_COLS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cars: data });
}

/** POST /api/saved-cars — save & start tracking a car */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const { data, error } = await supabase
    .from("saved_cars")
    .insert({
      user_id:          user.id,
      analysis_id:      body.analysisId  ?? null,
      vin:              body.vin          ?? null,
      year:             body.year,
      make:             body.make,
      model:            body.model,
      trim:             body.trim         ?? null,
      mileage:          body.mileage,
      asking_price:     body.askingPrice,
      deal_score:       body.dealScore,
      verdict:          body.verdict,
      price_delta:      body.priceDelta,
      fair_value_mid:   body.fairValueMid    ?? null,
      confidence_level: body.confidenceLevel ?? null,
      result_json:      body.resultJson      ?? null,
      // Tracking fields
      zip_code:         body.zipCode          ?? null,
      vehicle_category: body.vehicleCategory  ?? null,
      is_tracking:      true,
      // Seed latest values with what we already know
      latest_fair_value_low:  body.fairValueLow  ?? null,
      latest_fair_value_mid:  body.fairValueMid   ?? null,
      latest_fair_value_high: body.fairValueHigh  ?? null,
      latest_deal_score:      body.dealScore       ?? null,
    })
    .select("id")
    .single();

  if (error) {
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

  const id         = request.nextUrl.searchParams.get("id");
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
