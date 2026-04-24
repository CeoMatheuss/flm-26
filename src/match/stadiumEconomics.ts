/**
 * Stadium Economics — Fase 1 do sistema de gestão de estádio (FLM 26)
 *
 * Modela 5 módulos (Arquibancada/Camarotes/Comercial/Estacionamento/Infraestrutura)
 * derivados do nível do estádio (1-15) e calcula receita dinâmica por partida
 * com base em demanda (forma + reputação + importância + preço do ingresso).
 *
 * IMPORTANTE: usa a MESMA fórmula de público da `FansTab` para garantir
 * uma única fonte de verdade. Camarotes precisam ser CONSTRUÍDOS após desbloqueio.
 */

import { getStadiumCapacity } from '@/types/infrastructure';

// ─── Tipos ────────────────────────────────────────────────────────────────
export type VipTier = 'bronze' | 'prata' | 'ouro' | 'master';

export interface VipBoxTier {
  tier: VipTier;
  unlockLevel: number;       // nível mínimo do estádio para destravar
  buildCost: number;         // custo para construir 1 unidade
  maxAtFullStadium: number;  // limite máximo (no Nv 15)
  priceMatch: number;        // valor por jogo (1 unidade ocupada)
  monthlyContract: number;   // renda fixa de empresas (mensal por unidade)
  emoji: string;
  label: string;
  color: string;             // tailwind text color
}

export interface VipBoxOwnership {
  tier: VipTier;
  built: number;
  cap: number;               // máximo no nível atual
  unlocked: boolean;
}

export interface StadiumModules {
  seatingCapacity: number;
  vipBoxes: VipBoxOwnership[];
  parkingSpots: number;
  commercialPerFan: number;
  level: number;
  weeklyMaintenance: number;
}

export type MatchImportance = 'amistoso' | 'liga' | 'classico' | 'final';

export interface DemandInputs {
  fans: number;
  reputation: number;
  ticketPrice: number;
  winStreak?: number;
  loseStreak?: number;
  importance?: MatchImportance;
  isHomeAdvantageActive?: boolean;
}

export interface MatchRevenueBreakdown {
  attendance: number;
  capacity: number;
  occupancy: number;
  ticketRevenue: number;
  vipRevenue: number;
  commercialRevenue: number;
  parkingRevenue: number;
  total: number;
  parkingUsed: number;
}

// ─── Camarotes: catálogo base ─────────────────────────────────────────────
export const VIP_CATALOG: VipBoxTier[] = [
  {
    tier: 'bronze', unlockLevel: 3, buildCost: 250_000, maxAtFullStadium: 32,
    priceMatch: 1_500, monthlyContract: 8_000,
    emoji: '🥉', label: 'Bronze', color: 'text-amber-700',
  },
  {
    tier: 'prata', unlockLevel: 6, buildCost: 800_000, maxAtFullStadium: 17,
    priceMatch: 4_000, monthlyContract: 22_000,
    emoji: '🥈', label: 'Prata', color: 'text-slate-300',
  },
  {
    tier: 'ouro', unlockLevel: 9, buildCost: 2_500_000, maxAtFullStadium: 8,
    priceMatch: 9_000, monthlyContract: 55_000,
    emoji: '🥇', label: 'Ouro', color: 'text-amber-400',
  },
  {
    tier: 'master', unlockLevel: 12, buildCost: 8_000_000, maxAtFullStadium: 2,
    priceMatch: 22_000, monthlyContract: 140_000,
    emoji: '👑', label: 'Master', color: 'text-fuchsia-400',
  },
];

/** Limite atual de cada tier conforme o nível do estádio. */
export function getVipCapAtLevel(tier: VipTier, stadiumLevel: number): number {
  const cfg = VIP_CATALOG.find(v => v.tier === tier);
  if (!cfg || stadiumLevel < cfg.unlockLevel) return 0;
  const span = 15 - cfg.unlockLevel;
  if (span <= 0) return cfg.maxAtFullStadium;
  const progress = (stadiumLevel - cfg.unlockLevel) / span; // 0..1
  // Começa em 1 unidade e cresce até o teto
  return Math.max(1, Math.round(1 + (cfg.maxAtFullStadium - 1) * progress));
}

