import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Sequence, spring, useVideoConfig } from "remotion";
import { anton, inter } from "../fonts";

// 7 quick takes, each ~30 frames (1s)
const SHOT_LEN = 30;

const Shot: React.FC<{ children: React.ReactNode; index: number }> = ({ children, index }) => {
  const frame = useCurrentFrame();
  const local = frame - index * SHOT_LEN;
  // overlap window so cross-fades blend without black gaps
  if (local < -6 || local > SHOT_LEN + 6) return null;
  const opacity = interpolate(local, [-6, 4, SHOT_LEN - 4, SHOT_LEN + 6], [0, 1, 1, 0]);
  const scale = interpolate(local, [0, SHOT_LEN], [1.05, 1.15]);
  const blur = interpolate(local, [-6, 4, SHOT_LEN - 4, SHOT_LEN + 6], [12, 0, 0, 10]);
  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})`, filter: `blur(${blur}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

const TacticalPitch: React.FC = () => {
  const frame = useCurrentFrame();
  const dotX = interpolate(frame, [0, 30], [200, 800]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d2818", padding: 60, justifyContent: "center" }}>
      <svg viewBox="0 0 1000 1500" width="100%" height="100%">
        <rect x="20" y="20" width="960" height="1460" fill="none" stroke="#00E676" strokeWidth="6" />
        <line x1="20" y1="750" x2="980" y2="750" stroke="#00E676" strokeWidth="4" />
        <circle cx="500" cy="750" r="120" fill="none" stroke="#00E676" strokeWidth="4" />
        {/* Players */}
        {[[200, 1300], [500, 1300], [800, 1300], [300, 1000], [500, 1000], [700, 1000], [400, 600], [600, 600]].map(
          ([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="36" fill="#F5F5F5" stroke="#00E676" strokeWidth="4" />
          ),
        )}
        {/* Dragging player */}
        <circle cx={dotX} cy={400} r="42" fill="#FFB800" stroke="#fff" strokeWidth="5" />
        <circle cx={dotX} cy={400} r="80" fill="none" stroke="#FFB800" strokeWidth="3" opacity="0.5" />
      </svg>
      <Label text="TÁTICA AO VIVO" />
    </AbsoluteFill>
  );
};

const BudgetCounter: React.FC = () => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [0, 28], [1.2, 87.5], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#080808", justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: inter, color: "#888", letterSpacing: 6, fontSize: 32, fontWeight: 700 }}>ORÇAMENTO</div>
      <div style={{ fontFamily: anton, fontSize: 320, color: "#00E676", lineHeight: 1, textShadow: "0 0 60px rgba(0,230,118,0.6)" }}>
        R$ {v.toFixed(1)}M
      </div>
      <div style={{ fontFamily: inter, color: "#FFB800", fontSize: 38, marginTop: 20, fontWeight: 900 }}>
        ▲ +{(v - 1.2).toFixed(1)}M
      </div>
      <Label text="MERCADO" />
    </AbsoluteFill>
  );
};

