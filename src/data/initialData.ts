import { Club, Match } from '@/types/game';
import { generateInitialSquad } from '@/utils/playerGenerator';
import { leaguesByCountry } from '@/types/league';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function generateSeasonMatches(country?: string): Match[] {
  const teams = leaguesByCountry[country || 'BR'] || leaguesByCountry['BR'];
  const opponents = teams.map(t => ({ name: t.name, logo: t.logo }));
  const matches: Match[] = [];
  opponents.forEach((opp, i) => {
    matches.push({ id: generateId(), opponent: opp.name, opponentLogo: opp.logo, date: `Rodada ${i + 1}`, played: false });
    matches.push({ id: generateId(), opponent: opp.name, opponentLogo: opp.logo, date: `Rodada ${i + opponents.length + 1}`, played: false });
  });
  return matches;
}

export const initialPlayers = generateInitialSquad();

export const initialClub: Club = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'FLM 26',
  stadiumName: 'Arena FLM',
  ticketPrice: 30,
  budget: 1000000,
  fans: 500,
  reputation: 65,
  stats: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
  players: initialPlayers,
  matches: [], // friendlies generated on demand
  scouts: [],
  scoutReports: [],
  matchesSinceLastScout: 0,
};
