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
  { name: 'FCM 26', logo: '⚽', points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 },
  { name: 'Real Esporte FC', logo: '🏆', points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 },
  { name: 'Atlético Cidade', logo: '🏟️', points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 },
  { name: 'Sport Club União', logo: '🦅', points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 },
  { name: 'Estrela do Norte', logo: '⭐', points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 },
  { name: 'Dragões FC', logo: '🐉', points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 },
  { name: 'Leões da Serra', logo: '🦁', points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 },
  { name: 'Tubarões Azuis', logo: '🦈', points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 },
  { name: 'Gavião Futebol', logo: '🦅', points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 },
  { name: 'Pantera Negra EC', logo: '🐈‍⬛', points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 },
];
