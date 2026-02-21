import React from 'react';

interface ShieldProps {
  primaryColor: string;
  secondaryColor: string;
  detailColor?: string;
  pattern: string;
  shape?: ShieldShape;
  size?: number;
  className?: string;
}

export const shieldShapes = ['classic', 'rounded', 'pointed', 'circle', 'pentagon', 'gothic', 'hexagon', 'diamond-shield', 'badge', 'crest'] as const;
export type ShieldShape = typeof shieldShapes[number];

export const shieldPatterns = [
  'classic',
  'stripes',
  'diagonal',
  'split',
  'circle-emblem',
  'chevron',
  'cross',
  'diamond',
  'waves',
  'quarters',
  'triband',
  'star-badge',
  'sash',
  'hoop',
  'gradient-fade',
  'pinstripes',
  'crown',
  'eagle',
  'flame',
  'lightning',
] as const;

export type ShieldPattern = typeof shieldPatterns[number];

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
    const h = s / 2;
    const r = s * 0.44;
    return `M${h} ${h - r} A${r} ${r} 0 1 1 ${h} ${h + r} A${r} ${r} 0 1 1 ${h} ${h - r} Z`;
  },
  pentagon: (s) => {
    const h = s / 2;
    const r = s * 0.44;
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
    const h = s / 2;
    const r = s * 0.44;
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

export function ShieldCrest({ primaryColor, secondaryColor, detailColor, pattern, shape = 'classic', size = 64, className = '' }: ShieldProps) {
  const s = size;
  const h = s / 2;
  const dc = detailColor || secondaryColor;
  const shapeKey = (shieldShapes.includes(shape as ShieldShape) ? shape : 'classic') as ShieldShape;
  const shieldPath = shieldPaths[shapeKey](s);
  const clipId = `clip-${Math.random().toString(36).substr(2, 6)}`;
  const gradId = `grad-${Math.random().toString(36).substr(2, 6)}`;

  const renderPattern = () => {
    switch (pattern) {
      case 'classic':
        return (
          <>
            <line x1={h} y1={s * 0.1} x2={h} y2={s * 0.9} stroke={secondaryColor} strokeWidth={s * 0.025} opacity={0.5} />
            <circle cx={h} cy={s * 0.42} r={s * 0.15} fill="none" stroke={secondaryColor} strokeWidth={s * 0.025} />
            <circle cx={h} cy={s * 0.42} r={s * 0.08} fill={dc} opacity={0.8} />
            <text x={h} y={s * 0.2} textAnchor="middle" fill={dc} fontSize={s * 0.12} fontWeight="bold" opacity={0.6}>★</text>
          </>
        );
      case 'stripes':
        return (
          <>
            {[0.22, 0.34, 0.46, 0.58, 0.7, 0.78].map((x, i) => (
              <rect key={i} x={s * x} y={0} width={s * 0.04} height={s} fill={secondaryColor} opacity={i % 2 === 0 ? 0.7 : 0.4} />
            ))}
          </>
        );
      case 'diagonal':
        return (
          <>
            <polygon points={`0,0 ${s},0 ${s},${s * 0.5} 0,${s}`} fill={secondaryColor} opacity={0.5} />
            <line x1={0} y1={0} x2={s} y2={s} stroke={dc} strokeWidth={s * 0.03} opacity={0.5} />
          </>
        );
      case 'split':
        return <rect x={h} y={0} width={h} height={s} fill={secondaryColor} opacity={0.6} />;
      case 'circle-emblem':
        return (
          <>
            <circle cx={h} cy={s * 0.44} r={s * 0.25} fill="none" stroke={secondaryColor} strokeWidth={s * 0.035} />
            <circle cx={h} cy={s * 0.44} r={s * 0.2} fill="none" stroke={dc} strokeWidth={s * 0.015} opacity={0.5} />
            <circle cx={h} cy={s * 0.44} r={s * 0.06} fill={dc} />
            {[0, 60, 120, 180, 240, 300].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const cx = h + s * 0.17 * Math.cos(rad);
              const cy = s * 0.44 + s * 0.17 * Math.sin(rad);
              return <circle key={deg} cx={cx} cy={cy} r={s * 0.02} fill={dc} opacity={0.7} />;
            })}
          </>
        );
      case 'chevron':
        return (
          <polygon
            points={`${s * 0.08},${s * 0.2} ${h},${s * 0.55} ${s * 0.92},${s * 0.2} ${s * 0.92},${s * 0.35} ${h},${s * 0.68} ${s * 0.08},${s * 0.35}`}
            fill={secondaryColor} opacity={0.6}
          />
        );
      case 'cross':
        return (
          <>
            <rect x={s * 0.38} y={s * 0.08} width={s * 0.24} height={s * 0.84} fill={secondaryColor} opacity={0.5} />
            <rect x={s * 0.1} y={s * 0.32} width={s * 0.8} height={s * 0.2} fill={secondaryColor} opacity={0.5} />
          </>
        );
      case 'diamond':
        return (
          <>
            <polygon points={`${h},${s * 0.15} ${s * 0.75},${s * 0.44} ${h},${s * 0.73} ${s * 0.25},${s * 0.44}`} fill={secondaryColor} opacity={0.5} />
            <polygon points={`${h},${s * 0.28} ${s * 0.62},${s * 0.44} ${h},${s * 0.6} ${s * 0.38},${s * 0.44}`} fill={primaryColor} opacity={0.6} />
            <circle cx={h} cy={s * 0.44} r={s * 0.04} fill={dc} />
          </>
        );
      case 'waves':
        return (
          <>
            {[0.28, 0.4, 0.52, 0.64].map((y, i) => (
              <path key={i}
                d={`M0,${s * y} Q${s * 0.25},${s * (y - 0.06)} ${h},${s * y} T${s},${s * y}`}
                fill="none" stroke={secondaryColor} strokeWidth={s * 0.03} opacity={0.3 + i * 0.15}
              />
            ))}
          </>
        );
      case 'quarters':
        return (
          <>
            <rect x={0} y={0} width={h} height={h} fill={secondaryColor} opacity={0.5} />
            <rect x={h} y={h} width={h} height={h} fill={secondaryColor} opacity={0.5} />
          </>
        );
      case 'triband':
        return (
          <>
            <rect x={0} y={0} width={s * 0.33} height={s} fill={secondaryColor} opacity={0.5} />
            <rect x={s * 0.67} y={0} width={s * 0.33} height={s} fill={secondaryColor} opacity={0.5} />
          </>
        );
      case 'star-badge':
        return (
          <>
            {[0, 72, 144, 216, 288].map((deg) => {
              const rad = ((deg - 90) * Math.PI) / 180;
              const outerR = s * 0.22;
              const x1 = h + outerR * Math.cos(rad);
              const y1 = s * 0.44 + outerR * Math.sin(rad);
              return <line key={deg} x1={h} y1={s * 0.44} x2={x1} y2={y1} stroke={dc} strokeWidth={s * 0.015} opacity={0.4} />;
            })}
            <text x={h} y={s * 0.5} textAnchor="middle" fill={dc} fontSize={s * 0.38} fontWeight="bold" opacity={0.8}>★</text>
          </>
        );
      case 'sash':
        return <polygon points={`${s * 0.6},0 ${s * 0.8},0 ${s * 0.2},${s} ${0},${s}`} fill={secondaryColor} opacity={0.6} />;
      case 'hoop':
        return (
          <>
            {[0.2, 0.4, 0.6, 0.8].map((y, i) => (
              <rect key={i} x={0} y={s * (y - 0.05)} width={s} height={s * 0.1} fill={secondaryColor} opacity={i % 2 === 0 ? 0.6 : 0.3} />
            ))}
          </>
        );
      case 'gradient-fade':
        return (
          <>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={secondaryColor} stopOpacity={0.7} />
                <stop offset="100%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <rect x={0} y={0} width={s} height={s} fill={`url(#${gradId})`} />
            <circle cx={h} cy={s * 0.55} r={s * 0.08} fill={dc} opacity={0.5} />
          </>
        );
      case 'pinstripes':
        return (
          <>
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1={s * (0.1 + i * 0.07)} y1={0} x2={s * (0.1 + i * 0.07)} y2={s} stroke={secondaryColor} strokeWidth={s * 0.012} opacity={0.35} />
            ))}
            <circle cx={h} cy={s * 0.42} r={s * 0.12} fill="none" stroke={dc} strokeWidth={s * 0.02} opacity={0.6} />
          </>
        );
      case 'crown':
        return (
          <>
            <polygon points={`${s*0.2},${s*0.5} ${s*0.3},${s*0.25} ${s*0.4},${s*0.4} ${h},${s*0.2} ${s*0.6},${s*0.4} ${s*0.7},${s*0.25} ${s*0.8},${s*0.5}`} fill={dc} opacity={0.7} />
            <rect x={s*0.2} y={s*0.5} width={s*0.6} height={s*0.08} fill={dc} opacity={0.5} rx={s*0.01} />
            <circle cx={h} cy={s*0.68} r={s*0.06} fill={dc} opacity={0.4} />
          </>
        );
      case 'eagle':
        return (
          <>
            <path d={`M${h},${s*0.25} L${s*0.8},${s*0.35} L${s*0.7},${s*0.5} L${h},${s*0.45} L${s*0.3},${s*0.5} L${s*0.2},${s*0.35} Z`} fill={dc} opacity={0.6} />
            <path d={`M${h},${s*0.45} L${s*0.6},${s*0.7} L${h},${s*0.8} L${s*0.4},${s*0.7} Z`} fill={secondaryColor} opacity={0.4} />
            <circle cx={h} cy={s*0.35} r={s*0.04} fill={dc} opacity={0.9} />
          </>
        );
      case 'flame':
        return (
          <>
            <path d={`M${h},${s*0.15} Q${s*0.7},${s*0.3} ${s*0.65},${s*0.55} Q${s*0.6},${s*0.7} ${h},${s*0.85} Q${s*0.4},${s*0.7} ${s*0.35},${s*0.55} Q${s*0.3},${s*0.3} ${h},${s*0.15}`} fill={dc} opacity={0.5} />
            <path d={`M${h},${s*0.3} Q${s*0.6},${s*0.4} ${s*0.58},${s*0.55} Q${s*0.55},${s*0.65} ${h},${s*0.75} Q${s*0.45},${s*0.65} ${s*0.42},${s*0.55} Q${s*0.4},${s*0.4} ${h},${s*0.3}`} fill={secondaryColor} opacity={0.3} />
          </>
        );
      case 'lightning':
        return (
          <>
            <polygon points={`${s*0.55},${s*0.1} ${s*0.35},${s*0.45} ${s*0.48},${s*0.45} ${s*0.38},${s*0.9} ${s*0.7},${s*0.42} ${s*0.53},${s*0.42}`} fill={dc} opacity={0.65} />
          </>
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
      </defs>
      <path d={shieldPath} fill={primaryColor} />
      <g clipPath={`url(#${clipId})`}>
        {renderPattern()}
      </g>
      <path d={shieldPath} fill="none" stroke={dc} strokeWidth={s * 0.03} />
      <path d={shieldPath} fill="url(#shine)" opacity={0.08} />
    </svg>
  );
}
