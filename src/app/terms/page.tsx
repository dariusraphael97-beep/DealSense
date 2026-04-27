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

export default function TermsPage() {
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
            Legal — Terms of Service
          </p>
          <h1
            className="font-bold mb-3"
            style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.25rem)", lineHeight: 1.1, letterSpacing: "-0.025em", color: "var(--ds-text-1)" }}
          >
            Terms of Service
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
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of DealSense
              (&ldquo;DealSense&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), a
              vehicle deal-analysis service that combines third-party market data with vehicle
              history information to help you evaluate used-car listings. By creating an account,
              purchasing credits, or otherwise using the service, you agree to be bound by these
              Terms.
            </p>
          </section>

          <Section number="01" title="The Service">
            <p>
              DealSense provides a deal score, price-context analysis, and a negotiation script for
              used vehicles you submit. Vehicle history reports and underlying vehicle data are
              prepared and licensed by ClearVin (&ldquo;ClearVin&rdquo;). Estimates are
              informational only and are not financial, legal, or mechanical advice.
            </p>
          </Section>

          <Section number="02" title="Internal Use Only">
            <p>
              Vehicle history reports and any data delivered through DealSense — including
              ClearVin-sourced reports — are licensed to{" "}
              <strong style={{ color: "var(--ds-text-1)" }}>you for your personal, internal use only</strong>.
              You may not resell, sublicense, redistribute, repackage, publicly post, or otherwise
              make any report or its contents available to third parties, whether for compensation
              or free of charge. The information in a report must be used only to evaluate the
              specific vehicle to which it relates, and may not be modified, edited, abridged, or
              combined with other data in a way that misrepresents the underlying source data.
            </p>
          </Section>

          <Section number="03" title="Limitation of Liability &amp; Release">
            <p>
              You acknowledge that DealSense, ClearVin, and our other data providers source
              information from public records, registries, and commercial datasets that may be
              incomplete, delayed, or inaccurate. Reports may not reflect every event in a
              vehicle&rsquo;s history.
            </p>
            <p className="mt-3">
              <strong style={{ color: "var(--ds-text-1)" }}>You use the service at your own risk.</strong>{" "}
              To the fullest extent permitted by law, you release, waive, and discharge DealSense,
              ClearVin, and our respective officers, employees, agents, affiliates, licensors, and
              suppliers from any and all claims, demands, damages, losses, costs, expenses, and
              liabilities arising out of or relating to (a) your use of, or reliance on, any report
              or estimate; (b) any decision to purchase, decline to purchase, finance, sell, or
              repair a vehicle; or (c) any inaccuracy, omission, or delay in the underlying data.
              You agree to indemnify and hold harmless DealSense and ClearVin from any third-party
              claim arising out of your misuse of a report or breach of these Terms.
            </p>
            <p className="mt-3">
              Nothing in these Terms limits liability for fraud, gross negligence, or any other
              liability that cannot be excluded under applicable law.
            </p>
          </Section>

          <Section number="04" title="Intellectual Property">
            <p>
              <strong style={{ color: "var(--ds-text-1)" }}>ClearVin owns all right, title, and interest</strong>{" "}
              in and to its vehicle history reports and the underlying services, including all
              copyrights, trademarks, service marks, trade dress, patents, trade secrets, and other
              intellectual property rights embodied therein. Reports are licensed to you, not sold,
              and no rights in ClearVin&rsquo;s intellectual property are transferred to you. The
              DealSense product, its visual design, code, scoring logic, and brand assets are owned
              by DealSense and protected by intellectual property laws. You may not copy, reverse
              engineer, scrape, or create derivative works from the service except as expressly
              permitted in these Terms.
            </p>
          </Section>

          <Section number="05" title="Accounts &amp; Acceptable Use">
            <p>
              You are responsible for the accuracy of the information you provide, for safeguarding
              your credentials, and for all activity under your account. You agree not to (a) use
              the service for any unlawful purpose; (b) attempt to access reports for vehicles you
              do not have a legitimate interest in evaluating; (c) submit a VIN for resale of the
              report; (d) interfere with the service&rsquo;s operation or security; or (e) use
              automated means to extract data from the service.
            </p>
          </Section>

          <Section number="06" title="Payments, Credits &amp; Refunds">
            <p>
              Reports are sold as one-time credits or bundles. Pricing is shown at checkout and
              processed by Stripe. Because each report is a digital good delivered immediately and
              sourced from third-party providers we pay per request, all sales are final and{" "}
              <strong style={{ color: "var(--ds-text-1)" }}>non-refundable</strong> once a report
              has been generated. If a report fails to generate due to a service-side error, we
              will re-issue the credit or refund at our discretion. Contact{" "}
              <a href="mailto:support@dealsense.app" style={{ color: "var(--ds-accent-text)" }} className="underline underline-offset-2">
                support@dealsense.app
              </a>{" "}
              within 7 days for any billing issue.
            </p>
          </Section>

          <Section number="07" title="NMVTIS Disclosure">
            <p>
              Vehicle history reports delivered through DealSense are <em>not</em> NMVTIS Vehicle
              History Reports and are not approved by the U.S. Department of Justice. To obtain an
              official NMVTIS report, visit{" "}
              <a
                href="https://vehiclehistory.bja.ojp.gov"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--ds-accent-text)" }}
                className="underline underline-offset-2"
              >
                vehiclehistory.bja.ojp.gov
              </a>
              .
            </p>
          </Section>

          <Section number="08" title="Termination">
            <p>
              We may suspend or terminate your access at any time if you breach these Terms, attempt
              to defraud us or our providers, or use the service in a way that exposes us or
              ClearVin to liability. Sections 02, 03, 04, and 09 survive termination.
            </p>
          </Section>

          <Section number="09" title="Governing Law">
            <p>
              These Terms are governed by the laws of the State of New Jersey, without regard to its
              conflict-of-law principles. Any dispute arising out of these Terms or the service
              will be resolved in the state or federal courts located in New Jersey, and you consent
              to the personal jurisdiction of those courts.
            </p>
          </Section>

          <Section number="10" title="Changes">
            <p>
              We may update these Terms from time to time. Material changes will be announced in the
              app or by email. Continued use after a change constitutes acceptance of the updated
              Terms.
            </p>
          </Section>

          <Section number="11" title="Contact">
            <p>
              Questions? Reach us at{" "}
              <a href="mailto:support@dealsense.app" style={{ color: "var(--ds-accent-text)" }} className="underline underline-offset-2">
                support@dealsense.app
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
