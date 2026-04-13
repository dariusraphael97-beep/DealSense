"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { CompareItem } from "@/lib/types";

const STORAGE_KEY = "dealsense_compare";
const MAX_ITEMS = 4;

interface CompareContextType {
  items: CompareItem[];
  addItem: (item: CompareItem) => void;
  removeItem: (vin: string) => void;
  clearAll: () => void;
  isInCompare: (vin: string) => boolean;
  isFull: boolean;
}

const CompareContext = createContext<CompareContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  clearAll: () => {},
  isInCompare: () => false,
  isFull: false,
});

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Persist to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* ignore */ }
  }, [items]);

  const addItem = useCallback((item: CompareItem) => {
    setItems((prev) => {
      // Deduplicate by VIN
      const key = item.vin ?? `${item.year}-${item.make}-${item.model}-${item.askingPrice}`;
      const filtered = prev.filter((p) => {
        const pKey = p.vin ?? `${p.year}-${p.make}-${p.model}-${p.askingPrice}`;
        return pKey !== key;
      });
      if (filtered.length >= MAX_ITEMS) return prev; // full
      return [...filtered, item];
    });
  }, []);

  const removeItem = useCallback((vin: string) => {
    setItems((prev) => prev.filter((p) => (p.vin ?? `${p.year}-${p.make}-${p.model}`) !== vin));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  const isInCompare = useCallback(
    (vin: string) => items.some((p) => p.vin === vin),
    [items]
  );

  return (
    <CompareContext.Provider value={{ items, addItem, removeItem, clearAll, isInCompare, isFull: items.length >= MAX_ITEMS }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  return useContext(CompareContext);
}
