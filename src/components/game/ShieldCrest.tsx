import React from 'react';

interface ShieldProps {
  primaryColor: string;
  secondaryColor: string;
  detailColor?: string;
  pattern: string;
  shape?: ShieldShape;
  size?: number;
  className?: string;
  icon?: ShieldIcon;
}

export const shieldShapes = ['classic', 'rounded', 'pointed', 'circle', 'pentagon', 'gothic', 'hexagon', 'diamond-shield', 'badge', 'crest'] as const;
export type ShieldShape = typeof shieldShapes[number];

export const shieldPatterns = [
  'solid', 'stripes', 'diagonal', 'split', 'chevron',
  'cross', 'waves', 'quarters', 'triband',
  'sash', 'hoop', 'gradient-fade', 'pinstripes',
  'checkered', 'shield-band', 'frame', 'inner-circle',
  'double-split', 'arrow', 'zigzag',
] as const;

export type ShieldPattern = typeof shieldPatterns[number];

export const shieldIcons = [
  'none', 'star', 'double-star', 'triple-star', 'ball', 'lion', 'eagle-icon', 'crown-icon', 'sword',
  'crossed-swords', 'laurel', 'tower', 'anchor', 'flame-icon', 'diamond-icon',
  'shield-icon', 'wing', 'trident', 'compass', 'horse', 'wolf', 'dragon',
  'letter-F', 'letter-C', 'letter-A', 'letter-S',
] as const;
export type ShieldIcon = typeof shieldIcons[number];

export const shieldIconLabels: Record<ShieldIcon, string> = {
  none: 'Nenhum', star: '★ Estrela', 'double-star': '★★ Dupla', 'triple-star': '★★★ Tripla',
  ball: '⚽ Bola', lion: '🦁 Leão', 'eagle-icon': '🦅 Águia', 'crown-icon': '👑 Coroa',
  sword: '⚔ Espada', 'crossed-swords': '⚔️ Espadas', laurel: '🏆 Laurel', tower: '🏰 Torre',
  anchor: '⚓ Âncora', 'flame-icon': '🔥 Chama', 'diamond-icon': '💎 Diamante',
  'shield-icon': '🛡 Escudo', wing: '🪽 Asa', trident: '🔱 Tridente',
  compass: '🧭 Bússola', horse: '🐴 Cavalo', wolf: '🐺 Lobo', dragon: '🐉 Dragão',
  'letter-F': 'F', 'letter-C': 'C', 'letter-A': 'A', 'letter-S': 'S',
};

