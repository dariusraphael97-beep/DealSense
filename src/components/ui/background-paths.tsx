"use client";

import { memo, useMemo } from "react";

/**
 * FloatingPaths — memoized background decoration.
 *
 * Uses CSS keyframes instead of Framer Motion for the infinite animation loop.
 * This keeps the animation on the compositor thread (GPU) and avoids
 * main-thread repaints that cause flicker on Windows.
 *
 * Reduced from 36 paths to 20 for lighter GPU compositing.
 * Removed pathOffset animation (continuous stroke flow) which was the
 * primary source of SVG re-rasterization on every frame.
 */
function FloatingPathsInner({ position }: { position: number }) {
  const paths = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 9 * position} -${189 + i * 11}C-${
          380 - i * 9 * position
        } -${189 + i * 11} -${312 - i * 9 * position} ${216 - i * 11} ${
          152 - i * 9 * position
        } ${343 - i * 11}C${616 - i * 9 * position} ${470 - i * 11} ${
          684 - i * 9 * position
        } ${875 - i * 11} ${684 - i * 9 * position} ${875 - i * 11}`,
        width: 0.5 + i * 0.04,
        opacity: 0.08 + i * 0.02,
        duration: 22 + (i % 5) * 4,
      })),
    [position],
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg
        className="w-full h-full text-slate-900 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            style={{
              animation: `ds-path-pulse ${path.duration}s ease-in-out infinite`,
              /* Stagger start so paths don't all pulse in sync */
              animationDelay: `${(path.id % 7) * -3}s`,
            }}
          />
        ))}
      </svg>

      {/* CSS keyframe — opacity pulse only, no expensive stroke-dashoffset */}
      <style>{`
        @keyframes ds-path-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

export const FloatingPaths = memo(FloatingPathsInner);
