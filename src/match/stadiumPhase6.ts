/**
 * Stadium Phase 6 — Sócio-Torcedor & Modernizações Modulares (FLM 26)
 *
 * 1) Programa de sócio-torcedor: 3 tiers com mensalidade recorrente,
 *    bônus de ocupação garantido em jogos de liga e impacto em moral da torcida.
 * 2) Upgrades modulares: compras pontuais (telão, gramado híbrido, cobertura,
 *    drenagem, segurança) com efeitos específicos em receita, ocupação,
 *    proteção climática e prevenção de danos.
 *
 * Tudo puro. State vive em `Club.stadiumOps.phase6`.
 */

import type { StadiumModules } from './stadiumEconomics';

// ─── Sócio-Torcedor ──────────────────────────────────────────────────────
export type MembershipTier = 'basico' | 'premium' | 'gold';

export interface MembershipTierConfig {
  tier: MembershipTier;
  label: string;
  emoji: string;
  /** preço mensal cobrado de cada sócio */
  monthlyPrice: number;
  /** % da torcida (fans) que adere se o tier estiver aberto */
  conversionRate: number;
  /** assento garantido em jogos de liga (% de presença mínima sobre os sócios) */
  guaranteedAttendanceRate: number;
  /** impacto na moral da torcida ao manter o programa ativo */
  moodImpact: number;
  /** bônus por sócio em receita comercial por mês (loja, bares parceiros) */
  commercialBonusPerMember: number;
  description: string;
  color: string;
  minStadiumLevel: number;
}

export const MEMBERSHIP_CATALOG: MembershipTierConfig[] = [
  {
    tier: 'basico',
    label: 'Sócio Básico',
    emoji: '🎟️',
    monthlyPrice: 35,
    conversionRate: 0.05,        // 5% da torcida vira sócio
    guaranteedAttendanceRate: 0.40,
    moodImpact: 1,
    commercialBonusPerMember: 4,
    description: 'Desconto em ingressos e prioridade na fila.',
    color: 'text-slate-300',
    minStadiumLevel: 1,
  },
  {
    tier: 'premium',
    label: 'Sócio Premium',
    emoji: '⭐',
    monthlyPrice: 80,
    conversionRate: 0.025,
    guaranteedAttendanceRate: 0.65,
    moodImpact: 2,
    commercialBonusPerMember: 9,
    description: 'Assento marcado, fila exclusiva e desconto na loja.',
    color: 'text-sky-300',
    minStadiumLevel: 4,
  },
  {
    tier: 'gold',
    label: 'Sócio Gold',
    emoji: '👑',
    monthlyPrice: 180,
    conversionRate: 0.01,
    guaranteedAttendanceRate: 0.85,
    moodImpact: 3,
    commercialBonusPerMember: 22,
    description: 'Camarote compartilhado, kit anual e meet & greet.',
    color: 'text-amber-400',
    minStadiumLevel: 7,
  },
];

export interface MembershipState {
  /** tiers que o clube abriu vendas (pode ter os 3 ativos) */
  activeTiers: MembershipTier[];
  /** snapshot do número de sócios por tier (recalculado mensalmente) */
  membersByTier: Partial<Record<MembershipTier, number>>;
  /** ISO timestamp da última cobrança/recálculo */
  lastBilledAt?: string;
}

export function getMembershipConfig(tier: MembershipTier): MembershipTierConfig {
  return MEMBERSHIP_CATALOG.find(m => m.tier === tier)!;
}

/** Recalcula sócios por tier baseado na torcida atual. */
export function recomputeMembers(
  activeTiers: MembershipTier[],
  fans: number,
  reputation: number,
): Partial<Record<MembershipTier, number>> {
  const out: Partial<Record<MembershipTier, number>> = {};
  // Reputação alta atrai mais sócios (+ até 50%)
  const repBoost = 0.7 + (reputation / 100) * 0.6; // 0.7..1.3
  for (const tier of activeTiers) {
    const cfg = getMembershipConfig(tier);
    out[tier] = Math.max(0, Math.floor(fans * cfg.conversionRate * repBoost));
  }
  return out;
}

export interface MembershipBilling {
  totalRevenue: number;
  totalMembers: number;
  byTier: Array<{ tier: MembershipTier; members: number; revenue: number; commercialBonus: number }>;
  moodDelta: number;
}

export function billMembership(state: MembershipState): MembershipBilling {
  let totalRevenue = 0;
  let totalMembers = 0;
  let moodDelta = 0;
  const byTier: MembershipBilling['byTier'] = [];
  for (const tier of state.activeTiers) {
    const cfg = getMembershipConfig(tier);
    const members = state.membersByTier[tier] ?? 0;
    const revenue = members * cfg.monthlyPrice;
    const commercialBonus = members * cfg.commercialBonusPerMember;
    totalRevenue += revenue + commercialBonus;
    totalMembers += members;
    moodDelta += cfg.moodImpact;
    byTier.push({ tier, members, revenue, commercialBonus });
  }
  return { totalRevenue, totalMembers, byTier, moodDelta };
}

/**
 * Sócios garantem comparecimento mínimo no estádio em qualquer jogo de liga.
 * Retorna a quantidade extra (acima do baseAttendance) que deve ser somada,
 * limitada à capacidade.
 */
export function getMembershipAttendanceFloor(
  state: MembershipState | undefined,
  capacity: number,
): number {
  if (!state || state.activeTiers.length === 0) return 0;
  let floor = 0;
  for (const tier of state.activeTiers) {
    const cfg = getMembershipConfig(tier);
    const members = state.membersByTier[tier] ?? 0;
    floor += Math.floor(members * cfg.guaranteedAttendanceRate);
  }
  return Math.min(capacity, floor);
}

