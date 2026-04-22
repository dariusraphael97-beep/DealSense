export type Theme = "dark" | "light" | "system";
export type LoanTerm = 36 | 48 | 60 | 72 | 84;
export type DistanceUnit = "miles" | "km";

export interface AppSettings {
  theme: Theme;
  defaultAPR: number;           // e.g. 7.5 (%)
  defaultDownPayment: number;   // e.g. 10 (%)
  defaultLoanTerm: LoanTerm;
  distanceUnit: DistanceUnit;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  defaultAPR: 7.5,
  defaultDownPayment: 10,
  defaultLoanTerm: 60,
  distanceUnit: "miles",
};

const KEY = "dealsense_settings";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}
