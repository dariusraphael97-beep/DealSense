"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { UserNav } from "@/components/ui/user-nav";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.5, ease } },
};

export default function PrivacyPage() {
  const lastUpdated = "April 27, 2026";

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: "var(--ds-bg)" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: "var(--ds-nav-bg)",
          borderBottom: "1px solid var(--ds-nav-border)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center"><Logo variant="full" size={28} /></Link>
          <div className="flex items-center gap-3">
            <Link href="/analyze"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                boxShadow: "0 0 20px var(--ds-accent-glow), 0 4px 12px var(--ds-shadow-heavy)",
              }}
            >
              Check a Deal
            </Link>
            <UserNav />
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <motion.div initial="hidden" animate="show" variants={fadeUp}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: "var(--ds-text-3)" }}>
            Legal — Privacy Policy
          </p>
          <h1
            className="font-bold mb-3"
            style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.25rem)", lineHeight: 1.1, letterSpacing: "-0.025em", color: "var(--ds-text-1)" }}
          >
            Privacy Policy
          </h1>
          <p className="text-xs" style={{ color: "var(--ds-text-4)" }}>
            Last updated: {lastUpdated}
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ delay: 0.05 }}
          className="mt-10 space-y-10"
          style={{ color: "var(--ds-text-2)", lineHeight: 1.7, fontSize: 15 }}
        >
          <section>
            <p>
              This Privacy Policy describes how DealSense (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
              collects, uses, and shares information when you use our service. We aim to collect
              only what we need to operate the product and to be transparent about how it&rsquo;s
              handled.
            </p>
          </section>

          <Section number="01" title="What We Collect">
            <p>
              <strong style={{ color: "var(--ds-text-1)" }}>Account info.</strong> Email address and
              authentication identifiers when you sign up. Passwords are stored only as salted
              hashes by our auth provider (Supabase).
            </p>
            <p className="mt-3">
              <strong style={{ color: "var(--ds-text-1)" }}>Vehicle queries.</strong> The VIN,
              listing URL, asking price, mileage, and ZIP code you submit for analysis, plus the
              resulting report. We retain this so you can revisit prior reports.
            </p>
            <p className="mt-3">
              <strong style={{ color: "var(--ds-text-1)" }}>Payment info.</strong> Stripe handles
              all card data. We never see or store your full card number; we receive only Stripe
              identifiers, the last four digits, and transaction status.
            </p>
            <p className="mt-3">
              <strong style={{ color: "var(--ds-text-1)" }}>Usage data.</strong> Standard server
              logs (IP address, user agent, timestamps) and product analytics about how features
              are used. We do not sell this data.
            </p>
          </Section>

          <Section number="02" title="How We Use It">
            <ul className="list-disc pl-5 space-y-2">
              <li>To generate and deliver your reports.</li>
              <li>To bill you for credits and prevent fraud.</li>
              <li>To improve the product (debugging, scoring accuracy, UX).</li>
              <li>To send transactional emails (receipts, account notices). Marketing email is opt-in.</li>
            </ul>
          </Section>

          <Section number="03" title="Third-Party Data Provider">
            <p>
              To produce a report we send the VIN you submit (and, where applicable, the ZIP and
              mileage) to <strong style={{ color: "var(--ds-text-1)" }}>ClearVin</strong>, our
              vehicle data and history provider. ClearVin processes the VIN under its own privacy
              terms in order to return market and history data. We do not share your name, email,
              or payment data with ClearVin.
            </p>
          </Section>

          <Section number="04" title="Service Providers We Use">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong style={{ color: "var(--ds-text-1)" }}>Supabase</strong> — auth, database, storage.</li>
              <li><strong style={{ color: "var(--ds-text-1)" }}>Stripe</strong> — payments and billing.</li>
              <li><strong style={{ color: "var(--ds-text-1)" }}>Vercel</strong> — application hosting and edge delivery.</li>
            </ul>
          </Section>

          <Section number="05" title="Cookies">
            <p>
              We use a small number of first-party cookies for authentication and session state.
              We do not use third-party advertising cookies.
            </p>
          </Section>

          <Section number="06" title="Your Choices">
            <p>
              You can request a copy or deletion of your account data at any time by emailing{" "}
              <a href="mailto:privacy@dealsense.app" style={{ color: "var(--ds-accent-text)" }} className="underline underline-offset-2">
                privacy@dealsense.app
              </a>
              . We will respond within 30 days. Note that we may need to retain certain records
              (e.g., transaction logs) to meet our legal and accounting obligations.
            </p>
          </Section>

          <Section number="07" title="Security">
            <p>
              We use HTTPS everywhere, encrypt data at rest in our database, and follow the
              principle of least privilege for internal access. No system is perfectly secure — if
              you discover a vulnerability, please report it to{" "}
              <a href="mailto:security@dealsense.app" style={{ color: "var(--ds-accent-text)" }} className="underline underline-offset-2">
                security@dealsense.app
              </a>
              .
            </p>
          </Section>

          <Section number="08" title="Children">
            <p>
              DealSense is not directed to children under 13, and we do not knowingly collect
              personal information from children.
            </p>
          </Section>

          <Section number="09" title="Changes">
            <p>
              We may update this Policy. Material changes will be announced in the app or by email.
              Continued use after a change indicates acceptance.
            </p>
          </Section>

          <Section number="10" title="Contact">
            <p>
              Questions? Reach us at{" "}
              <a href="mailto:privacy@dealsense.app" style={{ color: "var(--ds-accent-text)" }} className="underline underline-offset-2">
                privacy@dealsense.app
              </a>
              .
            </p>
          </Section>
        </motion.div>

        <div className="mt-16 pt-8" style={{ borderTop: "1px solid var(--ds-divider)" }}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm transition-colors"
            style={{ color: "var(--ds-text-3)" }}
          >
            <span aria-hidden>←</span> Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <span
          className="text-xs font-semibold tracking-[0.12em]"
          style={{ color: "var(--ds-text-4)" }}
        >
          {number}
        </span>
        <h2
          className="font-bold"
          style={{ fontSize: "clamp(1.15rem, 2vw, 1.4rem)", letterSpacing: "-0.015em", color: "var(--ds-text-1)" }}
        >
          {title}
        </h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
