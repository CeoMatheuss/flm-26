/**
 * fanGrowthEngine.ts — Football Life Manager (FLM 26)
 * Sistema de crescimento de torcida REALISTA e BALANCEADO.
 */
import { safeNumber, MatchImportance } from './stadiumEconomyEngine';
import { RankingOutcome } from './rankingUpdater';

export interface FanGrowthInput {
  currentFans: number;
  reputation: number;
  outcome: RankingOutcome;
  importance: MatchImportance;
  homeGoals: number;
  awayGoals: number;
  isHome: boolean;
  recentForm: string[]; // ['V', 'D', 'E'...]
  opponentStrength: number;
  teamStrength: number;
}

export interface FanGrowthResult {
  delta: number;
  message: string;
}

/**
 * Calcula o crescimento ou perda de torcida baseado no resultado da partida.
 * O crescimento é logarítmico: quanto mais fãs, mais difícil ganhar novos.
 */
export function calculateFanGrowth(input: FanGrowthInput): FanGrowthResult {
  const fans = safeNumber(input.currentFans);
  const rep = safeNumber(input.reputation);
  const { outcome, importance, homeGoals, awayGoals, isHome } = input;
  
  // 1. Base de ganho por resultado e importância
  // Valores base para times pequenos (reputação < 30)
  const baseGains: Record<MatchImportance, Record<RankingOutcome, [number, number]>> = {
    amistoso: {
      win: [10, 50],
      draw: [0, 10],
      loss: [-10, -5]
    },
    liga: {
      win: [100, 300],
      draw: [5, 20],
      loss: [-50, -20]
    },
    classico: {
      win: [500, 2000],
      draw: [10, 50],
      loss: [-300, -100]
    },
    final: {
      win: [5000, 15000],
      draw: [100, 500],
      loss: [-2000, -500]
    }
  };

  const range = baseGains[importance][outcome];
  let delta = Math.floor(range[0] + Math.random() * (range[1] - range[0]));

  // 2. Fator de Dificuldade Logarítmica (Diminishing Returns)
  // Se o time tem milhões de fãs, ganhar +300 na liga é irrisório, mas ganhar +15k em final é ok.
  // Criamos um multiplicador que reduz conforme a torcida cresce.
  // Teto de referência: 10 milhões.
  const sizeFactor = Math.max(0.1, 1 - (Math.log10(Math.max(1000, fans)) / 8));
  delta = Math.round(delta * sizeFactor);

  // 3. Impacto do Placar (Goleada empolga mais)
  const goalDiff = isHome ? (homeGoals - awayGoals) : (awayGoals - homeGoals);
  if (outcome === 'win' && goalDiff >= 3) {
    delta = Math.round(delta * 1.3);
  }

  // 4. Impacto da Sequência (Hype)
  const winStreak = input.recentForm.filter((f, i) => i < 3 && f === 'V').length;
  if (outcome === 'win' && winStreak >= 3) {
    delta = Math.round(delta * 1.2);
  }

  // 5. Impacto da Reputação (Times grandes perdem mais fácil em derrotas)
  if (outcome === 'loss') {
    const repFactor = 1 + (rep / 100);
    delta = Math.round(delta * repFactor);
  }

  // 6. Mensagens dinâmicas
  let message = '';
  if (delta > 0) {
    if (importance === 'final') message = "🏆 Título conquistado! Milhares de novos torcedores se juntam ao clube!";
    else if (importance === 'classico') message = "🔥 Vitória no clássico! A cidade está pintada com suas cores.";
    else if (winStreak >= 3) message = "📈 Grande fase aumentando a popularidade do clube!";
    else message = "⚽ Torcida cresceu após vitória.";
  } else if (delta < 0) {
    if (importance === 'final') message = "😢 A derrota na final esfriou os ânimos de alguns torcedores.";
    else if (input.recentForm.filter((f, i) => i < 3 && f === 'D').length >= 3) message = "📉 Má fase contínua afastando torcedores.";
    else message = "Derrota amarga diminuiu levemente a base de fãs.";
  } else {
    message = "A torcida permanece estável após este resultado.";
  }

  return { delta, message };
}
