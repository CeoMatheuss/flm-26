import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Club, Player, Match, ScoutReport, Scout, PlayerAttributes } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { TrainingFocus } from '@/components/game/TrainingTab';
import { TacticsConfig, defaultTactics } from '@/types/tactics';
import { LeagueTeam, initialLeagueTeams, getLeagueTeams } from '@/types/league';
import { FinanceEntry, createFinanceEntry } from '@/types/finance';
import { Infrastructure, defaultInfrastructure, getUpgradeCost, getAcademyUpgradeCost, getStadiumUpgradeCost, getStadiumCapacity, getTrainingBoost, getPhysiotherapyRecovery, YouthProspect, SeasonData, defaultSeason, getYouthMonthlyPlayers } from '@/types/infrastructure';
import { Sponsor, SponsorOffer, generateSponsorOffers } from '@/types/sponsor';
import { initialClub, generateSeasonMatches } from '@/data/initialData';
import { generateMarketPlayers, getPlayerValue, generateYouthBatch, generateFreeAgents, generateScoutReport } from '@/utils/playerGenerator';
import { GameEvent, generateRandomEvents } from '@/types/events';
import { toast } from 'sonner';

import { Achievement, checkAchievements } from '@/types/achievements';
import { MatchReport, generateMatchReport, InterviewScenario, generateInterviewScenario, InterviewChoice } from '@/types/matchReport';
import { ClubProfile, defaultClubProfile } from '@/types/clubProfile';
import { CTRooms, defaultCTRooms, getCTRoomUpgradeCost } from '@/types/ctRooms';

export interface LoanedPlayer {
  player: Player;
  fromClub: string; // 'player' = loaned out by player, 'bot' = loaned in from bot
  direction: 'in' | 'out';
  seasonStart: number;
}

export interface RankingHistory {
  season: number;
  endRating: number;
  position: number;
  change: number;
}

export interface GameState {
  club: Club;
  tactics: TacticsConfig;
  leagueTeams: LeagueTeam[];
  finances: FinanceEntry[];
  marketPlayers: Player[];
  freeAgents: Player[];
  infrastructure: Infrastructure;
  youthProspects: YouthProspect[];
  youthInvestment: number;
  season: SeasonData;
  sponsors: Sponsor[];
  sponsorOffers: SponsorOffer[];
  events: GameEvent[];
  loanedPlayers?: LoanedPlayer[];
  trainingFocus?: Record<string, TrainingFocus>;
  
  achievements?: Achievement[];
  lastMatchReport?: MatchReport;
  clubProfile?: ClubProfile;
  ctRooms?: CTRooms;
  youthPromotedCount?: number;
  ranking?: number;
  rankingVersion?: number;
  rankingHistory?: RankingHistory[];
  friendliesPlayedToday?: number;
  friendliesPlayedSeason?: number;
  lastFriendlyDate?: string;
}

function resetLeagueTeams(): LeagueTeam[] {
  return initialLeagueTeams.map(t => ({ ...t, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 }));
}

function applyAgeDevelopment(player: Player): Player {
  if (player.age <= 33) return player;
  const lossChance = 0.1 + (player.age - 33) * 0.08;
  if (Math.random() < lossChance) {
    const attrs = { ...player.attributes };
    // Random attribute loses 1-2 points
    const keys = Object.keys(attrs) as (keyof typeof attrs)[];
    const key = keys[Math.floor(Math.random() * keys.length)];
    attrs[key] = Math.max(1, attrs[key] - Math.floor(Math.random() * 2 + 1));
    return { ...player, overall: Math.max(40, player.overall - 1), attributes: attrs };
  }
  return player;
}

