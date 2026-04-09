import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

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

const themeScript = `
(function() {
  try {
    var settings = JSON.parse(localStorage.getItem('ds_settings') || '{}');
    var theme = settings.theme;
    var isDark = true; // default to dark
    if (theme === 'light') {
      isDark = false;
    } else if (theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
    document.documentElement.classList.add('no-transitions');
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.add('no-transitions');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="bg-slate-50 dark:bg-[#030303] text-slate-800 dark:text-white/90 antialiased font-sans"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
