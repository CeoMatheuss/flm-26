/**
 * Cálculo único de "Sócios Torcedores" — usado tanto na Torcida (FansTab)
 * quanto no MembersTab. Mantém uma única fonte da verdade para o número
 * de sócios exibido em qualquer lugar do jogo.
 */

export interface MembersInput {
  totalFans: number;
  reputation: number;
  wins?: number;
  draws?: number;
  losses?: number;
}

/** Total de sócios torcedores estimado a partir da torcida e do desempenho. */
export function calculateTotalMembers({ totalFans, reputation, wins = 0, draws = 0, losses = 0 }: MembersInput): number {
  if (!totalFans || totalFans <= 0) return 0;
  const totalGames = wins + draws + losses;
  const winRate = totalGames > 0 ? wins / totalGames : 0.4;
  const lossRate = totalGames > 0 ? losses / totalGames : 0.4;
  const perfMod = 1 + (winRate - 0.5) * 1.2 - lossRate * 0.4;
  const baseRate = Math.min(0.055, 0.015 + reputation / 2500) * Math.max(0.5, perfMod);
  // Soma das proporções por tier (0.55 + 0.27 + 0.13 + 0.05) = 1
  return Math.max(0, Math.floor(totalFans * baseRate));
}

/** Distribuição interna por tier — preserva proporção usada no MembersTab. */
export const MEMBER_TIER_RATIOS = [0.55, 0.27, 0.13, 0.05] as const;