const shieldPaths: Record<ShieldShape, (s: number) => string> = {
  classic: (s) => {
    const h = s / 2;
    return `M${h} ${s * 0.02} L${s * 0.93} ${s * 0.12} L${s * 0.89} ${s * 0.55} Q${s * 0.83} ${s * 0.78} ${h} ${s * 0.97} Q${s * 0.17} ${s * 0.78} ${s * 0.11} ${s * 0.55} L${s * 0.07} ${s * 0.12} Z`;
  },
  rounded: (s) => {
    const h = s / 2;
    return `M${s * 0.12} ${s * 0.15} Q${s * 0.12} ${s * 0.05} ${h} ${s * 0.05} Q${s * 0.88} ${s * 0.05} ${s * 0.88} ${s * 0.15} L${s * 0.88} ${s * 0.55} Q${s * 0.85} ${s * 0.82} ${h} ${s * 0.95} Q${s * 0.15} ${s * 0.82} ${s * 0.12} ${s * 0.55} Z`;
  },
  pointed: (s) => {
    const h = s / 2;
    return `M${h} ${s * 0.03} L${s * 0.92} ${s * 0.08} L${s * 0.9} ${s * 0.5} L${h} ${s * 0.97} L${s * 0.1} ${s * 0.5} L${s * 0.08} ${s * 0.08} Z`;
  },
  circle: (s) => {
    const h = s / 2; const r = s * 0.44;
    return `M${h} ${h - r} A${r} ${r} 0 1 1 ${h} ${h + r} A${r} ${r} 0 1 1 ${h} ${h - r} Z`;
  },
  pentagon: (s) => {
    const h = s / 2; const r = s * 0.44;
    const pts = Array.from({ length: 5 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      return `${h + r * Math.cos(angle)},${h + r * Math.sin(angle)}`;
    });
    return `M${pts.join(' L')} Z`;
  },
  gothic: (s) => {
    const h = s / 2;
    return `M${h} ${s * 0.03} L${s * 0.9} ${s * 0.2} Q${s * 0.92} ${s * 0.35} ${s * 0.88} ${s * 0.5} L${h} ${s * 0.97} L${s * 0.12} ${s * 0.5} Q${s * 0.08} ${s * 0.35} ${s * 0.1} ${s * 0.2} Z`;
  },
  hexagon: (s) => {
    const h = s / 2; const r = s * 0.44;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      return `${h + r * Math.cos(angle)},${h + r * Math.sin(angle)}`;
    });
    return `M${pts.join(' L')} Z`;
  },
  'diamond-shield': (s) => {
    const h = s / 2;
    return `M${h} ${s * 0.05} L${s * 0.92} ${s * 0.4} L${h} ${s * 0.95} L${s * 0.08} ${s * 0.4} Z`;
  },
  badge: (s) => {
    const h = s / 2;
    return `M${s * 0.15} ${s * 0.08} L${s * 0.85} ${s * 0.08} Q${s * 0.93} ${s * 0.08} ${s * 0.93} ${s * 0.18} L${s * 0.93} ${s * 0.6} Q${s * 0.9} ${s * 0.82} ${h} ${s * 0.95} Q${s * 0.1} ${s * 0.82} ${s * 0.07} ${s * 0.6} L${s * 0.07} ${s * 0.18} Q${s * 0.07} ${s * 0.08} ${s * 0.15} ${s * 0.08} Z`;
  },
  crest: (s) => {
    const h = s / 2;
    return `M${h} ${s * 0.04} Q${s * 0.7} ${s * 0.04} ${s * 0.88} ${s * 0.12} L${s * 0.92} ${s * 0.18} L${s * 0.88} ${s * 0.58} Q${s * 0.82} ${s * 0.8} ${h} ${s * 0.96} Q${s * 0.18} ${s * 0.8} ${s * 0.12} ${s * 0.58} L${s * 0.08} ${s * 0.18} L${s * 0.12} ${s * 0.12} Q${s * 0.3} ${s * 0.04} ${h} ${s * 0.04} Z`;
  },
};

