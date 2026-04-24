/**
 * Stadium Economics — Fase 1 do sistema de gestão de estádio (FLM 26)
 *
 * Modela 5 módulos (Arquibancada/Camarotes/Comercial/Estacionamento/Infraestrutura)
 * derivados do nível do estádio (1-15) e calcula receita dinâmica por partida
 * com base em demanda (forma + reputação + importância + preço do ingresso).
 *
 * Pure functions, zero efeitos colaterais — fáceis de testar e plugar
 * em qualquer simulação ou tela.
 */

import { getStadiumCapacity } from '@/types/infrastructure';

// ─── Tipos ────────────────────────────────────────────────────────────────
export type VipTier = 'bronze' | 'prata' | 'ouro' | 'master';

export interface VipBoxConfig {
  tier: VipTier;
  unlockLevel: number;       // nível mínimo do estádio para destravar
  count: number;             // quantos camarotes existem nesse tier
  priceMatch: number;        // valor por jogo
  monthlyContract: number;   // renda fixa de empresas (mensal)
  emoji: string;
  label: string;
  color: string;             // tailwind text color
}

export interface StadiumModules {
  /** Capacidade total da arquibancada (segue o nível do estádio). */
  seatingCapacity: number;
  /** Lista de camarotes desbloqueados, com qtd e valores. */
  vipBoxes: VipBoxConfig[];
  /** Vagas de estacionamento. */
  parkingSpots: number;
  /** Receita por torcedor da área comercial (R$). */
  commercialPerFan: number;
  /** Nível geral do estádio (espelha infraestrutura). */
  level: number;
  /** Manutenção semanal (R$). */
  weeklyMaintenance: number;
}

export type MatchImportance = 'amistoso' | 'liga' | 'classico' | 'final';

export interface DemandInputs {
  fans: number;              // base de torcedores do clube
  reputation: number;        // 0-100
  ticketPrice: number;       // preço atual do ingresso
  /** Forma recente (-5 .. +5) — derivada dos últimos 5 jogos (V vence +1, D -1, E 0). */
  formScore?: number;
  importance?: MatchImportance;
  isHomeAdvantageActive?: boolean; // se false (estádio cedido p/ evento), reduz público
}

export interface MatchRevenueBreakdown {
  attendance: number;
  capacity: number;
  occupancy: number;            // 0..1
  ticketRevenue: number;
  vipRevenue: number;
  commercialRevenue: number;
  parkingRevenue: number;
  total: number;
  /** Quantas vagas de estacionamento foram usadas. */
  parkingUsed: number;
}

// ─── Camarotes: catálogo base ─────────────────────────────────────────────
//
// Desbloqueio progressivo: Bronze (Nv 3), Prata (Nv 6), Ouro (Nv 9), Master (Nv 12).
// Quantidade escala com o nível do estádio para manter exclusividade.
export const VIP_CATALOG: Omit<VipBoxConfig, 'count'>[] = [
  {
    tier: 'bronze', unlockLevel: 3, priceMatch: 1_500, monthlyContract: 8_000,
    emoji: '🥉', label: 'Bronze', color: 'text-amber-700',
  },
  {
    tier: 'prata', unlockLevel: 6, priceMatch: 4_000, monthlyContract: 22_000,
    emoji: '🥈', label: 'Prata', color: 'text-slate-300',
  },
  {
    tier: 'ouro', unlockLevel: 9, priceMatch: 9_000, monthlyContract: 55_000,
    emoji: '🥇', label: 'Ouro', color: 'text-amber-400',
  },
  {
    tier: 'master', unlockLevel: 12, priceMatch: 22_000, monthlyContract: 140_000,
    emoji: '👑', label: 'Master', color: 'text-fuchsia-400',
  },
];

/** Quantidade de camarotes por tier conforme o nível atual do estádio. */
export function getVipCount(tier: VipTier, stadiumLevel: number): number {
  const cfg = VIP_CATALOG.find(v => v.tier === tier);
  if (!cfg || stadiumLevel < cfg.unlockLevel) return 0;
  // Quanto maior o nível, mais boxes — mas sempre poucos (exclusividade)
  const levelsAbove = stadiumLevel - cfg.unlockLevel;
  switch (tier) {
    case 'bronze': return 8 + levelsAbove * 2;   // 8 → 32
    case 'prata':  return 4 + Math.floor(levelsAbove * 1.5); // 4 → 17
    case 'ouro':   return 2 + Math.floor(levelsAbove); // 2 → 8
    case 'master': return 1 + Math.floor(levelsAbove / 2); // 1 → 2
  }
}

