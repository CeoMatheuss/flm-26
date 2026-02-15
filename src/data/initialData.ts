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
  name: 'FLM 26',
  stadiumName: 'Arena FLM',
  ticketPrice: 30,
  budget: 2500000,
  fans: 200,
  reputation: 65,
  stats: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
  players: initialPlayers,
  matches: generateSeasonMatches(),
  scouts: [],
  scoutReports: [],
  matchesSinceLastScout: 0,
};
