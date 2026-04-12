import type { StickerResult } from "@/lib/types";
import { stickerCache, STICKER_CACHE_TTL } from "@/lib/cache";

/**
 * Check if a window sticker is available for a VIN.
 *
 * Currently scaffolded — returns { available: false } for all VINs.
 * When a sticker provider API is integrated (e.g., DataOne, VinAudit sticker),
 * this function will make the actual API call.
 */
export async function checkStickerAvailability(vin: string): Promise<StickerResult> {
  const cleaned = vin.trim().toUpperCase();

  // Check cache
  const cached = stickerCache.get<StickerResult>(cleaned);
  if (cached) return cached;

  // ── Future integration point ──
  // When a sticker API is available, the call goes here:
  //
  // try {
  //   const res = await fetch(`https://api.vinaudit.com/sticker?vin=${cleaned}&key=${API_KEY}`);
  //   const data = await res.json();
  //   if (data.url) {
  //     const result: StickerResult = { available: true, url: data.url, provider: "vinaudit" };
  //     stickerCache.set(cleaned, result, STICKER_CACHE_TTL);
  //     return result;
  //   }
  // } catch { /* fallthrough */ }

  const result: StickerResult = { available: false };
  stickerCache.set(cleaned, result, STICKER_CACHE_TTL);
  return result;
}
