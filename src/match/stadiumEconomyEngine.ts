/**
 * Stadium Economy Engine — Football Life Manager (FLM 26)
 * Sistema centralizado e sanitizado para simulação de torcida, público e receitas.
 */

/** Helper para garantir que qualquer valor seja um número válido e finito. */
export const safeNumber = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type MatchImportance = 'amistoso' | 'liga' | 'classico' | 'final';
export type FanMood = 'crise' | 'instável' | 'empolgada' | 'eufórica';

export interface StadiumEconomyState {
  fans: number;
  reputation: number;
  ticketPrice: number;
  winStreak: number;
  loseStreak: number;
  importance: MatchImportance;
  stadiumCapacity: number;
  stadiumLevel: number;
  vipUnits: number; // Unidades totais de camarotes construídos
  vipPrice?: number;
}

export interface EconomyResult {
  expectedAttendance: number;
  occupancyRate: number;
  mood: FanMood;
  revenue: {
    tickets: number;
    vip: number;
    commercial: number;
    parking: number;
    total: number;
  };
  visualState: 'vazio' | 'baixa' | 'media' | 'lotado' | 'fervendo';
}

/** Calcula o multiplicador baseado no humor da torcida (derivado de resultados e reputação) */
export function getFanMoodMultiplier(winStreak: number, loseStreak: number, reputation: number): { multiplier: number, mood: FanMood } {
  const score = (winStreak * 2) - (loseStreak * 1.5) + (reputation / 20);
  
  if (score >= 12) return { multiplier: 1.5, mood: 'eufórica' };
  if (score >= 6) return { multiplier: 1.25, mood: 'empolgada' };
  if (score >= 0) return { multiplier: 1.0, mood: 'instável' };
  return { multiplier: 0.7, mood: 'crise' };
}

/** Calcula o multiplicador por tipo de partida */
export function getMatchTypeMultiplier(type: MatchImportance): number {
  const multipliers: Record<MatchImportance, number> = {
    amistoso: 0.6,
    liga: 1.0,
    classico: 1.5,
    final: 2.2
  };
  return multipliers[type] || 1.0;
}

/** Calcula o impacto do preço do ingresso usando uma curva de tolerância */
export function getTicketPriceImpact(ticketPrice: number, reputation: number): number {
  const p = safeNumber(ticketPrice);
  const rep = safeNumber(reputation);
  
  // Preço ideal sugerido aumenta com a reputação do clube
  const idealPrice = 20 + (rep / 4); 
  const maxTolerance = idealPrice * 2.5;
  
  // Curva inteligente: acima do ideal, a demanda cai; abaixo, sobe mas com teto.
  const impact = 1 - ((p - idealPrice) / maxTolerance);
  
  // Clamp entre 0.25 (mínimo de teimosos) e 1.2 (bônus de preço popular)
  return Math.min(1.2, Math.max(0.25, impact));
}

/** Engine principal de cálculo */
export function calculateStadiumEconomy(state: StadiumEconomyState): EconomyResult {
  const {
    fans, reputation, ticketPrice, winStreak, loseStreak,
    importance, stadiumCapacity, stadiumLevel, vipUnits
  } = state;

  // 1. Sanitização inicial
  const sFans = safeNumber(fans);
  const sRep = safeNumber(reputation);
  const sPrice = safeNumber(ticketPrice);
  const sCap = safeNumber(stadiumCapacity);
  const sVipUnits = safeNumber(vipUnits);

  // 2. Multiplicadores
  const { multiplier: moodMult, mood } = getFanMoodMultiplier(winStreak, loseStreak, sRep);
  const matchMult = getMatchTypeMultiplier(importance);
  const priceImpact = getTicketPriceImpact(sPrice, sRep);
  const reputationMult = 0.5 + (sRep / 100);

  // 3. Público Base (Torcida que se interessa pelo jogo)
  // Um clube converte entre 2% a 10% de sua base de fãs em público real por jogo
  const conversionRate = 0.05 * reputationMult;
  const baseFans = sFans * conversionRate * moodMult * matchMult;

  // 4. Público Final (com impacto de preço e limite físico)
  let expectedAttendance = Math.floor(baseFans * priceImpact);
  expectedAttendance = Math.min(sCap, Math.max(0, expectedAttendance));

  // 5. Ocupação e Estado Visual
  const occupancyRate = sCap > 0 ? (expectedAttendance / sCap) : 0;
  let visualState: EconomyResult['visualState'] = 'vazio';
  if (occupancyRate > 0.95) visualState = 'fervendo';
  else if (occupancyRate > 0.8) visualState = 'lotado';
  else if (occupancyRate > 0.4) visualState = 'media';
  else if (occupancyRate > 0.1) visualState = 'baixa';

  // 6. Receitas Detalhadas
  const ticketRevenue = expectedAttendance * sPrice;
  
  // VIP: Camarotes rendem mais e dependem do nível do estádio
  const vipPricePerUnit = 500 + (stadiumLevel * 200);
  const vipOccupancy = Math.min(1, occupancyRate + 0.2); // VIP lota antes do povão
  const vipRevenue = sVipUnits * vipPricePerUnit * vipOccupancy;

  // Comercial: Consumo por torcedor (comida, loja, etc)
  const spendingPerFan = 10 + (stadiumLevel * 2);
  const commercialRevenue = expectedAttendance * spendingPerFan;

  // Estacionamento: 1 vaga para cada 10 torcedores em média
  const parkingSpots = Math.floor(sCap / 8);
  const parkingPrice = 20 + (stadiumLevel * 2);
  const occupiedSpots = Math.min(parkingSpots, Math.floor(expectedAttendance / 6));
  const parkingRevenue = occupiedSpots * parkingPrice;

  const totalRevenue = ticketRevenue + vipRevenue + commercialRevenue + parkingRevenue;

  const result = {
    expectedAttendance,
    occupancyRate,
    mood,
    revenue: {
      tickets: Math.round(ticketRevenue),
      vip: Math.round(vipRevenue),
      commercial: Math.round(commercialRevenue),
      parking: Math.round(parkingRevenue),
      total: Math.round(totalRevenue)
    },
    visualState
  };

  console.log("[ECONOMIA ESTÁDIO]", { 
    inputs: state, 
    multipliers: { moodMult, matchMult, priceImpact, reputationMult },
    result 
  });

  return result;
}
