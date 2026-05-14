// ── Sistema de Patrocínios V2 ────────────────────────────────────────────────
// Cada contrato tem objetivo, valor total, parcelas mensais e multa por descumprir.
// Compatível: o campo `monthlyPay` continua existindo (= valor da parcela mensal),
// para que UniformsTab/FinanceTab/match aggregations sigam funcionando sem refator.

export type SponsorType = 'camisa' | 'estadio' | 'treino' | 'geral';

export type SponsorObjectiveKind =
  | 'win_title'        // Ganhar título da liga
  | 'top5'             // Terminar no top 5
  | 'top10'            // Terminar no top 10
  | 'avoid_relegation' // Evitar rebaixamento (top 16)
  | 'continental'      // Classificar para competição continental (top 4)
  | 'win_n_matches';   // Vencer N partidas oficiais na temporada

export interface SponsorObjective {
  kind: SponsorObjectiveKind;
  /** Para 'win_n_matches' — número de vitórias requeridas */
  target?: number;
  /** Texto curto para UI */
  label: string;
}

export type SponsorPayMode = 'monthly' | 'on_complete';
export type SponsorStatus = 'active' | 'completed' | 'failed';

export interface Sponsor {
  id: string;
  name: string;
  type: SponsorType;
  /** Valor total do contrato em R$ */
  totalValue: number;
  /** Valor da parcela mensal (mantido para compat com UniformsTab/FinanceTab) */
  monthlyPay: number;
  /** Quantidade total de parcelas */
  installmentsTotal: number;
  /** Parcelas já pagas */
  installmentsPaid: number;
  /** Modo de pagamento */
  payMode: SponsorPayMode;
  /** Multa em R$ se objetivo não for cumprido */
  penalty: number;
  /** Objetivo obrigatório */
  objective: SponsorObjective;
  /** Temporada em que foi assinado */
  signedSeason: number;
  /** Temporadas restantes até avaliação do objetivo */
  duration: number;
  /** Status atual */
  status: SponsorStatus;
  /** Vitórias contabilizadas (para win_n_matches) */
  winsTracked?: number;
  /** Reputação mínima (para gerar oferta) */
  minReputation: number;
}

export interface SponsorOffer extends Sponsor {}

const sponsorNames = [
  'BetGol', 'MegaBet', 'ArenaBank', 'SportPay', 'Nitro Energy',
  'Vision Telecom', 'Max Cola', 'FlyAir', 'TechBrasil', 'Banco Central+',
  'NetPlay', 'AeroSport', 'VitaEnergy', 'TurboAuto', 'PixPay',
];

const sponsorTypes: SponsorType[] = ['camisa', 'estadio', 'treino', 'geral'];

export const sponsorTypeLabels: Record<SponsorType, string> = {
  camisa: '👕 Camisa',
  estadio: '🏟️ Estádio',
  treino: '🏋️ Treino',
  geral: '📋 Geral',
};

export const objectiveLabels: Record<SponsorObjectiveKind, string> = {
  win_title: '🏆 Ganhar o título',
  top5: '🥇 Terminar no top 5',
  top10: '⭐ Terminar no top 10',
  avoid_relegation: '🛡️ Evitar rebaixamento',
  continental: '🌎 Classificar à Continental',
  win_n_matches: '⚽ Vencer N partidas',
};

/** Gera um objetivo proporcional à reputação e ao valor do contrato. */
function rollObjective(reputation: number): SponsorObjective {
  // Quanto maior a reputação, mais ousados os objetivos exigidos pelo patrocinador
  const r = Math.random();
  if (reputation >= 80) {
    if (r < 0.35) return { kind: 'win_title', label: objectiveLabels.win_title };
    if (r < 0.65) return { kind: 'continental', label: objectiveLabels.continental };
    if (r < 0.85) return { kind: 'top5', label: objectiveLabels.top5 };
    const target = 10 + Math.floor(Math.random() * 5);
    return { kind: 'win_n_matches', target, label: `⚽ Vencer ${target}+ partidas oficiais` };
  }
  if (reputation >= 55) {
    if (r < 0.25) return { kind: 'continental', label: objectiveLabels.continental };
    if (r < 0.55) return { kind: 'top5', label: objectiveLabels.top5 };
    if (r < 0.85) return { kind: 'top10', label: objectiveLabels.top10 };
    const target = 7 + Math.floor(Math.random() * 5);
    return { kind: 'win_n_matches', target, label: `⚽ Vencer ${target}+ partidas oficiais` };
  }
  // Reputação baixa: objetivos mais modestos
  if (r < 0.40) return { kind: 'avoid_relegation', label: objectiveLabels.avoid_relegation };
  if (r < 0.75) return { kind: 'top10', label: objectiveLabels.top10 };
  const target = 4 + Math.floor(Math.random() * 4);
  return { kind: 'win_n_matches', target, label: `⚽ Vencer ${target}+ partidas oficiais` };
}