export function getVipTierConfig(tier: VipTier): VipBoxTier {
  return VIP_CATALOG.find(v => v.tier === tier)!;
}

/** Constrói os módulos do estádio a partir do nível e dos VIPs já construídos. */
export function buildStadiumModules(
  level: number,
  vipBoxesBuilt?: Partial<Record<VipTier, number>>,
): StadiumModules {
  const seatingCapacity = getStadiumCapacity(level);
  const built = vipBoxesBuilt ?? {};

  const vipBoxes: VipBoxOwnership[] = VIP_CATALOG.map(cfg => {
    const cap = getVipCapAtLevel(cfg.tier, level);
    const builtCount = Math.min(built[cfg.tier] ?? 0, cap);
    return {
      tier: cfg.tier,
      built: builtCount,
      cap,
      unlocked: level >= cfg.unlockLevel,
    };
  });

  const commercialPerFan = 4 + level * 1;       // R$ 5 → R$ 19
  const parkingSpots = Math.round(seatingCapacity * 0.05);
  const weeklyMaintenance = Math.round(15_000 + level * level * 1_200);

  return { seatingCapacity, vipBoxes, parkingSpots, commercialPerFan, level, weeklyMaintenance };
}

// ─── Demanda — usa a MESMA fórmula da FansTab ─────────────────────────────
/**
 * Multiplicador de público baseado em sequência de vitórias/derrotas.
 * Espelha exatamente o que o jogador vê em "Torcida → Previsão de Público".
 */
export function streakMultiplier(winStreak: number, loseStreak: number): number {
  if (winStreak >= 4) return 1.5;
  if (winStreak >= 3) return 1.3;
  if (winStreak >= 2) return 1.15;
  if (loseStreak >= 6) return 0.5;
  if (loseStreak >= 5) return 0.6;
  if (loseStreak >= 4) return 0.75;
  if (loseStreak >= 3) return 0.85;
  return 1;
}

/** Multiplicador de público por preço do ingresso (mesmo da FansTab). */
export function priceMultiplier(ticketPrice: number): number {
  if (ticketPrice > 100) return 0.7;
  if (ticketPrice > 60) return 0.85;
  if (ticketPrice < 15) return 1.2;
  return 1;
}

/** Avaliador semafórico do preço do ingresso. */
export interface PriceVerdict {
  level: 'great' | 'good' | 'fair' | 'high' | 'bad';
  label: string;
  description: string;
  color: string; // tailwind class
  emoji: string;
}

export function evaluateTicketPrice(ticketPrice: number, reputation: number): PriceVerdict {
  // Preço "ideal" cresce um pouco com a reputação (clube grande cobra mais)
  const sweetSpot = 25 + (reputation / 100) * 35; // ~25 a 60
  const ratio = ticketPrice / sweetSpot;

  if (ratio < 0.5) return {
    level: 'great', emoji: '🤑', color: 'text-emerald-400',
    label: 'Promocional',
    description: 'Estádio LOTADO garantido, mas você cobra pouco por ingresso. Volume compensa.',
  };
  if (ratio <= 0.85) return {
    level: 'good', emoji: '✅', color: 'text-emerald-300',
    label: 'Atrativo',
    description: 'Bom equilíbrio: público alto e receita por ingresso decente.',
  };
  if (ratio <= 1.2) return {
    level: 'fair', emoji: '🎯', color: 'text-amber-300',
    label: 'Justo',
    description: 'Preço alinhado com o tamanho do clube. Receita ótima, público estável.',
  };
  if (ratio <= 1.8) return {
    level: 'high', emoji: '⚠️', color: 'text-orange-400',
    label: 'Caro',
    description: 'Você está espantando torcedores. Receita por jogo cai com o público vazio.',
  };
  return {
    level: 'bad', emoji: '🚫', color: 'text-red-400',
    label: 'Abusivo',
    description: 'Estádio vai ficar vazio. Reduza o preço ou venda só p/ camarotes.',
  };
}

/**
 * Calcula público esperado.
 * IMPORTANTE: replica a fórmula EXATA da FansTab para consistência.
 */
