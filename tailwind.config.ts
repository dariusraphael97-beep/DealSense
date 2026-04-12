import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background:  "rgb(var(--background) / <alpha-value>)",
        foreground:  "rgb(var(--foreground) / <alpha-value>)",
        card:        { DEFAULT: "rgb(var(--card) / <alpha-value>)", foreground: "rgb(var(--card-foreground) / <alpha-value>)" },
        popover:     { DEFAULT: "rgb(var(--popover) / <alpha-value>)", foreground: "rgb(var(--popover-foreground) / <alpha-value>)" },
        primary:     { DEFAULT: "rgb(var(--primary) / <alpha-value>)", foreground: "rgb(var(--primary-foreground) / <alpha-value>)" },
        secondary:   { DEFAULT: "rgb(var(--secondary) / <alpha-value>)", foreground: "rgb(var(--secondary-foreground) / <alpha-value>)" },
        muted:       { DEFAULT: "rgb(var(--muted) / <alpha-value>)", foreground: "rgb(var(--muted-foreground) / <alpha-value>)" },
        accent:      { DEFAULT: "rgb(var(--accent) / <alpha-value>)", foreground: "rgb(var(--accent-foreground) / <alpha-value>)" },
        destructive: { DEFAULT: "rgb(var(--destructive) / <alpha-value>)", foreground: "rgb(var(--destructive-foreground) / <alpha-value>)" },
        border:      "rgb(var(--border) / <alpha-value>)",
        input:       "rgb(var(--input) / <alpha-value>)",
        ring:        "rgb(var(--ring) / <alpha-value>)",
        blue: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#172554",
        },
        slate: {
          50:  "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        verdict: {
          buy:       "#059669",
          "buy-bg":  "#ECFDF5",
          "buy-border": "#6EE7B7",
          negotiate:        "#D97706",
          "negotiate-bg":   "#FFFBEB",
          "negotiate-border": "#FCD34D",
          walk:        "#DC2626",
          "walk-bg":   "#FEF2F2",
          "walk-border": "#FECACA",
        },
      },
      fontFamily: {
        heading: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        sans:    ["Inter", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card:   "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
        "card-blue": "0 0 0 2px #BFDBFE, 0 4px 12px rgba(37,99,235,0.12)",
        btn:    "0 1px 2px rgba(37,99,235,0.3), 0 0 0 1px rgba(37,99,235,0.2)",
      },
      backgroundImage: {
        "hero-grid": "linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)",
        "blue-glow":  "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(37,99,235,0.08), transparent)",
      },
      backgroundSize: {
        grid: "48px 48px",
      },
    },
  },
  plugins: [],
};

export default config;
