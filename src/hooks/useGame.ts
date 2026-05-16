/**
 * useGame — Compositor hook that combines domain-specific hooks.
 * Exposes the same interface as before for backward compatibility.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { Player } from '@/types/game';
import { TacticsConfig, defaultTactics } from '@/types/tactics';
import { FinanceEntry } from '@/types/finance';
import { Infrastructure, SeasonData, YouthProspect } from '@/types/infrastructure';
import { Sponsor, SponsorOffer } from '@/types/sponsor';
import { GameEvent } from '@/types/events';
import { Achievement } from '@/types/achievements';
import { MatchReport } from '@/types/matchReport';
import { ClubProfile } from '@/types/clubProfile';
import { CTRooms } from '@/types/ctRooms';
import { TrainingFocus } from '@/components/game/TrainingTab';
import { getTrainingManager } from '@/training/TrainingManager';
import { useState } from 'react';
import { autoLineup } from '@/utils/lineupManager';

import { useClubState, LoanedPlayer } from './useClubState';
import { useFinanceState } from './useFinanceState';
import { useInfraState } from './useInfraState';
import { useMatchState, RankingHistory } from './useMatchState';

export type { LoanedPlayer } from './useClubState';
export type { RankingHistory } from './useMatchState';

export interface GameState {
  club: any;
  tactics: TacticsConfig;
  leagueTeams: any[];
  finances: FinanceEntry[];
  marketPlayers: Player[];
  freeAgents: Player[];
  infrastructure: Infrastructure;
  youthProspects: YouthProspect[];
  youthInvestment: number;
  trainingInvestment?: number;
  season: SeasonData;
  sponsors: Sponsor[];
  sponsorOffers: SponsorOffer[];
  events: GameEvent[];
  loanedPlayers?: LoanedPlayer[];
  trainingFocus?: Record<string, TrainingFocus>;
  trainingIntensity?: Record<string, 'leve' | 'moderado' | 'pesado'>;
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
  lastYouthGenAt?: string;
}

export function useGame(initialState?: GameState, userId?: string, isPremium: boolean = false) {
  const [tactics, setTactics] = useState<TacticsConfig>(initialState?.tactics ?? defaultTactics);

  // Domain hooks
  const clubState = useClubState(initialState, userId);
  const financeState = useFinanceState(initialState);
  const infraState = useInfraState(initialState, userId, isPremium);
  const matchState = useMatchState(initialState, userId);

  // 🌟 Premium: ativa bônus de +30% dev points no TrainingManager
  useEffect(() => {
    getTrainingManager().setPremiumBoost(!!isPremium);
  }, [isPremium]);

  // 💰 Investimento mensal em treino → engine de evolução
  useEffect(() => {
    getTrainingManager().setMonthlyTrainingInvestment(infraState.trainingInvestment ?? 0);
  }, [infraState.trainingInvestment]);

  // 🔄 Auto-Lineup Trigger
  useEffect(() => {
    if (tactics.autoUpdateLineup && clubState.club.players.length > 0) {
      const currentStartersIds = clubState.club.players.slice(0, 11).map(p => p.id).join(',');
      const newOrder = autoLineup(clubState.club.players, tactics.formation);
      const newStartersIds = newOrder.slice(0, 11).map(p => p.id).join(',');

      if (currentStartersIds !== newStartersIds) {
        clubState.setClub(prev => ({ ...prev, players: newOrder }));
        console.log('[useGame] Escalação atualizada automaticamente devido a mudança tática ou de elenco.');
      }
    }
  }, [tactics.formation, tactics.autoUpdateLineup, clubState.club.players, clubState.setClub]);

  // Bridged methods that need cross-hook access
  const applyServerResult = useCallback(({
    matchId, homeGoals, awayGoals, isHome = true, competition,
  }: { matchId: string; homeGoals: number; awayGoals: number; isHome?: boolean; competition?: string }) => {
    const isCup = /copa|cup/i.test(competition || '');
    const isFriendly = /amistoso|friendly/i.test(competition || '');
    matchState.applyServerResult({ matchId, homeGoals, awayGoals, isHome, competition }, {
      setClub: clubState.setClub,
      sponsors: financeState.sponsors,
      infrastructure: infraState.infrastructure,
      addFinance: financeState.addFinance,
      setSeason: infraState.setSeason,
      stadiumOps: clubState.club.stadiumOps,
      isCup,
      isFriendly,
    });
  }, [matchState.applyServerResult, clubState.setClub, financeState.sponsors, infraState.infrastructure, financeState.addFinance, infraState.setSeason, clubState.club.stadiumOps]);

  const generateFriendly = useCallback(async () => {
    await matchState.generateFriendly(
      clubState.club,
      infraState.infrastructure?.stadium?.level ?? 1,
      clubState.setClub,
    );
  }, [matchState.generateFriendly, clubState.club, infraState.infrastructure, clubState.setClub]);

  const generateFriendlyVs = useCallback(async (_teamName: string) => {
    return generateFriendly();
  }, [generateFriendly]);

  // Bridged buyPlayer with finance
  const buyPlayer = useCallback((player: Player) => {
    const result = clubState.buyPlayer(player);
    if (result) {
      financeState.addFinance('despesa', 'Transferência', result.value, `Compra: ${player.name}`);
    }
  }, [clubState.buyPlayer, financeState.addFinance]);

  const signFreeAgent = useCallback((player: Player, offeredSalary?: number) => {
    const result = clubState.signFreeAgent(player, offeredSalary);
    if (result) {
      financeState.addFinance('despesa', 'Transferência Livre', result.salary * 3, `Assinatura: ${player.name} (3 meses adiantados)`);
    }
  }, [clubState.signFreeAgent, financeState.addFinance]);

  const renewContract = useCallback(async (playerId: string, newSalary: number, newDuration?: number) => {
    const result = await clubState.renewContract(playerId, newSalary, newDuration);
    if (result) {
      // Logic for finance update if needed immediately or via background process
    }
  }, [clubState.renewContract]);

  const sellPlayer = useCallback((player: Player) => {
    const result = clubState.sellPlayer(player);
    if (result) {
      financeState.addFinance('receita', 'Transferência', result.value, `Venda: ${player.name}`);
    }
  }, [clubState.sellPlayer, financeState.addFinance]);

  const hireScout = useCallback((skill: number) => {
    const result = clubState.hireScout(skill);
    if (result) {
      financeState.addFinance('despesa', 'Olheiros', result.hireCost, `Contratação: ${result.opt.name}`);
    }
  }, [clubState.hireScout, financeState.addFinance]);

  const loanOutPlayer = useCallback((playerId: string) => {
    clubState.loanOutPlayer(playerId, infraState.season.currentSeason);
  }, [clubState.loanOutPlayer, infraState.season.currentSeason]);

  const loanInPlayer = useCallback((player: Player) => {
    const result = clubState.loanInPlayer(player, infraState.season.currentSeason);
    if (result) {
      financeState.addFinance('despesa', 'Empréstimo', result.salary * 12, `Empréstimo: ${player.name} (salário 1 temporada)`);
    }
  }, [clubState.loanInPlayer, infraState.season.currentSeason, financeState.addFinance]);

  const upgradeFacility = useCallback((facility: 'trainingCenter' | 'youthAcademy' | 'stadium' | 'physiotherapy') => {
    infraState.upgradeFacility(
      facility,
      clubState.club.budget,
      clubState.club.name,
      financeState.addFinance,
      (cost: number) => clubState.setClub(prev => ({ ...prev, budget: prev.budget - cost })),
    );
  }, [infraState.upgradeFacility, clubState.club.budget, clubState.club.name, financeState.addFinance, clubState.setClub]);

  const promoteYouth = useCallback((youthId: string) => {
    infraState.promoteYouth(youthId, (player: any) => {
      clubState.setClub(prev => ({ ...prev, players: [...prev.players, player] }));
    });
  }, [infraState.promoteYouth, clubState.setClub]);

  const sellYouth = useCallback((youthId: string) => {
    infraState.sellYouth(
      youthId,
      financeState.addFinance,
      (amount: number) => clubState.setClub(prev => ({ ...prev, budget: prev.budget + amount })),
    );
  }, [infraState.sellYouth, financeState.addFinance, clubState.setClub]);

  const enrollCopinha = useCallback(() => {
    infraState.enrollCopinha(clubState.club.name, (fn: (prev: any) => any) => {
      const next = fn(clubState.clubProfile ?? {});
      clubState.updateClubProfile(next);
    });
  }, [infraState.enrollCopinha, clubState.club.name, clubState.clubProfile, clubState.updateClubProfile]);

  const enrollWorldLeague = useCallback(async (teamId: string, countryId: string) => {
    await clubState.enrollWorldLeague(teamId, countryId);
  }, [clubState.enrollWorldLeague]);

  const upgradeCTRoom = useCallback((room: keyof CTRooms) => {
    infraState.upgradeCTRoom(
      room,
      clubState.club.budget,
      financeState.addFinance,
      (cost: number) => clubState.setClub(prev => ({ ...prev, budget: prev.budget - cost })),
    );
  }, [infraState.upgradeCTRoom, clubState.club.budget, financeState.addFinance, clubState.setClub]);

  const acceptSponsor = useCallback((offer: SponsorOffer) => {
    financeState.acceptSponsor(
      offer,
      (fn) => { clubState.setClub(prev => ({ ...prev, budget: fn(prev.budget) })); },
      infraState.season?.currentSeason ?? 1,
    );
  }, [financeState.acceptSponsor, clubState.setClub, infraState.season]);

  const refreshSponsorOffers = useCallback(() => {
    financeState.refreshSponsorOffers(clubState.club.reputation);
  }, [financeState.refreshSponsorOffers, clubState.club.reputation]);

  const addPackPlayers = useCallback((newPlayers: Player[], cost: number) => {
    const result = clubState.addPackPlayers(newPlayers, cost);
    if (result) {
      financeState.addFinance('despesa', 'Pacotinhos', cost, `${newPlayers.length} jogadores de pacotinhos`);
    }
  }, [clubState.addPackPlayers, financeState.addFinance]);

  const addBonus = useCallback((amount: number, description: string) => {
    clubState.addBonus(amount, description);
    financeState.addFinance('receita', 'Bônus', amount, description);
  }, [clubState.addBonus, financeState.addFinance]);

  // simulateMatch removed — all matches use applyServerResult
  const simulateMatch = useCallback((_matchId: string) => {
    console.warn('[useGame] simulateMatch is deprecated. Use applyServerResult instead.');
  }, []);

  // endSeason removed — seasons are managed by the server
  const endSeason = useCallback(() => {
    console.warn('[useGame] endSeason is deprecated. Seasons are managed by the server.');
  }, []);

  const hasUnplayedMatches = clubState.club.matches.some((m: any) => !m.played);

  // Keep leagueTeams as empty array for backward compat (server-driven now)
  const leagueTeams: any[] = [];

  const getFullState = useCallback((): GameState => ({
    club: clubState.club,
    tactics,
    leagueTeams,
    finances: financeState.finances,
    marketPlayers: clubState.marketPlayers,
    freeAgents: clubState.freeAgents,
    infrastructure: infraState.infrastructure,
    youthProspects: infraState.youthProspects,
    youthInvestment: infraState.youthInvestment,
    trainingInvestment: infraState.trainingInvestment,
    season: infraState.season,
    sponsors: financeState.sponsors,
    sponsorOffers: financeState.sponsorOffers,
    events: matchState.events,
    loanedPlayers: clubState.loanedPlayers,
    trainingFocus: clubState.trainingFocus,
    trainingIntensity: clubState.trainingIntensity,
    achievements: infraState.achievements,
    lastMatchReport: infraState.lastMatchReport,
    clubProfile: clubState.clubProfile,
    ctRooms: infraState.ctRooms,
    youthPromotedCount: infraState.youthPromotedCount,
    ranking: matchState.ranking,
    rankingVersion: 3,
    rankingHistory: matchState.rankingHistory,
    friendliesPlayedToday: matchState.friendliesPlayedToday,
    friendliesPlayedSeason: matchState.friendliesPlayedSeason,
    lastFriendlyDate: matchState.lastFriendlyDate,
    lastYouthGenAt: infraState.lastYouthGenAt,
  }), [clubState.club, tactics, financeState.finances, clubState.marketPlayers, clubState.freeAgents,
    infraState.infrastructure, infraState.youthProspects, infraState.youthInvestment, infraState.trainingInvestment, infraState.season,
    infraState.lastYouthGenAt,
    financeState.sponsors, financeState.sponsorOffers, matchState.events, clubState.loanedPlayers,
    clubState.trainingFocus, clubState.trainingIntensity, infraState.achievements, infraState.lastMatchReport, clubState.clubProfile,
    infraState.ctRooms, infraState.youthPromotedCount, matchState.ranking, matchState.rankingHistory,
    matchState.friendliesPlayedToday, matchState.friendliesPlayedSeason, matchState.lastFriendlyDate]);

  return {
    // State
    club: clubState.club,
    setClub: clubState.setClub,
    tactics,
    leagueTeams,
    finances: financeState.finances,
    marketPlayers: clubState.marketPlayers,
    freeAgents: clubState.freeAgents,
    totalSalaries: clubState.totalSalaries,
    transferBudget: clubState.transferBudget,
    salaryBudget: clubState.salaryBudget,
    reservaBudget: clubState.reservaBudget,
    salaryBudgetRemaining: clubState.salaryBudgetRemaining,
    annualSalaries: clubState.annualSalaries,
    infrastructure: infraState.infrastructure,
    youthProspects: infraState.youthProspects,
    youthInvestment: infraState.youthInvestment,
    trainingInvestment: infraState.trainingInvestment,
    setTrainingInvestment: infraState.setTrainingInvestment,
    season: infraState.season,
    hasUnplayedMatches,
    sponsors: financeState.sponsors,
    sponsorOffers: financeState.sponsorOffers,
    events: matchState.events,
    listedForSale: clubState.listedForSale,
    loanedPlayers: clubState.loanedPlayers,
    trainingFocus: clubState.trainingFocus,
    trainingIntensity: clubState.trainingIntensity,
    achievements: infraState.achievements,
    lastMatchReport: infraState.lastMatchReport,
    clubProfile: clubState.clubProfile,
    ctRooms: infraState.ctRooms,
    youthPromotedCount: infraState.youthPromotedCount,
    ranking: matchState.ranking,
    rankingHistory: matchState.rankingHistory,
    friendliesPlayedToday: matchState.friendliesPlayedToday,
    friendliesPlayedSeason: matchState.friendliesPlayedSeason,
    alreadyPlayedToday: matchState.alreadyPlayedToday,
    lastFriendlyDate: matchState.lastFriendlyDate,
    lastTrainingResult: clubState.lastTrainingResult,
    lastYouthGenAt: infraState.lastYouthGenAt,

    // Actions
    setTactics,
    simulateMatch,
    applyServerResult,
    trainPlayer: clubState.trainPlayer,
    restPlayer: clubState.restPlayer,
    restAllPlayers: (clubState as any).restAllPlayers,
    rotateSquad: (clubState as any).rotateSquad,
    buyPlayer,
    sellPlayer,
    signFreeAgent,
    refreshMarket: clubState.refreshMarket,
    refreshFreeAgents: clubState.refreshFreeAgents,
    getFullState,
    upgradeFacility,
    promoteYouth,
    sellYouth,
    enrollCopinha,
    setYouthInvestment: infraState.setYouthInvestment,
    endSeason,
    acceptSponsor,
    refreshSponsorOffers,
    renameClub: clubState.renameClub,
    renameStadium: clubState.renameStadium,
    updateShield: clubState.updateShield,
    setTicketPrice: clubState.setTicketPrice,
    buildVipBox: clubState.buildVipBox,
    acceptStadiumEvent: clubState.acceptStadiumEvent,
    rejectStadiumEvent: clubState.rejectStadiumEvent,
    startStadiumRepair: clubState.startStadiumRepair,
    buyStadiumInsurance: clubState.buyStadiumInsurance,
    cancelStadiumInsurance: clubState.cancelStadiumInsurance,
    acceptStadiumSponsor: clubState.acceptStadiumSponsor,
    rejectStadiumSponsor: clubState.rejectStadiumSponsor,
    toggleMembershipTier: clubState.toggleMembershipTier,
    buyModularUpgrade: clubState.buyModularUpgrade,
    applyFanChange: clubState.applyFanChange,
    hireScout,
    fireScout: clubState.fireScout,
    renewContract,
    listForSale: clubState.listForSale,
    loanOutPlayer,
    loanInPlayer,
    setPlayerTrainingFocus: clubState.setPlayerTrainingFocus,
    setPlayerTrainingIntensity: clubState.setPlayerTrainingIntensity,
    changeShirtNumber: clubState.changeShirtNumber,
    upgradeCTRoom,
    updateClubProfile: clubState.updateClubProfile,
    generateFriendly,
    generateFriendlyVs,
    updatePlayers: clubState.updatePlayers,
    addPackPlayers,
    addBonus,
    rescindPlayer: clubState.rescindPlayer,
    enrollWorldLeague: clubState.enrollWorldLeague,
    changePlayerPosition: clubState.changePlayerPosition,
    handlePromotionDecision: (prospectId: string, decision: any, details?: any) => {
      infraState.handlePromotionDecision(
        prospectId, 
        decision, 
        details,
        (p: any) => clubState.setClub(prev => ({ ...prev, players: [...prev.players, p] })),
        financeState.addFinance,
        (amt: number) => clubState.setClub(prev => ({ ...prev, budget: prev.budget + amt }))
      );
    }
  };
}
