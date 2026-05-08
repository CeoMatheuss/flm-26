import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { anton, inter } from "../fonts";

export const SceneClimax: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 0-60: stadium reveal; 60-120: goal slow-mo; 120-180: scoreboard; 180-210: trophy raise

  const stadiumOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const stadiumZoom = interpolate(frame, [0, 210], [1, 1.25]);

  const ballX = interpolate(frame, [60, 120], [200, 850], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ballY = interpolate(frame, [60, 120], [1400, 600], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ballScale = interpolate(frame, [60, 120], [1, 0.5]);
  const goalFlash = interpolate(frame, [118, 124, 140], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const scoreOpacity = interpolate(frame, [125, 145], [0, 1], { extrapolateRight: "clamp" });
  const scoreScale = spring({ frame: frame - 125, fps, config: { damping: 8, stiffness: 100 } });

  const trophyY = interpolate(frame, [170, 210], [400, 0]);
  const trophyOpacity = interpolate(frame, [170, 190], [0, 1], { extrapolateRight: "clamp" });
  const goldenGlow = interpolate(frame, [170, 210], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden", transform: `scale(${stadiumZoom})` }}>
      {/* Stadium silhouette */}
      <AbsoluteFill style={{ opacity: stadiumOpacity }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, #001a0d 0%, #003319 40%, #00E676 60%, #003319 65%, #050505 100%)",
          }}
        />
        {/* Stadium lights */}
        {[150, 400, 680, 930].map((x, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: 200,
              width: 40,
              height: 40,
              borderRadius: 999,
              background: "#fff",
              boxShadow: "0 0 80px 20px rgba(255,255,255,0.7), 0 0 200px 60px rgba(0,230,118,0.4)",
            }}
          />
        ))}
        {/* Crowd dots */}
        <svg width="100%" height="100%" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 200 }).map((_, i) => {
            const cx = (i * 73) % 1080;
            const cy = 350 + ((i * 37) % 600);
            return <circle key={i} cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.5)" />;
          })}
        </svg>
        {/* Goal posts */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 980,
            transform: "translateX(-50%)",
            width: 600,
            height: 200,
            border: "8px solid #fff",
            borderBottom: "none",
            opacity: 0.6,
          }}
        />
      </AbsoluteFill>

      {/* Ball trajectory */}
      {frame >= 55 && frame <= 130 && (
        <>
          <div
            style={{
              position: "absolute",
              left: ballX,
              top: ballY,
              width: 60,
              height: 60,
              borderRadius: 999,
              background: "#fff",
              transform: `scale(${ballScale})`,
              boxShadow: "0 0 40px rgba(255,255,255,0.9)",
            }}
          />
          {/* Trail */}
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <line x1={200} y1={1400} x2={ballX} y2={ballY} stroke="rgba(255,255,255,0.5)" strokeWidth="6" strokeDasharray="20 10" />
          </svg>
        </>
      )}

      {/* Goal flash */}
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 35%, rgba(0,230,118,0.9), transparent 60%)", opacity: goalFlash }} />

      {/* Scoreboard */}
      {frame >= 125 && (
        <div
          style={{
            position: "absolute",
            top: 1300,
            left: "50%",
            transform: `translateX(-50%) scale(${scoreScale})`,
            opacity: scoreOpacity,
            padding: "40px 80px",
            background: "rgba(0,0,0,0.92)",
            border: "4px solid #00E676",
            borderRadius: 20,
            textAlign: "center",
            boxShadow: "0 0 80px rgba(0,230,118,0.6)",
          }}
        >
          <div style={{ fontFamily: anton, fontSize: 60, color: "#fff", letterSpacing: 6 }}>VOCÊ</div>
          <div style={{ fontFamily: anton, fontSize: 200, color: "#00E676", lineHeight: 1, margin: "10px 0" }}>3 - 0</div>
          <div style={{ fontFamily: inter, fontSize: 32, color: "#888", letterSpacing: 4, fontWeight: 700 }}>RIVAL · 90'</div>
        </div>
      )}

      {/* Trophy raise */}
      {frame >= 170 && (
        <AbsoluteFill style={{ opacity: trophyOpacity, justifyContent: "flex-end" }}>
          <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 60%, rgba(255,184,0,${0.7 * goldenGlow}) 0%, transparent 60%)` }} />
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              transform: `translate(-50%, ${trophyY}px)`,
              width: 280,
            }}
          >
            <svg viewBox="0 0 200 400" width="100%">
              {/* Cup */}
              <path d="M50,40 L150,40 L140,180 Q100,210 60,180 Z" fill="#FFB800" stroke="#fff8d0" strokeWidth="3" />
              <ellipse cx="100" cy="40" rx="50" ry="10" fill="#FFD54A" />
              {/* Handles */}
              <path d="M50,60 Q15,80 25,140" fill="none" stroke="#FFB800" strokeWidth="10" />
              <path d="M150,60 Q185,80 175,140" fill="none" stroke="#FFB800" strokeWidth="10" />
              {/* Stem + base */}
              <rect x="90" y="200" width="20" height="50" fill="#FFB800" />
              <rect x="60" y="250" width="80" height="20" fill="#FFB800" />
              {/* Arms holding (silhouette) */}
              <path d="M70,260 L40,400 L60,400 L100,280 L140,400 L160,400 L130,260 Z" fill="#000" />
            </svg>
          </div>
          {/* Confetti */}
          {Array.from({ length: 40 }).map((_, i) => {
            const x = (i * 53) % 1080;
            const fall = ((frame - 180) * 8 + i * 17) % 1500;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: fall,
                  width: 10,
                  height: 18,
                  background: i % 2 === 0 ? "#FFB800" : "#00E676",
                  transform: `rotate(${fall}deg)`,
                  opacity: 0.9,
                }}
              />
            );
          })}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
