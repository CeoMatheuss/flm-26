/**
 * friendlyRewards.ts — Crescimento de torcida como recompensa de amistosos.
 *
 * Princípio: amistosos NÃO dão dinheiro. Eles fazem o clube crescer pela
 * torcida (fans), que por sua vez impacta receita futura, popularidade
 * e engajamento (sócios, ingressos, patrocínios).
 *
 * Modos suportados:
 *   • 'bot_balanced' — BOT calibrado para o OVR do clube (-2..+2)
 *   • 'bot_random'   — BOT com OVR 40..90; bônus por upset, penalidade por derrota fácil
 *   • 'online'       — sempre contra jogador real (convite ou amistoso aberto)
 *
 * Resultados: 'win' | 'draw' | 'loss'
 */

export type FriendlyMode = 'bot_balanced' | 'bot_random' | 'online';
export type MatchOutcome = 'win' | 'draw' | 'loss';

export interface FanRewardInput {
  mode: FriendlyMode;
  outcome: MatchOutcome;
  /** OVR do próprio clube (média titulares) */
  myOvr: number;
  /** OVR do adversário (apenas usado para escala em bot_random) */
  oppOvr: number;
  /** Torcida atual — usado para suavizar variações em clubes pequenos vs grandes */
  currentFans: number;
}

export interface FanRewardResult {
  /** Δ de torcida (pode ser negativo) */
  fanChange: number;
  /** Mensagem curta para notificação/popup */
  headline: string;
}

/**
 * Tabela base por modo + resultado.
 * Valores absolutos pequenos; modulados em seguida pelo gap de OVR e tamanho do clube.
 */
const BASE_TABLE: Record<FriendlyMode, Record<MatchOutcome, number>> = {
  bot_balanced: { win: 50,  draw: 20, loss: 5 },
  bot_random:   { win: 70,  draw: 25, loss: -5 },
  online:       { win: 150, draw: 35, loss: -10 },
};

/**
 * Calcula crescimento de torcida pós-amistoso.
 * Regras:
 *  - bot_random:
 *      • Vitória contra time MUITO mais forte (gap ≥ 10) → ×2.0
 *      • Vitória contra time mais forte (gap ≥ 5)        → ×1.5
 *      • Derrota para time MUITO mais fraco (gap ≤ -10) → ×3 (penalidade pesada, fica negativo)
 *      • Derrota para time mais fraco (gap ≤ -5)        → ×2
 *  - online: pequeno bônus extra se vitória for contra clube com torcida ≥ 2× a sua (David vs Golias)
 *  - Suavização por tamanho: clubes muito grandes (fans ≥ 50k) recebem 70% do ganho
 *    para evitar inflação descontrolada.
 */
export function computeFanReward(input: FanRewardInput): FanRewardResult {
  const { mode, outcome, myOvr, oppOvr, currentFans } = input;
  const base = BASE_TABLE[mode][outcome];
  let change = base;

  if (mode === 'bot_random') {
    const gap = oppOvr - myOvr; // positivo = adversário mais forte
    if (outcome === 'win') {
      if (gap >= 10) change = Math.round(base * 2.0);
      else if (gap >= 5) change = Math.round(base * 1.5);
    } else if (outcome === 'loss') {
      if (gap <= -10) change = Math.round(base * 3); // perdeu pra time muito mais fraco
      else if (gap <= -5) change = Math.round(base * 2);
    }
  }

  if (mode === 'online' && outcome === 'win') {
    // Pequeno bônus competitivo extra contra adversários reais — fica simples.
    change = Math.round(change * 1.1);
  }

  // Suavização por tamanho do clube
  if (currentFans >= 100_000) change = Math.round(change * 0.5);
  else if (currentFans >= 50_000) change = Math.round(change * 0.7);
  else if (currentFans >= 20_000) change = Math.round(change * 0.85);

  // Limites finais para evitar valores degenerados
  change = Math.max(-200, Math.min(400, change));

  const headline = buildHeadline(mode, outcome, change);
  return { fanChange: change, headline };
}

function buildHeadline(mode: FriendlyMode, outcome: MatchOutcome, change: number): string {
  const sign = change >= 0 ? '+' : '';
  const fanText = `${sign}${change.toLocaleString('pt-BR')} torcedores`;
  if (outcome === 'win') return `🟢 Vitória! ${fanText}`;
  if (outcome === 'draw') return `🟡 Empate. ${fanText}`;
  return `🔴 Derrota. ${fanText}`;
}

/** Helper utilitário para classificar o placar. */
export function outcomeFromScore(myGoals: number, oppGoals: number): MatchOutcome {
  if (myGoals > oppGoals) return 'win';
  if (myGoals < oppGoals) return 'loss';
  return 'draw';
}
