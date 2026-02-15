import { Club, Match } from '@/types/game';
import { generateInitialSquad } from '@/utils/playerGenerator';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function generateSeasonMatches(): Match[] {
  const opponents = [
    { name: 'Real Esporte FC', logo: '🏆' },
    { name: 'Atlético Cidade', logo: '🏟️' },
    { name: 'Sport Club União', logo: '🦅' },
    { name: 'Estrela do Norte', logo: '⭐' },
    { name: 'Dragões FC', logo: '🐉' },
    { name: 'Leões da Serra', logo: '🦁' },
    { name: 'Tubarões Azuis', logo: '🦈' },
    { name: 'Gavião Futebol', logo: '🦅' },
    { name: 'Pantera Negra EC', logo: '🐈‍⬛' },
  ];
  const matches: Match[] = [];
  opponents.forEach((opp, i) => {
    matches.push({ id: generateId(), opponent: opp.name, opponentLogo: opp.logo, date: `Rodada ${i + 1}`, played: false });
    matches.push({ id: generateId(), opponent: opp.name, opponentLogo: opp.logo, date: `Rodada ${i + 10}`, played: false });
  });
  return matches;
}

export const initialPlayers = generateInitialSquad();

export const initialClub: Club = {
  name: 'FCM 26',
  stadiumName: 'Arena FCM',
  ticketPrice: 30,
  budget: 2500000,
  fans: 15000,
  reputation: 65,
  stats: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
  players: initialPlayers,
  matches: generateSeasonMatches(),
  scouts: [],
  scoutReports: [],
  matchesSinceLastScout: 0,
};