function renderIcon(icon: ShieldIcon | undefined, s: number, dc: string, sc: string) {
  if (!icon || icon === 'none') return null;
  const h = s / 2;
  const cy = s * 0.44;
  const r = s * 0.13;

  switch (icon) {
    case 'star':
      return <text x={h} y={cy + r * 0.7} textAnchor="middle" fill={dc} fontSize={s * 0.28} fontWeight="bold">★</text>;
    case 'double-star':
      return (
        <>
          <text x={h - s * 0.08} y={cy + r * 0.5} textAnchor="middle" fill={dc} fontSize={s * 0.18} fontWeight="bold">★</text>
          <text x={h + s * 0.08} y={cy + r * 0.5} textAnchor="middle" fill={dc} fontSize={s * 0.18} fontWeight="bold">★</text>
        </>
      );
    case 'triple-star':
      return (
        <>
          <text x={h} y={cy - s * 0.04} textAnchor="middle" fill={dc} fontSize={s * 0.15} fontWeight="bold">★</text>
          <text x={h - s * 0.07} y={cy + s * 0.1} textAnchor="middle" fill={dc} fontSize={s * 0.15} fontWeight="bold">★</text>
          <text x={h + s * 0.07} y={cy + s * 0.1} textAnchor="middle" fill={dc} fontSize={s * 0.15} fontWeight="bold">★</text>
        </>
      );
    case 'ball':
      return (
        <>
          <circle cx={h} cy={cy} r={s * 0.1} fill="none" stroke={dc} strokeWidth={s * 0.025} />
          <path d={`M${h - s * 0.07},${cy - s * 0.07} L${h + s * 0.07},${cy + s * 0.07}`} stroke={dc} strokeWidth={s * 0.012} />
          <path d={`M${h + s * 0.07},${cy - s * 0.07} L${h - s * 0.07},${cy + s * 0.07}`} stroke={dc} strokeWidth={s * 0.012} />
          <circle cx={h} cy={cy} r={s * 0.035} fill={dc} />
        </>
      );
    case 'lion':
      return <text x={h} y={cy + r * 0.7} textAnchor="middle" fill={dc} fontSize={s * 0.26} fontWeight="bold">♛</text>;
    case 'eagle-icon':
      return (
        <>
          <path d={`M${h},${cy - s * 0.1} L${h + s * 0.14},${cy + s * 0.02} L${h + s * 0.1},${cy + s * 0.1} L${h},${cy + s * 0.05} L${h - s * 0.1},${cy + s * 0.1} L${h - s * 0.14},${cy + s * 0.02} Z`} fill={dc} />
          <circle cx={h} cy={cy - s * 0.04} r={s * 0.02} fill={sc} />
        </>
      );
    case 'crown-icon':
      return (
        <>
          <polygon points={`${h - s * 0.14},${cy + s * 0.06} ${h - s * 0.1},${cy - s * 0.1} ${h - s * 0.04},${cy} ${h},${cy - s * 0.12} ${h + s * 0.04},${cy} ${h + s * 0.1},${cy - s * 0.1} ${h + s * 0.14},${cy + s * 0.06}`} fill={dc} />
          <rect x={h - s * 0.14} y={cy + s * 0.06} width={s * 0.28} height={s * 0.04} fill={dc} rx={s * 0.008} />
        </>
      );
    case 'sword':
      return (
        <>
          <rect x={h - s * 0.012} y={cy - s * 0.14} width={s * 0.024} height={s * 0.24} fill={dc} rx={s * 0.004} />
          <rect x={h - s * 0.07} y={cy + s * 0.08} width={s * 0.14} height={s * 0.025} fill={dc} rx={s * 0.004} />
          <polygon points={`${h},${cy - s * 0.14} ${h - s * 0.025},${cy - s * 0.12} ${h + s * 0.025},${cy - s * 0.12}`} fill={dc} />
        </>
      );
    case 'crossed-swords':
      return (
        <>
          <line x1={h - s * 0.1} y1={cy - s * 0.1} x2={h + s * 0.1} y2={cy + s * 0.1} stroke={dc} strokeWidth={s * 0.025} strokeLinecap="round" />
          <line x1={h + s * 0.1} y1={cy - s * 0.1} x2={h - s * 0.1} y2={cy + s * 0.1} stroke={dc} strokeWidth={s * 0.025} strokeLinecap="round" />
          <circle cx={h} cy={cy} r={s * 0.025} fill={dc} />
        </>
      );
    case 'laurel':
      return (
        <>
          <path d={`M${h - s * 0.03},${cy + s * 0.1} Q${h - s * 0.16},${cy} ${h - s * 0.08},${cy - s * 0.14}`} fill="none" stroke={dc} strokeWidth={s * 0.02} />
          <path d={`M${h + s * 0.03},${cy + s * 0.1} Q${h + s * 0.16},${cy} ${h + s * 0.08},${cy - s * 0.14}`} fill="none" stroke={dc} strokeWidth={s * 0.02} />
          {[-0.1, -0.04, 0.02].map((off, i) => (
            <React.Fragment key={i}>
              <circle cx={h - s * (0.1 + i * 0.015)} cy={cy + s * off} r={s * 0.015} fill={dc} opacity={0.7} />
              <circle cx={h + s * (0.1 + i * 0.015)} cy={cy + s * off} r={s * 0.015} fill={dc} opacity={0.7} />
            </React.Fragment>
          ))}
        </>
      );
    case 'tower':
      return (
        <>
          <rect x={h - s * 0.07} y={cy - s * 0.04} width={s * 0.14} height={s * 0.16} fill={dc} />
          <rect x={h - s * 0.09} y={cy - s * 0.1} width={s * 0.04} height={s * 0.06} fill={dc} />
          <rect x={h - s * 0.02} y={cy - s * 0.1} width={s * 0.04} height={s * 0.06} fill={dc} />
          <rect x={h + s * 0.05} y={cy - s * 0.1} width={s * 0.04} height={s * 0.06} fill={dc} />
          <rect x={h - s * 0.02} y={cy + s * 0.02} width={s * 0.04} height={s * 0.06} fill={sc} opacity={0.5} />
        </>
      );
    case 'anchor':
      return (
        <>
          <circle cx={h} cy={cy - s * 0.1} r={s * 0.035} fill="none" stroke={dc} strokeWidth={s * 0.02} />
          <rect x={h - s * 0.01} y={cy - s * 0.065} width={s * 0.02} height={s * 0.18} fill={dc} />
          <path d={`M${h - s * 0.1},${cy + s * 0.08} Q${h},${cy + s * 0.18} ${h + s * 0.1},${cy + s * 0.08}`} fill="none" stroke={dc} strokeWidth={s * 0.02} />
          <rect x={h - s * 0.06} y={cy - s * 0.02} width={s * 0.12} height={s * 0.02} fill={dc} />
        </>
      );
    case 'flame-icon':
      return (
        <path d={`M${h},${cy - s * 0.13} Q${h + s * 0.1},${cy - s * 0.03} ${h + s * 0.06},${cy + s * 0.07} Q${h + s * 0.03},${cy + s * 0.12} ${h},${cy + s * 0.1} Q${h - s * 0.03},${cy + s * 0.12} ${h - s * 0.06},${cy + s * 0.07} Q${h - s * 0.1},${cy - s * 0.03} ${h},${cy - s * 0.13}`}
          fill={dc} />
      );
    case 'diamond-icon':
      return (
        <polygon points={`${h},${cy - s * 0.12} ${h + s * 0.1},${cy} ${h},${cy + s * 0.12} ${h - s * 0.1},${cy}`} fill={dc} />
      );
    case 'shield-icon':
      return (
        <path d={`M${h},${cy - s * 0.1} L${h + s * 0.1},${cy - s * 0.06} L${h + s * 0.09},${cy + s * 0.04} Q${h + s * 0.07},${cy + s * 0.1} ${h},${cy + s * 0.13} Q${h - s * 0.07},${cy + s * 0.1} ${h - s * 0.09},${cy + s * 0.04} L${h - s * 0.1},${cy - s * 0.06} Z`}
          fill="none" stroke={dc} strokeWidth={s * 0.02} />
      );
    case 'wing':
      return (
        <>
          <path d={`M${h},${cy} Q${h + s * 0.05},${cy - s * 0.12} ${h + s * 0.14},${cy - s * 0.08} Q${h + s * 0.12},${cy - s * 0.02} ${h + s * 0.06},${cy + s * 0.04} Z`} fill={dc} />
          <path d={`M${h},${cy} Q${h - s * 0.05},${cy - s * 0.12} ${h - s * 0.14},${cy - s * 0.08} Q${h - s * 0.12},${cy - s * 0.02} ${h - s * 0.06},${cy + s * 0.04} Z`} fill={dc} />
          <circle cx={h} cy={cy + s * 0.02} r={s * 0.02} fill={dc} />
        </>
      );
    case 'trident':
      return (
        <>
          <rect x={h - s * 0.01} y={cy - s * 0.06} width={s * 0.02} height={s * 0.2} fill={dc} />
          <rect x={h - s * 0.01} y={cy - s * 0.12} width={s * 0.02} height={s * 0.06} fill={dc} />
          <rect x={h - s * 0.08} y={cy - s * 0.12} width={s * 0.02} height={s * 0.08} fill={dc} />
          <rect x={h + s * 0.06} y={cy - s * 0.12} width={s * 0.02} height={s * 0.08} fill={dc} />
          <rect x={h - s * 0.08} y={cy - s * 0.04} width={s * 0.16} height={s * 0.02} fill={dc} />
        </>
      );
    case 'compass':
      return (
        <>
          <circle cx={h} cy={cy} r={s * 0.1} fill="none" stroke={dc} strokeWidth={s * 0.015} />
          <polygon points={`${h},${cy - s * 0.1} ${h + s * 0.025},${cy} ${h},${cy + s * 0.1} ${h - s * 0.025},${cy}`} fill={dc} opacity={0.8} />
          <circle cx={h} cy={cy} r={s * 0.02} fill={sc} />
        </>
      );
    case 'horse':
      return (
        <>
          <path d={`M${h - s * 0.04},${cy + s * 0.1} L${h - s * 0.04},${cy - s * 0.02} Q${h - s * 0.06},${cy - s * 0.1} ${h},${cy - s * 0.13} Q${h + s * 0.08},${cy - s * 0.1} ${h + s * 0.06},${cy - s * 0.02} L${h + s * 0.08},${cy + s * 0.04} Q${h + s * 0.04},${cy + s * 0.08} ${h},${cy + s * 0.06}`} fill="none" stroke={dc} strokeWidth={s * 0.025} strokeLinecap="round" />
          <circle cx={h + s * 0.02} cy={cy - s * 0.07} r={s * 0.015} fill={dc} />
        </>
      );
    case 'wolf':
      return (
        <>
          <polygon points={`${h - s * 0.06},${cy - s * 0.1} ${h - s * 0.1},${cy - s * 0.04} ${h - s * 0.06},${cy + s * 0.06}`} fill={dc} opacity={0.7} />
          <polygon points={`${h + s * 0.06},${cy - s * 0.1} ${h + s * 0.1},${cy - s * 0.04} ${h + s * 0.06},${cy + s * 0.06}`} fill={dc} opacity={0.7} />
          <ellipse cx={h} cy={cy + s * 0.02} rx={s * 0.08} ry={s * 0.06} fill={dc} opacity={0.8} />
          <circle cx={h - s * 0.03} cy={cy - s * 0.02} r={s * 0.012} fill={sc} />
          <circle cx={h + s * 0.03} cy={cy - s * 0.02} r={s * 0.012} fill={sc} />
        </>
      );
    case 'dragon':
      return (
        <>
          <path d={`M${h},${cy - s * 0.12} Q${h + s * 0.12},${cy - s * 0.06} ${h + s * 0.1},${cy + s * 0.04} L${h + s * 0.04},${cy + s * 0.1} L${h},${cy + s * 0.06} L${h - s * 0.04},${cy + s * 0.1} L${h - s * 0.1},${cy + s * 0.04} Q${h - s * 0.12},${cy - s * 0.06} ${h},${cy - s * 0.12}`} fill={dc} />
          <circle cx={h - s * 0.03} cy={cy - s * 0.04} r={s * 0.012} fill={sc} />
          <circle cx={h + s * 0.03} cy={cy - s * 0.04} r={s * 0.012} fill={sc} />
        </>
      );
    case 'letter-F':
    case 'letter-C':
    case 'letter-A':
    case 'letter-S':
      const letter = icon.split('-')[1].toUpperCase();
      return <text x={h} y={cy + s * 0.08} textAnchor="middle" fill={dc} fontSize={s * 0.3} fontWeight="bold" fontFamily="serif">{letter}</text>;
    default:
      return null;
  }
}