const Auction: React.FC = () => {
  const frame = useCurrentFrame();
  const bids = [
    { v: "R$ 2.0M", t: 0 },
    { v: "R$ 2.6M", t: 8 },
    { v: "R$ 3.4M", t: 16 },
    { v: "R$ 4.5M", t: 24 },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", padding: 60, justifyContent: "center" }}>
      <div style={{ fontFamily: anton, fontSize: 90, color: "#FFB800", textAlign: "center", marginBottom: 40 }}>
        LEILÃO AO VIVO
      </div>
      {bids.map((b, i) => {
        const op = interpolate(frame, [b.t, b.t + 4], [0, 1], { extrapolateRight: "clamp" });
        const ty = interpolate(frame, [b.t, b.t + 6], [40, 0], { extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              opacity: op,
              transform: `translateY(${ty}px)`,
              fontFamily: anton,
              fontSize: 110,
              color: i === bids.length - 1 ? "#00E676" : "#F5F5F5",
              padding: "20px 40px",
              borderLeft: "8px solid #00E676",
              marginBottom: 20,
              background: "rgba(0,230,118,0.08)",
            }}
          >
            {b.v}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const YouthGlow: React.FC = () => {
  const frame = useCurrentFrame();
  const ovr = Math.round(interpolate(frame, [0, 28], [62, 87], { extrapolateRight: "clamp" }));
  const glow = interpolate(frame, [0, 30], [0, 1]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#080808", justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontFamily: inter, color: "#888", letterSpacing: 4, fontSize: 28, fontWeight: 700, marginBottom: 10 }}>
        CATEGORIA DE BASE
      </div>
      <div
        style={{
          width: 500,
          height: 500,
          borderRadius: 999,
          background: `radial-gradient(circle, rgba(255,184,0,${0.6 * glow}) 0%, transparent 70%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: anton, fontSize: 380, color: "#FFB800", textShadow: `0 0 ${60 * glow}px #FFB800` }}>
          {ovr}
        </div>
      </div>
      <div style={{ fontFamily: anton, fontSize: 60, color: "#00E676", marginTop: 10 }}>OVR ↑</div>
    </AbsoluteFill>
  );
};

const Notification: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = Math.sin(frame * 0.6) * 0.5 + 0.5;
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a0606", justifyContent: "center", alignItems: "center", padding: 60 }}>
      <div
        style={{
          padding: "40px 60px",
          background: "rgba(229,57,53,0.2)",
          border: `4px solid rgba(229,57,53,${0.5 + flash * 0.5})`,
          borderRadius: 24,
          width: "85%",
        }}
      >
        <div style={{ fontFamily: inter, color: "#E53935", letterSpacing: 4, fontSize: 32, fontWeight: 900 }}>⚠ LESÃO</div>
        <div style={{ fontFamily: anton, fontSize: 80, color: "#fff", marginTop: 16 }}>NEYMAR JR.</div>
        <div style={{ fontFamily: inter, color: "#bbb", fontSize: 36, marginTop: 8 }}>3 semanas fora</div>
      </div>
      <Label text="DECISÕES REAIS" />
    </AbsoluteFill>
  );
};

const ChatGlobal: React.FC = () => {
  const frame = useCurrentFrame();
  const msgs = [
    { u: "@maradonafan", m: "Joga ou nao joga?", t: 0 },
    { u: "@kingofbr", m: "Vou comprar o CR7 🔥", t: 8 },
    { u: "@treinador9", m: "Final hoje, time forte!", t: 16 },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: "#080808", padding: 60, justifyContent: "center" }}>
      <div style={{ fontFamily: anton, fontSize: 90, color: "#00E676", marginBottom: 30 }}>CHAT GLOBAL</div>
      {msgs.map((m, i) => {
        const op = interpolate(frame, [m.t, m.t + 5], [0, 1], { extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ opacity: op, marginBottom: 24 }}>
            <div style={{ fontFamily: inter, color: "#FFB800", fontSize: 32, fontWeight: 900 }}>{m.u}</div>
            <div style={{ fontFamily: inter, color: "#F5F5F5", fontSize: 44 }}>{m.m}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const FinanceChart: React.FC = () => {
  const frame = useCurrentFrame();
  const points = [100, 180, 150, 280, 250, 400, 380, 580, 720];
  const visible = Math.min(points.length, Math.floor(interpolate(frame, [0, 28], [0, points.length])));
  const path = points
    .slice(0, visible + 1)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * 110} ${500 - p * 0.6}`)
    .join(" ");
  return (
    <AbsoluteFill style={{ backgroundColor: "#080808", padding: 80, justifyContent: "center" }}>
      <div style={{ fontFamily: anton, fontSize: 90, color: "#F5F5F5", marginBottom: 40 }}>FINANÇAS</div>
      <svg viewBox="0 0 900 600" width="100%" style={{ filter: "drop-shadow(0 0 30px rgba(0,230,118,0.6))" }}>
        <path d={path} stroke="#00E676" strokeWidth="10" fill="none" />
        <path d={path + " L 880 500 L 0 500 Z"} fill="rgba(0,230,118,0.15)" />
      </svg>
      <Label text="LUCRO EM ALTA" />
    </AbsoluteFill>
  );
};

const Label: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      bottom: 80,
      left: 60,
      fontFamily: anton,
      fontSize: 40,
      color: "#00E676",
      letterSpacing: 4,
      borderLeft: "6px solid #00E676",
      paddingLeft: 20,
    }}
  >
    {text}
  </div>
);

export const SceneImersao: React.FC = () => {
  return (
    <AbsoluteFill>
      <Shot index={0}><TacticalPitch /></Shot>
      <Shot index={1}><BudgetCounter /></Shot>
      <Shot index={2}><Auction /></Shot>
      <Shot index={3}><YouthGlow /></Shot>
      <Shot index={4}><Notification /></Shot>
      <Shot index={5}><ChatGlobal /></Shot>
      <Shot index={6}><FinanceChart /></Shot>
    </AbsoluteFill>
  );
};
