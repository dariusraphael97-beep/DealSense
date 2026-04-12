import { NextRequest, NextResponse } from "next/server";
import { extractFromHtml, getCachedListing, cacheListing } from "@/lib/providers";

/** Matches a 17-char VIN (excludes I, O, Q per NHTSA standard) */
const URL_VIN_RE = /\b([A-HJ-NPR-Z0-9]{17})\b/g;

// ─── SSRF protection — only allow known car-listing domains ────────────────
const ALLOWED_DOMAINS = [
  "autotrader.com",
  "cars.com",
  "cargurus.com",
  "carfax.com",
  "truecar.com",
  "edmunds.com",
  "kbb.com",
  "carmax.com",
  "vroom.com",
  "carvana.com",
  "facebook.com",
  "craigslist.org",
  "autotempest.com",
  "offerup.com",
  "capitalone.com",
  "iseecars.com",
  "autoblog.com",
  "hemmings.com",
  "bring-a-trailer.com",
  "bringatrailer.com",
  "copart.com",
  "iaai.com",
  "manheim.com",
  "dealer.com",
  "dealerinspire.com",
  "dealerclick.com",
];

function isAllowedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return ALLOWED_DOMAINS.some((d) => lower === d || lower.endsWith(`.${d}`));
}

// ─── AutoTrader: try their internal listing API for VIN/price/mileage ────────
async function tryAutoTraderApi(
  url: URL,
): Promise<{ vin?: string; price?: number; mileage?: number; zipCode?: string; title?: string } | null> {
  // Extract listingId from URL params or path
  const listingId =
    url.searchParams.get("listingId") ??
    url.pathname.match(/vehicledetails\.xhtml.*?(\d{8,12})/)?.[1] ??
    url.pathname.match(/\/(\d{8,12})(?:[/?#]|$)/)?.[1];

  if (!listingId) return null;

  try {
    // AutoTrader's public listing detail API
    const apiUrl = `https://www.autotrader.com/rest/lsc/listing/${listingId}`;
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.autotrader.com/",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const result: { vin?: string; price?: number; mileage?: number; zipCode?: string; title?: string } = {};

    // Deep search the JSON for vehicle data
    const json = JSON.stringify(data);

    // VIN
    const vinMatch = json.match(/"vin"\s*:\s*"([A-HJ-NPR-Z0-9]{17})"/i);
    if (vinMatch?.[1]) result.vin = vinMatch[1].toUpperCase();

    // Price — look for common price field names
    const priceMatch = json.match(/"(?:price|listPrice|displayPrice|askingPrice|internetPrice)"\s*:\s*"?\$?\s*([\d,]+)"?/i);
    if (priceMatch?.[1]) {
      const p = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (p > 500 && p < 500000) result.price = Math.round(p);
    }

    // Mileage
    const mileageMatch = json.match(/"(?:mileage|miles|odometer)"\s*:\s*"?\s*([\d,]+)"?/i);
    if (mileageMatch?.[1]) {
      const m = parseFloat(mileageMatch[1].replace(/,/g, ""));
      if (m > 0 && m < 1000000) result.mileage = Math.round(m);
    }

    // ZIP
    const zipMatch = json.match(/"(?:zip|zipCode|postalCode)"\s*:\s*"(\d{5})"/i);
    if (zipMatch?.[1]) result.zipCode = zipMatch[1];

    // Title
    const titleMatch = json.match(/"(?:title|heading|name)"\s*:\s*"([^"]{5,100})"/i);
    if (titleMatch?.[1]) result.title = titleMatch[1];

    if (result.vin) return result;
  } catch {
    // API not available — fall through
  }

  return null;
}

export async function POST(req: NextRequest) {
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { vin: null, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { vin: null, error: "No URL provided." },
      { status: 400 }
    );
  }

  const trimmed = url.trim();

  // ── 1. VIN embedded directly in the URL string (save as fallback) ──────
  // Don't return early — we still want to fetch the page for price/mileage/zip.
  const urlMatches = Array.from(trimmed.matchAll(URL_VIN_RE));
  const urlVin = urlMatches.length ? urlMatches[0][1].toUpperCase() : null;

  // ── 2. Validate URL before fetching ────────────────────────────────────
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return NextResponse.json(
      { vin: null, error: "Invalid URL format." },
      { status: 400 }
    );
  }

  if (parsed.protocol !== "https:") {
    return NextResponse.json(
      { vin: null, error: "Only HTTPS URLs are supported." },
      { status: 400 }
    );
  }

  if (!isAllowedHost(parsed.hostname)) {
    return NextResponse.json(
      {
        vin: null,
        error:
          "Unsupported listing site. We support major car sites like AutoTrader, Cars.com, CarGurus, etc. Please enter the VIN manually.",
      },
      { status: 400 }
    );
  }

  // ── 3. Check cache before fetching ─────────────────────────────────────
  const cached = getCachedListing(trimmed);
  if (cached) {
    if (cached.vin) {
      return NextResponse.json({
        vin: cached.vin,
        price: cached.price,
        mileage: cached.mileage,
        zipCode: cached.zipCode,
        title: cached.title,
      });
    }
    return NextResponse.json(
      {
        vin: null,
        error: "VIN not found in that listing. Please enter it manually.",
      },
      { status: 404 }
    );
  }

  // ── 4a. AutoTrader: try their listing API first (more reliable than HTML scraping)
  if (parsed.hostname.includes("autotrader")) {
    const atResult = await tryAutoTraderApi(parsed);
    if (atResult?.vin) {
      const extraction = {
        vin: atResult.vin,
        price: atResult.price ?? null,
        mileage: atResult.mileage ?? null,
        zipCode: atResult.zipCode ?? null,
        title: atResult.title ?? null,
        source: parsed.hostname,
      };
      cacheListing(trimmed, extraction);
      return NextResponse.json({
        vin: extraction.vin,
        price: extraction.price,
        mileage: extraction.mileage,
        zipCode: extraction.zipCode,
        title: extraction.title,
      });
    }
  }

  // ── 4b. Fetch the listing page and extract data ────────────────────────
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(trimmed, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      // If the page is blocked but we already found a VIN in the URL, return it
      if (urlVin) {
        return NextResponse.json({ vin: urlVin });
      }
      return NextResponse.json(
        {
          vin: null,
          error:
            "Couldn't load that listing. Please enter the VIN manually.",
        },
        { status: 502 }
      );
    }

    // Read up to 500 KB — Next.js __NEXT_DATA__ can be large on SPA sites
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      let bytes = 0;
      while (bytes < 500_000) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        html += new TextDecoder().decode(value);
        bytes += value.byteLength;
      }
      reader.cancel();
    } else {
      html = await res.text();
    }

    const extraction = extractFromHtml(html, parsed.hostname);

    // Use URL VIN as fallback if HTML extraction didn't find one
    const finalVin = extraction.vin ?? urlVin;
    const finalExtraction = { ...extraction, vin: finalVin };
    cacheListing(trimmed, finalExtraction);

    if (finalVin) {
      return NextResponse.json({
        vin: finalVin,
        price: extraction.price,
        mileage: extraction.mileage,
        zipCode: extraction.zipCode,
        title: extraction.title,
      });
    }

    return NextResponse.json(
      {
        vin: null,
        error: "VIN not found in that listing. Please enter it manually.",
      },
      { status: 404 }
    );
  } catch {
    clearTimeout(timer);
    // If the fetch failed but we already found a VIN in the URL, return it
    if (urlVin) {
      return NextResponse.json({ vin: urlVin });
    }
    return NextResponse.json(
      {
        vin: null,
        error: "Couldn't reach that page. Please enter the VIN manually.",
      },
      { status: 502 }
    );
  }
}
