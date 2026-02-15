export interface Player {
  id: string;
  name: string;
  position: 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
  overall: number;
  age: number;
  salary: number;
  stamina: number;
  morale: number;
  goals: number;
  assists: number;
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
  budget: number;
  fans: number;
  reputation: number;
  stats: TeamStats;
  players: Player[];
  matches: Match[];
}