/** Multiplicador de risco do objetivo: objetivos mais difíceis pagam mais e multam mais */
function objectiveRisk(obj: SponsorObjective): number {
  switch (obj.kind) {
    case 'win_title': return 1.6;
    case 'continental': return 1.3;
    case 'top5': return 1.15;
    case 'top10': return 1.0;
    case 'avoid_relegation': return 0.85;
    case 'win_n_matches': return 1.0 + ((obj.target ?? 5) - 5) * 0.05;
  }
}

export function generateSponsorOffers(reputation: number, count: number): SponsorOffer[] {
  return Array.from({ length: count }, () => {
    const type = sponsorTypes[Math.floor(Math.random() * sponsorTypes.length)];
    const typeMultiplier =
      type === 'camisa' ? 1.5 :
      type === 'estadio' ? 1.2 :
      type === 'treino' ? 1.0 : 0.8;

    const objective = rollObjective(reputation);
    const risk = objectiveRisk(objective);

    // Valor mensal-base equivalente ao sistema antigo (mantém balanceamento)
    const baseMonthly = Math.floor(
      (reputation * 15000 + Math.floor(Math.random() * reputation * 30000)) * typeMultiplier * risk
    );

    // 1 a 3 temporadas (cada temporada = ~30 parcelas mensais no jogo)
    // Para não inflar o caixa, usamos 6 parcelas por temporada (a cada 5 dias do calendário interno).
    const duration = Math.floor(Math.random() * 3) + 1;
    const installmentsTotal = duration * 6;
    const monthlyPay = Math.max(10000, Math.floor(baseMonthly));
    const totalValue = monthlyPay * installmentsTotal;

    // Multa: 1.2x a 1.6x do valor total — sempre maior do que se recebe
    const penaltyMult = 1.2 + Math.random() * 0.4;
    const penalty = Math.floor(totalValue * penaltyMult);

    // 30% das ofertas são "on_complete" (paga tudo só se cumprir)
    const payMode: SponsorPayMode = Math.random() < 0.3 ? 'on_complete' : 'monthly';

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: sponsorNames[Math.floor(Math.random() * sponsorNames.length)],
      type,
      totalValue,
      monthlyPay: payMode === 'monthly' ? monthlyPay : 0,
      installmentsTotal,
      installmentsPaid: 0,
      payMode,
      penalty,
      objective,
      signedSeason: 0, // preenchido ao aceitar
      duration,
      status: 'active',
      winsTracked: 0,
      minReputation: Math.max(10, reputation - 20),
    };
  });
}

/** Avalia se um objetivo foi cumprido com base no contexto da temporada. */
export interface SeasonContext {
  /** Posição final na liga (1-based). null = não disputou liga */
  leaguePosition: number | null;
  /** Total de times na liga (default 20) */
  leagueSize: number;
  /** Quantidade de vitórias oficiais na temporada */
  officialWins: number;
}

export function isObjectiveMet(obj: SponsorObjective, ctx: SeasonContext): boolean {
  switch (obj.kind) {
    case 'win_title':
      return ctx.leaguePosition === 1;
    case 'continental':
      return ctx.leaguePosition !== null && ctx.leaguePosition <= 4;
    case 'top5':
      return ctx.leaguePosition !== null && ctx.leaguePosition <= 5;
    case 'top10':
      return ctx.leaguePosition !== null && ctx.leaguePosition <= 10;
    case 'avoid_relegation':
      return ctx.leaguePosition !== null && ctx.leaguePosition <= (ctx.leagueSize - 4);
    case 'win_n_matches':
      return ctx.officialWins >= (obj.target ?? 5);
  }
}

// ── Patrocínios Premium (mockup visual — Em breve) ──────────────────────────
export interface PremiumSponsorPlan {
  id: string;
  name: string;
  description: string;
  inGameValue: number;       // R$ no jogo entregue durante a vigência
  payoutDays: number;        // dias para receber o total
  realPriceLabel: string;    // texto exibido na UI
  emoji: string;
}

export const premiumSponsorPlans: PremiumSponsorPlan[] = [
  {
    id: 'smartpit_500',
    name: 'SmartPit Bronze',
    description: 'Receba R$ 500.000 divididos em pagamentos diários ao longo do mês.',
    inGameValue: 500_000,
    payoutDays: 30,
    realPriceLabel: 'R$ 9,90',
    emoji: '🥉',
  },
  {
    id: 'smartpit_1m',
    name: 'SmartPit Prata',
    description: 'R$ 1.000.000 entregue em parcelas diárias durante 30 dias.',
    inGameValue: 1_000_000,
    payoutDays: 30,
    realPriceLabel: 'R$ 19,90',
    emoji: '🥈',
  },
  {
    id: 'smartpit_5m',
    name: 'SmartPit Ouro',
    description: 'O contrato definitivo: R$ 5.000.000 distribuídos em 30 dias.',
    inGameValue: 5_000_000,
    payoutDays: 30,
    realPriceLabel: 'R$ 79,90',
    emoji: '🥇',
  },
];
