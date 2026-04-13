"use client";

import { SettingsProvider } from "@/contexts/settings-context";
import { CreditsProvider } from "@/contexts/credits-context";
import { CompareProvider } from "@/contexts/compare-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <CreditsProvider>
        <CompareProvider>{children}</CompareProvider>
      </CreditsProvider>
    </SettingsProvider>
  );
}
