export interface LeagueTeam {
  name: string;
  logo: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  played: number;
}

export const initialLeagueTeams: LeagueTeam[] = [
  { name: 'FCM 26', logo: '⚽', points: 7, wins: 2, draws: 1, losses: 0, goalsFor: 6, goalsAgainst: 2, played: 3 },
  { name: 'Real Esporte FC', logo: '🏆', points: 9, wins: 3, draws: 0, losses: 0, goalsFor: 7, goalsAgainst: 1, played: 3 },
  { name: 'Atlético Cidade', logo: '🏟️', points: 5, wins: 1, draws: 2, losses: 0, goalsFor: 4, goalsAgainst: 3, played: 3 },
  { name: 'Sport Club União', logo: '🦅', points: 4, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 4, played: 3 },
  { name: 'Estrela do Norte', logo: '⭐', points: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 5, played: 3 },
  { name: 'Dragões FC', logo: '🐉', points: 6, wins: 2, draws: 0, losses: 1, goalsFor: 5, goalsAgainst: 3, played: 3 },
  { name: 'Leões da Serra', logo: '🦁', points: 4, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 4, played: 3 },
  { name: 'Tubarões Azuis', logo: '🦈', points: 2, wins: 0, draws: 2, losses: 1, goalsFor: 2, goalsAgainst: 3, played: 3 },
  { name: 'Gavião Futebol', logo: '🦅', points: 1, wins: 0, draws: 1, losses: 2, goalsFor: 1, goalsAgainst: 4, played: 3 },
  { name: 'Pantera Negra EC', logo: '🐈‍⬛', points: 0, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 6, played: 3 },
];
