import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CompareTrayWrapper } from "@/components/ui/compare-tray-wrapper";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

const SITE_URL = "https://dealsense.space";
const SITE_TITLE = "DealSense — Don't overpay for your next car";
const SITE_DESC =
  "Paste a VIN, get a Deal Score, fair value range, and a word-for-word negotiation script. One check can save you thousands.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "DealSense",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DealSense — Don't overpay for your next car",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "DealSense",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Web",
  "url": SITE_URL,
  "description": SITE_DESC,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "1 free analysis credit on sign up. Additional credits from $6.99.",
  },
  "featureList": [
    "VIN-based vehicle analysis",
    "Fair value range estimation",
    "Deal Score 0–100",
    "Word-for-word negotiation script",
    "Depreciation chart",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-slate-50 dark:bg-[#030303] text-slate-800 dark:text-white/90 antialiased font-sans transition-colors duration-300">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          {children}
          <CompareTrayWrapper />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
