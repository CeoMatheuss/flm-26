import { useState, useCallback } from 'react';
import { Club, Player, Match, ScoutReport, Scout } from '@/types/game';
import { TacticsConfig, defaultTactics } from '@/types/tactics';
import { LeagueTeam, initialLeagueTeams } from '@/types/league';
import { FinanceEntry, createFinanceEntry } from '@/types/finance';
import { Infrastructure, defaultInfrastructure, getUpgradeCost, getTrainingBoost, YouthProspect, SeasonData, defaultSeason, getYouthMonthlyPlayers } from '@/types/infrastructure';
import { Sponsor, SponsorOffer, generateSponsorOffers } from '@/types/sponsor';
import { initialClub, generateSeasonMatches } from '@/data/initialData';
import { generateMarketPlayers, getPlayerValue, generateYouthBatch, generateFreeAgents, generateScoutReport } from '@/utils/playerGenerator';
import { GameEvent, generateRandomEvents } from '@/types/events';
import { toast } from 'sonner';

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

export function useGame(initialState?: GameState) {
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
  const [listedForSale, setListedForSale] = useState<string[]>([]);

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

      const stadiumBonus = infrastructure.stadium.level * 20000;
      const ticketRevenue = Math.floor(prev.fans * prev.ticketPrice * 0.1); // 10% of fans attend
      const prize = (isWin ? 150000 : isDraw ? 75000 : 30000) + stadiumBonus + ticketRevenue;
      const sponsorIncome = sponsors.reduce((s, sp) => s + sp.monthlyPay, 0);
      const sponsorWeekly = Math.floor(sponsorIncome / 4);

      // Dynamic fan system
      const goalDiff = homeGoals - awayGoals;
      const isRout = goalDiff >= 3;
      const isBigLoss = goalDiff <= -3;
      const streak = prev.matches.filter(m => m.played).slice(-4);
      const recentWins = streak.filter(m => m.result && m.result.home > m.result.away).length;
      const recentLosses = streak.filter(m => m.result && m.result.home < m.result.away).length;
      const streakBonus = recentWins >= 3 ? 800 : recentWins >= 2 ? 300 : 0;
      const streakPenalty = recentLosses >= 3 ? -600 : recentLosses >= 2 ? -250 : 0;
      const stadiumFanBonus = infrastructure.stadium.level * 80;
      let fanChange = 0;
      if (isWin) fanChange = 400 + goalDiff * 150 + (isRout ? 500 : 0);
      else if (isDraw) fanChange = 50 + (homeGoals >= 3 ? 100 : 0);
      else fanChange = -300 + goalDiff * 100 + (isBigLoss ? -400 : 0);
      fanChange += streakBonus + streakPenalty + stadiumFanBonus;
      const repChange = isWin ? (isRout ? 2 : 1) : isDraw ? 0 : (isBigLoss ? -2 : -1);

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
        const w = Math.random() > 0.5;
        const d = !w && Math.random() > 0.5;
        const gf = Math.floor(Math.random() * 3);
        const ga = Math.floor(Math.random() * 3);
        return { ...t, played: t.played + 1, wins: t.wins + (w ? 1 : 0), draws: t.draws + (d ? 1 : 0), losses: t.losses + (!w && !d ? 1 : 0), goalsFor: t.goalsFor + gf, goalsAgainst: t.goalsAgainst + ga, points: t.points + (w ? 3 : d ? 1 : 0) };
      }));

      // Youth arrive every 4 matches
      const playedCount = prev.matches.filter(m => m.played).length + 1;
      if (playedCount % 4 === 0 && prev.budget >= youthInvestment) {
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
      const newEvents = generateRandomEvents(prev.players, prev.fans, prev.reputation, recentLosses, recentWins);
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

        setEvents(prev => [...newEvents.map(e => ({ ...e, resolved: true })), ...prev].slice(0, 20));

        fanChange += eventFanDelta;
        const extraPlayers = prev.players.map(p => {
          const eff = playerEffects[p.id];
          return eff ? { ...p, stamina: Math.max(20, p.stamina + eff.stamina), morale: Math.max(20, p.morale + eff.morale) } : p;
        }).map(p => ({ ...p, morale: Math.max(20, Math.min(100, p.morale + allMoraleDelta)) }));

        const fanSign2 = fanChange >= 0 ? '+' : '';
        if (isWin) toast.success(`Vitória! ${homeGoals} x ${awayGoals} | Torcida ${fanSign2}${fanChange}`);
        else if (isDraw) toast.info(`Empate: ${homeGoals} x ${awayGoals} | Torcida ${fanSign2}${fanChange}`);
        else toast.error(`Derrota: ${homeGoals} x ${awayGoals} | Torcida ${fanSign2}${fanChange}`);

        return {
          ...prev,
          matches: prev.matches.map(m => m.id === matchId ? { ...m, played: true, result: { home: homeGoals, away: awayGoals } } : m),
          players: extraPlayers.map(p => {
            const newGames = p.gamesPlayed + 1;
            const boost = getTrainingBoost(infrastructure.trainingCenter.level);
            let newOverall = p.overall;
            if (newGames >= 10 && p.age <= 33) {
              const chance = p.age <= 30 ? boost : boost * 0.3;
              newOverall = Math.min(99, p.overall + (Math.random() < chance ? 1 : 0));
            }
            return {
              ...p,
              gamesPlayed: newGames >= 10 ? 0 : newGames,
              trainingProgress: newGames >= 10 ? 0 : newGames,
              overall: newOverall,
              stamina: Math.max(40, p.stamina - Math.floor(Math.random() * 15 + 5)),
              morale: Math.min(100, Math.max(30, p.morale + (isWin ? 5 : isDraw ? 0 : -5))),
            };
          }),
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

      return {
        ...prev,
        matches: prev.matches.map(m => m.id === matchId ? { ...m, played: true, result: { home: homeGoals, away: awayGoals } } : m),
        players: prev.players.map(p => {
          const newGames = p.gamesPlayed + 1;
          const boost = getTrainingBoost(infrastructure.trainingCenter.level);
          let newOverall = p.overall;
          if (newGames >= 10 && p.age <= 33) {
            const chance = p.age <= 30 ? boost : boost * 0.3;
            newOverall = Math.min(99, p.overall + (Math.random() < chance ? 1 : 0));
          }
          return {
            ...p,
            gamesPlayed: newGames >= 10 ? 0 : newGames,
            trainingProgress: newGames >= 10 ? 0 : newGames,
            overall: newOverall,
            stamina: Math.max(40, p.stamina - Math.floor(Math.random() * 15 + 5)),
            morale: Math.min(100, Math.max(30, p.morale + (isWin ? 5 : isDraw ? 0 : -5))),
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
    toast.info('Treino automático: jogadores evoluem a cada 10 jogos com base na estrutura!');
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

  const upgradeFacility = useCallback((facility: 'trainingCenter' | 'youthAcademy' | 'stadium') => {
    const cost = getUpgradeCost(infrastructure[facility].level);
    if (club.budget < cost) return;

    setClub(prev => {
      if (prev.budget < cost) return prev;
      const label = facility === 'trainingCenter' ? 'Centro de Treinamento' : facility === 'youthAcademy' ? 'Academia' : 'Estádio';
      addFinance('despesa', 'Infraestrutura', cost, `Upgrade: ${label} → Nv${infrastructure[facility].level + 1}`);
      return { ...prev, budget: prev.budget - cost };
    });
    setInfrastructure(prev => ({
      ...prev,
      [facility]: { ...prev[facility], level: prev[facility].level + 1 },
    }));
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
    setSponsors(prev => [...prev, offer]);
    setSponsorOffers(prev => prev.filter(o => o.id !== offer.id));
    addFinance('receita', 'Patrocínio', offer.monthlyPay, `Novo: ${offer.name}`);
    setClub(prev => ({ ...prev, budget: prev.budget + offer.monthlyPay }));
    toast.success(`Patrocínio aceito: ${offer.name}!`);
  }, [addFinance]);

  const refreshSponsorOffers = useCallback(() => {
    setSponsorOffers(generateSponsorOffers(club.reputation, 4));
  }, [club.reputation]);

  const endSeason = useCallback(() => {
    const sorted = [...leagueTeams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
    const clubPos = sorted.findIndex(t => t.name === club.name) + 1;
    const seasonPrize = clubPos === 1 ? 5000000 : clubPos <= 4 ? 2000000 : 500000;

    setSeason(prev => ({
      currentSeason: prev.currentSeason + 1, currentWeek: 1, totalWeeks: 18,
      seasonHistory: [...prev.seasonHistory, {
        season: prev.currentSeason, position: clubPos, points: club.stats.points,
        wins: club.stats.wins, draws: club.stats.draws, losses: club.stats.losses,
        champion: sorted[0].name,
      }],
    }));

    setLeagueTeams(resetLeagueTeams());
    setClub(prev => ({
      ...prev,
      matches: generateSeasonMatches(),
      stats: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
      budget: prev.budget + seasonPrize,
      reputation: Math.min(100, prev.reputation + (clubPos <= 4 ? 5 : -2)),
      scoutReports: [],
      matchesSinceLastScout: 0,
      scouts: prev.scouts
        .map(s => ({ ...s, contract: s.contract - 1 }))
        .filter(s => s.contract > 0),
      players: prev.players
        .map(p => ({ ...p, goals: 0, assists: 0, stamina: 100, morale: 75, age: p.age + 1, contract: Math.max(0, (p.contract ?? 1) - 1), gamesPlayed: 0, trainingProgress: 0 }))
        .map(applyAgeDevelopment)
        .filter(p => p.age <= 42 && p.contract > 0),
    }));

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
  }, [leagueTeams, club, addFinance, season.currentSeason]);

  const hasUnplayedMatches = club.matches.some(m => !m.played);
  const totalSalaries = club.players.reduce((s, p) => s + p.salary, 0);

  const getFullState = useCallback((): GameState => ({
    club, tactics, leagueTeams, finances, marketPlayers, freeAgents, infrastructure, youthProspects, youthInvestment, season, sponsors, sponsorOffers, events,
  }), [club, tactics, leagueTeams, finances, marketPlayers, freeAgents, infrastructure, youthProspects, youthInvestment, season, sponsors, sponsorOffers, events]);

  return {
    club, tactics, leagueTeams, finances, marketPlayers, freeAgents, totalSalaries, infrastructure, youthProspects, youthInvestment, season, hasUnplayedMatches,
    sponsors, sponsorOffers, events, listedForSale,
    setTactics, simulateMatch, trainPlayer, restPlayer, buyPlayer, sellPlayer, signFreeAgent, refreshMarket, refreshFreeAgents, getFullState,
    upgradeFacility, promoteYouth, setYouthInvestment, endSeason,
    acceptSponsor, refreshSponsorOffers,
    renameClub, renameStadium, setTicketPrice,
    hireScout, fireScout, renewContract, listForSale,
  };
}
