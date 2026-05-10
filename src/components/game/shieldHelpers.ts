import type { ShieldConfig, ShieldShape, ShieldPattern, ShieldIcon } from './ShieldCrest';

/**
 * Returns the props to spread onto <ShieldCrest /> for a given club-like object.
 * Priority order:
 *   1. Full `shieldConfig` (V2 advanced editor) — spreads all transform/decoration fields
 *   2. Legacy fields (`shieldPattern` / `shieldShape` / `primaryColor` / etc)
 *   3. Sensible defaults
 *
 * Works for both the local Club object and remote/league member metadata.
 */
export interface ShieldSourceLike {
  shieldConfig?: Partial<ShieldConfig> & { shape?: string; pattern?: string; icon?: string; primaryColor?: string; secondaryColor?: string; detailColor?: string };
  primaryColor?: string;
  secondaryColor?: string;
  detailColor?: string;
  shieldPattern?: string;
  shieldShape?: string;
  shieldIcon?: string;
  logoUrl?: string;
}

export interface ShieldRenderProps {
  primaryColor: string;
  secondaryColor: string;
  detailColor?: string;
  pattern: string;
  shape?: ShieldShape;
  icon?: ShieldIcon;
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

export function shieldPropsFromClub(source: ShieldSourceLike | null | undefined): ShieldRenderProps {
  const cfg = source?.shieldConfig;
  if (cfg && cfg.pattern) {
    return {
      primaryColor: cfg.primaryColor || source?.primaryColor || '#2563EB',
      secondaryColor: cfg.secondaryColor || source?.secondaryColor || '#FFFFFF',
      detailColor: cfg.detailColor || source?.detailColor,
      pattern: cfg.pattern as ShieldPattern,
      shape: (cfg.shape as ShieldShape) || 'classic',
      icon: cfg.icon as ShieldIcon | undefined,
      borderColor: cfg.borderColor,
      borderWidth: cfg.borderWidth,
      iconScale: cfg.iconScale,
      iconOffsetX: cfg.iconOffsetX,
      iconOffsetY: cfg.iconOffsetY,
      iconRotation: cfg.iconRotation,
      iconOpacity: cfg.iconOpacity,
      iconMirror: cfg.iconMirror,
      topStars: cfg.topStars,
      showLaurels: cfg.showLaurels,
      showCrown: cfg.showCrown,
      bannerText: cfg.bannerText,
      bannerColor: cfg.bannerColor,
    };
  }

  return {
    primaryColor: source?.primaryColor || '#2563EB',
    secondaryColor: source?.secondaryColor || '#FFFFFF',
    detailColor: source?.detailColor,
    pattern: source?.shieldPattern || 'solid',
    shape: (source?.shieldShape as ShieldShape) || 'classic',
    icon: source?.shieldIcon as ShieldIcon | undefined,
  };
}

/** Returns true if the source has a renderable shield (legacy or V2). */
export function hasShield(source: ShieldSourceLike | null | undefined): boolean {
  if (!source) return false;
  return !!(source.shieldConfig?.pattern || source.shieldPattern);
}
