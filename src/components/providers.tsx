"use client";

import { SettingsProvider } from "@/contexts/settings-context";
import { CreditsProvider } from "@/contexts/credits-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <CreditsProvider>{children}</CreditsProvider>
    </SettingsProvider>
  );
}
