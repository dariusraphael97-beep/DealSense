import { NextRequest, NextResponse } from "next/server";
import { decodeVin } from "@/lib/providers";
import type { VinDecodeResult } from "@/lib/types";

export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get("vin");
  if (!vin || vin.trim().length < 11) {
    return NextResponse.json(
      { error: "Please provide at least 11 characters of VIN." },
      { status: 400 },
    );
  }

  try {
    const v = await decodeVin(vin);
    const result: VinDecodeResult = {
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      bodyClass: v.bodyClass,
      driveType: v.driveType,
      fuelType: v.fuelType,
      engineCylinders: v.engineCylinders,
      displacement: v.displacement,
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error("VIN decode error:", err);
    return NextResponse.json(
      { error: "Failed to decode VIN. Please enter details manually." },
      { status: 502 },
    );
  }
}
