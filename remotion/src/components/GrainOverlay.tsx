import { AbsoluteFill, useCurrentFrame } from "remotion";
export const GrainOverlay = () => {
  const frame = useCurrentFrame();
  // Procedural grain via SVG turbulence, animated by seed
  const seed = frame % 17;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.08, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%">
        <filter id="n">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#n)" />
      </svg>
    </AbsoluteFill>
  );
};
