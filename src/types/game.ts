export interface PlayerAttributes {
  speed: number;        // Velocidade
  shooting: number;     // Finalização
  passing: number;      // Passe
  defending: number;    // Defesa
  physical: number;     // Físico
  dribbling: number;    // Drible
  setPieces: number;    // Bola Parada
  positioning: number;  // Posicionamento
  heading: number;      // Cabeceio
  marking: number;      // Marcação
  vision?: number;      // Visão de Jogo
  crossing?: number;    // Cruzamento
  longShots?: number;   // Chute de Longe
  workRate?: number;    // Intensidade/Raça
  composure?: number;   // Compostura
  aggression?: number;  // Agressividade
}

export interface Injury {
  type: string;
  severity: 'leve' | 'moderada' | 'grave';
  weeksRemaining: number;
  originalWeeks: number;
}

export interface PlayerHistoryEntry {
  club: string;
  seasonStart: number;
  seasonEnd?: number;
  games: number;
  goals: number;
  assists: number;
  avgRating: number;
}

export interface Player {
  id: string;
  name: string;
  position: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
  overall: number;
  attributes: PlayerAttributes;
  age: number;
  salary: number;
  stamina: number;
  morale: number;
  goals: number;
  assists: number;
  contract: number;
  gamesPlayed: number;
  trainingProgress: number;
  injury?: Injury;
  history?: PlayerHistoryEntry[];
  matchRating?: number;
  seasonRatings?: number[];
}

export interface Scout {
  id: string;
  name: string;
  skill: number; // 1-10, higher = better reports, more expensive
  salary: number;
  contract: number; // seasons remaining
}

export interface ScoutReport {
  id: string;
  player: Player;
  scoutName: string;
  accuracy: number; // 0-100, how accurate the report is (higher scout skill = more accurate)
  estimatedOverall: number; // may differ from real overall
  estimatedAttributes: Partial<PlayerAttributes>; // only some attributes revealed
  reportDate: string;
}

export interface Match {
  id: string;
  opponent: string;
  opponentLogo: string;
  date: string;
  result?: { home: number; away: number };
  played: boolean;
}

export interface TeamStats {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface Club {
  name: string;
  stadiumName: string;
  ticketPrice: number;
  budget: number;
  fans: number;
  reputation: number;
  stats: TeamStats;
  players: Player[];
  matches: Match[];
  scouts: Scout[];
  scoutReports: ScoutReport[];
  matchesSinceLastScout: number;
  primaryColor?: string;
  secondaryColor?: string;
  shieldPattern?: string;
  logoUrl?: string;
  country?: string;
}