import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { anton, inter } from "../fonts";

export const SceneAscensao: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Tunnel effect: silhouette walking forward
  const z = interpolate(frame, [0, 150], [0.6, 1.4]);
  const tunnelOpacity = interpolate(frame, [0, 20, 130, 150], [0, 1, 1, 0]);
  const cardSpring = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      {/* Tunnel light */}
      <AbsoluteFill
        style={{
          opacity: tunnelOpacity,
          background:
            "radial-gradient(ellipse 40% 50% at 50% 45%, rgba(255,184,0,0.45) 0%, rgba(0,230,118,0.15) 30%, transparent 70%)",
          transform: `scale(${z})`,
        }}
      />
      {/* Tunnel walls (perspective lines) */}
      <svg width="100%" height="100%" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={i}
            x1={i * 216}
            y1={1920}
            x2={540}
            y2={860}
            stroke="rgba(0,230,118,0.25)"
            strokeWidth={2}
          />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={"r" + i}
            x1={1080 - i * 216}
            y1={1920}
            x2={540}
            y2={860}
            stroke="rgba(0,230,118,0.25)"
            strokeWidth={2}
          />
        ))}
      </svg>
      {/* Silhouette */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          transform: `translateX(-50%) scale(${interpolate(frame, [0, 150], [0.85, 1.15])})`,
          width: 380,
          height: 900,
        }}
      >
        <svg viewBox="0 0 200 460" width="100%" height="100%">
          {/* Head */}
          <ellipse cx="100" cy="60" rx="42" ry="50" fill="#000" />
          {/* Shoulders + body */}
          <path d="M30,200 Q100,140 170,200 L180,460 L20,460 Z" fill="#000" />
          {/* Coat highlight */}
          <path d="M95,140 L105,460 L95,460 Z" fill="#0a0a0a" />
        </svg>
      </div>

      {/* Floating UI cards */}
      {[
        { label: "ELENCO", value: "32", x: 80, y: 380, delay: 0 },
        { label: "ORÇAMENTO", value: "R$ 12M", x: 620, y: 480, delay: 8 },
        { label: "OVR MÉDIO", value: "78", x: 120, y: 1280, delay: 16 },
        { label: "TÁTICA", value: "4-3-3", x: 640, y: 1380, delay: 24 },
      ].map((c, i) => {
        const s = spring({ frame: frame - 35 - c.delay, fps, config: { damping: 14, stiffness: 90 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: c.x,
              top: c.y,
              opacity: s,
              transform: `translateY(${(1 - s) * 30}px) perspective(800px) rotateY(${interpolate(s, [0, 1], [-15, 0])}deg)`,
              padding: "16px 22px",
              background: "rgba(10,10,10,0.85)",
              border: "1px solid rgba(0,230,118,0.4)",
              borderRadius: 14,
              boxShadow: "0 0 40px rgba(0,230,118,0.25)",
              backdropFilter: "blur(0px)",
            }}
          >
            <div style={{ fontFamily: inter, fontSize: 18, color: "#888", letterSpacing: 2, fontWeight: 700 }}>{c.label}</div>
            <div style={{ fontFamily: anton, fontSize: 56, color: "#00E676", lineHeight: 1 }}>{c.value}</div>
          </div>
        );
      })}

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          bottom: 140,
          width: "100%",
          textAlign: "center",
          fontFamily: anton,
          fontSize: 70,
          color: "#FFB800",
          letterSpacing: 3,
          opacity: interpolate(frame, [60, 90, 130, 150], [0, 1, 1, 0]),
          textShadow: "0 0 30px rgba(255,184,0,0.6)",
        }}
      >
        UM SÓ CÉREBRO.
      </div>
    </AbsoluteFill>
  );
};
