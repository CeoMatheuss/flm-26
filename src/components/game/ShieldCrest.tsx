import React from 'react';
import heraldicAnimalsSprite from '@/assets/heraldic-animals.png';
import heraldicSymbolsSprite from '@/assets/heraldic-symbols.png';

/* ── Heraldic sprite sheets (1536×1024, 6 cols × 4 rows, 256×256 cells) ── */
const SPRITE_W = 1536;
const SPRITE_H = 1024;
const SPRITE_COLS = 6;
const SPRITE_ROWS = 4;
const CELL_W = SPRITE_W / SPRITE_COLS; // 256
const CELL_H = SPRITE_H / SPRITE_ROWS; // 256

// Map animal icon → [col, row] in heraldic-animals.png
// Some animals (phoenix, dragon-head) keep their natural color (red/flame)
const ANIMAL_SPRITE_MAP: Partial<Record<string, [number, number]>> = {
  // Row 0
  lion: [0, 0],
  tiger: [1, 0],
  'eagle-icon': [2, 0],
  'eagle-displayed': [3, 0],
  phoenix: [4, 0],
  horse: [5, 0],
  // Row 1
  wolf: [0, 1],
  bear: [1, 1],
  panther: [2, 1],
  bull: [3, 1],
  'deer-head': [4, 1],
  snake: [5, 1],
  // Row 2
  griffin: [0, 2],
  elephant: [1, 2],
  rhino: [2, 2],
  falcon: [3, 2],
  fox: [4, 2],
  ram: [5, 2],
  // Row 3 — heads
  'lion-head': [0, 3],
  'eagle-head': [1, 3],
  'wolf-head': [2, 3],
  'bear-head': [3, 3],
  dragon: [4, 3],
  swan: [5, 3],
};

// Animals that should preserve their original colors (multi-color silhouettes)
const FULLCOLOR_ANIMALS = new Set(['phoenix', 'dragon']);

// Map symbol icon → [col, row] in heraldic-symbols.png
const SYMBOL_SPRITE_MAP: Partial<Record<string, [number, number]>> = {
  // Row 0
  'crown-icon': [0, 0],
  'fleur-de-lis': [1, 0],
  'cross-pattee': [2, 0],
  star: [3, 0],
  'sun-burst': [4, 0],
  'crescent-moon': [5, 0],
  // Row 1
  sword: [0, 1],
  'crossed-swords': [1, 1],
  trident: [2, 1],
  laurel: [3, 1],
  feather: [4, 1],
  wing: [5, 1],
  // Row 2
  tower: [0, 2],
  castle: [1, 2],
  anchor: [2, 2],
  lightning: [3, 2],
  'flame-icon': [4, 2],
  compass: [5, 2],
  // Row 3
  'diamond-icon': [0, 3],
  'shield-icon': [1, 3],
  ball: [2, 3],
  trophy: [3, 3],
  boot: [4, 3],
  'oak-leaf': [5, 3],
};

/**
 * Renders a cropped heraldic silhouette from a sprite sheet, optionally
 * recolored via SVG filter. Renders inside an SVG <g>.
 */