// ─── Upgrades Modulares ──────────────────────────────────────────────────
export type ModularUpgradeId =
  | 'big_screen'        // Telão LED 4K
  | 'hybrid_pitch'      // Gramado híbrido
  | 'retractable_roof'  // Cobertura retrátil
  | 'drainage_system'   // Drenagem profissional
  | 'electronic_security'; // Segurança eletrônica

export interface ModularUpgrade {
  id: ModularUpgradeId;
  label: string;
  emoji: string;
  cost: number;
  monthlyCost: number;          // manutenção fixa
  minStadiumLevel: number;
  description: string;
  effect: string;               // texto curto p/ UI
  category: 'receita' | 'protecao' | 'conforto' | 'seguranca';
}

export const MODULAR_UPGRADES: ModularUpgrade[] = [
  {
    id: 'big_screen', label: 'Telão LED 4K', emoji: '📺',
    cost: 1_200_000, monthlyCost: 8_000, minStadiumLevel: 3,
    description: 'Painel gigante com replays e publicidade dinâmica.',
    effect: '+R$ 6/torcedor por jogo (publicidade)',
    category: 'receita',
  },
  {
    id: 'hybrid_pitch', label: 'Gramado Híbrido', emoji: '🌱',
    cost: 2_500_000, monthlyCost: 18_000, minStadiumLevel: 5,
    description: 'Fibras sintéticas tornam o gramado quase indestrutível.',
    effect: '−40% chance de dano no gramado em eventos',
    category: 'protecao',
  },
  {
    id: 'retractable_roof', label: 'Cobertura Retrátil', emoji: '⛱️',
    cost: 9_000_000, monthlyCost: 60_000, minStadiumLevel: 10,
    description: 'Teto móvel protege contra chuva, sol e granizo.',
    effect: '−70% chance de dano por clima + ocupação não cai com chuva',
    category: 'protecao',
  },
  {
    id: 'drainage_system', label: 'Drenagem Profissional', emoji: '🚰',
    cost: 800_000, monthlyCost: 5_000, minStadiumLevel: 2,
    description: 'Sistema sub-gramado evita inundações.',
    effect: '−50% chance de dano em chuvas pesadas',
    category: 'protecao',
  },
  {
    id: 'electronic_security', label: 'Segurança Eletrônica', emoji: '📡',
    cost: 1_500_000, monthlyCost: 12_000, minStadiumLevel: 4,
    description: 'Câmeras IA + catracas biométricas.',
    effect: '−25% multas por incidentes + ocupação +3% (segurança percebida)',
    category: 'seguranca',
  },
];

export function getUpgradeConfig(id: ModularUpgradeId): ModularUpgrade {
  return MODULAR_UPGRADES.find(u => u.id === id)!;
}

export interface ModularUpgradesState {
  owned: ModularUpgradeId[];
  purchasedAt: Partial<Record<ModularUpgradeId, string>>;
}

// ─── Phase 6 root state ──────────────────────────────────────────────────
export interface StadiumPhase6State {
  membership: MembershipState;
  upgrades: ModularUpgradesState;
}

export function emptyPhase6State(): StadiumPhase6State {
  return {
    membership: { activeTiers: [], membersByTier: {} },
    upgrades: { owned: [], purchasedAt: {} },
  };
}

// ─── Efeitos compostos dos upgrades ─────────────────────────────────────
export interface UpgradeEffects {
  /** receita extra por torcedor presente (publicidade do telão) */
  bonusCommercialPerFan: number;
  /** multiplicador de chance de dano em eventos (1 = neutro, < 1 reduz) */
  eventDamageMult: number;
  /** multiplicador de chance de dano por clima */
  weatherDamageMult: number;
  /** bônus em ocupação base (0..1) */
  occupancyBonus: number;
  /** desconto em multas (0..1) */
  fineDiscount: number;
  /** custo mensal total dos upgrades */
  totalMonthlyCost: number;
  /** clube tem cobertura retrátil? */
  hasRoof: boolean;
  /** clube tem gramado híbrido? */
  hasHybridPitch: boolean;
}

export function computeUpgradeEffects(state: ModularUpgradesState | undefined): UpgradeEffects {
  const owned = new Set(state?.owned ?? []);
  const has = (id: ModularUpgradeId) => owned.has(id);
  let bonusCommercialPerFan = 0;
  let eventDamageMult = 1;
  let weatherDamageMult = 1;
  let occupancyBonus = 0;
  let fineDiscount = 0;
  let totalMonthlyCost = 0;
  for (const id of owned) {
    totalMonthlyCost += getUpgradeConfig(id).monthlyCost;
  }
  if (has('big_screen')) bonusCommercialPerFan += 6;
  if (has('hybrid_pitch')) eventDamageMult *= 0.6;
  if (has('drainage_system')) weatherDamageMult *= 0.5;
  if (has('retractable_roof')) weatherDamageMult *= 0.3;
  if (has('electronic_security')) {
    occupancyBonus += 0.03;
    fineDiscount += 0.25;
  }
  return {
    bonusCommercialPerFan,
    eventDamageMult,
    weatherDamageMult,
    occupancyBonus,
    fineDiscount,
    totalMonthlyCost,
    hasRoof: has('retractable_roof'),
    hasHybridPitch: has('hybrid_pitch'),
  };
}

/** Custo mensal total da Fase 6 (para o relatório financeiro). */
export function getPhase6MonthlyCost(state: StadiumPhase6State | undefined): number {
  if (!state) return 0;
  return computeUpgradeEffects(state.upgrades).totalMonthlyCost;
}
