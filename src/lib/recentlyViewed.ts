/**
 * Recently Viewed — localStorage helper for recently analyzed vehicles.
 * Max 5 items, deduplicated by VIN, sorted newest-first.
 */

import type { RecentlyViewedItem } from "./types";

const STORAGE_KEY = "dealsense_recently_viewed";
const MAX_ITEMS = 5;

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentlyViewedItem[];
    return parsed.sort((a, b) => b.viewedAt - a.viewedAt).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addRecentlyViewed(item: RecentlyViewedItem): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentlyViewed();
    // Remove any existing entry with the same VIN
    const filtered = existing.filter((e) => e.vin !== item.vin);
    // Add new item at the front
    const updated = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // silently fail
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently fail
  }
}
