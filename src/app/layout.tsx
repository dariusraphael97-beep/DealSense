import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "DealSense — Is this car worth it?",
  description:
    "Instantly score any used-car listing. Get a Deal Score, fair value estimate, and a negotiation script in seconds.",
  openGraph: {
    title: "DealSense — Is this car worth it?",
    description:
      "Instantly score any used-car listing. Get a Deal Score, fair value estimate, and a negotiation script in seconds.",
  },
};

/* Inline script that runs BEFORE first paint — sets dark/light class immediately.
   This prevents Flash of Unstyled Content (FOUC) on Windows and all platforms. */
const themeScript = `
(function() {
  try {
    var d = document.documentElement;
    var s = JSON.parse(localStorage.getItem('ds_settings') || '{}');
    var t = s.theme;
    var dark = true;
    if (t === 'light') dark = false;
    else if (t === 'system') dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    d.classList.add(dark ? 'dark' : 'light');
    d.setAttribute('data-theme-set', '1');
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme-set', '1');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="bg-slate-50 dark:bg-[#030303] text-slate-800 dark:text-white/90 antialiased font-sans"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