/** Constrói os módulos do estádio a partir do nível atual. */
export function buildStadiumModules(level: number): StadiumModules {
  const seatingCapacity = getStadiumCapacity(level);
  const vipBoxes: VipBoxConfig[] = VIP_CATALOG
    .filter(v => level >= v.unlockLevel)
    .map(v => ({ ...v, count: getVipCount(v.tier, level) }));

  // Comercial: cresce com o nível (R$ 4 → R$ 18 por torcedor)
  const commercialPerFan = 4 + level * 1;

  // Estacionamento: ~5% da capacidade (vaga por carro)
  const parkingSpots = Math.round(seatingCapacity * 0.05);

  // Manutenção semanal: cresce ~quadrático com o nível
  const weeklyMaintenance = Math.round(15_000 + level * level * 1_200);

  return { seatingCapacity, vipBoxes, parkingSpots, commercialPerFan, level, weeklyMaintenance };
}

// ─── Demanda dinâmica ─────────────────────────────────────────────────────
/**
 * Calcula a taxa de ocupação esperada (0..1).
 * Combina forma, reputação, importância da partida e elasticidade do preço.
 */
export function computeOccupancy(inputs: DemandInputs): number {
  const {
    reputation, ticketPrice,
    formScore = 0,
    importance = 'liga',
    isHomeAdvantageActive = true,
  } = inputs;

  // Base por reputação: 30% (rep 0) → 90% (rep 100)
  let base = 0.30 + (Math.max(0, Math.min(100, reputation)) / 100) * 0.60;

  // Forma: cada ponto vale ~3% (faixa -15% .. +15%)
  base += Math.max(-5, Math.min(5, formScore)) * 0.03;

  // Importância
  const impMult: Record<MatchImportance, number> = {
    amistoso: 0.75,
    liga: 1.00,
    classico: 1.20,
    final: 1.30,
  };
  base *= impMult[importance];

  // Elasticidade do preço (referência: R$ 40)
  // Cada 10% acima/abaixo do preço-ref muda demanda em ~5%
  const PRICE_REF = 40;
  const priceDelta = (ticketPrice - PRICE_REF) / PRICE_REF; // -1 .. +∞
  base *= 1 - Math.max(-0.5, Math.min(2, priceDelta)) * 0.5;

  // Estádio cedido (sem fator casa) reduz público em ~30%
  if (!isHomeAdvantageActive) base *= 0.70;

  return Math.max(0.05, Math.min(1, base));
}

// ─── Receita por partida ──────────────────────────────────────────────────
export function computeMatchRevenue(
  modules: StadiumModules,
  demand: DemandInputs,
): MatchRevenueBreakdown {
  const occupancy = computeOccupancy(demand);
  const capacity = modules.seatingCapacity;

  // Público pagante: limitado pela capacidade E pela base de torcedores * 12% num jogo
  // (apenas uma fração da base total comparece em qualquer jogo).
  const fanPool = Math.floor(demand.fans * 0.12);
  const attendance = Math.min(capacity, Math.floor(capacity * occupancy), Math.max(fanPool, Math.floor(capacity * 0.05)));

  const ticketRevenue = attendance * Math.max(5, demand.ticketPrice);

  // VIP: ocupação dos camarotes segue uma versão suavizada da demanda (sempre alta)
  const vipOccupancy = Math.max(0.5, 0.6 + occupancy * 0.4);
  const vipRevenue = modules.vipBoxes.reduce(
    (sum, box) => sum + Math.round(box.count * vipOccupancy) * box.priceMatch,
    0,
  );

  // Comercial: por torcedor presente
  const commercialRevenue = attendance * modules.commercialPerFan;

  // Estacionamento: ~70% das vagas vendidas em jogos cheios; cresce com ocupação
  const parkingUsed = Math.min(modules.parkingSpots, Math.round(modules.parkingSpots * (0.4 + occupancy * 0.5)));
  const parkingPrice = 25 + modules.level * 2; // R$ 27 → R$ 55
  const parkingRevenue = parkingUsed * parkingPrice;

  const total = ticketRevenue + vipRevenue + commercialRevenue + parkingRevenue;

  return {
    attendance,
    capacity,
    occupancy,
    ticketRevenue,
    vipRevenue,
    commercialRevenue,
    parkingRevenue,
    parkingUsed,
    total,
  };
}

/** Renda fixa mensal dos contratos VIP (empresas). */
export function getMonthlyVipContractIncome(modules: StadiumModules): number {
  return modules.vipBoxes.reduce((sum, box) => sum + box.count * box.monthlyContract, 0);
}
