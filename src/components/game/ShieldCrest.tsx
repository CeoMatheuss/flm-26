import React from 'react';

interface ShieldProps {
  primaryColor: string;
  secondaryColor: string;
  pattern: string;
  size?: number;
  className?: string;
}

// Generic shield SVG crests that look like real football badges
export const shieldPatterns = [
  'classic',
  'stripes',
  'diagonal',
  'split',
  'circle',
  'chevron',
  'cross',
  'diamond',
  'waves',
  'quarters',
  'triband',
  'star-badge',
] as const;

export type ShieldPattern = typeof shieldPatterns[number];

export function ShieldCrest({ primaryColor, secondaryColor, pattern, size = 64, className = '' }: ShieldProps) {
  const s = size;
  const half = s / 2;

  const renderPattern = () => {
    switch (pattern) {
      case 'classic':
        return (
          <>
            <path d={`M${half} ${s * 0.15} L${half} ${s * 0.85}`} stroke={secondaryColor} strokeWidth={s * 0.04} />
            <circle cx={half} cy={s * 0.45} r={s * 0.12} fill={secondaryColor} />
            <text x={half} y={s * 0.49} textAnchor="middle" fill={primaryColor} fontSize={s * 0.14} fontWeight="bold">★</text>
          </>
        );
      case 'stripes':
        return (
          <>
            {[0.25, 0.4, 0.55, 0.7].map((x, i) => (
              <line key={i} x1={s * x} y1={s * 0.1} x2={s * x} y2={s * 0.88} stroke={secondaryColor} strokeWidth={s * 0.06} opacity={0.7} />
            ))}
          </>
        );
      case 'diagonal':
        return (
          <>
            <polygon points={`${half},${s * 0.05} ${s * 0.9},${s * 0.15} ${s * 0.5},${s * 0.92}`} fill={secondaryColor} opacity={0.6} />
          </>
        );
      case 'split':
        return (
          <>
            <rect x={half} y={s * 0.05} width={half * 0.85} height={s * 0.9} fill={secondaryColor} opacity={0.5} rx={2} />
          </>
        );
      case 'circle':
        return (
          <>
            <circle cx={half} cy={s * 0.45} r={s * 0.22} fill="none" stroke={secondaryColor} strokeWidth={s * 0.04} />
            <circle cx={half} cy={s * 0.45} r={s * 0.1} fill={secondaryColor} />
          </>
        );
      case 'chevron':
        return (
          <>
            <polyline points={`${s * 0.15},${s * 0.3} ${half},${s * 0.55} ${s * 0.85},${s * 0.3}`} fill="none" stroke={secondaryColor} strokeWidth={s * 0.06} strokeLinecap="round" strokeLinejoin="round" />
          </>
        );
      case 'cross':
        return (
          <>
            <line x1={s * 0.2} y1={s * 0.45} x2={s * 0.8} y2={s * 0.45} stroke={secondaryColor} strokeWidth={s * 0.08} />
            <line x1={half} y1={s * 0.15} x2={half} y2={s * 0.75} stroke={secondaryColor} strokeWidth={s * 0.08} />
          </>
        );
      case 'diamond':
        return (
          <>
            <polygon points={`${half},${s * 0.2} ${s * 0.7},${s * 0.45} ${half},${s * 0.7} ${s * 0.3},${s * 0.45}`} fill={secondaryColor} opacity={0.6} />
          </>
        );
      case 'waves':
        return (
          <>
            <path d={`M${s * 0.15},${s * 0.35} Q${s * 0.35},${s * 0.25} ${half},${s * 0.35} T${s * 0.85},${s * 0.35}`} fill="none" stroke={secondaryColor} strokeWidth={s * 0.04} />
            <path d={`M${s * 0.15},${s * 0.5} Q${s * 0.35},${s * 0.4} ${half},${s * 0.5} T${s * 0.85},${s * 0.5}`} fill="none" stroke={secondaryColor} strokeWidth={s * 0.04} />
          </>
        );
      case 'quarters':
        return (
          <>
            <rect x={s * 0.15} y={s * 0.12} width={s * 0.3} height={s * 0.35} fill={secondaryColor} opacity={0.5} rx={2} />
            <rect x={s * 0.55} y={s * 0.47} width={s * 0.25} height={s * 0.3} fill={secondaryColor} opacity={0.5} rx={2} />
          </>
        );
      case 'triband':
        return (
          <>
            <rect x={s * 0.15} y={s * 0.35} width={s * 0.7} height={s * 0.12} fill={secondaryColor} opacity={0.7} />
          </>
        );
      case 'star-badge':
        return (
          <>
            <text x={half} y={s * 0.52} textAnchor="middle" fill={secondaryColor} fontSize={s * 0.35} fontWeight="bold">★</text>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Shield shape */}
      <path
        d={`M${half} ${s * 0.03} 
            L${s * 0.92} ${s * 0.13} 
            L${s * 0.88} ${s * 0.55} 
            Q${s * 0.82} ${s * 0.78} ${half} ${s * 0.97} 
            Q${s * 0.18} ${s * 0.78} ${s * 0.12} ${s * 0.55} 
            L${s * 0.08} ${s * 0.13} Z`}
        fill={primaryColor}
        stroke={secondaryColor}
        strokeWidth={s * 0.03}
      />
      {renderPattern()}
    </svg>
  );
}