function HeraldicSprite({
  spriteHref, cell, s, color, filterId, recolor = true,
}: {
  spriteHref: string;
  cell: [number, number];
  s: number;
  color: string;
  filterId: string;
  recolor?: boolean;
}) {
  const [col, row] = cell;
  const drawSize = s * 0.42;
  const cx = s / 2;
  const cy = s * 0.44;
  const dx = cx - drawSize / 2;
  const dy = cy - drawSize / 2;
  const scale = drawSize / CELL_W;
  const fullW = SPRITE_W * scale;
  const fullH = SPRITE_H * scale;
  const offsetX = dx - col * CELL_W * scale;
  const offsetY = dy - row * CELL_H * scale;
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2) || '00', 16) / 255;
  const g = parseInt(hex.substring(2, 4) || '00', 16) / 255;
  const b = parseInt(hex.substring(4, 6) || '00', 16) / 255;
  const clipId = `${filterId}-clip`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={dx} y={dy} width={drawSize} height={drawSize} />
        </clipPath>
        {recolor && (
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1 0`}
            />
          </filter>
        )}
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <image
          href={spriteHref}
          x={offsetX}
          y={offsetY}
          width={fullW}
          height={fullH}
          preserveAspectRatio="none"
          filter={recolor ? `url(#${filterId})` : undefined}
        />
      </g>
    </g>
  );
}

export interface ShieldConfig {
  shape: ShieldShape;
  pattern: ShieldPattern;
  icon: ShieldIcon;
  primaryColor: string;
  secondaryColor: string;
  detailColor: string;
  borderColor?: string;
  borderWidth?: number;
  iconScale?: number;
  iconOffsetX?: number;
  iconOffsetY?: number;
  iconRotation?: number;
  iconOpacity?: number;
  iconMirror?: boolean;
  topStars?: 0 | 1 | 2 | 3;
  showLaurels?: boolean;
  showCrown?: boolean;
  bannerText?: string;
  bannerColor?: string;
}

interface ShieldProps {
  primaryColor: string;
  secondaryColor: string;
  detailColor?: string;
  pattern: string;
  shape?: ShieldShape;
  size?: number;
  className?: string;
  icon?: ShieldIcon;
  // Transform & decoration extras
  borderColor?: string;
  borderWidth?: number;
  iconScale?: number;
  iconOffsetX?: number;
  iconOffsetY?: number;
  iconRotation?: number;
  iconOpacity?: number;
  iconMirror?: boolean;
  topStars?: 0 | 1 | 2 | 3;
  showLaurels?: boolean;
  showCrown?: boolean;
  bannerText?: string;
  bannerColor?: string;
}

export const shieldShapes = ['classic', 'rounded', 'pointed', 'circle', 'pentagon', 'gothic', 'hexagon', 'diamond-shield', 'badge', 'crest'] as const;
export type ShieldShape = typeof shieldShapes[number];

export const shieldPatterns = [
  'solid', 'stripes', 'diagonal', 'split', 'chevron',
  'cross', 'waves', 'quarters', 'triband',
  'sash', 'hoop', 'gradient-fade', 'pinstripes',
  'checkered', 'shield-band', 'frame', 'inner-circle',
  'double-split', 'arrow', 'zigzag',
  // ── Heraldic divisions (clean, solid) ──
  'quartered', 'per-pale', 'per-bend', 'bordure', 'chief',
] as const;

export type ShieldPattern = typeof shieldPatterns[number];

export const shieldIcons = [
  'none', 'star', 'double-star', 'triple-star', 'ball', 'lion', 'eagle-icon', 'crown-icon', 'sword',
  'crossed-swords', 'laurel', 'tower', 'anchor', 'flame-icon', 'diamond-icon',
  'shield-icon', 'wing', 'trident', 'compass', 'horse', 'wolf', 'dragon',
  'trophy', 'boot', 'goal-net', 'whistle',
  // ── Animals ──
  'tiger', 'bear', 'phoenix', 'snake', 'elephant', 'rhino', 'panther', 'deer', 'bull', 'griffin',
  // ── New animals (from sprite v2) ──
  'eagle-displayed', 'deer-head', 'falcon', 'fox', 'ram',
  'lion-head', 'eagle-head', 'wolf-head', 'bear-head', 'swan',
  // ── Symbols ──
  'lightning', 'castle', 'axe', 'fleur-de-lis', 'cross-pattee', 'crescent-moon', 'sun-burst',
  // ── New symbols (from sprite v2) ──
  'feather', 'oak-leaf',
  // ── Letters ──
  'letter-A', 'letter-B', 'letter-C', 'letter-F', 'letter-M', 'letter-R', 'letter-S',
] as const;
export type ShieldIcon = typeof shieldIcons[number];

export const shieldIconLabels: Record<ShieldIcon, string> = {
  none: 'Nenhum', star: '★ Estrela', 'double-star': '★★ Dupla', 'triple-star': '★★★ Tripla',
  ball: '⚽ Bola', lion: '🦁 Leão', 'eagle-icon': '🦅 Águia', 'crown-icon': '👑 Coroa',
  sword: '⚔ Espada', 'crossed-swords': '⚔️ Espadas', laurel: '🏆 Laurel', tower: '🏰 Torre',
  anchor: '⚓ Âncora', 'flame-icon': '🔥 Chama', 'diamond-icon': '💎 Diamante',
  'shield-icon': '🛡 Escudo', wing: '🪽 Asa', trident: '🔱 Tridente',
  compass: '🧭 Bússola', horse: '🐴 Cavalo', wolf: '🐺 Lobo', dragon: '🐉 Dragão',
  trophy: '🏆 Troféu', boot: '👟 Chuteira', 'goal-net': '🥅 Gol', whistle: '📣 Apito',
  tiger: '🐯 Tigre', bear: '🐻 Urso', phoenix: '🔥 Fênix', snake: '🐍 Cobra',
  elephant: '🐘 Elefante', rhino: '🦏 Rinoceronte', panther: '🐆 Pantera', deer: '🦌 Veado',
  bull: '🐂 Touro', griffin: '🦅 Grifo',
  'eagle-displayed': '🦅 Águia Real', 'deer-head': '🦌 Cervo', falcon: '🦅 Falcão',
  fox: '🦊 Raposa', ram: '🐏 Carneiro',
  'lion-head': '🦁 Cabeça Leão', 'eagle-head': '🦅 Cabeça Águia', 'wolf-head': '🐺 Cabeça Lobo',
  'bear-head': '🐻 Cabeça Urso', swan: '🦢 Cisne',
  lightning: '⚡ Raio', castle: '🏰 Castelo', axe: '🪓 Machado',
  'fleur-de-lis': '⚜ Flor de Lis', 'cross-pattee': '✚ Cruz', 'crescent-moon': '🌙 Lua', 'sun-burst': '☀ Sol',
  feather: '🪶 Pena', 'oak-leaf': '🍂 Folha',
  'letter-A': 'A', 'letter-B': 'B', 'letter-C': 'C', 'letter-F': 'F', 'letter-M': 'M', 'letter-R': 'R', 'letter-S': 'S',
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

function renderIcon(icon: ShieldIcon | undefined, s: number, dc: string, sc: string, filterId: string) {
  if (!icon || icon === 'none') return null;
  const h = s / 2;
  const cy = s * 0.44;
  const r = s * 0.13;

  // Heraldic animal sprite (high-fidelity silhouettes)
  const animalCell = ANIMAL_SPRITE_MAP[icon as string];
  if (animalCell) {
    const fullColor = FULLCOLOR_ANIMALS.has(icon as string);
    return (
      <HeraldicSprite
        spriteHref={heraldicAnimalsSprite}
        cell={animalCell}
        s={s}
        color={dc}
        filterId={filterId}
        recolor={!fullColor}
      />
    );
  }

  // Heraldic symbol sprite (high-fidelity silhouettes)
  const symbolCell = SYMBOL_SPRITE_MAP[icon as string];
  if (symbolCell) {
    return (
      <HeraldicSprite
        spriteHref={heraldicSymbolsSprite}
        cell={symbolCell}
        s={s}
        color={dc}
        filterId={filterId}
        recolor={true}
      />
    );
  }

  // Letters
  if (icon.startsWith('letter-')) {
    const letter = icon.replace('letter-', '');
    return (
      <text x={h} y={cy + s * 0.1} textAnchor="middle" fill={dc} fontSize={s * 0.34} fontWeight="900" fontFamily="Georgia, serif">{letter}</text>
    );
  }

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
      // Heraldic lion-rampant silhouette (dense, profile)
      return (
        <g fill={dc}>
          <path d={`M${h - s * 0.11},${cy + s * 0.13}
            L${h - s * 0.11},${cy - s * 0.02}
            Q${h - s * 0.13},${cy - s * 0.1} ${h - s * 0.06},${cy - s * 0.13}
            Q${h - s * 0.02},${cy - s * 0.16} ${h + s * 0.03},${cy - s * 0.13}
            L${h + s * 0.04},${cy - s * 0.05}
            L${h + s * 0.1},${cy - s * 0.08}
            L${h + s * 0.13},${cy - s * 0.02}
            L${h + s * 0.1},${cy + s * 0.06}
            L${h + s * 0.13},${cy + s * 0.13}
            L${h + s * 0.06},${cy + s * 0.13}
            L${h + s * 0.04},${cy + s * 0.07}
            L${h - s * 0.04},${cy + s * 0.07}
            L${h - s * 0.05},${cy + s * 0.13} Z`} />
          {/* mane spikes */}
          <polygon points={`${h - s * 0.13},${cy - s * 0.08} ${h - s * 0.16},${cy - s * 0.04} ${h - s * 0.11},${cy - s * 0.04}`} />
          <polygon points={`${h - s * 0.13},${cy + s * 0.02} ${h - s * 0.17},${cy + s * 0.02} ${h - s * 0.13},${cy + s * 0.06}`} />
          {/* eye */}
          <circle cx={h - s * 0.05} cy={cy - s * 0.07} r={s * 0.01} fill={sc} />
        </g>
      );
    case 'eagle-icon':
      // Heraldic eagle with spread wings
      return (
        <g fill={dc}>
          <path d={`M${h},${cy - s * 0.13}
            L${h - s * 0.02},${cy - s * 0.04}
            L${h - s * 0.16},${cy - s * 0.08}
            L${h - s * 0.13},${cy + s * 0.02}
            L${h - s * 0.07},${cy + s * 0.02}
            L${h - s * 0.05},${cy + s * 0.1}
            L${h - s * 0.02},${cy + s * 0.04}
            L${h},${cy + s * 0.13}
            L${h + s * 0.02},${cy + s * 0.04}
            L${h + s * 0.05},${cy + s * 0.1}
            L${h + s * 0.07},${cy + s * 0.02}
            L${h + s * 0.13},${cy + s * 0.02}
            L${h + s * 0.16},${cy - s * 0.08}
            L${h + s * 0.02},${cy - s * 0.04} Z`} />
          <circle cx={h} cy={cy - s * 0.085} r={s * 0.012} fill={sc} />
        </g>
      );
    case 'crown-icon':
      // Royal crown — heraldic 5-point with jewels
      return (
        <g fill={dc}>
          <path d={`M${h - s * 0.16},${cy + s * 0.08}
            L${h - s * 0.16},${cy - s * 0.02}
            L${h - s * 0.1},${cy + s * 0.02}
            L${h - s * 0.08},${cy - s * 0.1}
            L${h - s * 0.02},${cy + s * 0.02}
            L${h},${cy - s * 0.13}
            L${h + s * 0.02},${cy + s * 0.02}
            L${h + s * 0.08},${cy - s * 0.1}
            L${h + s * 0.1},${cy + s * 0.02}
            L${h + s * 0.16},${cy - s * 0.02}
            L${h + s * 0.16},${cy + s * 0.08} Z`} />
          <rect x={h - s * 0.16} y={cy + s * 0.08} width={s * 0.32} height={s * 0.04} rx={s * 0.005} />
          {/* jewels */}
          <circle cx={h - s * 0.08} cy={cy - s * 0.1} r={s * 0.018} fill={sc} />
          <circle cx={h} cy={cy - s * 0.13} r={s * 0.022} fill={sc} />
          <circle cx={h + s * 0.08} cy={cy - s * 0.1} r={s * 0.018} fill={sc} />
        </g>
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
      // Heraldic wolf head — sharp triangular profile
      return (
        <g fill={dc}>
          <path d={`M${h - s * 0.13},${cy + s * 0.04}
            L${h - s * 0.1},${cy - s * 0.08}
            L${h - s * 0.05},${cy - s * 0.13}
            L${h - s * 0.02},${cy - s * 0.06}
            L${h + s * 0.02},${cy - s * 0.06}
            L${h + s * 0.05},${cy - s * 0.13}
            L${h + s * 0.1},${cy - s * 0.08}
            L${h + s * 0.13},${cy + s * 0.04}
            L${h + s * 0.06},${cy + s * 0.04}
            L${h},${cy + s * 0.13}
            L${h - s * 0.06},${cy + s * 0.04} Z`} />
          <polygon points={`${h - s * 0.025},${cy + s * 0.04} ${h + s * 0.025},${cy + s * 0.04} ${h},${cy + s * 0.09}`} fill={sc} />
          <circle cx={h - s * 0.045} cy={cy - s * 0.03} r={s * 0.013} fill={sc} />
          <circle cx={h + s * 0.045} cy={cy - s * 0.03} r={s * 0.013} fill={sc} />
        </g>
      );
    case 'dragon':
      return (
        <>
          <path d={`M${h},${cy - s * 0.12} Q${h + s * 0.12},${cy - s * 0.06} ${h + s * 0.1},${cy + s * 0.04} L${h + s * 0.04},${cy + s * 0.1} L${h},${cy + s * 0.06} L${h - s * 0.04},${cy + s * 0.1} L${h - s * 0.1},${cy + s * 0.04} Q${h - s * 0.12},${cy - s * 0.06} ${h},${cy - s * 0.12}`} fill={dc} />
          <circle cx={h - s * 0.03} cy={cy - s * 0.04} r={s * 0.012} fill={sc} />
          <circle cx={h + s * 0.03} cy={cy - s * 0.04} r={s * 0.012} fill={sc} />
        </>
      );
    case 'trophy':
      return (
        <>
          <rect x={h - s * 0.04} y={cy + s * 0.04} width={s * 0.08} height={s * 0.06} fill={dc} rx={s * 0.005} />
          <rect x={h - s * 0.02} y={cy + s * 0.1} width={s * 0.04} height={s * 0.03} fill={dc} />
          <path d={`M${h - s * 0.08},${cy - s * 0.1} L${h - s * 0.07},${cy + s * 0.04} Q${h},${cy + s * 0.08} ${h + s * 0.07},${cy + s * 0.04} L${h + s * 0.08},${cy - s * 0.1} Z`} fill={dc} />
          <path d={`M${h - s * 0.08},${cy - s * 0.06} Q${h - s * 0.14},${cy - s * 0.04} ${h - s * 0.12},${cy + s * 0.02}`} fill="none" stroke={dc} strokeWidth={s * 0.02} strokeLinecap="round" />
          <path d={`M${h + s * 0.08},${cy - s * 0.06} Q${h + s * 0.14},${cy - s * 0.04} ${h + s * 0.12},${cy + s * 0.02}`} fill="none" stroke={dc} strokeWidth={s * 0.02} strokeLinecap="round" />
        </>
      );
    case 'boot':
      return (
        <>
          <path d={`M${h - s * 0.04},${cy - s * 0.1} L${h - s * 0.04},${cy + s * 0.06} L${h + s * 0.1},${cy + s * 0.06} L${h + s * 0.1},${cy + s * 0.02} L${h + s * 0.02},${cy + s * 0.02} L${h + s * 0.02},${cy - s * 0.1} Z`} fill={dc} />
          <rect x={h + s * 0.06} y={cy + s * 0.06} width={s * 0.02} height={s * 0.03} fill={dc} />
          <rect x={h - s * 0.02} y={cy + s * 0.06} width={s * 0.02} height={s * 0.03} fill={dc} />
        </>
      );
    case 'goal-net':
      return (
        <>
          <rect x={h - s * 0.1} y={cy - s * 0.08} width={s * 0.2} height={s * 0.16} fill="none" stroke={dc} strokeWidth={s * 0.025} rx={s * 0.01} />
          <line x1={h - s * 0.1} y1={cy} x2={h + s * 0.1} y2={cy} stroke={dc} strokeWidth={s * 0.012} />
          <line x1={h - s * 0.033} y1={cy - s * 0.08} x2={h - s * 0.033} y2={cy + s * 0.08} stroke={dc} strokeWidth={s * 0.012} />
          <line x1={h + s * 0.033} y1={cy - s * 0.08} x2={h + s * 0.033} y2={cy + s * 0.08} stroke={dc} strokeWidth={s * 0.012} />
          <circle cx={h + s * 0.06} cy={cy + s * 0.03} r={s * 0.025} fill={dc} opacity={0.6} />
        </>
      );
    case 'whistle':
      return (
        <>
          <circle cx={h - s * 0.04} cy={cy} r={s * 0.06} fill={dc} />
          <rect x={h - s * 0.04} y={cy - s * 0.025} width={s * 0.14} height={s * 0.05} fill={dc} rx={s * 0.02} />
          <circle cx={h - s * 0.04} cy={cy} r={s * 0.025} fill={sc} />
          <line x1={h + s * 0.08} y1={cy - s * 0.02} x2={h + s * 0.12} y2={cy - s * 0.08} stroke={dc} strokeWidth={s * 0.015} strokeLinecap="round" />
        </>
      );
    // ── New animals ──
    case 'tiger':
      return (
        <>
          <ellipse cx={h} cy={cy + s * 0.02} rx={s * 0.1} ry={s * 0.08} fill={dc} />
          <polygon points={`${h - s * 0.09},${cy - s * 0.06} ${h - s * 0.05},${cy - s * 0.12} ${h - s * 0.04},${cy - s * 0.02}`} fill={dc} />
          <polygon points={`${h + s * 0.09},${cy - s * 0.06} ${h + s * 0.05},${cy - s * 0.12} ${h + s * 0.04},${cy - s * 0.02}`} fill={dc} />
          <line x1={h - s * 0.07} y1={cy + s * 0.02} x2={h - s * 0.04} y2={cy + s * 0.02} stroke={sc} strokeWidth={s * 0.012} />
          <line x1={h + s * 0.07} y1={cy + s * 0.02} x2={h + s * 0.04} y2={cy + s * 0.02} stroke={sc} strokeWidth={s * 0.012} />
          <circle cx={h - s * 0.035} cy={cy - s * 0.02} r={s * 0.012} fill={sc} />
          <circle cx={h + s * 0.035} cy={cy - s * 0.02} r={s * 0.012} fill={sc} />
          <polygon points={`${h - s * 0.018},${cy + s * 0.05} ${h + s * 0.018},${cy + s * 0.05} ${h},${cy + s * 0.08}`} fill={sc} />
        </>
      );
    case 'bear':
      return (
        <>
          <circle cx={h} cy={cy + s * 0.02} r={s * 0.1} fill={dc} />
          <circle cx={h - s * 0.075} cy={cy - s * 0.06} r={s * 0.035} fill={dc} />
          <circle cx={h + s * 0.075} cy={cy - s * 0.06} r={s * 0.035} fill={dc} />
          <circle cx={h - s * 0.03} cy={cy} r={s * 0.012} fill={sc} />
          <circle cx={h + s * 0.03} cy={cy} r={s * 0.012} fill={sc} />
          <ellipse cx={h} cy={cy + s * 0.06} rx={s * 0.025} ry={s * 0.018} fill={sc} />
        </>
      );
    case 'phoenix':
      return (
        <>
          <path d={`M${h},${cy - s * 0.13} Q${h + s * 0.04},${cy - s * 0.04} ${h + s * 0.12},${cy - s * 0.06} Q${h + s * 0.06},${cy + s * 0.04} ${h + s * 0.04},${cy + s * 0.12} Q${h},${cy + s * 0.06} ${h - s * 0.04},${cy + s * 0.12} Q${h - s * 0.06},${cy + s * 0.04} ${h - s * 0.12},${cy - s * 0.06} Q${h - s * 0.04},${cy - s * 0.04} ${h},${cy - s * 0.13}`} fill={dc} />
          <circle cx={h} cy={cy - s * 0.04} r={s * 0.015} fill={sc} />
        </>
      );
    case 'snake':
      return (
        <>
          <path d={`M${h - s * 0.1},${cy + s * 0.08} Q${h},${cy} ${h + s * 0.08},${cy + s * 0.06} Q${h + s * 0.04},${cy - s * 0.06} ${h - s * 0.04},${cy - s * 0.04} Q${h - s * 0.1},${cy - s * 0.1} ${h},${cy - s * 0.12}`} fill="none" stroke={dc} strokeWidth={s * 0.025} strokeLinecap="round" />
          <circle cx={h + s * 0.005} cy={cy - s * 0.115} r={s * 0.012} fill={sc} />
        </>
      );
    case 'elephant':
      return (
        <>
          <ellipse cx={h} cy={cy + s * 0.02} rx={s * 0.1} ry={s * 0.07} fill={dc} />
          <ellipse cx={h - s * 0.08} cy={cy - s * 0.02} rx={s * 0.04} ry={s * 0.05} fill={dc} />
          <ellipse cx={h + s * 0.08} cy={cy - s * 0.02} rx={s * 0.04} ry={s * 0.05} fill={dc} />
          <path d={`M${h},${cy + s * 0.06} Q${h - s * 0.02},${cy + s * 0.13} ${h + s * 0.02},${cy + s * 0.12}`} fill="none" stroke={dc} strokeWidth={s * 0.022} strokeLinecap="round" />
          <circle cx={h - s * 0.025} cy={cy + s * 0.005} r={s * 0.01} fill={sc} />
          <circle cx={h + s * 0.025} cy={cy + s * 0.005} r={s * 0.01} fill={sc} />
        </>
      );
    case 'rhino':
      return (
        <>
          <ellipse cx={h + s * 0.01} cy={cy + s * 0.03} rx={s * 0.11} ry={s * 0.06} fill={dc} />
          <polygon points={`${h - s * 0.1},${cy + s * 0.02} ${h - s * 0.14},${cy - s * 0.02} ${h - s * 0.08},${cy - s * 0.04}`} fill={dc} />
          <polygon points={`${h - s * 0.11},${cy - s * 0.02} ${h - s * 0.13},${cy - s * 0.08} ${h - s * 0.07},${cy - s * 0.03}`} fill={sc} />
          <circle cx={h - s * 0.02} cy={cy} r={s * 0.012} fill={sc} />
        </>
      );
    case 'panther':
      return (
        <>
          <path d={`M${h - s * 0.1},${cy + s * 0.06} Q${h - s * 0.04},${cy - s * 0.04} ${h + s * 0.04},${cy - s * 0.02} Q${h + s * 0.12},${cy} ${h + s * 0.1},${cy + s * 0.08} L${h - s * 0.04},${cy + s * 0.1} Z`} fill={dc} />
          <polygon points={`${h - s * 0.06},${cy - s * 0.08} ${h - s * 0.02},${cy - s * 0.04} ${h - s * 0.07},${cy - s * 0.02}`} fill={dc} />
          <polygon points={`${h + s * 0.02},${cy - s * 0.08} ${h + s * 0.06},${cy - s * 0.04} ${h + s * 0.01},${cy - s * 0.02}`} fill={dc} />
          <circle cx={h - s * 0.02} cy={cy} r={s * 0.01} fill={sc} />
          <circle cx={h + s * 0.04} cy={cy} r={s * 0.01} fill={sc} />
        </>
      );
    case 'deer':
      return (
        <>
          <ellipse cx={h} cy={cy + s * 0.04} rx={s * 0.05} ry={s * 0.07} fill={dc} />
          <path d={`M${h - s * 0.05},${cy - s * 0.04} Q${h - s * 0.1},${cy - s * 0.13} ${h - s * 0.04},${cy - s * 0.13} M${h - s * 0.05},${cy - s * 0.04} Q${h - s * 0.13},${cy - s * 0.08} ${h - s * 0.12},${cy - s * 0.13}`} fill="none" stroke={dc} strokeWidth={s * 0.018} strokeLinecap="round" />
          <path d={`M${h + s * 0.05},${cy - s * 0.04} Q${h + s * 0.1},${cy - s * 0.13} ${h + s * 0.04},${cy - s * 0.13} M${h + s * 0.05},${cy - s * 0.04} Q${h + s * 0.13},${cy - s * 0.08} ${h + s * 0.12},${cy - s * 0.13}`} fill="none" stroke={dc} strokeWidth={s * 0.018} strokeLinecap="round" />
          <circle cx={h - s * 0.018} cy={cy + s * 0.02} r={s * 0.01} fill={sc} />
          <circle cx={h + s * 0.018} cy={cy + s * 0.02} r={s * 0.01} fill={sc} />
        </>
      );
    case 'bull':
      return (
        <>
          <ellipse cx={h} cy={cy + s * 0.04} rx={s * 0.08} ry={s * 0.07} fill={dc} />
          <path d={`M${h - s * 0.07},${cy - s * 0.02} Q${h - s * 0.14},${cy - s * 0.1} ${h - s * 0.1},${cy - s * 0.12}`} fill="none" stroke={dc} strokeWidth={s * 0.022} strokeLinecap="round" />
          <path d={`M${h + s * 0.07},${cy - s * 0.02} Q${h + s * 0.14},${cy - s * 0.1} ${h + s * 0.1},${cy - s * 0.12}`} fill="none" stroke={dc} strokeWidth={s * 0.022} strokeLinecap="round" />
          <circle cx={h - s * 0.025} cy={cy + s * 0.02} r={s * 0.012} fill={sc} />
          <circle cx={h + s * 0.025} cy={cy + s * 0.02} r={s * 0.012} fill={sc} />
          <circle cx={h} cy={cy + s * 0.08} r={s * 0.012} fill={sc} />
        </>
      );
    case 'griffin':
      return (
        <>
          <path d={`M${h},${cy - s * 0.12} Q${h + s * 0.06},${cy - s * 0.06} ${h + s * 0.04},${cy + s * 0.02} Q${h + s * 0.1},${cy + s * 0.04} ${h + s * 0.12},${cy + s * 0.1} L${h - s * 0.12},${cy + s * 0.1} Q${h - s * 0.1},${cy + s * 0.04} ${h - s * 0.04},${cy + s * 0.02} Q${h - s * 0.06},${cy - s * 0.06} ${h},${cy - s * 0.12}`} fill={dc} />
          <circle cx={h} cy={cy - s * 0.06} r={s * 0.012} fill={sc} />
        </>
      );
    // ── New symbols ──
    case 'lightning':
      return (
        <polygon points={`${h - s * 0.04},${cy - s * 0.13} ${h + s * 0.06},${cy - s * 0.13} ${h - s * 0.005},${cy - s * 0.01} ${h + s * 0.05},${cy - s * 0.01} ${h - s * 0.06},${cy + s * 0.13} ${h + s * 0.005},${cy + s * 0.02} ${h - s * 0.05},${cy + s * 0.02}`} fill={dc} />
      );
    case 'castle':
      return (
        <>
          <rect x={h - s * 0.1} y={cy - s * 0.02} width={s * 0.2} height={s * 0.12} fill={dc} />
          <rect x={h - s * 0.1} y={cy - s * 0.08} width={s * 0.04} height={s * 0.06} fill={dc} />
          <rect x={h - s * 0.02} y={cy - s * 0.08} width={s * 0.04} height={s * 0.06} fill={dc} />
          <rect x={h + s * 0.06} y={cy - s * 0.08} width={s * 0.04} height={s * 0.06} fill={dc} />
          <rect x={h - s * 0.04} y={cy + s * 0.04} width={s * 0.08} height={s * 0.06} fill={sc} opacity={0.55} />
          <polygon points={`${h - s * 0.08},${cy - s * 0.08} ${h},${cy - s * 0.14} ${h + s * 0.08},${cy - s * 0.08}`} fill={dc} opacity={0.6} />
        </>
      );
    case 'axe':
      return (
        <>
          <rect x={h - s * 0.012} y={cy - s * 0.12} width={s * 0.024} height={s * 0.24} fill={dc} />
          <path d={`M${h + s * 0.01},${cy - s * 0.1} Q${h + s * 0.12},${cy - s * 0.06} ${h + s * 0.1},${cy + s * 0.02} L${h + s * 0.012},${cy - s * 0.02} Z`} fill={dc} />
          <path d={`M${h - s * 0.01},${cy - s * 0.1} Q${h - s * 0.12},${cy - s * 0.06} ${h - s * 0.1},${cy + s * 0.02} L${h - s * 0.012},${cy - s * 0.02} Z`} fill={dc} />
        </>
      );
    case 'fleur-de-lis':
      // Proper heraldic fleur-de-lis silhouette
      return (
        <g fill={dc}>
          {/* center petal */}
          <path d={`M${h},${cy - s * 0.13}
            Q${h - s * 0.025},${cy - s * 0.04} ${h - s * 0.018},${cy + s * 0.04}
            Q${h},${cy + s * 0.06} ${h + s * 0.018},${cy + s * 0.04}
            Q${h + s * 0.025},${cy - s * 0.04} ${h},${cy - s * 0.13} Z`} />
          {/* left petal curling out */}
          <path d={`M${h - s * 0.005},${cy - s * 0.04}
            Q${h - s * 0.13},${cy - s * 0.06} ${h - s * 0.11},${cy + s * 0.06}
            Q${h - s * 0.06},${cy + s * 0.02} ${h - s * 0.005},${cy + s * 0.04} Z`} />
          {/* right petal curling out */}
          <path d={`M${h + s * 0.005},${cy - s * 0.04}
            Q${h + s * 0.13},${cy - s * 0.06} ${h + s * 0.11},${cy + s * 0.06}
            Q${h + s * 0.06},${cy + s * 0.02} ${h + s * 0.005},${cy + s * 0.04} Z`} />
          {/* horizontal band */}
          <rect x={h - s * 0.1} y={cy + s * 0.04} width={s * 0.2} height={s * 0.022} rx={s * 0.004} />
          {/* lower stem */}
          <path d={`M${h - s * 0.05},${cy + s * 0.062}
            Q${h},${cy + s * 0.14} ${h + s * 0.05},${cy + s * 0.062} Z`} />
        </g>
      );
    case 'cross-pattee':
      return (
        <>
          <polygon points={`${h - s * 0.025},${cy - s * 0.12} ${h + s * 0.025},${cy - s * 0.12} ${h + s * 0.06},${cy - s * 0.08} ${h + s * 0.06},${cy - s * 0.025} ${h + s * 0.12},${cy - s * 0.025} ${h + s * 0.12},${cy + s * 0.025} ${h + s * 0.06},${cy + s * 0.025} ${h + s * 0.06},${cy + s * 0.08} ${h + s * 0.025},${cy + s * 0.12} ${h - s * 0.025},${cy + s * 0.12} ${h - s * 0.06},${cy + s * 0.08} ${h - s * 0.06},${cy + s * 0.025} ${h - s * 0.12},${cy + s * 0.025} ${h - s * 0.12},${cy - s * 0.025} ${h - s * 0.06},${cy - s * 0.025} ${h - s * 0.06},${cy - s * 0.08}`} fill={dc} />
        </>
      );
    case 'crescent-moon':
      return (
        <path d={`M${h + s * 0.05},${cy - s * 0.1} A${s * 0.11} ${s * 0.11} 0 1 0 ${h + s * 0.05},${cy + s * 0.1} A${s * 0.085} ${s * 0.085} 0 1 1 ${h + s * 0.05},${cy - s * 0.1} Z`} fill={dc} />
      );
    case 'sun-burst':
      return (
        <>
          <circle cx={h} cy={cy} r={s * 0.05} fill={dc} />
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / 8;
            const x1 = h + Math.cos(angle) * s * 0.07;
            const y1 = cy + Math.sin(angle) * s * 0.07;
            const x2 = h + Math.cos(angle) * s * 0.13;
            const y2 = cy + Math.sin(angle) * s * 0.13;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={dc} strokeWidth={s * 0.018} strokeLinecap="round" />;
          })}
        </>
      );
    default:
      return null;
  }
}

