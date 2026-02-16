export type PlayerPersonality = 
  | 'lider'        // Líder nato - moral +5 para todos quando joga bem
  | 'festeiro'     // Festeiro - chance de perder stamina extra
  | 'dedicado'     // Dedicado - treina 20% mais rápido
  | 'preguicoso'   // Preguiçoso - treina 20% mais devagar
  | 'ambicioso'    // Ambicioso - pede aumento mais cedo
  | 'leal'         // Leal - aceita salário menor para ficar
  | 'temperamental' // Temperamental - moral oscila mais
  | 'calmo'        // Calmo - moral estável, compostura +5 efetivo
  | 'competitivo'  // Competitivo - joga melhor em jogos grandes
  | 'introvertido'; // Introvertido - neutro, sem efeitos especiais

export const personalityLabels: Record<PlayerPersonality, { label: string; emoji: string; desc: string }> = {
  lider: { label: 'Líder', emoji: '👑', desc: 'Inspira os companheiros. Moral +5 para todos quando joga bem.' },
  festeiro: { label: 'Festeiro', emoji: '🎉', desc: 'Adora a vida noturna. Pode perder stamina extra entre jogos.' },
  dedicado: { label: 'Dedicado', emoji: '📚', desc: 'Sempre o primeiro no treino. Evolui 20% mais rápido.' },
  preguicoso: { label: 'Preguiçoso', emoji: '😴', desc: 'Prefere descansar. Evolui 20% mais devagar.' },
  ambicioso: { label: 'Ambicioso', emoji: '🔥', desc: 'Quer sempre mais. Pede aumento salarial mais cedo.' },
  leal: { label: 'Leal', emoji: '💚', desc: 'Ama o clube. Aceita salário menor para renovar.' },
  temperamental: { label: 'Temperamental', emoji: '😤', desc: 'Humor instável. Moral oscila muito entre jogos.' },
  calmo: { label: 'Calmo', emoji: '🧘', desc: 'Mente fria. Moral muito estável.' },
  competitivo: { label: 'Competitivo', emoji: '⚔️', desc: 'Brilha nos clássicos. Joga melhor contra times fortes.' },
  introvertido: { label: 'Introvertido', emoji: '🤫', desc: 'Na dele. Sem efeitos especiais.' },
};

export const allPersonalities: PlayerPersonality[] = ['lider', 'festeiro', 'dedicado', 'preguicoso', 'ambicioso', 'leal', 'temperamental', 'calmo', 'competitivo', 'introvertido'];

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
  goalkeeping?: number; // Defesa de Goleiro
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
  shirtNumber?: number;
  seasonsWithoutPlaying?: number;
  personality?: PlayerPersonality;
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