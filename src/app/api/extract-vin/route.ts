import { NextRequest, NextResponse } from "next/server";

/** Matches a 17-char VIN (excludes I, O, Q per NHTSA standard) */
const VIN_RE = /\b([A-HJ-NPR-Z0-9]{17})\b/g;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ vin: null, error: "No URL provided." });
    }

    const trimmed = url.trim();

    // ── 1. VIN embedded directly in the URL ───────────────────────────────
    const urlMatches = [...trimmed.matchAll(VIN_RE)];
    if (urlMatches.length) {
      return NextResponse.json({ vin: urlMatches[0][1].toUpperCase() });
    }

    // ── 2. Fetch the listing page and scan HTML ────────────────────────────
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(trimmed, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        return NextResponse.json({
          vin: null,
          error: "Couldn't load that listing. Please enter the VIN manually.",
        });
      }

      // Only read first 200 KB — VIN will be near the top of any listing page
      const reader = res.body?.getReader();
      let html = "";
      if (reader) {
        let bytes = 0;
        while (bytes < 200_000) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          html += new TextDecoder().decode(value);
          bytes += value.byteLength;
        }
        reader.cancel();
      } else {
        html = await res.text();
      }

      // Ordered from most specific to most general
      const patterns: RegExp[] = [
        /["']vin["']\s*:\s*["']([A-HJ-NPR-Z0-9]{17})["']/i,
        /data-vin=["']([A-HJ-NPR-Z0-9]{17})["']/i,
        /vin=([A-HJ-NPR-Z0-9]{17})/i,
        /\bvin\b[^A-Z0-9]{1,10}([A-HJ-NPR-Z0-9]{17})/i,
        /vehicle.{1,30}identification.{1,30}([A-HJ-NPR-Z0-9]{17})/i,
      ];

      for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1]) {
          return NextResponse.json({ vin: m[1].toUpperCase() });
        }
      }

      return NextResponse.json({
        vin: null,
        error: "VIN not found in that listing. Please enter it manually.",
      });
    } catch {
      clearTimeout(timer);
      return NextResponse.json({
        vin: null,
        error: "Couldn't reach that page. Please enter the VIN manually.",
      });
    }
  } catch {
    return NextResponse.json({ vin: null, error: "Invalid request." });
  }
}
