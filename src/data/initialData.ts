import { Club, Player, Match } from '@/types/game';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const initialPlayers: Player[] = [
  { id: generateId(), name: 'Rafael Mendes', position: 'GOL', overall: 78, age: 28, salary: 45000, stamina: 85, morale: 80, goals: 0, assists: 0 },
  { id: generateId(), name: 'Lucas Silva', position: 'ZAG', overall: 76, age: 26, salary: 40000, stamina: 90, morale: 85, goals: 2, assists: 1 },
  { id: generateId(), name: 'Pedro Almeida', position: 'ZAG', overall: 74, age: 24, salary: 35000, stamina: 88, morale: 82, goals: 1, assists: 0 },
  { id: generateId(), name: 'Bruno Costa', position: 'LAT', overall: 73, age: 23, salary: 32000, stamina: 92, morale: 78, goals: 1, assists: 5 },
  { id: generateId(), name: 'Marcos Oliveira', position: 'LAT', overall: 71, age: 22, salary: 28000, stamina: 94, morale: 75, goals: 0, assists: 3 },
  { id: generateId(), name: 'Thiago Santos', position: 'VOL', overall: 77, age: 27, salary: 50000, stamina: 86, morale: 88, goals: 3, assists: 4 },
  { id: generateId(), name: 'Gabriel Rocha', position: 'VOL', overall: 72, age: 21, salary: 25000, stamina: 91, morale: 80, goals: 1, assists: 2 },
  { id: generateId(), name: 'Diego Ferreira', position: 'MEI', overall: 80, age: 25, salary: 60000, stamina: 84, morale: 90, goals: 7, assists: 10 },
  { id: generateId(), name: 'André Souza', position: 'MEI', overall: 75, age: 23, salary: 38000, stamina: 89, morale: 83, goals: 4, assists: 6 },
  { id: generateId(), name: 'Felipe Nunes', position: 'ATA', overall: 82, age: 26, salary: 70000, stamina: 82, morale: 92, goals: 15, assists: 3 },
  { id: generateId(), name: 'Matheus Lima', position: 'ATA', overall: 79, age: 24, salary: 55000, stamina: 87, morale: 86, goals: 10, assists: 5 },
];

export const initialMatches: Match[] = [
  { id: generateId(), opponent: 'Real Esporte FC', opponentLogo: '⚽', date: 'Rodada 1', result: { home: 2, away: 1 }, played: true },
  { id: generateId(), opponent: 'Atlético Cidade', opponentLogo: '🏟️', date: 'Rodada 2', result: { home: 1, away: 1 }, played: true },
  { id: generateId(), opponent: 'Sport Club União', opponentLogo: '🦅', date: 'Rodada 3', result: { home: 3, away: 0 }, played: true },
  { id: generateId(), opponent: 'Estrela do Norte', opponentLogo: '⭐', date: 'Rodada 4', played: false },
  { id: generateId(), opponent: 'Dragões FC', opponentLogo: '🐉', date: 'Rodada 5', played: false },
  { id: generateId(), opponent: 'Leões da Serra', opponentLogo: '🦁', date: 'Rodada 6', played: false },
];

export const initialClub: Club = {
  name: 'FCM 26',
  budget: 2500000,
  fans: 15000,
  reputation: 65,
  stats: {
    wins: 2,
    draws: 1,
    losses: 0,
    goalsFor: 6,
    goalsAgainst: 2,
    points: 7,
  },
  players: initialPlayers,
  matches: initialMatches,
};
