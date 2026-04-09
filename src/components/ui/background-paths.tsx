"use client";

/**
 * FloatingPaths — lightweight background decoration.
 * Uses CSS animations instead of framer-motion to avoid
 * 72+ concurrent JS-driven animations that stall Windows GPUs.
 * Reduced from 36 paths to 12 for performance.
 */
export function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 15 * position} -${189 + i * 18}C-${
      380 - i * 15 * position
    } -${189 + i * 18} -${312 - i * 15 * position} ${216 - i * 18} ${
      152 - i * 15 * position
    } ${343 - i * 18}C${616 - i * 15 * position} ${470 - i * 18} ${
      684 - i * 15 * position
    } ${875 - i * 18} ${684 - i * 15 * position} ${875 - i * 18}`,
    width: 0.5 + i * 0.08,
    opacity: 0.04 + i * 0.025,
    duration: 25 + (i % 5) * 5,
  }));

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
            strokeDasharray="8 4"
            style={{
              animation: `floatPath ${path.duration}s linear infinite`,
              animationDelay: `${-path.id * 2}s`,
            }}
          />
        ))}
      </svg>

      <style>{`
        @keyframes floatPath {
          0% { stroke-dashoffset: 0; opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { stroke-dashoffset: -100; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
