/**
 * ClearVIN Vehicle History API Provider
 *
 * Fetches vehicle history data from ClearVIN's API.
 * Test environment: 18 approved VINs only (see docs). Token valid 30 days.
 * Production: any VIN, JWT expires every 120 min (auto-refresh needed).
 *
 * Used to enrich analysis with:
 *  - Title brand history (salvage, rebuilt, lemon, flood, etc.)
 *  - Accident & damage records
 *  - Odometer history (rollback detection)
 *  - Auction history
 *  - Active NHTSA recalls
 *  - Black Book valuation (retail/trade-in at clean/avg/rough condition)
 */

const BASE_URL = "https://www.clearvin.com/rest/vendor";

// ── Normalized types exposed to the rest of the app ─────────────────────────

export interface ClearVinRecall {
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  campaignNumber: string;
  reportDate: string;
}

export interface ClearVinDamage {
  date: string;
  primaryDamage: string;
  secondaryDamage?: string;
  repairCost: number | null;
  airbagDeployed: boolean | null;
}

export interface ClearVinOdometer {
  date: string;
  mileage: number;
  isError: boolean; // true = rollback/discrepancy flag
  location: string;
}

export interface ClearVinAuction {
  date: string;
  vendor: string;
  salePrice: number | null;
  primaryDamage: string;
  secondaryDamage: string;
  condition: string;
  odometer: number;
}

export interface ClearVinTitleBrand {
  code: string;
  name: string;        // e.g. "Salvage", "Rebuilt", "Flood", "Lemon", "Clear"
  description: string;
}

export interface ClearVinBlackBook {
  publishDate: string;
  // Retail values at different conditions
  retailClean:  number | null;
  retailAvg:    number | null;
  retailRough:  number | null;
  // Trade-in values
  tradeinClean: number | null;
  tradeinAvg:   number | null;
  tradeinRough: number | null;
  // Mileage adjustments
  mileageAdjRetailClean: number | null;
  mileageAdjRetailAvg:   number | null;
  // Regional adjustments
  regionalAdjRetailClean: number | null;
  regionalAdjRetailAvg:   number | null;
}

export interface ClearVinHistoryGrade {
  label: string;  // A, B, C, D, E, F
  score: number;  // 0-100
}

export interface VehicleHistory {
  /** Source of data */
  source: "clearvin";
  reportId: string;

  /** Vehicle has title brands other than "Clear" */
  hasProblematicBrands: boolean;
  /** The worst brand — "Clear", "Salvage", "Rebuilt", "Flood", "Lemon", etc. */
  worstBrand: string;
  /** All title brands (may include "Clear" if no issues) */
  titleBrands: ClearVinTitleBrand[];

  /** Number of accident/damage records */
  accidentCount: number;
  damages: ClearVinDamage[];

  /** Odometer history — check isError=true entries for rollback flags */
  odometerRecords: ClearVinOdometer[];
  hasOdometerRollback: boolean;

  /** Times this vehicle has appeared at auction */
  auctionCount: number;
  auctions: ClearVinAuction[];

  /** Active NHTSA recalls */
  recallCount: number;
  recalls: ClearVinRecall[];

  /** Black Book value data (null if not returned by API) */
  blackBook: ClearVinBlackBook | null;

  /** Overall vehicle history grade from ClearVIN */
  historyGrade: ClearVinHistoryGrade | null;

  /** Number of previous owners */
  ownerCount: number;

  /** Whether VIN has changed / been tampered */
  vinChanged: boolean;
}

// ── Internal response types ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

// ── Brand severity ranking ───────────────────────────────────────────────────

const BRAND_SEVERITY: Record<string, number> = {
  "Salvage":       10,
  "Junk":           9,
  "Rebuilt":        8,
  "Flood":          8,
  "Fire":           7,
  "Hail":           5,
  "Lemon":          6,
  "Structural":     7,
  "Manufacturer":   4,
  "Odometer":       9,
  "Taxi":           3,
  "Police":         4,
  "Rental":         2,
  "Lease":          1,
  "Clear":          0,
};

