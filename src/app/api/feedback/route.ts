import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: {
    analysisId?: string;
    vin?: string;
    dealScore?: number;
    verdict?: string;
    confidenceLevel?: string;
    helpful: boolean;
    comment?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.helpful !== "boolean") {
    return NextResponse.json({ error: "Missing 'helpful' field." }, { status: 400 });
  }

  try {
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      analysis_id: body.analysisId || null,
      vin: body.vin || null,
      deal_score: body.dealScore ?? null,
      verdict: body.verdict || null,
      confidence_level: body.confidenceLevel || null,
      helpful: body.helpful,
      comment: body.comment || null,
    });

    if (error) {
      console.error("Feedback insert error:", error);
      return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback error:", err);
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }
}
