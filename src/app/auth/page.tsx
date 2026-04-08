"use client"

import { motion } from "framer-motion"
import { EtherealShadow } from "@/components/ui/etheral-shadow"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const ease = [0.25, 0.4, 0.25, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 1, delay: 0.4 + i * 0.18, ease },
  }),
}

export default function AuthLandingPage() {
  return (
    <div className="relative w-full min-h-screen bg-[#030303] overflow-hidden">

      {/* Ethereal shadow fills entire screen */}
      <EtherealShadow
        color="rgba(79, 70, 229, 1)"
        animation={{ scale: 100, speed: 90 }}
        noise={{ opacity: 0.8, scale: 1.2 }}
        sizing="fill"
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Dark vignette over the shadow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#030303]/70 via-transparent to-[#030303]/80 pointer-events-none z-10" />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 text-center">

        {/* Badge */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.10] mb-10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-xs text-white/60 tracking-widest uppercase font-medium">Used Car Intelligence</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-[1.05] mb-6"
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/75">
            Know the deal
          </span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-indigo-200 to-violet-300">
            before you buy
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          custom={2} variants={fadeUp} initial="hidden" animate="visible"
          className="text-base sm:text-lg text-white/40 max-w-md leading-relaxed font-light mb-12"
        >
          Enter a VIN or listing details. Get a Deal Score, fair value range,
          and a word-for-word negotiation script — instantly.
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={3} variants={fadeUp} initial="hidden" animate="visible"
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            href="/auth/signin"
            className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-900/40"
          >
            Get started free
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/auth/signin"
            className="px-8 py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.12] text-white/80 hover:text-white font-semibold text-sm transition-all"
          >
            Sign in
          </Link>
        </motion.div>

        {/* Trust */}
        <motion.p
          custom={4} variants={fadeUp} initial="hidden" animate="visible"
          className="mt-10 text-xs text-white/20 tracking-wide"
        >
          Free to start · No credit card required · 256-bit encryption
        </motion.p>
      </div>
    </div>
  )
}
