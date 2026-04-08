"use client";
import React, { useRef } from "react";
import { cn } from "@/lib/utils";

export const InfiniteGridHero = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const revealRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
      {/* Static dim grid */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--ds-grid-dim) 1px, transparent 1px),
            linear-gradient(to bottom, var(--ds-grid-dim) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          animation: "gridScroll 8s linear infinite",
        }}
      />

      {/* Mouse-reveal brighter grid */}
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
        }}
      />

      {/* Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute right-[-15%] top-[-15%] w-[35%] h-[35%] rounded-full blur-[100px]"
          style={{ background: "var(--ds-orb-indigo)" }} />
        <div className="absolute left-[-10%] bottom-[-15%] w-[35%] h-[35%] rounded-full blur-[100px]"
          style={{ background: "var(--ds-orb-blue)" }} />
      </div>

      {/* Fade bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 h-32 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to top, var(--ds-fade), transparent)` }} />

      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>

      <style>{`
        @keyframes gridScroll {
          0%   { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
      `}</style>
    </div>
  );
};