function brandSeverity(name: string): number {
  const key = Object.keys(BRAND_SEVERITY).find(k =>
    name.toLowerCase().includes(k.toLowerCase())
  );
  return key ? BRAND_SEVERITY[key] : 1;
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

function getToken(): string {
  const token = process.env.CLEARVIN_TOKEN;
  if (!token) throw new Error("CLEARVIN_TOKEN not set");
  return token;
}

async function clearVinFetch(path: string): Promise<AnyObj | null> {
  const token = getToken();
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${token}` },
    // 10s timeout via AbortController
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    console.warn(`[clearvin] HTTP ${res.status} for ${path}`);
    return null;
  }

  const json: AnyObj = await res.json();
  if (json.status !== "ok") {
    console.warn(`[clearvin] API error: ${json.message ?? "unknown"}`);
    return null;
  }

  return json;
}

// ── Main export: fetch full vehicle history for a VIN ───────────────────────

export async function fetchVehicleHistory(vin: string): Promise<VehicleHistory | null> {
  try {
    // Fetch full report (HTML format — contains embedded JSON __REPORT_DATA__)
    const json = await clearVinFetch(`/report?vin=${vin}&format=html`);
    if (!json) return null;

    const reportId: string = json.result?.id ?? "";
    const html: string = json.result?.html_report ?? "";
    if (!html) return null;

    // ── Extract embedded __REPORT_DATA__ JSON ──────────────────────────────
    const match = html.match(/__REPORT_DATA__\s*=\s*JSON\.parse\(decodeURIComponent\(`([^`]+)`\)/);
    if (!match) {
      console.warn("[clearvin] Could not find __REPORT_DATA__ in HTML");
      return null;
    }

    let rd: AnyObj;
    try {
      const decoded = decodeURIComponent(match[1]);
      const parsed = JSON.parse(decoded);
      rd = parsed?.reportData?.report ?? {};
    } catch {
      console.warn("[clearvin] Failed to parse __REPORT_DATA__");
      return null;
    }

    // ── Title brands ───────────────────────────────────────────────────────
    const rawBrands: AnyObj[] = rd.brandsInformation ?? [];
    const titleBrands: ClearVinTitleBrand[] = rawBrands.map(b => ({
      code: b.code ?? "",
      name: b.name ?? "",
      description: b.description ?? "",
    }));

    const nonClearBrands = titleBrands.filter(b => b.name.toLowerCase() !== "clear");
    const hasProblematicBrands = nonClearBrands.length > 0;
    const worstBrand = nonClearBrands.length > 0
      ? nonClearBrands.sort((a, b) => brandSeverity(b.name) - brandSeverity(a.name))[0].name
      : "Clear";

    // ── Damage records ─────────────────────────────────────────────────────
    const rawDamages: AnyObj[] = rd.damage ?? [];
    const damages: ClearVinDamage[] = rawDamages.map(d => ({
      date: d.date?.slice(0, 10) ?? "",
      primaryDamage:    d.damages?.find((x: AnyObj) => x.type === 2)?.value ?? "Unknown",
      secondaryDamage:  d.damages?.find((x: AnyObj) => x.type === 5)?.value,
      repairCost:       typeof d.repair_cost === "number" ? d.repair_cost : null,
      airbagDeployed:   d.airbag_status ? d.airbag_status.toLowerCase().includes("deploy") : null,
    }));

    // ── Odometer ───────────────────────────────────────────────────────────
    const rawOdo: AnyObj[] = rd.odometer ?? [];
    const odometerRecords: ClearVinOdometer[] = rawOdo.map(o => ({
      date:     o.date?.slice(0, 10) ?? "",
      mileage:  typeof o.mileage === "number" ? o.mileage : parseInt(o.mileage ?? "0", 10),
      isError:  !!o.isError,
      location: o.location ?? "",
    }));
    const hasOdometerRollback = odometerRecords.some(o => o.isError);

    // ── Auction history ────────────────────────────────────────────────────
    const rawAuctions: AnyObj[] = rd.auctions ?? [];
    const auctions: ClearVinAuction[] = rawAuctions.map(a => ({
      date:            a.date?.slice(0, 10) ?? a.sale_date ?? "",
      vendor:          a.vendor ?? "",
      salePrice:       typeof a.sale_price === "number" ? a.sale_price : null,
      primaryDamage:   a.primary_damage ?? "",
      secondaryDamage: a.secondary_damage ?? "",
      condition:       a.condition ?? "",
      odometer:        typeof a.odometer === "number" ? a.odometer : 0,
    }));

    // ── Recalls ────────────────────────────────────────────────────────────
    const rawRecalls: AnyObj[] = rd.recall ?? [];
    const recalls: ClearVinRecall[] = rawRecalls.map(r => ({
      component:      r.Component ?? "",
      summary:        r.Summary ?? "",
      consequence:    r.Consequence ?? "",
      remedy:         r.Remedy ?? "",
      campaignNumber: r.NHTSACampaignNumber ?? "",
      reportDate:     r.ReportReceivedDate ?? "",
    }));

    // ── Black Book valuation ───────────────────────────────────────────────
    const bb: AnyObj | null = rd.blackBook ?? null;
    const blackBook: ClearVinBlackBook | null = bb ? {
      publishDate:            bb.publish_date ?? "",
      retailClean:            toNum(bb.adjusted_retail_clean),
      retailAvg:              toNum(bb.adjusted_retail_avg),
      retailRough:            toNum(bb.adjusted_retail_rough),
      tradeinClean:           toNum(bb.adjusted_tradein_clean),
      tradeinAvg:             toNum(bb.adjusted_tradein_avg),
      tradeinRough:           toNum(bb.adjusted_tradein_rough),
      mileageAdjRetailClean:  toNum(bb.mileage_retail_clean),
      mileageAdjRetailAvg:    toNum(bb.mileage_retail_avg),
      regionalAdjRetailClean: toNum(bb.regional_retail_clean),
      regionalAdjRetailAvg:   toNum(bb.regional_retail_avg),
    } : null;

    // ── History grade ──────────────────────────────────────────────────────
    const rawRating: AnyObj | null = rd.rating ?? null;
    const historyGrade: ClearVinHistoryGrade | null = rawRating?.grade ? {
      label: rawRating.grade.label ?? "?",
      score: typeof rawRating.grade.value === "number" ? rawRating.grade.value : 0,
    } : null;

    // ── Owners ────────────────────────────────────────────────────────────
    const ownerCount = Array.isArray(rd.owners) ? rd.owners.length : 0;

    return {
      source:               "clearvin",
      reportId,
      hasProblematicBrands,
      worstBrand,
      titleBrands,
      accidentCount:        damages.length,
      damages,
      odometerRecords,
      hasOdometerRollback,
      auctionCount:         auctions.length,
      auctions,
      recallCount:          recalls.length,
      recalls,
      blackBook,
      historyGrade,
      ownerCount,
      vinChanged:           !!rd.vinChanged,
    };

  } catch (err) {
    console.error("[clearvin] fetchVehicleHistory error:", err);
    return null;
  }
}

// ── Helper ───────────────────────────────────────────────────────────────────

function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}
