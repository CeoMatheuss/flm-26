export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'league' | 'player' | 'club' | 'special';
  unlockedAt?: number; // timestamp
  progress?: number;
  target?: number;
}

export const achievementDefinitions: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  // Liga
  { id: 'champion', name: 'Campeão!', description: 'Vença o campeonato da liga', icon: '🏆', category: 'league', target: 1 },
  { id: 'unbeaten', name: 'Invicto', description: 'Termine uma temporada sem derrotas', icon: '🛡️', category: 'league', target: 1 },
  { id: 'win_streak_5', name: 'Sequência de Fogo', description: 'Vença 5 jogos seguidos', icon: '🔥', category: 'league', target: 5 },
  { id: 'win_streak_10', name: 'Imbatível', description: 'Vença 10 jogos seguidos', icon: '⚡', category: 'league', target: 10 },
  { id: 'clean_sheet_5', name: 'Muralha', description: 'Não sofra gols em 5 jogos', icon: '🧱', category: 'league', target: 5 },
  { id: 'goals_100', name: 'Centenário', description: 'Marque 100 gols na temporada', icon: '💯', category: 'league', target: 100 },

  // Jogador
  { id: 'top_scorer', name: 'Artilheiro', description: 'Tenha um jogador com 20+ gols', icon: '⚽', category: 'player', target: 20 },
  { id: 'top_assister', name: 'Garçom', description: 'Tenha um jogador com 15+ assistências', icon: '🅰️', category: 'player', target: 15 },
  { id: 'player_90', name: 'Craque', description: 'Tenha um jogador com OVR 90+', icon: '⭐', category: 'player', target: 90 },
  { id: 'youth_star', name: 'Joia da Base', description: 'Promova 5 jogadores da base', icon: '🌟', category: 'player', target: 5 },
  { id: 'hat_trick', name: 'Hat-trick!', description: 'Um jogador marque 3+ gols em um jogo', icon: '🎩', category: 'player', target: 1 },

  // Clube
  { id: 'fans_50k', name: 'Torcida Gigante', description: 'Alcance 50.000 torcedores', icon: '👥', category: 'club', target: 50000 },
  { id: 'fans_100k', name: 'Nação', description: 'Alcance 100.000 torcedores', icon: '🏟️', category: 'club', target: 100000 },
  { id: 'budget_50m', name: 'Milionário', description: 'Tenha R$50M no caixa', icon: '💰', category: 'club', target: 50000000 },
  { id: 'reputation_90', name: 'Prestígio Mundial', description: 'Alcance 90+ de reputação', icon: '🌍', category: 'club', target: 90 },
  { id: 'stadium_max', name: 'Coliseu', description: 'Estádio no nível máximo (15)', icon: '🏗️', category: 'club', target: 15 },
  { id: 'infra_all_5', name: 'Base Sólida', description: 'Todas as instalações no nível 5+', icon: '🔧', category: 'club', target: 1 },

  // Especial
  { id: 'first_win', name: 'Primeira Vitória', description: 'Vença seu primeiro jogo', icon: '✅', category: 'special', target: 1 },
  { id: 'first_signing', name: 'Primeiro Reforço', description: 'Contrate seu primeiro jogador', icon: '✍️', category: 'special', target: 1 },
  { id: 'season_5', name: 'Veterano', description: 'Complete 5 temporadas', icon: '📅', category: 'special', target: 5 },
  { id: 'season_10', name: 'Lenda', description: 'Complete 10 temporadas', icon: '👑', category: 'special', target: 10 },
];

export function checkAchievements(
  stats: {
    wins: number; losses: number; goalsFor: number;
    fans: number; budget: number; reputation: number;
    seasonNum: number; stadiumLevel: number;
    infraLevels: number[];
    topScorerGoals: number; topAssisterAssists: number;
    topOverall: number; youthPromoted: number;
    currentWinStreak: number; cleanSheets: number;
  },
  existing: Achievement[]
): Achievement[] {
  const unlocked = [...existing];
  const has = (id: string) => unlocked.some(a => a.id === id && a.unlockedAt);

  const tryUnlock = (id: string) => {
    if (has(id)) return;
    const def = achievementDefinitions.find(d => d.id === id);
    if (!def) return;
    const idx = unlocked.findIndex(a => a.id === id);
    if (idx >= 0) {
      unlocked[idx] = { ...unlocked[idx], unlockedAt: Date.now() };
    } else {
      unlocked.push({ ...def, unlockedAt: Date.now() });
    }
  };

  if (stats.wins >= 1) tryUnlock('first_win');
  if (stats.currentWinStreak >= 5) tryUnlock('win_streak_5');
  if (stats.currentWinStreak >= 10) tryUnlock('win_streak_10');
  if (stats.cleanSheets >= 5) tryUnlock('clean_sheet_5');
  if (stats.goalsFor >= 100) tryUnlock('goals_100');
  if (stats.topScorerGoals >= 20) tryUnlock('top_scorer');
  if (stats.topAssisterAssists >= 15) tryUnlock('top_assister');
  if (stats.topOverall >= 90) tryUnlock('player_90');
  if (stats.youthPromoted >= 5) tryUnlock('youth_star');
  if (stats.fans >= 50000) tryUnlock('fans_50k');
  if (stats.fans >= 100000) tryUnlock('fans_100k');
  if (stats.budget >= 50000000) tryUnlock('budget_50m');
  if (stats.reputation >= 90) tryUnlock('reputation_90');
  if (stats.stadiumLevel >= 15) tryUnlock('stadium_max');
  if (stats.infraLevels.every(l => l >= 5)) tryUnlock('infra_all_5');
  if (stats.seasonNum >= 5) tryUnlock('season_5');
  if (stats.seasonNum >= 10) tryUnlock('season_10');
  if (stats.losses === 0 && stats.wins > 0) tryUnlock('unbeaten');

  return unlocked;
}
