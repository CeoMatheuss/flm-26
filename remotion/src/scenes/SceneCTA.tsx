import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { anton, inter } from "../fonts";

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const pulse = Math.sin(frame * 0.3) * 0.5 + 0.5;
  const fadeOut = interpolate(frame, [70, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", justifyContent: "center", alignItems: "center", opacity: fadeOut }}>
      {/* Phone mockup */}
      <div
        style={{
          opacity: fade,
          transform: `translateY(${(1 - fade) * 30}px)`,
          width: 380,
          height: 780,
          borderRadius: 50,
          background: "linear-gradient(180deg, #1a1a1a, #0a0a0a)",
          border: "8px solid #2a2a2a",
          padding: 16,
          boxShadow: `0 0 ${60 + pulse * 40}px rgba(0,230,118,0.4)`,
          marginBottom: 60,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 36,
            background: "linear-gradient(180deg, #0a0a0a, #050505)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{ fontFamily: anton, fontSize: 100, color: "#00E676", textShadow: "0 0 20px #00E676" }}>FLM</div>
          <div style={{ fontFamily: inter, fontSize: 14, color: "#888", letterSpacing: 3, marginTop: 4 }}>TEMPORADA 2026</div>
          <div style={{ marginTop: 30, fontFamily: anton, fontSize: 32, color: "#FFB800" }}>🏆 VOCÊ É CAMPEÃO</div>
        </div>
      </div>

      <div
        style={{
          opacity: fade,
          fontFamily: anton,
          fontSize: 70,
          color: "#F5F5F5",
          letterSpacing: 4,
          textAlign: "center",
        }}
      >
        JOGUE GRÁTIS AGORA
      </div>
      <div
        style={{
          opacity: fade,
          fontFamily: inter,
          fontSize: 42,
          color: "#00E676",
          fontWeight: 900,
          marginTop: 10,
        }}
      >
        flm26.lovable.app
      </div>
      <div
        style={{
          opacity: fade,
          fontFamily: inter,
          fontSize: 28,
          color: "#888",
          letterSpacing: 4,
          marginTop: 30,
          fontWeight: 700,
        }}
      >
        #SEJAOTREINADOR
      </div>
    </AbsoluteFill>
  );
};
