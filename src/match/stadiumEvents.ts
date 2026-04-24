/**
 * Stadium Events — Fase 2 do sistema de gestão de estádio (FLM 26)
 *
 * - Geração dinâmica de propostas (shows, festivais, eventos religiosos, corporativos)
 * - Cálculo de receita / risco de dano / impacto na torcida
 * - Sistema de seguro mensal
 * - Reparos do gramado/estrutura com bloqueio de partidas importantes
 *
 * Tudo aqui é PURO (sem side-effects). O state vive em `Club.stadiumOps`.
 */

import type { StadiumModules } from './stadiumEconomics';

// ─── Tipos ────────────────────────────────────────────────────────────────
export type EventCategory =
  | 'show_pop'        // Show pop nacional
  | 'show_rock'       // Show rock/internacional
  | 'festival'        // Festival 2 dias (mais risco)
  | 'religioso'       // Culto/encontro religioso (baixo risco)
  | 'corporativo'     // Convenção corporativa
  | 'esports';        // Final de e-sports

export type EventSeverity = 'baixo' | 'medio' | 'alto' | 'extremo';

export interface EventCategoryConfig {
  category: EventCategory;
  label: string;
  emoji: string;
  /** dias bloqueando o estádio para reparos (gramado/limpeza) */
  blockDays: number;
  /** chance base de causar dano (0-1) */
  damageChance: number;
  /** severidade típica do dano se ocorrer */
  damageSeverity: EventSeverity;
  /** fator base de receita (multiplicado por capacidade) */
  baseRevenuePerSeat: number;
  /** mínimo de nível do estádio exigido */
  minStadiumLevel: number;
  /** impacto na torcida se aceitar (-100..+100) */
  fanImpact: number;
}

export const EVENT_CATALOG: EventCategoryConfig[] = [
  {
    category: 'religioso',
    label: 'Culto / Encontro',
    emoji: '🙏',
    blockDays: 1,
    damageChance: 0.04,
    damageSeverity: 'baixo',
    baseRevenuePerSeat: 6,
    minStadiumLevel: 1,
    fanImpact: 1,
  },
  {
    category: 'corporativo',
    label: 'Convenção Corporativa',
    emoji: '💼',
    blockDays: 1,
    damageChance: 0.05,
    damageSeverity: 'baixo',
    baseRevenuePerSeat: 9,
    minStadiumLevel: 2,
    fanImpact: 0,
  },
  {
    category: 'esports',
    label: 'Final de E-Sports',
    emoji: '🎮',
    blockDays: 2,
    damageChance: 0.10,
    damageSeverity: 'medio',
    baseRevenuePerSeat: 14,
    minStadiumLevel: 3,
    fanImpact: 3,
  },
  {
    category: 'show_pop',
    label: 'Show Pop Nacional',
    emoji: '🎤',
    blockDays: 3,
    damageChance: 0.22,
    damageSeverity: 'medio',
    baseRevenuePerSeat: 22,
    minStadiumLevel: 4,
    fanImpact: -3,
  },
  {
    category: 'show_rock',
    label: 'Show Rock Internacional',
    emoji: '🎸',
    blockDays: 4,
    damageChance: 0.32,
    damageSeverity: 'alto',
    baseRevenuePerSeat: 38,
    minStadiumLevel: 6,
    fanImpact: -5,
  },
  {
    category: 'festival',
    label: 'Festival (2 dias)',
    emoji: '🎪',
    blockDays: 6,
    damageChance: 0.45,
    damageSeverity: 'extremo',
    baseRevenuePerSeat: 55,
    minStadiumLevel: 8,
    fanImpact: -8,
  },
];

export const DAMAGE_PROFILES: Record<EventSeverity, { repairCostFactor: number; repairDays: number; capacityCutPct: number; label: string; color: string; emoji: string }> = {
  baixo: { repairCostFactor: 0.6, repairDays: 1, capacityCutPct: 5, label: 'Leve', color: 'text-emerald-400', emoji: '🟢' },
  medio: { repairCostFactor: 1.4, repairDays: 3, capacityCutPct: 15, label: 'Moderado', color: 'text-amber-400', emoji: '🟡' },
  alto: { repairCostFactor: 2.8, repairDays: 6, capacityCutPct: 35, label: 'Alto', color: 'text-orange-400', emoji: '🟠' },
  extremo: { repairCostFactor: 5.2, repairDays: 10, capacityCutPct: 60, label: 'Extremo', color: 'text-red-500', emoji: '🔴' },
};