export function ShieldCrest({ primaryColor, secondaryColor, detailColor, pattern, shape = 'classic', size = 64, className = '', icon }: ShieldProps) {
  const s = size;
  const h = s / 2;
  const dc = detailColor || secondaryColor;
  const shapeKey = (shieldShapes.includes(shape as ShieldShape) ? shape : 'classic') as ShieldShape;
  const shieldPath = shieldPaths[shapeKey](s);
  const clipId = `clip-${Math.random().toString(36).substr(2, 8)}`;
  const gradId = `grad-${Math.random().toString(36).substr(2, 8)}`;
  const shineId = `shine-${Math.random().toString(36).substr(2, 8)}`;

  const renderPattern = () => {
    // Patterns are ONLY background decoration — NO central elements
    switch (pattern) {
      case 'solid':
        return null; // Just the solid color
      case 'stripes':
        return (
          <>
            {[0.2, 0.32, 0.44, 0.56, 0.68, 0.8].map((x, i) => (
              <rect key={i} x={s * x} y={0} width={s * 0.06} height={s} fill={secondaryColor} opacity={0.8} />
            ))}
          </>
        );
      case 'diagonal':
        return (
          <>
            <polygon points={`0,0 ${s},0 ${s},${s * 0.5} 0,${s}`} fill={secondaryColor} opacity={0.6} />
            <line x1={0} y1={0} x2={s} y2={s} stroke={dc} strokeWidth={s * 0.03} opacity={0.5} />
          </>
        );
      case 'split':
        return <rect x={h} y={0} width={h} height={s} fill={secondaryColor} opacity={0.75} />;
      case 'chevron':
        return (
          <polygon
            points={`${s * 0.08},${s * 0.15} ${h},${s * 0.5} ${s * 0.92},${s * 0.15} ${s * 0.92},${s * 0.3} ${h},${s * 0.63} ${s * 0.08},${s * 0.3}`}
            fill={secondaryColor} opacity={0.7}
          />
        );
      case 'cross':
        return (
          <>
            <rect x={s * 0.4} y={s * 0.08} width={s * 0.2} height={s * 0.84} fill={secondaryColor} opacity={0.6} />
            <rect x={s * 0.1} y={s * 0.34} width={s * 0.8} height={s * 0.18} fill={secondaryColor} opacity={0.6} />
          </>
        );
      case 'waves':
        return (
          <>
            {[0.22, 0.36, 0.5, 0.64, 0.78].map((y, i) => (
              <path key={i}
                d={`M0,${s * y} Q${s * 0.25},${s * (y - 0.06)} ${h},${s * y} T${s},${s * y}`}
                fill="none" stroke={secondaryColor} strokeWidth={s * 0.035} opacity={0.35 + i * 0.1}
              />
            ))}
          </>
        );
      case 'quarters':
        return (
          <>
            <rect x={0} y={0} width={h} height={h} fill={secondaryColor} opacity={0.65} />
            <rect x={h} y={h} width={h} height={h} fill={secondaryColor} opacity={0.65} />
          </>
        );
      case 'triband':
        return (
          <>
            <rect x={0} y={0} width={s * 0.33} height={s} fill={secondaryColor} opacity={0.65} />
            <rect x={s * 0.67} y={0} width={s * 0.33} height={s} fill={secondaryColor} opacity={0.65} />
          </>
        );
      case 'sash':
        return (
          <>
            <polygon points={`${s * 0.55},0 ${s * 0.82},0 ${s * 0.25},${s} ${0},${s}`} fill={secondaryColor} opacity={0.7} />
            <polygon points={`${s * 0.58},0 ${s * 0.78},0 ${s * 0.22},${s} ${s * 0.02},${s}`} fill={dc} opacity={0.25} />
          </>
        );
      case 'hoop':
        return (
          <>
            {[0.18, 0.38, 0.58, 0.78].map((y, i) => (
              <rect key={i} x={0} y={s * (y - 0.05)} width={s} height={s * 0.1} fill={secondaryColor} opacity={0.7} />
            ))}
          </>
        );
      case 'gradient-fade':
        return (
          <>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={secondaryColor} stopOpacity={0.8} />
                <stop offset="100%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <rect x={0} y={0} width={s} height={s} fill={`url(#${gradId})`} />
          </>
        );
      case 'pinstripes':
        return (
          <>
            {Array.from({ length: 14 }, (_, i) => (
              <line key={i} x1={s * (0.08 + i * 0.065)} y1={0} x2={s * (0.08 + i * 0.065)} y2={s} stroke={secondaryColor} strokeWidth={s * 0.015} opacity={0.45} />
            ))}
          </>
        );
      case 'checkered':
        return (
          <>
            {Array.from({ length: 4 }, (_, row) =>
              Array.from({ length: 4 }, (_, col) => {
                if ((row + col) % 2 === 0) return null;
                return <rect key={`${row}-${col}`} x={s * (0.1 + col * 0.2)} y={s * (0.1 + row * 0.2)} width={s * 0.2} height={s * 0.2} fill={secondaryColor} opacity={0.7} />;
              })
            )}
          </>
        );
      case 'shield-band':
        return (
          <>
            <rect x={0} y={s * 0.3} width={s} height={s * 0.22} fill={secondaryColor} opacity={0.75} />
            <line x1={0} y1={s * 0.3} x2={s} y2={s * 0.3} stroke={dc} strokeWidth={s * 0.015} opacity={0.5} />
            <line x1={0} y1={s * 0.52} x2={s} y2={s * 0.52} stroke={dc} strokeWidth={s * 0.015} opacity={0.5} />
          </>
        );
      case 'frame':
        return (
          <>
            <rect x={s * 0.12} y={s * 0.12} width={s * 0.76} height={s * 0.76} fill="none" stroke={secondaryColor} strokeWidth={s * 0.035} opacity={0.7} rx={s * 0.02} />
            <rect x={s * 0.18} y={s * 0.18} width={s * 0.64} height={s * 0.64} fill="none" stroke={dc} strokeWidth={s * 0.015} opacity={0.4} rx={s * 0.01} />
          </>
        );
      case 'inner-circle':
        return (
          <>
            <circle cx={h} cy={s * 0.44} r={s * 0.28} fill="none" stroke={secondaryColor} strokeWidth={s * 0.04} opacity={0.6} />
            <circle cx={h} cy={s * 0.44} r={s * 0.21} fill="none" stroke={dc} strokeWidth={s * 0.015} opacity={0.4} />
          </>
        );
      case 'double-split':
        return (
          <>
            <rect x={0} y={0} width={s * 0.25} height={s} fill={secondaryColor} opacity={0.65} />
            <rect x={s * 0.75} y={0} width={s * 0.25} height={s} fill={secondaryColor} opacity={0.65} />
          </>
        );
      case 'arrow':
        return (
          <polygon
            points={`${h},${s * 0.12} ${s * 0.85},${s * 0.5} ${s * 0.7},${s * 0.5} ${s * 0.7},${s * 0.88} ${s * 0.3},${s * 0.88} ${s * 0.3},${s * 0.5} ${s * 0.15},${s * 0.5}`}
            fill={secondaryColor} opacity={0.5}
          />
        );
      case 'zigzag':
        return (
          <path
            d={`M0,${s * 0.35} L${s * 0.15},${s * 0.25} L${s * 0.3},${s * 0.35} L${s * 0.45},${s * 0.25} L${s * 0.6},${s * 0.35} L${s * 0.75},${s * 0.25} L${s * 0.9},${s * 0.35} L${s},${s * 0.35} L${s},${s * 0.55} L${s * 0.9},${s * 0.55} L${s * 0.75},${s * 0.65} L${s * 0.6},${s * 0.55} L${s * 0.45},${s * 0.65} L${s * 0.3},${s * 0.55} L${s * 0.15},${s * 0.65} L0,${s * 0.55} Z`}
            fill={secondaryColor} opacity={0.6}
          />
        );
      default:
        return null;
    }
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={clipId}>
          <path d={shieldPath} />
        </clipPath>
        <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.15} />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="100%" stopColor="#000000" stopOpacity={0.1} />
        </linearGradient>
      </defs>
      <path d={shieldPath} fill={primaryColor} />
      <g clipPath={`url(#${clipId})`}>
        {renderPattern()}
        {renderIcon(icon, s, dc, primaryColor)}
      </g>
      <path d={shieldPath} fill={`url(#${shineId})`} />
      <path d={shieldPath} fill="none" stroke={dc} strokeWidth={s * 0.035} opacity={0.9} />
    </svg>
  );
}
