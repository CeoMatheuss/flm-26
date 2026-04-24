/**
 * Stadium Achievements & Sponsors — Fase 5
 *
 * - Missões/conquistas relacionadas ao estádio (público, eventos, sem dano, etc.)
 * - Sponsors específicos do estádio (naming rights, telão, lounge VIP)
 * - Multa por jogar partidas oficiais com o estádio danificado
 */

import type { StadiumOpsState } from './stadiumEvents';
import type { StadiumModules } from './stadiumEconomics';

// ─── Conquistas ───────────────────────────────────────────────────────────
export type StadiumAchievementId =
  | 'first_event'        // Primeiro evento aceito
  | 'sold_out'           // Estádio LOTADO (>95%)
  | 'no_damage_streak'   // 3 eventos sem dano
  | 'big_show'           // Festival/Show Rock realizado
  | 'insurance_saver'    // Seguro evitou dano (preventivo)
  | 'vip_full'           // Todos os tiers VIP construídos
  | 'finance_positive_30d' // Saldo positivo nos últimos 30 dias
  | 'level_max';         // Estádio Nível 15

export interface StadiumAchievement {
  id: StadiumAchievementId;
  label: string;
  description: string;
  emoji: string;
  reward: number;          // dinheiro
  fanReward?: number;
  reputationReward?: number;
}

export const STADIUM_ACHIEVEMENTS: StadiumAchievement[] = [
  { id: 'first_event',        label: 'Estreia nos Bastidores',  description: 'Aceite seu primeiro evento no estádio.',           emoji: '🎤', reward: 25_000,  fanReward: 50 },
  { id: 'sold_out',           label: 'Casa Cheia!',             description: 'Atinja 95%+ de ocupação em uma partida.',          emoji: '🎟️', reward: 80_000,  fanReward: 200, reputationReward: 2 },
  { id: 'no_damage_streak',   label: 'Operação Impecável',      description: 'Realize 3 eventos seguidos sem qualquer dano.',    emoji: '✨', reward: 150_000, reputationReward: 3 },
  { id: 'big_show',           label: 'Palco Internacional',     description: 'Sedie um Festival ou Show Rock Internacional.',    emoji: '🎸', reward: 250_000, reputationReward: 5, fanReward: 300 },
  { id: 'insurance_saver',    label: 'Coberto pelo Seguro',     description: 'O seguro premium evitou um desastre climático.',   emoji: '🛡️', reward: 50_000 },
  { id: 'vip_full',           label: 'Império VIP',             description: 'Construa pelo menos 1 camarote de cada tier.',     emoji: '👑', reward: 500_000, reputationReward: 4 },
  { id: 'finance_positive_30d', label: 'Diretoria Sorridente',  description: 'Saldo positivo do estádio nos últimos 30 dias.',   emoji: '📈', reward: 100_000 },
  { id: 'level_max',          label: 'Catedral do Futebol',     description: 'Eleve seu estádio ao Nível 15.',                   emoji: '🏟️', reward: 1_000_000, reputationReward: 10, fanReward: 1000 },
];

export interface StadiumAchievementState {
  unlocked: StadiumAchievementId[];
  progress: { noDamageStreak?: number };
}

export function emptyAchievementState(): StadiumAchievementState {
  return { unlocked: [], progress: {} };
}

export function getAchievement(id: StadiumAchievementId): StadiumAchievement {
  return STADIUM_ACHIEVEMENTS.find(a => a.id === id)!;
}

// ─── Sponsors específicos do estádio ──────────────────────────────────────
export type StadiumSponsorSlot = 'naming' | 'screen' | 'lounge';

export interface StadiumSponsorOffer {
  id: string;
  slot: StadiumSponsorSlot;
  brand: string;
  /** R$/mês */
  monthlyPay: number;
  /** Duração do contrato em meses */
  durationMonths: number;
  /** Reputação mínima para receber a oferta */
  minReputation: number;
  /** Nível de estádio mínimo */
  minStadiumLevel: number;
  /** Bônus se o estádio estiver em ótimo estado (sem danos) */
  bonusIfHealthy?: number;
  expiresAt: string;
  createdAt: string;
}

export interface StadiumSponsorContract {
  id: string;
  slot: StadiumSponsorSlot;
  brand: string;
  monthlyPay: number;
  bonusIfHealthy: number;
  startedAt: string;
  endsAt: string;
  /** Próxima cobrança/pagamento mensal */
  nextPayoutAt: string;
}

const SPONSOR_BRANDS: Record<StadiumSponsorSlot, string[]> = {
  naming: ['Itaú Arena', 'Bradesco Stadium', 'Petrobras Park', 'Vivo Arena', 'Banco do Brasil Stadium'],
  screen: ['Samsung Vision', 'LG Megascreen', 'Sony Live', 'Philips Display'],
  lounge: ['Heineken Lounge', 'Stella VIP', 'Veuve Premium', 'Brahma Box'],
};

const SLOT_CONFIG: Record<StadiumSponsorSlot, { label: string; emoji: string; baseFactor: number; minLevel: number }> = {
  naming: { label: 'Naming Rights', emoji: '🏟️', baseFactor: 0.18, minLevel: 5 },
  screen: { label: 'Telão Oficial',  emoji: '📺', baseFactor: 0.07, minLevel: 3 },
  lounge: { label: 'Lounge VIP',     emoji: '🥂', baseFactor: 0.10, minLevel: 6 },
};