export interface StadiumEventProposal {
  id: string;
  category: EventCategory;
  promoter: string;
  /** receita líquida proposta para o clube */
  revenue: number;
  /** dias que o estádio fica bloqueado pós-evento (limpeza/reparo preventivo) */
  blockDays: number;
  /** chance estimada (0-1) de causar algum dano */
  damageChance: number;
  /** severidade caso o dano ocorra */
  damageSeverity: EventSeverity;
  /** multa se aceitar e cancelar depois */
  cancelPenalty: number;
  fanImpact: number;
  /** ISO timestamp em que a proposta expira (sem resposta = recusada) */
  expiresAt: string;
  /** ISO timestamp do dia que o evento aconteceria */
  scheduledFor: string;
  createdAt: string;
}

export interface StadiumDamage {
  id: string;
  source: 'event' | 'weather' | 'random';
  sourceLabel: string;
  severity: EventSeverity;
  /** porcentagem de capacidade reduzida (0..100) */
  capacityCutPct: number;
  repairCost: number;
  repairDays: number;
  /** ISO timestamp do dia em que o reparo terminará se contratado */
  repairCompletesAt?: string;
  /** se true, está em reparo */
  repairing: boolean;
  createdAt: string;
}

export interface StadiumInsurance {
  /** plano contratado */
  tier: 'basico' | 'completo' | 'premium' | null;
  /** ISO timestamp da renovação */
  renewsAt?: string;
  monthlyCost: number;
  /** % do reparo que o seguro cobre (0..1) */
  coverage: number;
  /** % de redução do prêmio se você teve poucos eventos */
  noClaimDiscount?: number;
}

export interface StadiumOpsState {
  proposals: StadiumEventProposal[];
  acceptedEvents: Array<{ proposalId: string; category: EventCategory; scheduledFor: string; revenue: number }>;
  damages: StadiumDamage[];
  insurance: StadiumInsurance;
  /** histórico simples (últimos 12) */
  recentLog: Array<{ at: string; message: string; type: 'info' | 'success' | 'warning' | 'danger' }>;
  lastProposalGenAt?: string;
  /** Fase 4 — última checagem diária de clima */
  lastWeatherRollAt?: string;
  /** Fase 4 — log financeiro consolidado (últimos 60 dias) */
  financeLog?: Array<import('./stadiumWeather').StadiumFinanceEntry>;
}

// ─── Insurance plans ──────────────────────────────────────────────────────
export const INSURANCE_PLANS: Array<{
  tier: NonNullable<StadiumInsurance['tier']>;
  label: string;
  emoji: string;
  monthlyFactor: number; // multiplica weeklyMaintenance × 4
  coverage: number;
  description: string;
  color: string;
}> = [
  { tier: 'basico',   label: 'Básico',   emoji: '🛡️',  monthlyFactor: 0.30, coverage: 0.40, description: 'Cobre 40% dos reparos. Ideal para clubes pequenos.',          color: 'text-slate-300' },
  { tier: 'completo', label: 'Completo', emoji: '🛡️✨', monthlyFactor: 0.55, coverage: 0.70, description: 'Cobre 70% dos reparos + reduz dias de obra em 1.',           color: 'text-sky-300' },
  { tier: 'premium',  label: 'Premium',  emoji: '👑🛡️', monthlyFactor: 1.00, coverage: 0.95, description: 'Cobre 95% dos reparos. Eventos extremos sem dor de cabeça.', color: 'text-amber-400' },
];

export function getInsuranceMonthlyCost(tier: NonNullable<StadiumInsurance['tier']>, modules: StadiumModules): number {
  const plan = INSURANCE_PLANS.find(p => p.tier === tier)!;
  // Base = manutenção mensal × fator do plano. Garante variação por nível.
  return Math.round(modules.weeklyMaintenance * 4 * plan.monthlyFactor);
}

