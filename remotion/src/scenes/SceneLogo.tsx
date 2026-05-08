import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { anton, inter } from "../fonts";

export const SceneLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 80 } });
  const tagOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" });
  const sweep = interpolate(frame, [0, 50], [-1.2, 1.2], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
      {/* Light sweep behind */}
      <div
        style={{
          position: "absolute",
          width: "180%",
          height: 220,
          background: "linear-gradient(90deg, transparent 0%, rgba(255,184,0,0.5) 45%, rgba(0,230,118,0.6) 55%, transparent 100%)",
          transform: `translateX(${sweep * 100}%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Particles */}
      {Array.from({ length: 60 }).map((_, i) => {
        const angle = (i / 60) * Math.PI * 2;
        const dist = interpolate(frame, [0, 50], [600, 0], { extrapolateRight: "clamp" });
        const opacity = interpolate(frame, [0, 30, 50], [0, 1, 0.6]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540 + Math.cos(angle) * dist,
              top: 960 + Math.sin(angle) * dist,
              width: 6,
              height: 6,
              borderRadius: 999,
              background: i % 2 === 0 ? "#FFB800" : "#00E676",
              boxShadow: "0 0 10px currentColor",
              opacity,
            }}
          />
        );
      })}

      {/* Logo */}
      <div
        style={{
          opacity: logoSpring,
          transform: `scale(${interpolate(logoSpring, [0, 1], [0.5, 1])})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: anton,
            fontSize: 360,
            color: "#F5F5F5",
            lineHeight: 0.9,
            letterSpacing: 8,
            textShadow: "0 0 60px rgba(0,230,118,0.6), 0 0 120px rgba(255,184,0,0.4)",
          }}
        >
          FLM
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 38,
            color: "#FFB800",
            letterSpacing: 8,
            fontWeight: 900,
            marginTop: 10,
          }}
        >
          FOOTBALL LIFE MANAGER
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 80,
          opacity: tagOpacity,
          fontFamily: anton,
          fontSize: 90,
          color: "#00E676",
          letterSpacing: 4,
          textAlign: "center",
          textShadow: "0 0 40px rgba(0,230,118,0.8)",
          padding: "0 60px",
          lineHeight: 1.0,
        }}
      >
        VOCÊ NÃO JOGA.<br />VOCÊ COMANDA.
      </div>
    </AbsoluteFill>
  );
};
