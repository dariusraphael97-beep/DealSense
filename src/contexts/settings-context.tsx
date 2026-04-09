"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AppSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from "@/lib/settings";

interface SettingsCtx {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const Ctx = createContext<SettingsCtx>({ settings: DEFAULT_SETTINGS, update: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
    setMounted(true);
  }, []);

  // Apply theme — only when user CHANGES theme after mount, not on initial load
  // (the inline script in layout.tsx already set the correct class before paint)
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    const applyTheme = (dark: boolean) => {
      root.classList.toggle("dark", dark);
      root.classList.toggle("light", !dark);
    };

    // Skip the first application if the inline script already handled it
    const alreadySet = root.getAttribute("data-theme-set") === "1";
    if (alreadySet) {
      root.removeAttribute("data-theme-set");
      // Still set up system theme listener if needed
      if (settings.theme === "system") {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
      }
      return;
    }

    // Subsequent theme changes (user toggled in settings)
    if (settings.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(settings.theme === "dark");
    }
  }, [settings.theme, mounted]);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export function useSettings() {
  return useContext(Ctx);
}
