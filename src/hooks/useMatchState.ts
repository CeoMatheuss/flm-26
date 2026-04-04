import { useState, useCallback } from 'react';
import { Club, Match, Player } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { GameEvent } from '@/types/events';
import { getStadiumCapacity } from '@/types/infrastructure';
import { toast } from 'sonner';

export interface RankingHistory {
  season: number;
  endRating: number;
  position: number;
  change: number;
}

export function useMatchState(initialState: any, userId?: string) {
  const [events, setEvents] = useState<GameEvent[]>(initialState?.events ?? []);
  const [ranking, setRanking] = useState(() => {
    if (initialState?.rankingVersion && initialState.rankingVersion >= 3) return initialState.ranking ?? 0;
    return 0;
  });
  const [rankingHistory, setRankingHistory] = useState<RankingHistory[]>(() => {
    if (initialState?.rankingVersion && initialState.rankingVersion >= 3) return initialState.rankingHistory ?? [];
    return [];
  });
  const [friendliesPlayedToday, setFriendliesPlayedToday] = useState(initialState?.friendliesPlayedToday ?? 0);
  const [friendliesPlayedSeason, setFriendliesPlayedSeason] = useState(initialState?.friendliesPlayedSeason ?? 0);
  const [lastFriendlyDate, setLastFriendlyDate] = useState(initialState?.lastFriendlyDate ?? '');

  const alreadyPlayedToday = false; // Unlimited friendlies

  const applyServerResult = useCallback(({
    matchId, homeGoals, awayGoals, isHome = true,
  }: {
    matchId: string; homeGoals: number; awayGoals: number; isHome?: boolean;
  }, deps: {
    setClub: React.Dispatch<React.SetStateAction<Club>>;
    sponsors: any[];
    infrastructure: any;
    addFinance: (type: 'receita' | 'despesa', cat: string, amount: number, desc: string) => void;
    setSeason: (fn: (s: any) => any) => void;
  }) => {
    const nowIso = new Date().toISOString();
    setLastFriendlyDate(nowIso);
    setFriendliesPlayedToday(1);

    if (userId) {
      supabase.from('game_saves')
        .update({ last_match_timestamp: nowIso } as any)
        .eq('user_id', userId)
        .then(() => {});
    }

    const isWin = isHome ? homeGoals > awayGoals : awayGoals > homeGoals;
    const isDraw = homeGoals === awayGoals;

    deps.setClub(prev => {
      const match = prev.matches.find(m => m.id === matchId);
      if (!match || match.played) {
        console.warn('[applyServerResult] Match not found or already played:', matchId);
        return prev;
      }

      const teamStrength = prev.players.reduce((s, p) => s + p.overall, 0) / Math.max(1, prev.players.length);
      const strengthDiff = 65 - teamStrength;
      const strengthFactor = 1 + (strengthDiff / 100);
      const baseWin = 20, baseDraw = 5, baseLoss = -15;
      const rankingDelta = Math.round((isWin ? baseWin : isDraw ? baseDraw : baseLoss) * strengthFactor);
      setRanking(r => Math.max(100, r + rankingDelta));

      const sponsorIncome = deps.sponsors.reduce((s: number, sp: any) => s + sp.monthlyPay, 0);
      const sponsorWeekly = Math.floor(sponsorIncome / 4);
      const stadiumBonus = deps.infrastructure.stadium.level * 20000;
      const ticketRevenue = Math.floor(prev.fans * prev.ticketPrice * 0.1);
      const prize = (isWin ? 150000 : isDraw ? 75000 : 30000) + stadiumBonus + ticketRevenue;

      if (sponsorWeekly > 0) deps.addFinance('receita', 'Patrocínio', sponsorWeekly, 'Receita de patrocínios');
      deps.addFinance('receita', 'Partida', prize, `${isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota'} vs ${match.opponent}`);

      const goalDiff = homeGoals - awayGoals;
      const isRout = isHome ? goalDiff >= 3 : goalDiff <= -3;
      const isBigLoss = isHome ? goalDiff <= -3 : goalDiff >= 3;
      const streak = prev.matches.filter(m => m.played).slice(-4);
      const recentWins = streak.filter(m => m.result && m.result.home > m.result.away).length;
      const recentLosses = streak.filter(m => m.result && m.result.home < m.result.away).length;
      const streakBonus = recentWins >= 4 ? 1200 : recentWins >= 3 ? 500 : recentWins >= 2 ? 200 : 0;
      const streakPenalty = recentLosses >= 4 ? -800 : recentLosses >= 3 ? -300 : 0;
      const stadiumFanBonus = deps.infrastructure.stadium.level * 80;
      const ticketPenalty = prev.ticketPrice > 100 ? -Math.floor((prev.ticketPrice - 100) * 3) :
                            prev.ticketPrice > 60 ? -Math.floor((prev.ticketPrice - 60) * 1.5) : 0;
      let fanChange = 0;
      if (isWin) fanChange = 200 + (isRout ? 500 : 0);
      else if (isDraw) fanChange = 50;
      else fanChange = 20 + (isBigLoss ? -50 : 0);
      fanChange += streakBonus + streakPenalty + stadiumFanBonus + ticketPenalty;
      fanChange = Math.round(fanChange * 0.3);
      fanChange = Math.max(-200, Math.min(fanChange, 300));
      const repChange = isWin ? (isRout ? 2 : 1) : isDraw ? 0 : (isBigLoss ? -2 : -1);

      const fanSign = fanChange >= 0 ? '+' : '';
      if (isWin) toast.success(`Vitória! ${homeGoals} x ${awayGoals} | Torcida ${fanSign}${fanChange}`);
      else if (isDraw) toast.info(`Empate: ${homeGoals} x ${awayGoals} | Torcida ${fanSign}${fanChange}`);
      else toast.error(`Derrota: ${homeGoals} x ${awayGoals} | Torcida ${fanSign}${fanChange}`);

      deps.setSeason((s: any) => ({ ...s, currentWeek: s.currentWeek + 1 }));

      return {
        ...prev,
        matches: prev.matches.filter(m => m.id !== matchId),
        players: prev.players.map(p => ({
          ...p,
          morale: Math.min(100, Math.max(20, p.morale + (isWin ? 5 : isDraw ? 0 : -5))),
          stamina: Math.min(100, Math.max(20, p.stamina - Math.floor(Math.random() * 10 + 5))),
          gamesPlayed: p.gamesPlayed + 1,
        })),
        budget: prev.budget + prize + sponsorWeekly,
        fans: Math.max(100, prev.fans + fanChange),
        reputation: Math.min(100, Math.max(1, prev.reputation + repChange)),
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

    console.log(`[applyServerResult] Applied server result for match ${matchId}: ${homeGoals}x${awayGoals}`);
  }, [userId]);

  const generateFriendly = useCallback(async (
    club: Club,
    infrastructureLevel: number,
    setClub: React.Dispatch<React.SetStateAction<Club>>,
  ) => {
    const hasUnplayed = club.matches.some(m => !m.played);
    if (hasUnplayed) {
      toast.error('Você já tem um amistoso agendado! Jogue-o primeiro.');
      return;
    }

    const botStrength = 55 + Math.floor(Math.random() * 26);
    const isHome = Math.random() > 0.5;
    const botStadium = 'Estádio BOT FC';
    const botCapacity = Math.floor(5000 + (botStrength - 50) * 150);
    const myCapacity = getStadiumCapacity(infrastructureLevel);

    const friendlyMatch: Match = {
      id: Math.random().toString(36).substr(2, 9),
      opponent: 'BOT FC', opponentLogo: '🤖',
      date: new Date().toISOString(), played: false, isHome,
      stadium: isHome ? (club.stadiumName || 'Arena') : botStadium,
      stadiumCapacity: isHome ? myCapacity : botCapacity,
      opponentStrength: botStrength,
    };
    setClub(prev => ({ ...prev, matches: [...prev.matches, friendlyMatch] }));
    toast.info(`⚽ Amistoso ${isHome ? '(Casa)' : '(Fora)'} vs BOT FC (OVR ~${botStrength})!`);
  }, []);

  return {
    events, setEvents, ranking, setRanking, rankingHistory, setRankingHistory,
    friendliesPlayedToday, setFriendliesPlayedToday,
    friendliesPlayedSeason, setFriendliesPlayedSeason,
    lastFriendlyDate, setLastFriendlyDate,
    alreadyPlayedToday,
    applyServerResult, generateFriendly,
  };
}
