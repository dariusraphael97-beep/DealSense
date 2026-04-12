"use client";

/**
 * DealSense Logo — gauge/meter icon mark + wordmark
 *
 * Variants:
 *   "icon"    — standalone icon (for favicons, small spaces)
 *   "full"    — icon + "DealSense" text (for nav bars, headers)
 *   "text"    — just the styled "DealSense" text (backwards-compatible)
 */
export function Logo({
  variant = "full",
  size = 28,
  className = "",
}: {
  variant?: "icon" | "full" | "text";
  size?: number;
  className?: string;
}) {
  const iconSize = size;
  const textSize = size * 0.75; // text height relative to icon

  const icon = (
    <svg
      viewBox="0 0 512 512"
      width={iconSize}
      height={iconSize}
      className="flex-shrink-0"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="logo-shine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {/* Background */}
      <rect width="512" height="512" rx="112" fill="url(#logo-bg)" />
      <rect width="512" height="512" rx="112" fill="url(#logo-shine)" />
      {/* Gauge track — center=(256,300) r=140, 240° sweep */}
      <path
        d="M 135 370 A 140 140 0 1 1 377 370"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="28"
        strokeLinecap="round"
      />
      {/* Gauge fill — 70%, same circle */}
      <path
        d="M 135 370 A 140 140 0 0 1 360 206"
        fill="none"
        stroke="white"
        strokeWidth="28"
        strokeLinecap="round"
      />
      {/* Needle */}
      <line
        x1="256" y1="300" x2="339" y2="225"
        stroke="white"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Hub */}
      <circle cx="256" cy="300" r="18" fill="white" />
      <circle cx="256" cy="300" r="8" fill="url(#logo-bg)" />
    </svg>
  );

  if (variant === "icon") {
    return (
      <span className={`inline-flex items-center ${className}`} aria-label="DealSense">
        {icon}
      </span>
    );
  }

  if (variant === "text") {
    return (
      <span
        className={`font-heading font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-white/70 ${className}`}
        style={{ fontSize: textSize }}
      >
        DealSense
      </span>
    );
  }

  // variant === "full"
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="DealSense">
      {icon}
      <span
        className="font-heading font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-white/70"
        style={{ fontSize: textSize }}
      >
        DealSense
      </span>
    </span>
  );
}
