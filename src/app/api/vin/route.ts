import { NextRequest, NextResponse } from "next/server";
import type { VinDecodeResult } from "@/lib/types";

// NHTSA vPIC API — free, no key required
const NHTSA_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

interface NhtsaVariable {
  Variable: string;
  Value: string | null;
}

function pick(variables: NhtsaVariable[], name: string): string | undefined {
  const v = variables.find((x) => x.Variable === name);
  return v?.Value ?? undefined;
}

export async function GET(req: NextRequest) {
  const vin = req.nextUrl.searchParams.get("vin");
  if (!vin || vin.trim().length < 11) {
    return NextResponse.json(
      { error: "Please provide at least 11 characters of VIN." },
      { status: 400 }
    );
  }

  try {
    const url = `${NHTSA_BASE}/DecodeVin/${encodeURIComponent(vin.trim())}?format=json`;
    const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h
    if (!res.ok) throw new Error(`NHTSA returned ${res.status}`);

    const data = await res.json();
    const vars: NhtsaVariable[] = data?.Results ?? [];

    const yearStr = pick(vars, "Model Year");
    const result: VinDecodeResult = {
      year: yearStr ? parseInt(yearStr, 10) : undefined,
      make: pick(vars, "Make") || undefined,
      model: pick(vars, "Model") || undefined,
      trim: pick(vars, "Trim") || undefined,
      bodyClass: pick(vars, "Body Class") || undefined,
      driveType: pick(vars, "Drive Type") || undefined,
      fuelType: pick(vars, "Fuel Type - Primary") || undefined,
      engineCylinders: pick(vars, "Engine Number of Cylinders") || undefined,
      displacement: pick(vars, "Displacement (L)") || undefined,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("VIN decode error:", err);
    return NextResponse.json(
      { error: "Failed to decode VIN. Please enter details manually." },
      { status: 502 }
    );
  }
}
