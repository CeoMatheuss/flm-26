import { Club, Player, Match } from '@/types/game';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const initialPlayers: Player[] = [
  { id: generateId(), name: 'Rafael Mendes', position: 'GOL', overall: 78, age: 28, salary: 45000, stamina: 100, morale: 80, goals: 0, assists: 0 },
  { id: generateId(), name: 'Lucas Silva', position: 'ZAG', overall: 76, age: 26, salary: 40000, stamina: 100, morale: 85, goals: 0, assists: 0 },
  { id: generateId(), name: 'Pedro Almeida', position: 'ZAG', overall: 74, age: 24, salary: 35000, stamina: 100, morale: 82, goals: 0, assists: 0 },
  { id: generateId(), name: 'Bruno Costa', position: 'LAT', overall: 73, age: 23, salary: 32000, stamina: 100, morale: 78, goals: 0, assists: 0 },
  { id: generateId(), name: 'Marcos Oliveira', position: 'LAT', overall: 71, age: 22, salary: 28000, stamina: 100, morale: 75, goals: 0, assists: 0 },
  { id: generateId(), name: 'Thiago Santos', position: 'VOL', overall: 77, age: 27, salary: 50000, stamina: 100, morale: 88, goals: 0, assists: 0 },
  { id: generateId(), name: 'Gabriel Rocha', position: 'VOL', overall: 72, age: 21, salary: 25000, stamina: 100, morale: 80, goals: 0, assists: 0 },
  { id: generateId(), name: 'Diego Ferreira', position: 'MEI', overall: 80, age: 25, salary: 60000, stamina: 100, morale: 90, goals: 0, assists: 0 },
  { id: generateId(), name: 'André Souza', position: 'MEI', overall: 75, age: 23, salary: 38000, stamina: 100, morale: 83, goals: 0, assists: 0 },
  { id: generateId(), name: 'Felipe Nunes', position: 'ATA', overall: 82, age: 26, salary: 70000, stamina: 100, morale: 92, goals: 0, assists: 0 },
  { id: generateId(), name: 'Matheus Lima', position: 'ATA', overall: 79, age: 24, salary: 55000, stamina: 100, morale: 86, goals: 0, assists: 0 },
];

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

export const initialClub: Club = {
  name: 'FCM 26',
  budget: 2500000,
  fans: 15000,
  reputation: 65,
  stats: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
  players: initialPlayers,
  matches: generateSeasonMatches(),
};
