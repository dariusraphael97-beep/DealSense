"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Detect mobile to simplify animations */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
  isMobile = false,
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
  isMobile?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
      style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
    >
      <motion.div
        /* On mobile: no infinite float — just static position after entry */
        animate={isMobile ? undefined : { y: [0, 15, 0] }}
        transition={isMobile ? undefined : { duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ width, height, transform: "translateZ(0)" }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            /* On mobile: skip backdrop-blur (compositing-heavy) */
            isMobile ? "" : "backdrop-blur-[2px]",
            "border-2 border-white/[0.15]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

export function HeroGeometric({
  badge,
  title1,
  title2,
  children,
}: {
  badge?: string;
  title1?: string;
  title2?: string;
  children?: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const fadeEase = [0.25, 0.4, 0.25, 1] as const;
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: fadeEase,
      },
    }),
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#030303]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.05] via-transparent to-indigo-500/[0.05] blur-3xl" />

      {/* Floating shapes — on mobile: only render 3 shapes (skip 2 smallest) */}
      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-blue-500/[0.15]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
          isMobile={isMobile}
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-indigo-500/[0.15]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
          isMobile={isMobile}
        />
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-violet-500/[0.15]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
          isMobile={isMobile}
        />
        {!isMobile && (
          <>
            <ElegantShape
              delay={0.6}
              width={200}
              height={60}
              rotate={20}
              gradient="from-blue-400/[0.15]"
              className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
            />
            <ElegantShape
              delay={0.7}
              width={150}
              height={40}
              rotate={-25}
              gradient="from-cyan-500/[0.15]"
              className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
            />
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          {badge && (
            <motion.div
              custom={0}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8 md:mb-12"
            >
              <Circle className="h-2 w-2 fill-blue-400/80" />
              <span className="text-sm text-white/60 tracking-wide">{badge}</span>
            </motion.div>
          )}

          {(title1 || title2) && (
            <motion.div
              custom={1}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
            >
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-6 md:mb-8 tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                  {title1}
                </span>
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-white/90 to-indigo-300">
                  {title2}
                </span>
              </h1>
            </motion.div>
          )}

          {children && (
            <motion.div
              custom={3}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
            >
              {children}
            </motion.div>
          )}
        </div>
      </div>

      {/* Top + bottom fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/80 pointer-events-none" />
    </div>
  );
}
