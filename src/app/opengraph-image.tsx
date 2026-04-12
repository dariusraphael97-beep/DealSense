import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DealSense — Don\u2019t overpay for your next car";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0a0a14 0%, #0c0c1e 50%, #0f0a1e 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "800px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Logo gauge icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))",
            border: "1px solid rgba(99,102,241,0.3)",
            marginBottom: "28px",
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 512 512"
            fill="none"
          >
            <defs>
              <linearGradient id="og-bg" x1="0" y1="0" x2="512" y2="512">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            <path
              d="M 135 370 A 140 140 0 1 1 377 370"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M 135 370 A 140 140 0 0 1 360 206"
              fill="none"
              stroke="white"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <line
              x1="256"
              y1="300"
              x2="339"
              y2="225"
              stroke="white"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <circle cx="256" cy="300" r="18" fill="white" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontSize: "52px",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-1px",
              lineHeight: 1.1,
            }}
          >
            DealSense
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "-0.3px",
            }}
          >
            Don&apos;t overpay for your next car.
          </div>
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "36px",
          }}
        >
          {["Deal Score", "Fair Value", "Negotiation Script"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "100px",
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.25)",
                fontSize: "16px",
                fontWeight: 600,
                color: "rgba(165,180,252,0.9)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#818cf8"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {label}
            </div>
          ))}
        </div>

        {/* Founders badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "24px",
            padding: "6px 16px",
            borderRadius: "100px",
            background: "linear-gradient(135deg, rgba(79,70,229,0.25), rgba(124,58,237,0.2))",
            border: "1px solid rgba(99,102,241,0.35)",
            fontSize: "14px",
            fontWeight: 600,
            color: "rgba(199,210,254,0.8)",
          }}
        >
          Free during early access
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            fontSize: "15px",
            fontWeight: 500,
            color: "rgba(255,255,255,0.2)",
            letterSpacing: "1px",
          }}
        >
          dealsense.space
        </div>
      </div>
    ),
    { ...size }
  );
}
