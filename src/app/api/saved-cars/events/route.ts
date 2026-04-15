/**
 * GET /api/saved-cars/events
 *
 * Returns the most recent meaningful tracking events across all of a user's
 * tracked cars — used by the "Recent Updates" feed on the Market Watch page.
 *
 * Intentionally excludes `no_change` events (too noisy for the feed).
 * The first_check event is included so users can see when monitoring started.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("tracked_vehicle_events")
    .select(`
      id,
      event_type,
      delta_amount,
      delta_percent,
      new_fair_value_mid,
      asking_price,
      deal_score,
      buy_timing_status,
      confidence_level,
      insight_summary,
      created_at,
      saved_cars (
        id,
        year,
        make,
        model,
        trim,
        vehicle_category
      )
    `)
    .eq("user_id", user.id)
    .neq("event_type", "no_change")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}