export const STADIUM_SPONSOR_SLOT_META = SLOT_CONFIG;

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function generateStadiumSponsorOffers(input: {
  modules: StadiumModules;
  reputation: number;
  existingContracts: StadiumSponsorContract[];
  existingOffersCount: number;
}): StadiumSponsorOffer[] {
  if (input.existingOffersCount >= 3) return [];
  const occupiedSlots = new Set(input.existingContracts.map(c => c.slot));
  const available = (Object.keys(SLOT_CONFIG) as StadiumSponsorSlot[]).filter(s => {
    const cfg = SLOT_CONFIG[s];
    return !occupiedSlots.has(s)
      && input.modules.level >= cfg.minLevel
      && input.reputation >= (s === 'naming' ? 60 : s === 'lounge' ? 40 : 25);
  });
  if (available.length === 0) return [];

  const slot = pick(available);
  const cfg = SLOT_CONFIG[slot];
  const repFactor = 0.6 + input.reputation / 150;     // 0.6..1.27
  const variance = 0.85 + Math.random() * 0.30;
  const baseMonthly = input.modules.seatingCapacity * cfg.baseFactor * repFactor * variance;
  const monthlyPay = Math.round(baseMonthly);
  const bonusIfHealthy = Math.round(monthlyPay * 0.10);

  return [{
    id: `spons_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    slot,
    brand: pick(SPONSOR_BRANDS[slot]),
    monthlyPay,
    durationMonths: 6 + Math.floor(Math.random() * 7), // 6-12 meses
    minReputation: slot === 'naming' ? 60 : slot === 'lounge' ? 40 : 25,
    minStadiumLevel: cfg.minLevel,
    bonusIfHealthy,
    expiresAt: new Date(Date.now() + (3 + Math.random() * 3) * 24 * 3600_000).toISOString(),
    createdAt: new Date().toISOString(),
  }];
}

export function acceptSponsorOffer(offer: StadiumSponsorOffer): StadiumSponsorContract {
  const now = Date.now();
  return {
    id: `cspon_${now}_${Math.random().toString(36).slice(2, 7)}`,
    slot: offer.slot,
    brand: offer.brand,
    monthlyPay: offer.monthlyPay,
    bonusIfHealthy: offer.bonusIfHealthy ?? 0,
    startedAt: new Date(now).toISOString(),
    endsAt: new Date(now + offer.durationMonths * 30 * 24 * 3600_000).toISOString(),
    nextPayoutAt: new Date(now + 30 * 24 * 3600_000).toISOString(),
  };
}

// ─── Multa por jogo com estádio danificado ────────────────────────────────
export interface StadiumMatchPenalty {
  fine: number;
  reputationLoss: number;
  reason: string;
}

/**
 * Calcula multa quando partida oficial acontece com danos não reparados.
 * - Dano leve: 0 (apenas aviso)
 * - Dano médio: -R$30k + -1 reputação
 * - Dano alto: -R$120k + -2 reputação
 * - Dano extremo: -R$300k + -4 reputação
 */
export function computeMatchPenalty(ops?: StadiumOpsState, isFriendly = false): StadiumMatchPenalty | null {
  if (isFriendly) return null;
  if (!ops || !ops.damages) return null;
  const active = ops.damages.filter(d => !d.repairing);
  if (active.length === 0) return null;

  const worst = active.reduce((a, b) => {
    const order = { baixo: 1, medio: 2, alto: 3, extremo: 4 } as const;
    return order[a.severity] >= order[b.severity] ? a : b;
  });

  const map = {
    baixo:   { fine: 0,        rep: 0, label: 'Leve' },
    medio:   { fine: 30_000,   rep: 1, label: 'Moderado' },
    alto:    { fine: 120_000,  rep: 2, label: 'Alto' },
    extremo: { fine: 300_000,  rep: 4, label: 'Extremo' },
  } as const;
  const m = map[worst.severity];
  if (m.fine === 0 && m.rep === 0) return null;
  return {
    fine: m.fine,
    reputationLoss: m.rep,
    reason: `Estádio com dano ${m.label} (${worst.sourceLabel}) — multa da liga e perda de reputação.`,
  };
}

// ─── Detecção de unlock de conquistas ─────────────────────────────────────
export interface AchievementCheckInput {
  ops?: StadiumOpsState;
  modules: StadiumModules;
  occupancy?: number;            // partida recém jogada
  acceptedEventCategory?: string; // novo evento aceito
  insurancePrevented?: boolean;
  financeNet30d?: number;
}

export function detectNewAchievements(
  state: StadiumAchievementState,
  input: AchievementCheckInput,
): StadiumAchievementId[] {
  const newly: StadiumAchievementId[] = [];
  const has = (id: StadiumAchievementId) => state.unlocked.includes(id);

  if (!has('first_event') && (input.ops?.acceptedEvents.length ?? 0) > 0) {
    newly.push('first_event');
  }
  if (!has('sold_out') && (input.occupancy ?? 0) >= 0.95) {
    newly.push('sold_out');
  }
  if (!has('no_damage_streak') && (state.progress.noDamageStreak ?? 0) >= 3) {
    newly.push('no_damage_streak');
  }
  if (!has('big_show') && (input.acceptedEventCategory === 'festival' || input.acceptedEventCategory === 'show_rock')) {
    newly.push('big_show');
  }
  if (!has('insurance_saver') && input.insurancePrevented) {
    newly.push('insurance_saver');
  }
  if (!has('vip_full') && input.modules.vipBoxes.every(b => b.built >= 1)) {
    newly.push('vip_full');
  }
  if (!has('finance_positive_30d') && (input.financeNet30d ?? -1) > 0) {
    newly.push('finance_positive_30d');
  }
  if (!has('level_max') && input.modules.level >= 15) {
    newly.push('level_max');
  }
  return newly;
}