// ─── Geração de propostas ────────────────────────────────────────────────
const PROMOTERS_BY_CATEGORY: Record<EventCategory, string[]> = {
  show_pop:    ['LiveNation BR', 'T4F Eventos', 'Mondo Entretenimento', 'GS Live'],
  show_rock:   ['Rock World', 'AEG Presents', 'Move Concerts', 'Live Nation Global'],
  festival:    ['Tomorrowland LATAM', 'Lollapalooza', 'Rock in Rio Tour', 'C6 Fest'],
  religioso:   ['Igreja Universal', 'Caminho de Damasco', 'Renascer Brasil', 'Visão Mundial'],
  corporativo: ['Sebrae', 'Endeavor', 'Câmara de Comércio', 'TechSummit BR'],
  esports:     ['Riot Games BR', 'BLAST Premier', 'ESL Pro', 'CBLOL'],
};

function pickFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export interface ProposalGenInputs {
  modules: StadiumModules;
  reputation: number;
  /** importância da próxima partida (afeta scheduledFor para evitar finais) */
  nextImportantMatchAt?: string | null;
  /** propostas já existentes para evitar duplicatas próximas */
  existingCount: number;
}

/**
 * Gera 1-3 propostas plausíveis, respeitando o nível do estádio e a reputação.
 * Receita escala com capacidade × baseRevenuePerSeat × (0.7 + reputação/200).
 */
export function generateEventProposals(input: ProposalGenInputs): StadiumEventProposal[] {
  const { modules, reputation, existingCount } = input;
  if (existingCount >= 4) return []; // teto

  const eligible = EVENT_CATALOG.filter(c => modules.level >= c.minStadiumLevel);
  if (eligible.length === 0) return [];

  const howMany = Math.min(2, 4 - existingCount);
  const out: StadiumEventProposal[] = [];

  for (let i = 0; i < howMany; i++) {
    const cfg = pickFrom(eligible);
    const sizeFactor = 0.7 + reputation / 200;     // 0.7..1.2
    const variance = 0.85 + Math.random() * 0.30;  // 0.85..1.15
    const revenue = Math.round(modules.seatingCapacity * cfg.baseRevenuePerSeat * sizeFactor * variance);
    const cancelPenalty = Math.round(revenue * 0.35);

    // Datas: evento ocorre entre 7 e 25 dias à frente
    const daysAhead = 7 + Math.floor(Math.random() * 19);
    const scheduledFor = new Date(Date.now() + daysAhead * 24 * 3600_000).toISOString();
    // Proposta expira em 3-5 dias
    const expiresAt = new Date(Date.now() + (3 + Math.random() * 2) * 24 * 3600_000).toISOString();

    out.push({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      category: cfg.category,
      promoter: pickFrom(PROMOTERS_BY_CATEGORY[cfg.category]),
      revenue,
      blockDays: cfg.blockDays,
      damageChance: cfg.damageChance,
      damageSeverity: cfg.damageSeverity,
      cancelPenalty,
      fanImpact: cfg.fanImpact,
      expiresAt,
      scheduledFor,
      createdAt: new Date().toISOString(),
    });
  }
  return out;
}

// ─── Resolução de evento (quando a data chega) ────────────────────────────
export interface EventResolution {
  damageOccurred: boolean;
  damage?: StadiumDamage;
  message: string;
}

