import { useState, useCallback } from 'react';
import { Club } from '@/types/game';
import { Player } from '@/types/game';
import { TacticsConfig, defaultTactics } from '@/types/tactics';
import { LeagueTeam, initialLeagueTeams } from '@/types/league';
import { FinanceEntry, createFinanceEntry } from '@/types/finance';
import { initialClub } from '@/data/initialData';
import { generateMarketPlayers, getPlayerValue } from '@/utils/playerGenerator';

export interface GameState {
  club: Club;
  tactics: TacticsConfig;
  leagueTeams: LeagueTeam[];
  finances: FinanceEntry[];
  marketPlayers: Player[];
}

export function useGame(initialState?: GameState) {
  const [club, setClub] = useState<Club>(initialState?.club ?? initialClub);
  const [tactics, setTactics] = useState<TacticsConfig>(initialState?.tactics ?? defaultTactics);
  const [leagueTeams, setLeagueTeams] = useState<LeagueTeam[]>(initialState?.leagueTeams ?? initialLeagueTeams);
  const [finances, setFinances] = useState<FinanceEntry[]>(initialState?.finances ?? []);
  const [marketPlayers, setMarketPlayers] = useState<Player[]>(initialState?.marketPlayers ?? generateMarketPlayers(8));

  const addFinance = useCallback((type: 'receita' | 'despesa', category: string, amount: number, desc: string) => {
    setFinances(prev => [...prev, createFinanceEntry(type, category, amount, desc)]);
  }, []);

  const simulateMatch = useCallback((matchId: string) => {
    setClub(prev => {
      const match = prev.matches.find(m => m.id === matchId);
      if (!match || match.played) return prev;

      const teamStrength = prev.players.reduce((s, p) => s + p.overall, 0) / prev.players.length;
      const tacticBonus = tactics.playStyle === 'ofensivo' ? 5 : tactics.playStyle === 'defensivo' ? -3 : 0;
      const pressingBonus = tactics.pressing === 'alto' ? 3 : tactics.pressing === 'baixo' ? -2 : 0;
      const adjustedStrength = teamStrength + tacticBonus + pressingBonus;

      const opponentStrength = 60 + Math.random() * 25;
      const homeGoals = Math.floor(Math.random() * 4 * (adjustedStrength / opponentStrength));
      const awayGoals = Math.floor(Math.random() * 3 * (opponentStrength / adjustedStrength));

      const isWin = homeGoals > awayGoals;
      const isDraw = homeGoals === awayGoals;

      const prize = isWin ? 150000 : isDraw ? 75000 : 30000;
      addFinance('receita', 'Partida', prize, `${isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota'} vs ${match.opponent}`);

      // Update league
      setLeagueTeams(prevTeams => {
        return prevTeams.map(t => {
          if (t.name === prev.name) {
            return {
              ...t,
              played: t.played + 1,
              wins: t.wins + (isWin ? 1 : 0),
              draws: t.draws + (isDraw ? 1 : 0),
              losses: t.losses + (!isWin && !isDraw ? 1 : 0),
              goalsFor: t.goalsFor + homeGoals,
              goalsAgainst: t.goalsAgainst + awayGoals,
              points: t.points + (isWin ? 3 : isDraw ? 1 : 0),
            };
          }
          // Simulate other results
          const otherWin = Math.random() > 0.5;
          const otherDraw = !otherWin && Math.random() > 0.5;
          const gf = Math.floor(Math.random() * 3);
          const ga = Math.floor(Math.random() * 3);
          return {
            ...t,
            played: t.played + 1,
            wins: t.wins + (otherWin ? 1 : 0),
            draws: t.draws + (otherDraw ? 1 : 0),
            losses: t.losses + (!otherWin && !otherDraw ? 1 : 0),
            goalsFor: t.goalsFor + gf,
            goalsAgainst: t.goalsAgainst + ga,
            points: t.points + (otherWin ? 3 : otherDraw ? 1 : 0),
          };
        });
      });

      return {
        ...prev,
        matches: prev.matches.map(m => m.id === matchId ? { ...m, played: true, result: { home: homeGoals, away: awayGoals } } : m),
        players: prev.players.map(p => ({
          ...p,
          stamina: Math.max(40, p.stamina - Math.floor(Math.random() * 15 + 5)),
          morale: Math.min(100, Math.max(30, p.morale + (isWin ? 5 : isDraw ? 0 : -5))),
        })),
        budget: prev.budget + prize,
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
  }, [tactics, addFinance]);

  const trainPlayer = useCallback((playerId: string) => {
    const cost = 10000;
    setClub(prev => {
      if (prev.budget < cost) return prev;
      addFinance('despesa', 'Treino', cost, `Treino de jogador`);
      return {
        ...prev,
        budget: prev.budget - cost,
        players: prev.players.map(p =>
          p.id === playerId
            ? { ...p, overall: Math.min(99, p.overall + (Math.random() > 0.5 ? 1 : 0)), stamina: Math.min(100, p.stamina + 10), morale: Math.min(100, p.morale + 3) }
            : p
        ),
      };
    });
  }, [addFinance]);

  const restPlayer = useCallback((playerId: string) => {
    setClub(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === playerId ? { ...p, stamina: Math.min(100, p.stamina + 20) } : p),
    }));
  }, []);

  const buyPlayer = useCallback((player: Player) => {
    const value = getPlayerValue(player);
    setClub(prev => {
      if (prev.budget < value) return prev;
      addFinance('despesa', 'Transferência', value, `Compra de ${player.name}`);
      return { ...prev, budget: prev.budget - value, players: [...prev.players, player] };
    });
    setMarketPlayers(prev => prev.filter(p => p.id !== player.id));
  }, [addFinance]);

  const sellPlayer = useCallback((player: Player) => {
    const value = Math.floor(getPlayerValue(player) * 0.8);
    setClub(prev => {
      if (prev.players.length <= 11) return prev;
      addFinance('receita', 'Transferência', value, `Venda de ${player.name}`);
      return { ...prev, budget: prev.budget + value, players: prev.players.filter(p => p.id !== player.id) };
    });
  }, [addFinance]);

  const refreshMarket = useCallback(() => {
    setMarketPlayers(generateMarketPlayers(8));
  }, []);

  const getFullState = useCallback((): GameState => ({
    club, tactics, leagueTeams, finances, marketPlayers,
  }), [club, tactics, leagueTeams, finances, marketPlayers]);

  const totalSalaries = club.players.reduce((s, p) => s + p.salary, 0);

  return {
    club, tactics, leagueTeams, finances, marketPlayers, totalSalaries,
    setTactics, simulateMatch, trainPlayer, restPlayer, buyPlayer, sellPlayer, refreshMarket, getFullState,
  };
}
