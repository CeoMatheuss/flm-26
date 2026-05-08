import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { anton } from "../fonts";

const TEXT = "E SE O PRÓXIMO\nGUARDIOLA\nFOSSE VOCÊ?";

export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const chars = TEXT.split("");
  const flash = interpolate(frame, [80, 89], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Heartbeat pulse on background
  const pulse = Math.sin(frame * 0.35) * 0.5 + 0.5;
  const bgGlow = interpolate(pulse, [0, 1], [0.0, 0.15]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 55%, rgba(0,230,118,${bgGlow}) 0%, transparent 60%)`,
        }}
      />
      <div
        style={{
          fontFamily: anton,
          color: "#F5F5F5",
          fontSize: 130,
          lineHeight: 1.0,
          textAlign: "center",
          letterSpacing: 2,
          whiteSpace: "pre-line",
          padding: "0 60px",
          textShadow: "0 4px 30px rgba(0,0,0,0.8)",
        }}
      >
        {chars.map((c, i) => {
          const start = 8 + i * 1.2;
          const opacity = interpolate(frame, [start, start + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const blur = interpolate(frame, [start, start + 6], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          if (c === "\n") return <br key={i} />;
          const isVoce = i >= TEXT.indexOf("VOCÊ") && i < TEXT.indexOf("VOCÊ") + 4;
          return (
            <span
              key={i}
              style={{
                opacity,
                filter: `blur(${blur}px)`,
                display: "inline-block",
                color: isVoce ? "#00E676" : "#F5F5F5",
              }}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          );
        })}
      </div>
      <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: flash }} />
    </AbsoluteFill>
  );
};
