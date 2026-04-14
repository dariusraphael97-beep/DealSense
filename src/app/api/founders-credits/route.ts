import { NextResponse } from "next/server";

/**
 * Founders credit claim endpoint — disabled.
 * Free credit grants are no longer issued this way.
 * New users receive 1 credit at signup via the Supabase trigger.
 */
export async function POST() {
  return NextResponse.json(
    { error: "This offer is no longer available." },
    { status: 410 }
  );
}
