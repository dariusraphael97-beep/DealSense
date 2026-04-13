"use client";

import { memo, useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";

/** Detect mobile to reduce path count and animation complexity */
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

/**
 * FloatingPaths — memoized background decoration.
 * Path data is computed once and cached. React.memo prevents re-renders.
 * On mobile: renders 10 static paths (no animation) instead of 36 animated.
 */
function FloatingPathsInner({ position }: { position: number }) {
  const isMobile = useIsMobile();
  const pathCount = isMobile ? 10 : 36;

  const paths = useMemo(
    () =>
      Array.from({ length: pathCount }, (_, i) => {
        // When on mobile with fewer paths, space them out (use every ~3.6th index)
        const idx = isMobile ? Math.round(i * 3.6) : i;
        return {
          id: i,
          d: `M-${380 - idx * 5 * position} -${189 + idx * 6}C-${
            380 - idx * 5 * position
          } -${189 + idx * 6} -${312 - idx * 5 * position} ${216 - idx * 6} ${
            152 - idx * 5 * position
          } ${343 - idx * 6}C${616 - idx * 5 * position} ${470 - idx * 6} ${
            684 - idx * 5 * position
          } ${875 - idx * 6} ${684 - idx * 5 * position} ${875 - idx * 6}`,
          width: 0.5 + idx * 0.03,
          opacity: 0.08 + idx * 0.018,
          duration: 20 + (idx % 7) * 3,
        };
      }),
    [position, pathCount, isMobile]
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg
        className="w-full h-full text-slate-900 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        style={{ transform: "translateZ(0)" }} /* GPU layer */
      >
        <title>Background Paths</title>
        {paths.map((path) =>
          isMobile ? (
            /* Static paths on mobile — no framer-motion overhead */
            <path
              key={path.id}
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              strokeOpacity={path.opacity * 0.7}
            />
          ) : (
            <motion.path
              key={path.id}
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              strokeOpacity={path.opacity}
              initial={{ pathLength: 0.3, opacity: 0.6 }}
              animate={{
                pathLength: 1,
                opacity: [0.3, 0.6, 0.3],
                pathOffset: [0, 1, 0],
              }}
              transition={{
                duration: path.duration,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
          )
        )}
      </svg>
    </div>
  );
}

export const FloatingPaths = memo(FloatingPathsInner);