export function computeExpectedAttendance(
  inputs: Required<Pick<DemandInputs, 'fans' | 'reputation' | 'ticketPrice'>> & {
    winStreak?: number; loseStreak?: number;
    capacity: number;
    importance?: MatchImportance;
    isHomeAdvantageActive?: boolean;
  },
): number {
  const {
    fans, reputation, ticketPrice, capacity,
    winStreak = 0, loseStreak = 0,
    importance = 'liga',
    isHomeAdvantageActive = true,
  } = inputs;

  const baseAttendance = Math.min(fans * 0.15, capacity);
  const sm = streakMultiplier(winStreak, loseStreak);
  const pm = priceMultiplier(ticketPrice);
  const reputationBonus = reputation / 100;
  const impMult: Record<MatchImportance, number> = {
    amistoso: 0.80, liga: 1.0, classico: 1.20, final: 1.30,
  };
  const homeMult = isHomeAdvantageActive ? 1.0 : 0.70;

  const raw = baseAttendance * sm * pm * (0.7 + reputationBonus * 0.5) * impMult[importance] * homeMult;
  return Math.min(capacity, Math.max(0, Math.floor(raw)));
}

// ─── Receita por partida ──────────────────────────────────────────────────
export interface MatchRevenueExtras {
  /** Fase 6 — bônus de comercial/torcedor (telão LED) */
  bonusCommercialPerFan?: number;
  /** Fase 6 — bônus em ocupação base (segurança eletrônica, etc.) — 0..1 */
  occupancyBonus?: number;
  /** Fase 6 — piso de público garantido por sócios-torcedores */
  membershipFloor?: number;
}

export function computeMatchRevenue(
  modules: StadiumModules,
  demand: DemandInputs,
  extras: MatchRevenueExtras = {},
): MatchRevenueBreakdown {
  let attendance = computeExpectedAttendance({
    fans: demand.fans,
    reputation: demand.reputation,
    ticketPrice: demand.ticketPrice,
    winStreak: demand.winStreak ?? 0,
    loseStreak: demand.loseStreak ?? 0,
    capacity: modules.seatingCapacity,
    importance: demand.importance,
    isHomeAdvantageActive: demand.isHomeAdvantageActive,
  });

  // Aplica bônus de ocupação (segurança eletrônica)
  if (extras.occupancyBonus && extras.occupancyBonus > 0) {
    attendance = Math.min(modules.seatingCapacity, Math.floor(attendance * (1 + extras.occupancyBonus)));
  }
  // Sócios-torcedores garantem comparecimento mínimo
  if (extras.membershipFloor && extras.membershipFloor > 0) {
    attendance = Math.max(attendance, Math.min(modules.seatingCapacity, extras.membershipFloor));
  }

  const capacity = modules.seatingCapacity;
  const occupancy = capacity > 0 ? attendance / capacity : 0;

  const ticketRevenue = attendance * Math.max(5, demand.ticketPrice);

  // VIP: ocupação dos camarotes segue uma versão suavizada da demanda (sempre alta)
  const vipOccupancy = Math.max(0.5, 0.6 + occupancy * 0.4);
  const vipRevenue = modules.vipBoxes.reduce((sum, box) => {
    if (box.built === 0) return sum;
    const cfg = getVipTierConfig(box.tier);
    return sum + Math.round(box.built * vipOccupancy) * cfg.priceMatch;
  }, 0);

  const commercialPerFan = modules.commercialPerFan + (extras.bonusCommercialPerFan ?? 0);
  const commercialRevenue = attendance * commercialPerFan;

  const parkingUsed = Math.min(
    modules.parkingSpots,
    Math.round(modules.parkingSpots * (0.4 + occupancy * 0.5)),
  );
  const parkingPrice = 25 + modules.level * 2;
  const parkingRevenue = parkingUsed * parkingPrice;

  const total = ticketRevenue + vipRevenue + commercialRevenue + parkingRevenue;

  return {
    attendance, capacity, occupancy,
    ticketRevenue, vipRevenue, commercialRevenue, parkingRevenue,
    parkingUsed, total,
  };
}

/** Renda fixa mensal dos contratos VIP (empresas). */
export function getMonthlyVipContractIncome(modules: StadiumModules): number {
  return modules.vipBoxes.reduce((sum, box) => {
    if (box.built === 0) return sum;
    const cfg = getVipTierConfig(box.tier);
    return sum + box.built * cfg.monthlyContract;
  }, 0);
}
