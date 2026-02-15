import { useState } from 'react';
import { Club, Match } from '@/types/game';
import { initialClub } from '@/data/initialData';

export function useGame() {
  const [club, setClub] = useState<Club>(initialClub);

  const simulateMatch = (matchId: string) => {
    setClub(prev => {
      const match = prev.matches.find(m => m.id === matchId);
      if (!match || match.played) return prev;

      const teamStrength = prev.players.reduce((sum, p) => sum + p.overall, 0) / prev.players.length;
      const opponentStrength = 60 + Math.random() * 25;

      const homeGoals = Math.floor(Math.random() * 4 * (teamStrength / opponentStrength));
      const awayGoals = Math.floor(Math.random() * 3 * (opponentStrength / teamStrength));

      const isWin = homeGoals > awayGoals;
      const isDraw = homeGoals === awayGoals;

      const newMatches = prev.matches.map(m =>
        m.id === matchId ? { ...m, played: true, result: { home: homeGoals, away: awayGoals } } : m
      );

      const newPlayers = prev.players.map(p => ({
        ...p,
        stamina: Math.max(40, p.stamina - Math.floor(Math.random() * 15 + 5)),
        morale: Math.min(100, Math.max(30, p.morale + (isWin ? 5 : isDraw ? 0 : -5))),
      }));

      return {
        ...prev,
        matches: newMatches,
        players: newPlayers,
        budget: prev.budget + (isWin ? 150000 : isDraw ? 75000 : 30000),
        fans: prev.fans + (isWin ? 500 : isDraw ? 100 : -200),
        stats: {
          wins: prev.stats.wins + (isWin ? 1 : 0),
          draws: prev.stats.draws + (isDraw ? 1 : 0),
          losses: prev.stats.losses + (!isWin && !isDraw ? 1 : 0),
          goalsFor: prev.stats.goalsFor + homeGoals,
          goalsAgainst: prev.stats.goalsAgainst + awayGoals,
          points: prev.stats.points + (isWin ? 3 : isDraw ? 1 : 0),
        },
      };
    });
  };

  const trainPlayer = (playerId: string) => {
    setClub(prev => ({
      ...prev,
      budget: prev.budget - 10000,
      players: prev.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              overall: Math.min(99, p.overall + (Math.random() > 0.5 ? 1 : 0)),
              stamina: Math.min(100, p.stamina + 10),
              morale: Math.min(100, p.morale + 3),
            }
          : p
      ),
    }));
  };

  const restPlayer = (playerId: string) => {
    setClub(prev => ({
      ...prev,
      players: prev.players.map(p =>
        p.id === playerId ? { ...p, stamina: Math.min(100, p.stamina + 20) } : p
      ),
    }));
  };

  return { club, simulateMatch, trainPlayer, restPlayer };
}
