import type { NormalizedVehicle } from "@/lib/types";
import { vinCache, VIN_CACHE_TTL } from "@/lib/cache";

const NHTSA_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

/**
 * Decode a VIN via NHTSA vPIC and return a normalized vehicle object.
 * Results are cached for 24 hours to avoid redundant API calls.
 */
export async function decodeVin(vin: string): Promise<NormalizedVehicle> {
  const cleaned = vin.trim().toUpperCase();

  // Check cache first
  const cached = vinCache.get<NormalizedVehicle>(cleaned);
  if (cached) return cached;

  const url = `${NHTSA_BASE}/DecodeVinValues/${encodeURIComponent(cleaned)}?format=json`;
  const res = await fetch(url, { next: { revalidate: 86400 } });

  if (!res.ok) {
    throw new Error(`NHTSA returned ${res.status}`);
  }

  const data = await res.json();
  const r = data?.Results?.[0];

  if (!r) {
    throw new Error("No results from NHTSA");
  }

  const vehicle: NormalizedVehicle = {
    vin: cleaned,
    year: r.ModelYear ? parseInt(r.ModelYear, 10) : undefined,
    make: r.Make || undefined,
    model: r.Model || undefined,
    trim: r.Trim || undefined,
    bodyClass: r.BodyClass || undefined,
    driveType: r.DriveType || undefined,
    fuelType: r.FuelTypePrimary || undefined,
    engineCylinders: r.EngineCylinders || undefined,
    displacement: r.DisplacementL || undefined,
    transmission: r.TransmissionStyle || undefined,
  };

  vinCache.set(cleaned, vehicle, VIN_CACHE_TTL);
  return vehicle;
}