export function useGame(initialState?: GameState, userId?: string) {
  const [club, setClub] = useState<Club>(initialState?.club ?? initialClub);
  const [tactics, setTactics] = useState<TacticsConfig>(initialState?.tactics ?? defaultTactics);
  const [leagueTeams, setLeagueTeams] = useState<LeagueTeam[]>(initialState?.leagueTeams ?? initialLeagueTeams);
  const [finances, setFinances] = useState<FinanceEntry[]>(initialState?.finances ?? []);
  const [marketPlayers, setMarketPlayers] = useState<Player[]>(initialState?.marketPlayers ?? generateMarketPlayers(8));
  const [freeAgents, setFreeAgents] = useState<Player[]>(initialState?.freeAgents ?? generateFreeAgents(12));
  const [infrastructure, setInfrastructure] = useState<Infrastructure>(initialState?.infrastructure ?? defaultInfrastructure);
  const [youthProspects, setYouthProspects] = useState<YouthProspect[]>(initialState?.youthProspects ?? []);
  const [youthInvestment, setYouthInvestment] = useState(initialState?.youthInvestment ?? 100000);
  const [season, setSeason] = useState<SeasonData>(initialState?.season ?? defaultSeason);
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialState?.sponsors ?? []);
  const [sponsorOffers, setSponsorOffers] = useState<SponsorOffer[]>(initialState?.sponsorOffers ?? generateSponsorOffers(65, 4));
  const [events, setEvents] = useState<GameEvent[]>(initialState?.events ?? []);
  const [loanedPlayers, setLoanedPlayers] = useState<LoanedPlayer[]>(initialState?.loanedPlayers ?? []);
  const [trainingFocus, setTrainingFocus] = useState<Record<string, TrainingFocus>>(initialState?.trainingFocus ?? {});
  const [listedForSale, setListedForSale] = useState<string[]>([]);

  // Load active listings from database on mount
  useEffect(() => {
    if (!userId) return;
    const loadActiveListings = async () => {
      const { data } = await supabase
        .from('transfer_listings')
        .select('player_data')
        .eq('seller_id', userId)
        .eq('status', 'active');
      if (data && data.length > 0) {
        const ids = data.map((d: any) => d.player_data?.id).filter(Boolean);
        setListedForSale(ids);
      }
    };
    loadActiveListings();
  }, [userId]);
   const [achievements, setAchievements] = useState<Achievement[]>(initialState?.achievements ?? []);
   const [lastMatchReport, setLastMatchReport] = useState<MatchReport | undefined>(initialState?.lastMatchReport);
   const [clubProfile, setClubProfile] = useState<ClubProfile>(initialState?.clubProfile ?? defaultClubProfile);
   const [ctRooms, setCTRooms] = useState<CTRooms>(initialState?.ctRooms ?? defaultCTRooms);
   const [youthPromotedCount, setYouthPromotedCount] = useState(initialState?.youthPromotedCount ?? 0);
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

   const MAX_FRIENDLIES_PER_DAY = 1;

  const addFinance = useCallback((type: 'receita' | 'despesa', category: string, amount: number, desc: string) => {
    setFinances(prev => [...prev, createFinanceEntry(type, category, amount, desc)]);
  }, []);

  /**
   * applyServerResult — Aplica resultado JÁ CALCULADO pelo servidor.
   * NÃO recalcula gols. Usa home_goals/away_goals do banco.
   * Substitui simulateMatch() para o fluxo de partidas online.
   */
  const applyServerResult = useCallback(({
    matchId,
    homeGoals,
    awayGoals,
    isHome = true,
  }: {
    matchId: string;
    homeGoals: number;
    awayGoals: number;
    isHome?: boolean;
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

    setClub(prev => {
      const match = prev.matches.find(m => m.id === matchId);
      if (!match || match.played) {
        console.warn('[applyServerResult] Match not found or already played:', matchId);
        return prev;
      }

      const opponentTeam = leagueTeams.find(t => t.name === match.opponent);
      const teamStrength = prev.players.reduce((s, p) => s + p.overall, 0) / Math.max(1, prev.players.length);
      const strengthDiff = (opponentTeam?.strength || 65) - teamStrength;
      const strengthFactor = 1 + (strengthDiff / 100);
      const baseWin = 20, baseDraw = 5, baseLoss = -15;
      const rankingDelta = Math.round((isWin ? baseWin : isDraw ? baseDraw : baseLoss) * strengthFactor);
      setRanking(r => Math.max(100, r + rankingDelta));

      const sponsorIncome = sponsors.reduce((s, sp) => s + sp.monthlyPay, 0);
      const sponsorWeekly = Math.floor(sponsorIncome / 4);
      const stadiumBonus = infrastructure.stadium.level * 20000;
      const ticketRevenue = Math.floor(prev.fans * prev.ticketPrice * 0.1);
      const prize = (isWin ? 150000 : isDraw ? 75000 : 30000) + stadiumBonus + ticketRevenue;

      if (sponsorWeekly > 0) {
        addFinance('receita', 'Patrocínio', sponsorWeekly, 'Receita de patrocínios');
      }
      addFinance('receita', 'Partida', prize, `${isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota'} vs ${match.opponent}`);

      const goalDiff = homeGoals - awayGoals;
      const isRout = isHome ? goalDiff >= 3 : goalDiff <= -3;
      const isBigLoss = isHome ? goalDiff <= -3 : goalDiff >= 3;
      const streak = prev.matches.filter(m => m.played).slice(-4);
      const recentWins = streak.filter(m => m.result && m.result.home > m.result.away).length;
      const recentLosses = streak.filter(m => m.result && m.result.home < m.result.away).length;
      const streakBonus = recentWins >= 4 ? 1200 : recentWins >= 3 ? 500 : recentWins >= 2 ? 200 : 0;
      const streakPenalty = recentLosses >= 4 ? -800 : recentLosses >= 3 ? -300 : 0;
      const stadiumFanBonus = infrastructure.stadium.level * 80;
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

      setSeason(s => ({ ...s, currentWeek: s.currentWeek + 1 }));

      // Update league table
      setLeagueTeams(prevTeams => prevTeams.map(t => {
        if (t.name === prev.name) {
          return { ...t, played: t.played + 1, wins: t.wins + (isWin ? 1 : 0), draws: t.draws + (isDraw ? 1 : 0), losses: t.losses + (!isWin && !isDraw ? 1 : 0), goalsFor: t.goalsFor + homeGoals, goalsAgainst: t.goalsAgainst + awayGoals, points: t.points + (isWin ? 3 : isDraw ? 1 : 0) };
        }
        const str = t.strength || 65;
        const winProb = str / 130;
        const w = Math.random() < winProb;
        const d = !w && Math.random() < 0.3;
        const gf = w ? Math.floor(Math.random() * 3 + 1) : Math.floor(Math.random() * 2);
        const ga = w ? Math.floor(Math.random() * 2) : d ? gf : Math.floor(Math.random() * 3 + 1);
        return { ...t, played: t.played + 1, wins: t.wins + (w ? 1 : 0), draws: t.draws + (d ? 1 : 0), losses: t.losses + (!w && !d ? 1 : 0), goalsFor: t.goalsFor + gf, goalsAgainst: t.goalsAgainst + ga, points: t.points + (w ? 3 : d ? 1 : 0) };
      }));

      return {
        ...prev,
        // Remove played BOT FC matches — history is stored server-side in match_history
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
  }, [addFinance, infrastructure, sponsors, leagueTeams, userId]);

  const simulateMatch = useCallback((matchId: string) => {
    // Mark the friendly as played NOW (prevents playing 2 per day)
    const nowIso = new Date().toISOString();
    setLastFriendlyDate(nowIso);
    setFriendliesPlayedToday(1);
    
    // Update database timestamp to enforce across sessions
    if (userId) {
      supabase.from('game_saves')
        .update({ last_match_timestamp: nowIso } as any)
        .eq('user_id', userId)
        .then(() => {});
    }
    
    setClub(prev => {
      const match = prev.matches.find(m => m.id === matchId);
      if (!match || match.played) return prev;

      const teamStrength = prev.players.reduce((s, p) => s + p.overall, 0) / prev.players.length;
      const tacticBonus = tactics.playStyle === 'ofensivo' ? 5 : tactics.playStyle === 'defensivo' ? -3 : 0;
      const pressingBonus = tactics.pressing === 'alto' ? 3 : tactics.pressing === 'baixo' ? -2 : 0;
      // Competitivo personality bonus against strong teams
      const hasCompetitivo = prev.players.some(p => p.personality === 'competitivo');
      const opponentTeamPreCheck = leagueTeams.find(t => t.name === match.opponent);
      const competitivoBonus = hasCompetitivo && (opponentTeamPreCheck?.strength || 65) > 70 ? 3 : 0;
      const adjustedStrength = teamStrength + tacticBonus + pressingBonus + competitivoBonus;
      // Use bot team strength from league data
      const opponentTeam = leagueTeams.find(t => t.name === match.opponent);
      const opponentStrength = (opponentTeam?.strength || 65) + Math.random() * 15 - 5;

      const homeGoals = Math.floor(Math.random() * 4 * (adjustedStrength / opponentStrength));
      const awayGoals = Math.floor(Math.random() * 3 * (opponentStrength / adjustedStrength));
      const isWin = homeGoals > awayGoals;
      const isDraw = homeGoals === awayGoals;

      // Ranking update: opponent strength factor
      const strengthDiff = (opponentTeam?.strength || 65) - teamStrength;
      const strengthFactor = 1 + (strengthDiff / 100); // beating stronger teams = more points
      const baseWin = 20, baseDraw = 5, baseLoss = -15;
      const competitionWeight = 1.0; // liga nacional
      const rankingDelta = Math.round(
        (isWin ? baseWin : isDraw ? baseDraw : baseLoss) * strengthFactor * competitionWeight
      );
      setRanking(r => Math.max(100, r + rankingDelta));

      const stadiumBonus = infrastructure.stadium.level * 20000;
      const ticketRevenue = Math.floor(prev.fans * prev.ticketPrice * 0.1); // 10% of fans attend
      const prize = (isWin ? 150000 : isDraw ? 75000 : 30000) + stadiumBonus + ticketRevenue;
      const sponsorIncome = sponsors.reduce((s, sp) => s + sp.monthlyPay, 0);
      const sponsorWeekly = Math.floor(sponsorIncome / 4);

      // Dynamic fan system — friendlies with progressive diminishing returns
      const diminishFactor = Math.max(0.1, 1 - (friendliesPlayedSeason * 0.03)); // 3% less per friendly played
      const friendlyMultiplier = 0.3 * diminishFactor;
      const goalDiff = homeGoals - awayGoals;
      const isRout = goalDiff >= 3;
      const isBigLoss = goalDiff <= -3;
      const streak = prev.matches.filter(m => m.played).slice(-4);
      const recentWins = streak.filter(m => m.result && m.result.home > m.result.away).length;
      const recentLosses = streak.filter(m => m.result && m.result.home < m.result.away).length;
      // More patient fans: smaller penalties, need bigger streak to trigger negatives
      const streakBonus = recentWins >= 4 ? 1200 : recentWins >= 3 ? 500 : recentWins >= 2 ? 200 : 0;
      const streakPenalty = recentLosses >= 4 ? -800 : recentLosses >= 3 ? -300 : 0; // No penalty for 2 losses
      const stadiumFanBonus = infrastructure.stadium.level * 80;
      const ticketPenalty = prev.ticketPrice > 100 ? -Math.floor((prev.ticketPrice - 100) * 3) :
                            prev.ticketPrice > 60 ? -Math.floor((prev.ticketPrice - 60) * 1.5) : 0;
      const opponentLevelBonus = Math.floor(((opponentTeam?.strength || 65) - 50) * 0.5);
      let fanChange = 0;
      if (isWin) fanChange = 200 + (isRout ? 500 : 0);
      else if (isDraw) fanChange = 50;
      else fanChange = 20 + (isBigLoss ? -50 : 0);
      fanChange += streakBonus + streakPenalty + stadiumFanBonus + ticketPenalty + opponentLevelBonus;
      fanChange = Math.round(fanChange * friendlyMultiplier);
      fanChange = Math.max(-200, Math.min(fanChange, 300));
      const repChange = isWin ? (isRout ? 2 : 1) : isDraw ? 0 : (isBigLoss ? -2 : -1);

      // Friendly counters already incremented in generateFriendly

      addFinance('receita', 'Partida', prize, `${isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota'} vs ${match.opponent}`);
      if (sponsorWeekly > 0) {
        addFinance('receita', 'Patrocínio', sponsorWeekly, 'Receita de patrocínios');
      }

      setSeason(s => ({ ...s, currentWeek: s.currentWeek + 1 }));

      // Update league
      setLeagueTeams(prevTeams => prevTeams.map(t => {
        if (t.name === prev.name) {
          return { ...t, played: t.played + 1, wins: t.wins + (isWin ? 1 : 0), draws: t.draws + (isDraw ? 1 : 0), losses: t.losses + (!isWin && !isDraw ? 1 : 0), goalsFor: t.goalsFor + homeGoals, goalsAgainst: t.goalsAgainst + awayGoals, points: t.points + (isWin ? 3 : isDraw ? 1 : 0) };
        }
        // AI bot simulation based on team strength
        const str = t.strength || 65;
        const winProb = str / 130; // stronger teams win more
        const w = Math.random() < winProb;
        const d = !w && Math.random() < 0.3;
        const gf = w ? Math.floor(Math.random() * 3 + 1) : Math.floor(Math.random() * 2);
        const ga = w ? Math.floor(Math.random() * 2) : d ? gf : Math.floor(Math.random() * 3 + 1);
        return { ...t, played: t.played + 1, wins: t.wins + (w ? 1 : 0), draws: t.draws + (d ? 1 : 0), losses: t.losses + (!w && !d ? 1 : 0), goalsFor: t.goalsFor + gf, goalsAgainst: t.goalsAgainst + ga, points: t.points + (w ? 3 : d ? 1 : 0) };
      }));

      // Youth arrive every 4 matches
      const playedCount = prev.matches.filter(m => m.played).length + 1;
      if (playedCount % 4 === 0 && prev.budget >= youthInvestment && infrastructure.youthAcademy.level >= 1) {
        const count = getYouthMonthlyPlayers(youthInvestment);
        const newProspects = generateYouthBatch(count, infrastructure.youthAcademy.level);
        setYouthProspects(yp => [...yp, ...newProspects]);
        addFinance('despesa', 'Base', youthInvestment, `Safra da base (Rodada ${playedCount})`);
        toast.info(`${count} jovens chegaram da base!`);
      }

      const youthCost = (playedCount % 4 === 0 && prev.budget >= youthInvestment) ? youthInvestment : 0;

      // Scout reports every 5 matches (only if scouts hired)
      const newMatchesSinceScout = prev.matchesSinceLastScout + 1;
      let newScoutReports = prev.scoutReports;
      let resetScoutCounter = newMatchesSinceScout;
      if (newMatchesSinceScout >= 5 && prev.scouts.length > 0) {
        const allReports: ScoutReport[] = [];
        for (const scout of prev.scouts) {
          const scoutAccuracy = 20 + scout.skill * 8;
          const agentsToScout = freeAgents.slice(0, Math.min(2, Math.ceil(scout.skill / 3)));
          const reports = agentsToScout.map(p => {
            const r = generateScoutReport(p, scoutAccuracy);
            return { ...r, scoutName: scout.name };
          });
          allReports.push(...reports);
        }
        newScoutReports = [...allReports, ...prev.scoutReports].slice(0, 20);
        resetScoutCounter = 0;
        toast.info(`📋 ${allReports.length} relatório(s) de olheiros chegaram!`);
      }

      // Random events after match
      const newEvents = generateRandomEvents(prev.players, prev.fans, prev.reputation, recentLosses, recentWins, infrastructure?.physiotherapy?.level ?? 1, infrastructure?.trainingCenter?.level ?? 1);
      if (newEvents.length > 0) {
        let eventFanDelta = 0;
        let eventBudgetDelta = 0;
        let eventRepDelta = 0;
        const playerEffects: Record<string, { stamina: number; morale: number }> = {};
        let allMoraleDelta = 0;

        for (const ev of newEvents) {
          const parts = ev.impact.split(',');
          for (const part of parts) {
            const [key, val] = part.split(':');
            if (key === 'fans') eventFanDelta += parseInt(val);
            if (key === 'budget') eventBudgetDelta += parseInt(val);
            if (key === 'reputation') eventRepDelta += parseInt(val);
            if (key === 'morale_all') allMoraleDelta += parseInt(val);
            if (key === 'stamina' || key === 'morale') {
              const pidPart = parts.find(p => p.startsWith('player:'));
              if (pidPart) {
                const pid = pidPart.split(':')[1];
                if (!playerEffects[pid]) playerEffects[pid] = { stamina: 0, morale: 0 };
                playerEffects[pid][key] += parseInt(val);
              }
            }
          }
          if (ev.type === 'injury') toast.warning(ev.title);
          else if (ev.type === 'protest') toast.error(ev.title);
          else if (ev.type === 'offer') toast.info(ev.title);
          else toast.success(ev.title);
        }

        // Apply injuries from events
        const injuryMap: Record<string, import('@/types/game').Injury> = {};
        for (const ev of newEvents) {
          if (ev.injuryData) {
            injuryMap[ev.injuryData.playerId] = ev.injuryData.injury;
          }
        }

        fanChange += eventFanDelta;
        const extraPlayers = prev.players.map(p => {
          const eff = playerEffects[p.id];
          return eff ? { ...p, stamina: Math.max(20, p.stamina + eff.stamina), morale: Math.max(20, p.morale + eff.morale) } : p;
        }).map(p => ({ ...p, morale: Math.max(20, Math.min(100, p.morale + allMoraleDelta)) }));

        const fanSign2 = fanChange >= 0 ? '+' : '';
        if (isWin) toast.success(`Vitória! ${homeGoals} x ${awayGoals} | Torcida ${fanSign2}${fanChange}`);
        else if (isDraw) toast.info(`Empate: ${homeGoals} x ${awayGoals} | Torcida ${fanSign2}${fanChange}`);
        else toast.error(`Derrota: ${homeGoals} x ${awayGoals} | Torcida ${fanSign2}${fanChange}`);

        const physioLevel = infrastructure?.physiotherapy?.level ?? 1;
        const extraEvents: GameEvent[] = [];

        // Fan rage when team is doing very poorly
        if (recentLosses >= 4 && !isWin) {
          const rageMessages = [
            `"Diretoria incompetente! Fora técnico!" — Organizadas do ${prev.name} protestam nas redes sociais após mais uma derrota.`,
            `Torcida organizada do ${prev.name} ameaça não ir mais ao estádio: "Esse time é uma vergonha!"`,
            `Faixas de protesto são estendidas em frente ao CT do ${prev.name}: "Queremos respeito, não derrota!"`,
            `Líderes das organizadas convocam reunião de emergência para cobrar jogadores do ${prev.name}.`,
            `"Vocês não vestem a camisa!" — Organizadas do ${prev.name} xingam elenco após ${recentLosses}ª derrota seguida.`,
          ];
          extraEvents.push({
            id: crypto.randomUUID(),
            type: 'fan_rage',
            title: `😡 ORGANIZADAS CONTRA O ${prev.name.toUpperCase()}!`,
            description: rageMessages[Math.floor(Math.random() * rageMessages.length)],
            icon: '🔥',
            impact: `morale_all:-3,fans:-${recentLosses * 200}`,
            resolved: true,
          });
        }

        const mappedPlayers = extraPlayers.map(p => {
          let playerInjury = injuryMap[p.id] ?? p.injury;
          if (playerInjury && !injuryMap[p.id]) {
            playerInjury = { ...playerInjury, weeksRemaining: playerInjury.weeksRemaining - 1 };
            if (playerInjury.weeksRemaining <= 0) {
              playerInjury = undefined as any;
              toast.success(`🏥 ${p.name} se recuperou da lesão!`);
            }
          }
          const isInjured = !!playerInjury;
          const newGames = isInjured ? p.gamesPlayed : p.gamesPlayed + 1;
          const boost = getTrainingBoost(infrastructure?.trainingCenter?.level ?? 1);
          let newOverall = p.overall;
          if (newGames >= 10 && p.age <= 33 && !isInjured && (infrastructure?.trainingCenter?.level ?? 1) >= 2) {
            const chance = p.age <= 30 ? boost : boost * 0.3;
            const gained = Math.random() < chance ? 1 : 0;
            newOverall = Math.min(99, p.overall + gained);
            if (gained > 0) {
              extraEvents.push({
                id: crypto.randomUUID(),
                type: 'player_upgrade',
                title: `📈 ${p.name} EVOLUIU!`,
                description: `${p.name} (${p.position}) subiu para OVR ${newOverall}! O treinamento no CT está dando resultado.`,
                icon: '⬆️',
                impact: `player:${p.id}`,
                resolved: true,
              });
            }
          }
          return {
            ...p,
            injury: playerInjury || undefined,
            overall: newOverall,
            gamesPlayed: newGames >= 10 ? 0 : newGames,
            stamina: (() => {
              const baseStamina = isInjured
                ? Math.min(100, p.stamina + getPhysiotherapyRecovery(physioLevel) * 0.5)
                : Math.min(100, Math.max(40, p.stamina - Math.floor(Math.random() * 15 + 5) + getPhysiotherapyRecovery(physioLevel)));
              const festeiroPenalty = p.personality === 'festeiro' ? Math.floor(Math.random() * 8 + 3) : 0;
              return Math.max(20, baseStamina - festeiroPenalty);
            })(),
            morale: (() => {
              const baseMoraleDelta = isWin ? 5 : isDraw ? 0 : -5;
              const moraleDelta = p.personality === 'temperamental' ? baseMoraleDelta * 2 :
                p.personality === 'calmo' ? Math.round(baseMoraleDelta * 0.5) : baseMoraleDelta;
              return Math.min(100, Math.max(20, p.morale + moraleDelta));
            })(),
            trainingProgress: (() => {
              const base = newGames >= 10 ? 0 : newGames;
              if (p.personality === 'dedicado' && !isInjured && base > 0) return Math.min(base + 1, 12);
              if (p.personality === 'preguicoso' && Math.random() < 0.2) return Math.max(0, base - 1);
              return base;
            })(),
          };
        });

        // Líder personality: +3 morale to all teammates when team wins
        const hasLider = mappedPlayers.some(p => p.personality === 'lider');
        if (hasLider && isWin) {
          mappedPlayers.forEach((p, i) => {
            mappedPlayers[i] = { ...p, morale: Math.min(100, p.morale + 3) };
          });
        }

        setEvents(ev => [...extraEvents, ...newEvents.map(e => ({ ...e, resolved: true })), ...ev].slice(0, 20));

        return {
          ...prev,
          matches: prev.matches.map(m => m.id === matchId ? { ...m, played: true, result: { home: homeGoals, away: awayGoals } } : m),
          players: mappedPlayers,
          budget: prev.budget + prize + sponsorWeekly - youthCost + eventBudgetDelta,
          fans: Math.max(100, prev.fans + fanChange),
          reputation: Math.min(100, Math.max(1, prev.reputation + repChange + eventRepDelta)),
          scoutReports: newScoutReports,
          matchesSinceLastScout: resetScoutCounter,
          stats: {
            wins: prev.stats.wins + (isWin ? 1 : 0),
            draws: prev.stats.draws + (isDraw ? 1 : 0),
            losses: prev.stats.losses + (!isWin && !isDraw ? 1 : 0),
            goalsFor: prev.stats.goalsFor + homeGoals,
            goalsAgainst: prev.stats.goalsAgainst + awayGoals,
            points: prev.stats.points + (isWin ? 3 : isDraw ? 1 : 0),
          },
        };
      }

      // Result toast
      const fanSign = fanChange >= 0 ? '+' : '';
      if (isWin) toast.success(`Vitória! ${homeGoals} x ${awayGoals} | Torcida ${fanSign}${fanChange}`);
      else if (isDraw) toast.info(`Empate: ${homeGoals} x ${awayGoals} | Torcida ${fanSign}${fanChange}`);
      else toast.error(`Derrota: ${homeGoals} x ${awayGoals} | Torcida ${fanSign}${fanChange}`);

      const physioLevel2 = infrastructure?.physiotherapy?.level ?? 1;

      return {
        ...prev,
        matches: prev.matches.map(m => m.id === matchId ? { ...m, played: true, result: { home: homeGoals, away: awayGoals } } : m),
        players: prev.players.map(p => {
          // Tick down existing injury
          let playerInjury = p.injury;
          if (playerInjury) {
            playerInjury = { ...playerInjury, weeksRemaining: playerInjury.weeksRemaining - 1 };
            if (playerInjury.weeksRemaining <= 0) {
              playerInjury = undefined as any;
              toast.success(`🏥 ${p.name} se recuperou da lesão!`);
            }
          }

          const isInjured = !!playerInjury;
          const newGames = isInjured ? p.gamesPlayed : p.gamesPlayed + 1;
          const boost = getTrainingBoost(infrastructure?.trainingCenter?.level ?? 1);
          let newOverall = p.overall;
          if (newGames >= 10 && p.age <= 33 && !isInjured && (infrastructure?.trainingCenter?.level ?? 1) >= 2) {
            const chance = p.age <= 30 ? boost : boost * 0.3;
            newOverall = Math.min(99, p.overall + (Math.random() < chance ? 1 : 0));
          }
          return {
            ...p,
            injury: playerInjury || undefined,
            gamesPlayed: newGames >= 10 ? 0 : newGames,
            trainingProgress: newGames >= 10 ? 0 : newGames,
            overall: newOverall,
            stamina: (() => {
              const baseStamina = isInjured
                ? Math.min(100, p.stamina + getPhysiotherapyRecovery(physioLevel2) * 0.5)
                : Math.min(100, Math.max(40, p.stamina - Math.floor(Math.random() * 15 + 5) + getPhysiotherapyRecovery(physioLevel2)));
              const festeiroPenalty = p.personality === 'festeiro' ? Math.floor(Math.random() * 8 + 3) : 0;
              return Math.max(20, baseStamina - festeiroPenalty);
            })(),
            morale: (() => {
              const baseMoraleDelta = isWin ? 5 : isDraw ? 0 : -5;
              const moraleDelta = p.personality === 'temperamental' ? baseMoraleDelta * 2 :
                p.personality === 'calmo' ? Math.round(baseMoraleDelta * 0.5) : baseMoraleDelta;
              return Math.min(100, Math.max(20, p.morale + moraleDelta));
            })(),
          };
        }),
        budget: prev.budget + prize + sponsorWeekly - youthCost,
        fans: Math.max(100, prev.fans + fanChange),
        reputation: Math.min(100, Math.max(1, prev.reputation + repChange)),
        scoutReports: newScoutReports,
        matchesSinceLastScout: resetScoutCounter,
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
  }, [tactics, addFinance, infrastructure, sponsors, youthInvestment, freeAgents]);

  const trainPlayer = useCallback((_playerId: string) => {
    toast.info('Selecione o foco de treino na aba Treinos!');
  }, []);

  const setPlayerTrainingFocus = useCallback((playerId: string, focus: TrainingFocus) => {
    setTrainingFocus(prev => ({ ...prev, [playerId]: focus }));
    if (focus === 'none') {
      toast.info('Foco de treino removido.');
    } else {
      const focusNames: Record<string, string> = { speed: 'Velocidade', shooting: 'Finalização', passing: 'Passe', defending: 'Defesa', physical: 'Físico', dribbling: 'Drible', positioning: 'Posicionamento', heading: 'Cabeceio', vision: 'Visão', composure: 'Compostura' };
      toast.success(`Treino focado em ${focusNames[focus] || focus}!`);
    }
  }, []);

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
      addFinance('despesa', 'Transferência', value, `Compra: ${player.name}`);
      return { ...prev, budget: prev.budget - value, players: [...prev.players, player] };
    });
    setMarketPlayers(prev => prev.filter(p => p.id !== player.id));
  }, [addFinance]);

  const signFreeAgent = useCallback((player: Player, offeredSalary?: number) => {
    const salary = offeredSalary || Math.floor(player.overall * 200 + player.age * 100);
    setClub(prev => {
      const signed = { ...player, salary, contract: Math.floor(Math.random() * 3 + 2) };
      addFinance('despesa', 'Transferência Livre', salary * 3, `Assinatura: ${player.name} (3 meses adiantados)`);
      return { ...prev, budget: prev.budget - salary * 3, players: [...prev.players, signed] };
    });
    setFreeAgents(prev => prev.filter(p => p.id !== player.id));
    toast.success(`${player.name} assinou! Salário: R$${(salary / 1000).toFixed(0)}k/mês`);
  }, [addFinance]);

  const renewContract = useCallback((playerId: string, newSalary: number, newDuration?: number) => {
    const duration = newDuration || 2;
    setClub(prev => {
      const player = prev.players.find(p => p.id === playerId);
      if (!player) return prev;
      if (newSalary < player.salary) {
        toast.error(`${player.name} recusou! Oferça mais que R$${(player.salary / 1000).toFixed(0)}k.`);
        return prev;
      }
      const renewalCost = newSalary * duration * 12;
      if (prev.budget < renewalCost) {
        toast.error('Orçamento insuficiente para renovação!');
        return prev;
      }
      addFinance('despesa', 'Renovação', renewalCost, `Renovação: ${player.name} (${duration}a)`);
      toast.success(`${player.name} renovou por +${duration} anos! Novo salário: R$${(newSalary / 1000).toFixed(0)}k/mês`);
      return {
        ...prev,
        budget: prev.budget - renewalCost,
        players: prev.players.map(p => p.id === playerId ? { ...p, salary: newSalary, contract: p.contract + duration } : p),
      };
    });
  }, [addFinance]);

  const listForSale = useCallback((playerId: string) => {
    setClub(prev => {
      const player = prev.players.find(p => p.id === playerId);
      if (!player) return prev;
      if (prev.players.length <= 11) {
        toast.error('Elenco muito pequeno para vender!');
        return prev;
      }
      setListedForSale(l => {
        if (l.includes(playerId)) {
          toast.info(`${player.name} removido da lista de transferência.`);
          return l.filter(id => id !== playerId);
        }
        toast.success(`${player.name} colocado na lista de transferência!`);
        return [...l, playerId];
      });
      return prev;
    });
  }, []);

  const sellPlayer = useCallback((player: Player) => {
    const value = Math.floor(getPlayerValue(player) * 0.8);
    setClub(prev => {
      if (prev.players.length <= 11) return prev;
      addFinance('receita', 'Transferência', value, `Venda: ${player.name}`);
      return { ...prev, budget: prev.budget + value, players: prev.players.filter(p => p.id !== player.id) };
    });
    setListedForSale(l => l.filter(id => id !== player.id));
  }, [addFinance]);

  const refreshMarket = useCallback(() => setMarketPlayers(generateMarketPlayers(8)), []);
  const refreshFreeAgents = useCallback(() => setFreeAgents(generateFreeAgents(12)), []);

  // === LOAN SYSTEM ===
  const loansOut = loanedPlayers.filter(l => l.direction === 'out');
  const loansIn = loanedPlayers.filter(l => l.direction === 'in');

  const loanOutPlayer = useCallback((playerId: string) => {
    if (loansOut.length >= 3) { toast.error('Limite de 3 empréstimos atingido!'); return; }
    setClub(prev => {
      const player = prev.players.find(p => p.id === playerId);
      if (!player) return prev;
      if (prev.players.length <= 11) { toast.error('Elenco muito pequeno para emprestar!'); return prev; }
      // Check if player is already loaned in
      if (loanedPlayers.some(l => l.player.id === playerId)) { toast.error('Este jogador já está emprestado!'); return prev; }
      setLoanedPlayers(lp => [...lp, { player, fromClub: 'player', direction: 'out', seasonStart: season.currentSeason }]);
      toast.success(`${player.name} emprestado por 1 temporada! O clube receptor paga o salário.`);
      return { ...prev, players: prev.players.filter(p => p.id !== playerId) };
    });
  }, [loansOut.length, loanedPlayers, season.currentSeason]);

  const loanInPlayer = useCallback((player: Player) => {
    if (loansIn.length >= 3) { toast.error('Limite de 3 empréstimos recebidos atingido!'); return; }
    setLoanedPlayers(lp => [...lp, { player, fromClub: 'bot', direction: 'in', seasonStart: season.currentSeason }]);
    setClub(prev => ({ ...prev, players: [...prev.players, player] }));
    setMarketPlayers(prev => prev.filter(p => p.id !== player.id));
    addFinance('despesa', 'Empréstimo', player.salary * 12, `Empréstimo: ${player.name} (salário 1 temporada)`);
    toast.success(`${player.name} emprestado ao seu clube! Você arca com o salário.`);
  }, [loansIn.length, season.currentSeason, addFinance]);

  const upgradeFacility = useCallback((facility: 'trainingCenter' | 'youthAcademy' | 'stadium' | 'physiotherapy') => {
    let cost: number;
    if (facility === 'stadium') {
      cost = getStadiumUpgradeCost(infrastructure[facility].level);
    } else if (facility === 'youthAcademy') {
      cost = getAcademyUpgradeCost(infrastructure[facility].level);
    } else {
      cost = getUpgradeCost(infrastructure[facility].level);
    }
    if (club.budget < cost) return;
    const label = facility === 'trainingCenter' ? 'Centro de Treinamento' : facility === 'youthAcademy' ? 'Academia' : facility === 'physiotherapy' ? 'Fisioterapia' : 'Estádio';
    const newLevel = infrastructure[facility].level + 1;

    setClub(prev => {
      if (prev.budget < cost) return prev;
      addFinance('despesa', 'Infraestrutura', cost, `Upgrade: ${label} → Nv${newLevel}`);
      return { ...prev, budget: prev.budget - cost };
    });
    setInfrastructure(prev => ({
      ...prev,
      [facility]: { ...prev[facility], level: prev[facility].level + 1 },
    }));

    const isStadium = facility === 'stadium';
    const desc = isStadium
      ? `${label} expandido para nível ${newLevel}! Capacidade: ${getStadiumCapacity(newLevel).toLocaleString()} lugares.`
      : `${label} atualizado para nível ${newLevel}!`;
  }, [addFinance, infrastructure, club.budget]);

  const promoteYouth = useCallback((youthId: string) => {
    const prospect = youthProspects.find(p => p.id === youthId);
    if (!prospect) return;
    const player: Player = {
      id: prospect.id, name: prospect.name, position: prospect.position,
      overall: prospect.overall, attributes: prospect.attributes,
      age: prospect.age, salary: prospect.salary,
      stamina: prospect.stamina, morale: 90, goals: 0, assists: 0,
      contract: 3, gamesPlayed: 0, trainingProgress: 0,
      personality: prospect.personality,
    };
    setClub(prev => ({ ...prev, players: [...prev.players, player] }));
    setYouthProspects(prev => prev.filter(p => p.id !== youthId));
    toast.success(`${prospect.name} promovido ao time principal!`);
  }, [youthProspects]);

  const renameClub = useCallback((newName: string) => {
    setClub(prev => ({ ...prev, name: newName }));
    toast.success(`Clube renomeado para ${newName}!`);
  }, []);

  const renameStadium = useCallback((newName: string) => {
    setClub(prev => ({ ...prev, stadiumName: newName }));
    toast.success(`Estádio renomeado para ${newName}!`);
  }, []);

  const setTicketPrice = useCallback((price: number) => {
    setClub(prev => ({ ...prev, ticketPrice: Math.max(5, Math.min(200, price)) }));
  }, []);

  const scoutOptionData = [
    { skill: 1, name: 'Amador Local', salary: 5000 },
    { skill: 2, name: 'Observador Iniciante', salary: 12000 },
    { skill: 3, name: 'Olheiro Regional', salary: 25000 },
    { skill: 4, name: 'Olheiro Experiente', salary: 45000 },
    { skill: 5, name: 'Analista Profissional', salary: 70000 },
    { skill: 6, name: 'Scout Nacional', salary: 100000 },
    { skill: 7, name: 'Scout Internacional', salary: 150000 },
    { skill: 8, name: 'Especialista Elite', salary: 220000 },
    { skill: 9, name: 'Lenda da Observação', salary: 300000 },
    { skill: 10, name: 'Gênio Supremo', salary: 500000 },
  ];

  const hireScout = useCallback((skill: number) => {
    const opt = scoutOptionData.find(o => o.skill === skill);
    if (!opt) return;
    const hireCost = opt.salary * 3;
    setClub(prev => {
      if (prev.budget < hireCost) { toast.error('Orçamento insuficiente!'); return prev; }
      const newScout: Scout = {
        id: Math.random().toString(36).substr(2, 9),
        name: opt.name,
        skill: opt.skill,
        salary: opt.salary,
        contract: 2,
      };
      addFinance('despesa', 'Olheiros', hireCost, `Contratação: ${opt.name}`);
      toast.success(`${opt.name} contratado! Hab: ${opt.skill}/10`);
      return { ...prev, budget: prev.budget - hireCost, scouts: [...prev.scouts, newScout] };
    });
  }, [addFinance]);

  const fireScout = useCallback((scoutId: string) => {
    setClub(prev => {
      const scout = prev.scouts.find(s => s.id === scoutId);
      if (scout) toast.info(`${scout.name} dispensado.`);
      return { ...prev, scouts: prev.scouts.filter(s => s.id !== scoutId) };
    });
  }, []);

  const acceptSponsor = useCallback((offer: SponsorOffer) => {
    if (sponsors.length >= 3) {
      toast.error('Limite de 3 patrocinadores atingido! Aguarde um contrato expirar.');
      return;
    }
    setSponsors(prev => [...prev, offer]);
    setSponsorOffers(prev => prev.filter(o => o.id !== offer.id));
    addFinance('receita', 'Patrocínio', offer.monthlyPay, `Novo: ${offer.name}`);
    setClub(prev => ({ ...prev, budget: prev.budget + offer.monthlyPay }));
    toast.success(`Patrocínio aceito: ${offer.name}!`);
  }, [addFinance, sponsors.length]);

  const refreshSponsorOffers = useCallback(() => {
    setSponsorOffers(generateSponsorOffers(club.reputation, 4));
  }, [club.reputation]);

  const endSeason = useCallback(() => {
    const sorted = [...leagueTeams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
    const clubPos = sorted.findIndex(t => t.name === club.name) + 1;
    const seasonPrize = clubPos === 1 ? 5000000 : clubPos <= 4 ? 2000000 : 500000;

    // Season ranking adjustment
    const totalTeams = sorted.length;
    let rankingSeasonMult = 0;
    if (clubPos === 1) rankingSeasonMult = 0.10; // champion +10%
    else if (clubPos <= 4) rankingSeasonMult = 0.05; // top 4 +5%
    else if (clubPos <= Math.floor(totalTeams * 0.5)) rankingSeasonMult = 0; // mid table
    else if (clubPos <= Math.floor(totalTeams * 0.75)) rankingSeasonMult = -0.05; // lower mid -5%
    else if (clubPos <= totalTeams - 2) rankingSeasonMult = -0.10; // relegation zone -10%
    else rankingSeasonMult = -0.20; // relegated -20%
    
    setRanking(prev => {
      const adjusted = Math.max(100, Math.round(prev * (1 + rankingSeasonMult)));
      const change = adjusted - prev;
      setRankingHistory(h => [...h, { season: season.currentSeason, endRating: adjusted, position: clubPos, change }]);
      return adjusted;
    });

    // Season awards events
    const topScorer = [...club.players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    const topAssister = [...club.players].sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))[0];
    const bestRating = [...club.players].filter(p => (p.seasonRatings?.length ?? 0) > 0)
      .sort((a, b) => {
        const avgA = (a.seasonRatings ?? []).reduce((s, r) => s + r, 0) / (a.seasonRatings?.length ?? 1);
        const avgB = (b.seasonRatings ?? []).reduce((s, r) => s + r, 0) / (b.seasonRatings?.length ?? 1);
        return avgB - avgA;
      })[0];
    const champion = sorted[0];

    const seasonAwardsEvents: GameEvent[] = [];
    if (topScorer && (topScorer.goals ?? 0) > 0) {
      seasonAwardsEvents.push({
        id: crypto.randomUUID(),
        type: 'season_awards',
        title: `⚽ ARTILHEIRO DA TEMPORADA: ${topScorer.name}`,
        description: `${topScorer.name} foi o artilheiro do ${club.name} com ${topScorer.goals} gols na temporada ${season.currentSeason}!`,
        icon: '⚽',
        impact: 'morale_all:3',
        resolved: true,
      });
    }
    if (topAssister && (topAssister.assists ?? 0) > 0) {
      seasonAwardsEvents.push({
        id: crypto.randomUUID(),
        type: 'season_awards',
        title: `🅰️ GARÇOM DA TEMPORADA: ${topAssister.name}`,
        description: `${topAssister.name} liderou em assistências com ${topAssister.assists} passes decisivos na temporada ${season.currentSeason}!`,
        icon: '🅰️',
        impact: 'morale_all:2',
        resolved: true,
      });
    }
    if (champion) {
      seasonAwardsEvents.push({
        id: crypto.randomUUID(),
        type: 'season_awards',
        title: `🏆 CAMPEÃO: ${champion.name}`,
        description: `${champion.name} conquistou o título da temporada ${season.currentSeason} com ${champion.points} pontos!`,
        icon: '🏆',
        impact: 'morale_all:5',
        resolved: true,
      });
    }
    setEvents(prev => [...seasonAwardsEvents, ...prev].slice(0, 20));

    // Trophies
    const newTrophies: import('@/types/clubProfile').Trophy[] = [];
    const dateStr = new Date().toLocaleDateString('pt-BR');
    if (clubPos === 1) {
      newTrophies.push({ title: 'Campeão da Liga', season: season.currentSeason, date: dateStr });
    }
    if (topScorer && (topScorer.goals ?? 0) > 0) {
      newTrophies.push({ title: `Artilheiro - ${topScorer.name} (${topScorer.goals} gols)`, season: season.currentSeason, date: dateStr });
    }
    if (topAssister && (topAssister.assists ?? 0) > 0) {
      newTrophies.push({ title: `Garçom - ${topAssister.name} (${topAssister.assists} assists)`, season: season.currentSeason, date: dateStr });
    }
    if (newTrophies.length > 0) {
      setClubProfile(prev => ({
        ...prev,
        trophies: [...(prev.trophies || []), ...newTrophies],
      }));
    }

    // Player unhappiness: players with OVR >= 70 and 0 games for 2+ seasons
    const unhappyEvents: GameEvent[] = [];

    setSeason(prev => ({
      currentSeason: prev.currentSeason + 1, currentWeek: 1, totalWeeks: 38,
      seasonHistory: [...prev.seasonHistory, {
        season: prev.currentSeason, position: clubPos, points: club.stats.points,
        wins: club.stats.wins, draws: club.stats.draws, losses: club.stats.losses,
        champion: sorted[0].name,
      }],
    }));

    setLeagueTeams(getLeagueTeams(club.country || 'BR', club.name).map(t => ({ ...t, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 })));
    const loanedInIds = loanedPlayers.filter(l => l.direction === 'in').map(l => l.player.id);
    const returnedPlayers = loanedPlayers.filter(l => l.direction === 'out').map(l => l.player);

    setClub(prev => {
      const basePlayers = prev.players.filter(p => !loanedInIds.includes(p.id));
      const allPlayers = [...basePlayers, ...returnedPlayers];
      
      // Track seasons without playing and filter unhappy players
      const processedPlayers = allPlayers
        .map(p => {
          const swp = p.gamesPlayed === 0 ? (p.seasonsWithoutPlaying ?? 0) + 1 : 0;
          return {
            ...p, goals: 0, assists: 0, stamina: 100, morale: 75, age: p.age + 1,
            contract: Math.max(0, (p.contract ?? 1) - 1), gamesPlayed: 0,
            trainingProgress: 0, injury: undefined, seasonsWithoutPlaying: swp,
          };
        })
        .map(applyAgeDevelopment);
      
      // Remove unhappy players (OVR >= 70, 2+ seasons without playing, contract expiring)
      const remaining = processedPlayers.filter(p => {
        if (p.age > 42 || p.contract <= 0) return false;
        if (p.overall >= 70 && (p.seasonsWithoutPlaying ?? 0) >= 2) {
          unhappyEvents.push({
            id: crypto.randomUUID(),
            type: 'player_unhappy',
            title: `😤 ${p.name} PEDE PARA SAIR!`,
            description: `${p.name} (OVR ${p.overall}) está insatisfeito por ficar ${p.seasonsWithoutPlaying} temporadas sem jogar e deixou o clube.`,
            icon: '😤',
            impact: `morale_all:-3`,
            resolved: true,
          });
          return false;
        }
        return true;
      });

      if (unhappyEvents.length > 0) {
        setEvents(ev => [...unhappyEvents, ...ev].slice(0, 20));
      }

      return {
        ...prev,
        matches: [], // friendlies are generated on demand now
        stats: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
        budget: prev.budget + seasonPrize,
        reputation: Math.min(100, prev.reputation + (clubPos <= 4 ? 5 : -2)),
        scoutReports: [],
        matchesSinceLastScout: 0,
        scouts: prev.scouts
          .map(s => ({ ...s, contract: s.contract - 1 }))
          .filter(s => s.contract > 0),
        players: remaining,
      };
    });
    setLoanedPlayers([]);
    setFriendliesPlayedToday(0);
    setFriendliesPlayedSeason(0);
    setLastFriendlyDate('');

    addFinance('receita', 'Premiação', seasonPrize, `Premiação T${season.currentSeason} - ${clubPos}º lugar`);
    setMarketPlayers(generateMarketPlayers(10));
    setFreeAgents(generateFreeAgents(15));
    setYouthProspects(prev => prev.map(p => ({
      ...p, overall: Math.min(p.potential, p.overall + Math.floor(Math.random() * 3 + 1)),
      monthsInAcademy: p.monthsInAcademy + 6, age: p.age + 1,
    })));
    setSponsors(prev => prev.map(sp => ({ ...sp, duration: sp.duration - 1 })).filter(sp => sp.duration > 0));
    setSponsorOffers(generateSponsorOffers(club.reputation, 4));

    toast.success(`Temporada ${season.currentSeason} encerrada! ${clubPos}º lugar. Prêmio: R$ ${(seasonPrize / 1000000).toFixed(1)}M`);
  }, [leagueTeams, club, addFinance, season.currentSeason, loanedPlayers]);

  const hasUnplayedMatches = club.matches.some(m => !m.played);
  const totalSalaries = club.players.reduce((s, p) => s + p.salary, 0);

  const getFullState = useCallback((): GameState => ({
    club, tactics, leagueTeams, finances, marketPlayers, freeAgents, infrastructure, youthProspects, youthInvestment, season, sponsors, sponsorOffers, events, loanedPlayers, trainingFocus, achievements, lastMatchReport, clubProfile, ctRooms, youthPromotedCount, ranking, rankingVersion: 3, rankingHistory, friendliesPlayedToday, friendliesPlayedSeason, lastFriendlyDate,
  }), [club, tactics, leagueTeams, finances, marketPlayers, freeAgents, infrastructure, youthProspects, youthInvestment, season, sponsors, sponsorOffers, events, loanedPlayers, trainingFocus, achievements, lastMatchReport, clubProfile, ctRooms, youthPromotedCount, ranking, rankingHistory, friendliesPlayedToday, friendliesPlayedSeason, lastFriendlyDate]);

  const changeShirtNumber = useCallback((playerId: string, number: number) => {
    setClub(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === playerId ? { ...p, shirtNumber: number } : p),
    }));
    toast.success(`Numeração alterada para #${number}`);
  }, []);

  const upgradeCTRoom = useCallback((room: keyof CTRooms) => {
    const cost = getCTRoomUpgradeCost(room, ctRooms[room]);
    if (club.budget < cost) { toast.error('Orçamento insuficiente!'); return; }
    const roomNames: Record<string, string> = { gym: 'Musculação', pool: 'Piscina', cryotherapy: 'Crioterapia', videoRoom: 'Sala de Vídeo', nutrition: 'Nutrição', meditation: 'Meditação' };
    setClub(prev => ({ ...prev, budget: prev.budget - cost }));
    setCTRooms(prev => ({ ...prev, [room]: prev[room] + 1 }));
    addFinance('despesa', 'CT', cost, `Sala: ${roomNames[room]} → Nv.${ctRooms[room] + 1}`);
    toast.success(`${roomNames[room]} melhorada para nível ${ctRooms[room] + 1}!`);
  }, [ctRooms, club.budget, addFinance]);

  // Helper: check if two dates are the same local calendar day
  const isSameLocalDay = useCallback((d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }, []);

  // Friendly matches are unlimited — alreadyPlayedToday always false
  const alreadyPlayedToday = false;

  const generateFriendly = useCallback(async () => {
    const now = new Date();
    
    // Friendly matches are now unlimited — no daily limit
    // Check if there's already an unplayed friendly
    const hasUnplayed = club.matches.some(m => !m.played);
    if (hasUnplayed) {
      toast.error('Você já tem um amistoso agendado! Jogue-o primeiro.');
      return;
    }
    
    // BOT FC — oponente genérico com força variável (55-80 OVR)
    const botStrength = 55 + Math.floor(Math.random() * 26); // 55-80
    const isHome = Math.random() > 0.5;
    const botStadium = 'Estádio BOT FC';
    const botCapacity = Math.floor(5000 + (botStrength - 50) * 150);
    const myCapacity = getStadiumCapacity(infrastructure?.stadium?.level ?? 1);
    
    const friendlyMatch: Match = {
      id: Math.random().toString(36).substr(2, 9),
      opponent: 'BOT FC',
      opponentLogo: '🤖',
      date: now.toISOString(),
      played: false,
      isHome,
      stadium: isHome ? (club.stadiumName || 'Arena') : botStadium,
      stadiumCapacity: isHome ? myCapacity : botCapacity,
      // Store bot strength in the match for later use
      opponentStrength: botStrength,
    };
    setClub(prev => ({ ...prev, matches: [...prev.matches, friendlyMatch] }));
    toast.info(`⚽ Amistoso ${isHome ? '(Casa)' : '(Fora)'} vs BOT FC (OVR ~${botStrength})!`);
  }, [club.name, club.matches, club.stadiumName, lastFriendlyDate, userId, infrastructure]);

  // generateFriendlyVs removed — no more specific club invites, only BOT FC
  const generateFriendlyVs = useCallback(async (_teamName: string) => {
    // Redirect to BOT FC
    return generateFriendly();
  }, [generateFriendly]);

  const updateClubProfile = useCallback((profile: ClubProfile) => {
    setClubProfile(profile);
  }, []);

  const updatePlayers = useCallback((players: Player[]) => {
    setClub(prev => ({ ...prev, players }));
  }, []);

  const addPackPlayers = useCallback((newPlayers: Player[], cost: number) => {
    setClub(prev => {
      if (prev.budget < cost) return prev;
      addFinance('despesa', 'Pacotinhos', cost, `${newPlayers.length} jogadores de pacotinhos`);
      return { ...prev, budget: prev.budget - cost, players: [...prev.players, ...newPlayers.map(p => ({ ...p, contract: 2 }))] };
    });
  }, [addFinance]);

  const addBonus = useCallback((amount: number, description: string) => {
    setClub(prev => ({ ...prev, budget: prev.budget + amount }));
    addFinance('receita', 'Bônus', amount, description);
  }, [addFinance]);

  return {
    club, tactics, leagueTeams, finances, marketPlayers, freeAgents, totalSalaries, infrastructure, youthProspects, youthInvestment, season, hasUnplayedMatches,
    sponsors, sponsorOffers, events, listedForSale, loanedPlayers, trainingFocus, feedItems,
    achievements, lastMatchReport, clubProfile, ctRooms, youthPromotedCount, ranking, rankingHistory,
    friendliesPlayedToday, friendliesPlayedSeason,
    alreadyPlayedToday, lastFriendlyDate,
    setTactics, simulateMatch, applyServerResult, trainPlayer, restPlayer, buyPlayer, sellPlayer, signFreeAgent, refreshMarket, refreshFreeAgents, getFullState,
    upgradeFacility, promoteYouth, setYouthInvestment, endSeason,
    acceptSponsor, refreshSponsorOffers,
    renameClub, renameStadium, setTicketPrice,
    hireScout, fireScout, renewContract, listForSale,
    loanOutPlayer, loanInPlayer, setPlayerTrainingFocus, changeShirtNumber,
    reactToFeed, upgradeCTRoom, updateClubProfile, generateFriendly, generateFriendlyVs, updatePlayers, addPackPlayers, addBonus,
  };
}
