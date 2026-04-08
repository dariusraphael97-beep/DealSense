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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-50 dark:bg-[#030303] text-slate-800 dark:text-white/90 antialiased font-sans transition-colors duration-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