export function ShieldCrest({
  primaryColor, secondaryColor, detailColor, pattern, shape = 'classic', size = 64, className = '', icon,
  borderColor, borderWidth, iconScale = 1, iconOffsetX = 0, iconOffsetY = 0, iconRotation = 0,
  iconOpacity = 1, iconMirror = false, topStars = 0, showLaurels = false, showCrown = false,
  bannerText, bannerColor,
}: ShieldProps) {
  const s = size;
  const h = s / 2;
  const dc = detailColor || secondaryColor;
  const bc = borderColor || dc;
  const bw = typeof borderWidth === 'number' ? borderWidth : s * 0.035;
  const shapeKey = (shieldShapes.includes(shape as ShieldShape) ? shape : 'classic') as ShieldShape;
  const shieldPath = shieldPaths[shapeKey](s);
  const clipId = React.useId().replace(/:/g, '');
  const gradId = `grad-${clipId}`;
  const shineId = `shine-${clipId}`;

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
        return (
          <>
            <rect x={h} y={0} width={h} height={s} fill={secondaryColor} />
            <line x1={h} y1={0} x2={h} y2={s} stroke="#000" strokeOpacity={0.25} strokeWidth={s * 0.008} />
          </>
        );
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
            <rect x={s * 0.4} y={s * 0.04} width={s * 0.2} height={s * 0.92} fill={secondaryColor} />
            <rect x={s * 0.04} y={s * 0.36} width={s * 0.92} height={s * 0.2} fill={secondaryColor} />
            <line x1={s * 0.4} y1={s * 0.04} x2={s * 0.4} y2={s * 0.96} stroke="#000" strokeOpacity={0.18} strokeWidth={s * 0.006} />
            <line x1={s * 0.6} y1={s * 0.04} x2={s * 0.6} y2={s * 0.96} stroke="#000" strokeOpacity={0.18} strokeWidth={s * 0.006} />
            <line x1={s * 0.04} y1={s * 0.36} x2={s * 0.96} y2={s * 0.36} stroke="#000" strokeOpacity={0.18} strokeWidth={s * 0.006} />
            <line x1={s * 0.04} y1={s * 0.56} x2={s * 0.96} y2={s * 0.56} stroke="#000" strokeOpacity={0.18} strokeWidth={s * 0.006} />
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
            <rect x={0} y={0} width={h} height={h} fill={secondaryColor} />
            <rect x={h} y={h} width={h} height={h} fill={secondaryColor} />
            <line x1={h} y1={0} x2={h} y2={s} stroke="#000" strokeOpacity={0.22} strokeWidth={s * 0.008} />
            <line x1={0} y1={h} x2={s} y2={h} stroke="#000" strokeOpacity={0.22} strokeWidth={s * 0.008} />
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
      // ── Heraldic divisions (clean, solid colors) ──
      case 'quartered':
        return (
          <>
            <rect x={0} y={0} width={h} height={h} fill={secondaryColor} />
            <rect x={h} y={h} width={h} height={h} fill={secondaryColor} />
            <line x1={h} y1={0} x2={h} y2={s} stroke="#000" strokeOpacity={0.4} strokeWidth={s * 0.012} />
            <line x1={0} y1={h} x2={s} y2={h} stroke="#000" strokeOpacity={0.4} strokeWidth={s * 0.012} />
          </>
        );
      case 'per-pale':
        return (
          <>
            <rect x={h} y={0} width={h} height={s} fill={secondaryColor} />
            <line x1={h} y1={0} x2={h} y2={s} stroke="#000" strokeOpacity={0.35} strokeWidth={s * 0.012} />
          </>
        );
      case 'per-bend':
        return (
          <>
            <polygon points={`0,0 ${s},0 ${s},${s}`} fill={secondaryColor} />
            <line x1={0} y1={0} x2={s} y2={s} stroke="#000" strokeOpacity={0.35} strokeWidth={s * 0.012} />
          </>
        );
      case 'bordure':
        return (
          <>
            <rect x={0} y={0} width={s} height={s} fill={secondaryColor} />
            <rect x={s * 0.14} y={s * 0.1} width={s * 0.72} height={s * 0.78} fill={primaryColor} rx={s * 0.04} />
          </>
        );
      case 'chief':
        return (
          <>
            <rect x={0} y={0} width={s} height={s * 0.34} fill={secondaryColor} />
            <line x1={0} y1={s * 0.34} x2={s} y2={s * 0.34} stroke="#000" strokeOpacity={0.3} strokeWidth={s * 0.01} />
          </>
        );
      default:
        return null;
    }
  };

  // Icon transform: translate to center, apply transforms, then translate back
  const iconCx = h;
  const iconCy = s * 0.44;
  const mirror = iconMirror ? -1 : 1;
  const iconTransform = `translate(${iconOffsetX} ${iconOffsetY}) translate(${iconCx} ${iconCy}) rotate(${iconRotation}) scale(${iconScale * mirror} ${iconScale}) translate(${-iconCx} ${-iconCy})`;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className} xmlns="http://www.w3.org/2000/svg" style={{ transition: 'all 200ms ease' }}>
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
        <g transform={iconTransform} opacity={iconOpacity} style={{ transition: 'all 200ms ease' }}>
          {renderIcon(icon, s, dc, primaryColor, `anim-${clipId}`)}
        </g>
        {/* Top stars (inside shield) */}
        {topStars > 0 && (
          <g>
            {Array.from({ length: topStars }).map((_, i) => {
              const spacing = s * 0.06;
              const startX = h - ((topStars - 1) * spacing) / 2;
              return (
                <text key={i} x={startX + i * spacing} y={s * 0.16} textAnchor="middle" fill={dc} fontSize={s * 0.07} fontWeight="bold">★</text>
              );
            })}
          </g>
        )}
      </g>
      <path d={shieldPath} fill={`url(#${shineId})`} />
      <path d={shieldPath} fill="none" stroke={bc} strokeWidth={bw} opacity={0.92} />

      {/* Decorative layers OUTSIDE the clip */}
      {showCrown && (
        <g>
          <polygon
            points={`${h - s * 0.18},${s * 0.06} ${h - s * 0.12},${s * -0.02} ${h - s * 0.06},${s * 0.05} ${h},${s * -0.04} ${h + s * 0.06},${s * 0.05} ${h + s * 0.12},${s * -0.02} ${h + s * 0.18},${s * 0.06}`}
            fill={bc}
          />
          <rect x={h - s * 0.18} y={s * 0.06} width={s * 0.36} height={s * 0.025} fill={bc} />
          <circle cx={h - s * 0.12} cy={s * -0.02} r={s * 0.014} fill={dc} />
          <circle cx={h} cy={s * -0.04} r={s * 0.014} fill={dc} />
          <circle cx={h + s * 0.12} cy={s * -0.02} r={s * 0.014} fill={dc} />
        </g>
      )}
      {showLaurels && (
        <g>
          {/* Left laurel */}
          <path d={`M${s * 0.04},${s * 0.85} Q${s * -0.04},${s * 0.5} ${s * 0.1},${s * 0.2}`} fill="none" stroke={bc} strokeWidth={s * 0.018} strokeLinecap="round" />
          {[0.25, 0.4, 0.55, 0.7].map((y, i) => (
            <ellipse key={`ll-${i}`} cx={s * (0.025 + i * 0.005)} cy={s * y} rx={s * 0.025} ry={s * 0.014} fill={bc} opacity={0.85} transform={`rotate(${-30 - i * 5} ${s * 0.025} ${s * y})`} />
          ))}
          {/* Right laurel */}
          <path d={`M${s * 0.96},${s * 0.85} Q${s * 1.04},${s * 0.5} ${s * 0.9},${s * 0.2}`} fill="none" stroke={bc} strokeWidth={s * 0.018} strokeLinecap="round" />
          {[0.25, 0.4, 0.55, 0.7].map((y, i) => (
            <ellipse key={`rl-${i}`} cx={s * (0.975 - i * 0.005)} cy={s * y} rx={s * 0.025} ry={s * 0.014} fill={bc} opacity={0.85} transform={`rotate(${30 + i * 5} ${s * 0.975} ${s * y})`} />
          ))}
        </g>
      )}
      {bannerText && (
        <g>
          <path
            d={`M${s * 0.05},${s * 0.86} Q${h},${s * 0.92} ${s * 0.95},${s * 0.86} L${s * 0.9},${s * 0.99} Q${h},${s * 1.02} ${s * 0.1},${s * 0.99} Z`}
            fill={bannerColor || bc}
          />
          <text
            x={h}
            y={s * 0.95}
            textAnchor="middle"
            fill={primaryColor}
            fontSize={s * 0.07}
            fontWeight="bold"
            fontFamily="Georgia, serif"
            style={{ letterSpacing: s * 0.005 }}
          >
            {bannerText.slice(0, 14).toUpperCase()}
          </text>
        </g>
      )}
    </svg>
  );
}
