import { useState, useCallback } from 'react';
import { Club, Match, Player, PhysicalStatus } from '@/types/game';
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
    matchId, homeGoals, awayGoals, isHome = true, competition,
  }: {
    matchId: string; homeGoals: number; awayGoals: number; isHome?: boolean; competition?: string;
  }, deps: {
    setClub: React.Dispatch<React.SetStateAction<Club>>;
    sponsors: any[];
    infrastructure: any;
    addFinance: (type: 'receita' | 'despesa', cat: string, amount: number, desc: string) => void;
    setSeason: (fn: (s: any) => any) => void;
    stadiumOps?: any;
  }) => {
    const nowIso = new Date().toISOString();
    setLastFriendlyDate(nowIso);
    setFriendliesPlayedToday(1);

    const isWin = isHome ? homeGoals > awayGoals : awayGoals > homeGoals;
    const isDraw = homeGoals === awayGoals;

    deps.setClub(prev => {
      const match = prev.matches.find(m => m.id === matchId);
      
      const teamStrength = prev.players.reduce((s, p) => s + p.overall, 0) / Math.max(1, prev.players.length);
      const strengthDiff = 65 - teamStrength;
      const strengthFactor = 1 + (strengthDiff / 100);
      const baseWin = 20, baseDraw = 5, baseLoss = -15;
      const rankingDelta = Math.round((isWin ? baseWin : isDraw ? baseDraw : baseLoss) * strengthFactor);
      setRanking(r => Math.max(100, r + rankingDelta));

      const sponsorIncome = deps.sponsors.reduce((s: number, sp: any) => s + sp.monthlyPay, 0);
      const sponsorWeekly = Math.floor(sponsorIncome / 4);
      const stadiumBonus = (deps.infrastructure?.stadium?.level || 1) * 20000;
      const ticketRevenue = Math.floor(prev.fans * prev.ticketPrice * 0.1);
      const prize = (isWin ? 150000 : isDraw ? 75000 : 30000) + stadiumBonus + ticketRevenue;

      const compLower = (competition || '').toLowerCase();
      const isFriendly = !competition || compLower.includes('amistos');
      let leaguePrize = 0;
      if (!isFriendly) {
        const stadiumLeagueScale = 1 + ((deps.infrastructure?.stadium?.level || 1) - 1) * 0.05;
        const resultMult = isWin ? 1.5 : isDraw ? 1.0 : 0.75;
        leaguePrize = Math.round(20000 * resultMult * stadiumLeagueScale);
      }

      let stadiumPenaltyFine = 0;
      let stadiumPenaltyRep = 0;
      let stadiumPenaltyMsg = '';
      if (isHome && !isFriendly && deps.stadiumOps) {
        try {
          const { computeMatchPenalty } = require('@/match/stadiumExtras');
          const pen = computeMatchPenalty(deps.stadiumOps, isFriendly);
          if (pen) {
            stadiumPenaltyFine = pen.fine;
            stadiumPenaltyRep = pen.reputationLoss;
            stadiumPenaltyMsg = pen.reason;
          }
        } catch (e) {
          console.error('Error computing stadium penalty:', e);
        }
      }

      if (sponsorWeekly > 0) deps.addFinance('receita', 'Patrocínio', sponsorWeekly, 'Receita de patrocínios');
      deps.addFinance('receita', 'Partida', prize, `${isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota'} vs ${match?.opponent || 'Adversário'}`);
      if (leaguePrize > 0) {
        deps.addFinance('receita', 'Premiação Liga', leaguePrize, `Cota ${competition} vs ${match?.opponent || 'Adversário'}`);
      }
      if (stadiumPenaltyFine > 0) {
        deps.addFinance('despesa', 'Multa Estádio', stadiumPenaltyFine, stadiumPenaltyMsg);
      }

      const stadiumFanBonus = Math.min(20, (deps.infrastructure?.stadium?.level || 1) * 5);
      const repBonus = prev.reputation >= 70 ? 10 : prev.reputation <= 30 ? -10 : 0;

      let fanChange: number;
      if (isWin) {
        fanChange = 50 + Math.floor(Math.random() * 51);
      } else if (isDraw) {
        fanChange = 20 + Math.floor(Math.random() * 31);
      } else {
        fanChange = Math.floor(Math.random() * 21);
      }
      fanChange += stadiumFanBonus + repBonus;
      fanChange = Math.max(-50, Math.min(fanChange, 100));

      const isRout = isHome ? (homeGoals - awayGoals) >= 3 : (awayGoals - homeGoals) >= 3;
      const isBigLoss = isHome ? (homeGoals - awayGoals) <= -3 : (awayGoals - homeGoals) <= -3;
      const repChange = isWin ? (isRout ? 2 : 1) : isDraw ? 0 : (isBigLoss ? -2 : -1);

      const prizeMsg = leaguePrize > 0 ? ` | +R$${(leaguePrize/1000).toFixed(0)}k liga` : '';
      const penMsg = stadiumPenaltyFine > 0 ? ` | -R$${(stadiumPenaltyFine/1000).toFixed(0)}k multa estádio` : '';
      
      toast(isWin ? 'Vitória!' : isDraw ? 'Empate' : 'Derrota', {
        description: `${homeGoals} x ${awayGoals} | Torcida ${fanChange >= 0 ? '+' : ''}${fanChange}${prizeMsg}${penMsg}`,
      });

      if (userId) {
        supabase.from('user_notifications').insert({
          user_id: userId,
          type: 'match_result',
          icon: isWin ? '🏆' : '⚽',
          title: `Fim de Jogo: ${isWin ? 'Vitória!' : isDraw ? 'Empate' : 'Derrota'}`,
          message: `${prev.name} ${homeGoals} x ${awayGoals} vs ${match?.opponent || 'Adversário'}. Posição: Ver tabela.`,
        }).then(() => {});
      }

      deps.setSeason((s: any) => ({ ...s, currentWeek: s.currentWeek + 1 }));

      return {
        ...prev,
        matches: prev.matches.filter(m => m.id !== matchId),
        players: prev.players.map(p => {
          const drain = Math.floor(Math.random() * 15 + 10); 
          const newStamina = Math.max(0, p.stamina - drain);
          return {
            ...p,
            stamina: newStamina,
            physicalStatus: newStamina >= 95 ? 'Descansado' : newStamina >= 80 ? 'Em forma' : newStamina >= 60 ? 'Desgastado' : newStamina >= 40 ? 'Cansado' : newStamina >= 20 ? 'Exausto' : 'Risco de Lesão',
            staminaLastUpdatedAt: nowIso,
            morale: Math.min(100, Math.max(20, p.morale + (isWin ? 5 : isDraw ? 0 : -5))),
            gamesPlayed: p.gamesPlayed + 1,
          };
        }),
        budget: prev.budget + prize + sponsorWeekly + leaguePrize - stadiumPenaltyFine,
        fans: Math.max(1000, prev.fans + fanChange),
        reputation: Math.min(100, Math.max(1, prev.reputation + repChange - stadiumPenaltyRep)),
        stats: {
          wins: prev.stats.wins + (isWin ? 1 : 0),
          draws: prev.stats.draws + (isDraw ? 1 : 0),
          losses: prev.stats.losses + (!isWin && !isDraw ? 1 : 0),
          goalsFor: prev.stats.goalsFor + (isHome ? homeGoals : awayGoals),
          goalsAgainst: prev.stats.goalsAgainst + (isHome ? awayGoals : homeGoals),
          points: prev.stats.points + (isWin ? 3 : isDraw ? 1 : 0),
        },
      };
    });
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