export function resolveEvent(p: StadiumEventProposal): EventResolution {
  const roll = Math.random();
  if (roll > p.damageChance) {
    return { damageOccurred: false, message: `Evento "${EVENT_CATALOG.find(c => c.category === p.category)?.label}" foi um sucesso sem incidentes.` };
  }
  const profile = DAMAGE_PROFILES[p.damageSeverity];
  // Custo de reparo escala com a severidade e o tamanho do evento
  const repairCost = Math.round(p.revenue * profile.repairCostFactor * (0.4 + Math.random() * 0.3));
  const damage: StadiumDamage = {
    id: `dmg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    source: 'event',
    sourceLabel: EVENT_CATALOG.find(c => c.category === p.category)?.label ?? p.category,
    severity: p.damageSeverity,
    capacityCutPct: profile.capacityCutPct,
    repairCost,
    repairDays: profile.repairDays,
    repairing: false,
    createdAt: new Date().toISOString(),
  };
  return {
    damageOccurred: true,
    damage,
    message: `${profile.emoji} Dano ${profile.label} no estádio após ${damage.sourceLabel}! Reparo estimado: R$ ${(repairCost/1000).toFixed(0)}k`,
  };
}

// ─── Capacidade efetiva considerando danos ativos ─────────────────────────
export function getEffectiveCapacity(baseCapacity: number, damages: StadiumDamage[]): number {
  if (!damages || damages.length === 0) return baseCapacity;
  const totalCutPct = Math.min(90, damages.filter(d => !d.repairing).reduce((s, d) => s + d.capacityCutPct, 0));
  return Math.round(baseCapacity * (1 - totalCutPct / 100));
}

/** Há algum dano severo bloqueando partidas importantes? */
export function isStadiumBlockedForBigMatch(damages: StadiumDamage[]): { blocked: boolean; reason?: string } {
  const severe = damages.find(d => (d.severity === 'alto' || d.severity === 'extremo') && !d.repairing);
  if (severe) {
    return {
      blocked: true,
      reason: `Estrutura comprometida (${DAMAGE_PROFILES[severe.severity].label}) — repare antes de jogar finais/clássicos em casa.`,
    };
  }
  return { blocked: false };
}

// ─── Fase 3 — Conflitos com o calendário de partidas ──────────────────────
export interface MatchScheduleEntry {
  id: string;
  date: string;          // ISO
  isHome: boolean;
  competition?: string;  // 'Liga', 'Copa', 'Amistoso', 'Final'...
  opponent?: string;
}

export interface EventCalendarConflict {
  hasConflict: boolean;
  /** partida em casa que choca com janela do evento (incluindo blockDays de pós-evento) */
  conflictingMatch?: MatchScheduleEntry;
  /** dias entre o evento e a partida (negativo: partida antes do evento; positivo: partida depois) */
  daysToMatch?: number;
  reason?: string;
}

/**
 * Verifica se uma proposta de evento conflita com partidas oficiais em casa.
 * Considera blockDays APÓS o evento (gramado/limpeza) + 1 dia de buffer antes.
 */
export function detectEventCalendarConflict(
  scheduledFor: string,
  blockDays: number,
  upcomingHomeMatches: MatchScheduleEntry[],
): EventCalendarConflict {
  if (!upcomingHomeMatches || upcomingHomeMatches.length === 0) return { hasConflict: false };
  const evDay = new Date(scheduledFor).getTime();
  // Janela bloqueada: [evento - 1d, evento + blockDays + 1d]
  const winStart = evDay - 24 * 3600_000;
  const winEnd = evDay + (blockDays + 1) * 24 * 3600_000;

  for (const m of upcomingHomeMatches) {
    if (!m.isHome) continue;
    const md = new Date(m.date).getTime();
    if (md >= winStart && md <= winEnd) {
      const diffDays = Math.round((md - evDay) / (24 * 3600_000));
      const compLabel = m.competition || 'Partida';
      const isBig = /(final|clás|derby|decis)/i.test(compLabel);
      return {
        hasConflict: true,
        conflictingMatch: m,
        daysToMatch: diffDays,
        reason: isBig
          ? `⚠️ ${compLabel} marcada para ${new Date(m.date).toLocaleDateString('pt-BR')} (${diffDays >= 0 ? '+' : ''}${diffDays}d) — risco crítico ao gramado.`
          : `Conflito com ${compLabel} em ${new Date(m.date).toLocaleDateString('pt-BR')} (${diffDays >= 0 ? '+' : ''}${diffDays}d). Gramado pode estar comprometido.`,
      };
    }
  }
  return { hasConflict: false };
}

export function emptyStadiumOps(): StadiumOpsState {
  return {
    proposals: [],
    acceptedEvents: [],
    damages: [],
    insurance: { tier: null, monthlyCost: 0, coverage: 0 },
    recentLog: [],
    financeLog: [],
  };
}

export function getEventConfig(category: EventCategory): EventCategoryConfig {
  return EVENT_CATALOG.find(c => c.category === category)!;
}
