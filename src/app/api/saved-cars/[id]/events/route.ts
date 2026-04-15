/**
 * GET /api/saved-cars/[id]/events
 *
 * Returns the full event history for a single tracked car — used by the
 * inline timeline / history panel on each card.
 *
 * Returns all event types including no_change, so the timeline shows every
 * check (even quiet ones), ordered newest first.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const { data, error } = await supabase
    .from("tracked_vehicle_events")
    .select(
      "id, event_type, old_fair_value_mid, new_fair_value_mid, asking_price, " +
      "delta_amount, delta_percent, deal_score, confidence_level, " +
      "buy_timing_status, insight_summary, created_at",
    )
    .eq("saved_car_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}
