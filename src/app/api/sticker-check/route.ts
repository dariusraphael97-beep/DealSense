import { NextRequest, NextResponse } from "next/server";
import { checkStickerAvailability } from "@/lib/providers";

export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get("vin");
  if (!vin || !/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim())) {
    return NextResponse.json(
      { available: false, error: "A valid 17-character VIN is required." },
      { status: 400 }
    );
  }

  try {
    const result = await checkStickerAvailability(vin.trim());
    return NextResponse.json(result);
  } catch (err) {
    console.error("Sticker check error:", err);
    return NextResponse.json(
      { available: false, error: "Could not check sticker availability." },
      { status: 502 }
    );
  }
}
