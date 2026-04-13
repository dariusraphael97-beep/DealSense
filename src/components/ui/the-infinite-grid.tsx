"use client";
import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/** Detect mobile to skip expensive continuous animation + mouse tracking */
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

export const InfiniteGridHero = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const revealRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleMouseMove = isMobile
    ? undefined
    : (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (revealRef.current) {
          revealRef.current.style.setProperty("--mx", `${x}px`);
          revealRef.current.style.setProperty("--my", `${y}px`);
        }
      };

  return (
    <div
      onMouseMove={handleMouseMove}
      className={cn("relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden")}
      style={{ background: "var(--ds-bg)" }}
    >
      {/* Static dim grid — on mobile: no continuous scroll animation */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--ds-grid-dim) 1px, transparent 1px),
            linear-gradient(to bottom, var(--ds-grid-dim) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          ...(isMobile ? {} : { animation: "gridScroll 8s linear infinite" }),
          transform: "translateZ(0)", /* GPU layer */
        }}
      />

      {/* Mouse-reveal brighter grid — desktop only */}
      {!isMobile && (
        <div
          ref={revealRef}
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--ds-grid-bright) 1px, transparent 1px),
              linear-gradient(to bottom, var(--ds-grid-bright) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            animation: "gridScroll 8s linear infinite",
            WebkitMaskImage: "radial-gradient(280px circle at var(--mx, -999px) var(--my, -999px), black, transparent)",
            maskImage: "radial-gradient(280px circle at var(--mx, -999px) var(--my, -999px), black, transparent)",
            transform: "translateZ(0)",
          }}
        />
      )}

      {/* Ambient glow orbs — on mobile: smaller blur radius */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className={cn("absolute right-[-15%] top-[-15%] w-[35%] h-[35%] rounded-full", isMobile ? "blur-[60px]" : "blur-[100px]")}
          style={{ background: "var(--ds-orb-indigo)", transform: "translateZ(0)" }} />
        <div className={cn("absolute left-[-10%] bottom-[-15%] w-[35%] h-[35%] rounded-full", isMobile ? "blur-[60px]" : "blur-[100px]")}
          style={{ background: "var(--ds-orb-blue)", transform: "translateZ(0)" }} />
      </div>

      {/* Fade bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 h-32 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to top, var(--ds-fade), transparent)` }} />

      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>

      {!isMobile && (
        <style>{`
          @keyframes gridScroll {
            0%   { background-position: 0 0; }
            100% { background-position: 40px 40px; }
          }
        `}</style>
      )}
    </div>
  );
};
