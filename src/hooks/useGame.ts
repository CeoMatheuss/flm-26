import { useState, useCallback } from 'react';
import { Club, Player, Match } from '@/types/game';
import { TacticsConfig, defaultTactics } from '@/types/tactics';
import { LeagueTeam, initialLeagueTeams } from '@/types/league';
import { FinanceEntry, createFinanceEntry } from '@/types/finance';
import { Infrastructure, defaultInfrastructure, getUpgradeCost, getTrainingBoost, YouthProspect, SeasonData, defaultSeason, getYouthMonthlyPlayers } from '@/types/infrastructure';
import { Sponsor, SponsorOffer, generateSponsorOffers } from '@/types/sponsor';
import { initialClub } from '@/data/initialData';
import { generateMarketPlayers, getPlayerValue, generateYouthBatch } from '@/utils/playerGenerator';

export interface GameState {
  club: Club;
  tactics: TacticsConfig;
  leagueTeams: LeagueTeam[];
  finances: FinanceEntry[];
  marketPlayers: Player[];
  infrastructure: Infrastructure;
  youthProspects: YouthProspect[];
  youthInvestment: number;
  season: SeasonData;
  sponsors: Sponsor[];
  sponsorOffers: SponsorOffer[];
}

const generateId = () => Math.random().toString(36).substr(2, 9);

function generateSeasonMatches(): Match[] {
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

function resetLeagueTeams(): LeagueTeam[] {
  return initialLeagueTeams.map(t => ({ ...t, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, played: 0 }));
}

// Age-based training: up to 30 gains, 31-33 maintains, 33+ loses
function applyAgeDevelopment(player: Player): Player {
  if (player.age <= 30) return player; // gains through training only
  if (player.age <= 33) return player; // maintains
  // 34+: chance to lose overall
  const lossChance = 0.1 + (player.age - 33) * 0.08; // 34=18%, 38=50%, 42=82%
  if (Math.random() < lossChance) {
    return { ...player, overall: Math.max(40, player.overall - 1) };
  }
  return player;
}

export function useGame(initialState?: GameState) {
  const [club, setClub] = useState<Club>(initialState?.club ?? initialClub);
  const [tactics, setTactics] = useState<TacticsConfig>(initialState?.tactics ?? defaultTactics);
  const [leagueTeams, setLeagueTeams] = useState<LeagueTeam[]>(initialState?.leagueTeams ?? initialLeagueTeams);
  const [finances, setFinances] = useState<FinanceEntry[]>(initialState?.finances ?? []);
  const [marketPlayers, setMarketPlayers] = useState<Player[]>(initialState?.marketPlayers ?? generateMarketPlayers(8));
  const [infrastructure, setInfrastructure] = useState<Infrastructure>(initialState?.infrastructure ?? defaultInfrastructure);
  const [youthProspects, setYouthProspects] = useState<YouthProspect[]>(initialState?.youthProspects ?? []);
  const [youthInvestment, setYouthInvestment] = useState(initialState?.youthInvestment ?? 100000);
  const [season, setSeason] = useState<SeasonData>(initialState?.season ?? defaultSeason);
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialState?.sponsors ?? []);
  const [sponsorOffers, setSponsorOffers] = useState<SponsorOffer[]>(initialState?.sponsorOffers ?? generateSponsorOffers(65, 4));

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
      const prize = (isWin ? 150000 : isDraw ? 75000 : 30000) + stadiumBonus;
      const sponsorIncome = sponsors.reduce((s, sp) => s + sp.monthlyPay, 0);

      addFinance('receita', 'Partida', prize, `${isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota'} vs ${match.opponent}`);
      if (sponsorIncome > 0) {
        addFinance('receita', 'Patrocínio', Math.floor(sponsorIncome / 4), 'Receita de patrocínios (semanal)');
      }

      setSeason(prev => ({ ...prev, currentWeek: prev.currentWeek + 1 }));

      setLeagueTeams(prevTeams => prevTeams.map(t => {
        if (t.name === prev.name) {
          return { ...t, played: t.played + 1, wins: t.wins + (isWin ? 1 : 0), draws: t.draws + (isDraw ? 1 : 0), losses: t.losses + (!isWin && !isDraw ? 1 : 0), goalsFor: t.goalsFor + homeGoals, goalsAgainst: t.goalsAgainst + awayGoals, points: t.points + (isWin ? 3 : isDraw ? 1 : 0) };
        }
        const w = Math.random() > 0.5;
        const d = !w && Math.random() > 0.5;
        return { ...t, played: t.played + 1, wins: t.wins + (w ? 1 : 0), draws: t.draws + (d ? 1 : 0), losses: t.losses + (!w && !d ? 1 : 0), goalsFor: t.goalsFor + Math.floor(Math.random() * 3), goalsAgainst: t.goalsAgainst + Math.floor(Math.random() * 3), points: t.points + (w ? 3 : d ? 1 : 0) };
      }));

      // Youth prospects arrive during the season (every 4 matches)
      const playedCount = prev.matches.filter(m => m.played).length + 1;
      if (playedCount % 4 === 0) {
        const count = getYouthMonthlyPlayers(youthInvestment);
        const newProspects = generateYouthBatch(count, infrastructure.youthAcademy.level);
        setYouthProspects(yp => [...yp, ...newProspects]);
        setClub(c => {
          addFinance('despesa', 'Base', youthInvestment, `Investimento mensal na base (Rodada ${playedCount})`);
          return { ...c, budget: c.budget - youthInvestment };
        });
      }

      const sponsorWeekly = Math.floor(sponsorIncome / 4);

      return {
        ...prev,
        matches: prev.matches.map(m => m.id === matchId ? { ...m, played: true, result: { home: homeGoals, away: awayGoals } } : m),
        players: prev.players.map(p => ({
          ...p,
          stamina: Math.max(40, p.stamina - Math.floor(Math.random() * 15 + 5)),
          morale: Math.min(100, Math.max(30, p.morale + (isWin ? 5 : isDraw ? 0 : -5))),
        })),
        budget: prev.budget + prize + sponsorWeekly,
        fans: prev.fans + (isWin ? 500 : isDraw ? 100 : -200) + infrastructure.stadium.level * 50,
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
  }, [tactics, addFinance, infrastructure.stadium.level, infrastructure.youthAcademy.level, sponsors, youthInvestment]);

  const trainPlayer = useCallback((playerId: string) => {
    const cost = 10000;
    const boost = getTrainingBoost(infrastructure.trainingCenter.level);
    setClub(prev => {
      if (prev.budget < cost) return prev;
      const player = prev.players.find(p => p.id === playerId);
      if (!player) return prev;

      addFinance('despesa', 'Treino', cost, `Treino de ${player.name}`);

      return {
        ...prev,
        budget: prev.budget - cost,
        players: prev.players.map(p => {
          if (p.id !== playerId) return p;
          // Age-based training effectiveness
          let newOverall = p.overall;
          if (p.age <= 30) {
            // Young: gains OVR based on CT level
            newOverall = Math.min(99, p.overall + (Math.random() < boost ? 1 : 0));
          } else if (p.age <= 33) {
            // 31-33: maintains, small chance to gain
            newOverall = Math.min(99, p.overall + (Math.random() < boost * 0.3 ? 1 : 0));
          }
          // 34+: no gain from training
          return { ...p, overall: newOverall, stamina: Math.min(100, p.stamina + 10), morale: Math.min(100, p.morale + 3) };
        }),
      };
    });
  }, [addFinance, infrastructure.trainingCenter.level]);

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

  const upgradeFacility = useCallback((facility: 'trainingCenter' | 'youthAcademy' | 'stadium') => {
    setInfrastructure(prev => {
      const current = prev[facility];
      if (current.level >= current.maxLevel) return prev;
      const cost = getUpgradeCost(current.level);
      setClub(c => {
        if (c.budget < cost) return c;
        addFinance('despesa', 'Infraestrutura', cost, `Melhoria: ${facility === 'trainingCenter' ? 'CT' : facility === 'youthAcademy' ? 'Base' : 'Estádio'} → Nv${current.level + 1}`);
        return { ...c, budget: c.budget - cost };
      });
      return { ...prev, [facility]: { ...current, level: current.level + 1 } };
    });
  }, [addFinance]);

  const promoteYouth = useCallback((youthId: string) => {
    const prospect = youthProspects.find(p => p.id === youthId);
    if (!prospect) return;
    const player: Player = {
      id: prospect.id, name: prospect.name, position: prospect.position,
      overall: prospect.overall, age: prospect.age, salary: prospect.salary,
      stamina: prospect.stamina, morale: 90, goals: 0, assists: 0,
    };
    setClub(prev => ({ ...prev, players: [...prev.players, player] }));
    setYouthProspects(prev => prev.filter(p => p.id !== youthId));
  }, [youthProspects]);

  const acceptSponsor = useCallback((offer: SponsorOffer) => {
    setSponsors(prev => [...prev, offer]);
    setSponsorOffers(prev => prev.filter(o => o.id !== offer.id));
    addFinance('receita', 'Patrocínio', offer.monthlyPay, `Novo patrocínio: ${offer.name} (${offer.type})`);
  }, [addFinance]);

  const refreshSponsorOffers = useCallback(() => {
    setSponsorOffers(generateSponsorOffers(club.reputation, 4));
  }, [club.reputation]);

  const endSeason = useCallback(() => {
    const sorted = [...leagueTeams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
    const clubPos = sorted.findIndex(t => t.name === club.name) + 1;

    setSeason(prev => ({
      currentSeason: prev.currentSeason + 1,
      currentWeek: 1,
      totalWeeks: 18,
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
      players: prev.players
        .map(p => ({ ...p, goals: 0, assists: 0, stamina: 100, morale: 75, age: p.age + 1 }))
        .map(applyAgeDevelopment) // Age degradation for 34+
        .filter(p => p.age <= 42), // Retire at 42
    }));
    setMarketPlayers(generateMarketPlayers(10));

    // Develop youth prospects
    setYouthProspects(prev => prev.map(p => ({
      ...p,
      overall: Math.min(p.potential, p.overall + Math.floor(Math.random() * 3 + 1)),
      monthsInAcademy: p.monthsInAcademy + 6,
      age: p.age + 1,
    })));

    // Sponsor duration decrease
    setSponsors(prev => prev
      .map(sp => ({ ...sp, duration: sp.duration - 1 }))
      .filter(sp => sp.duration > 0)
    );
    setSponsorOffers(generateSponsorOffers(club.reputation, 4));

    const seasonPrize = clubPos === 1 ? 5000000 : clubPos <= 4 ? 2000000 : 500000;
    addFinance('receita', 'Premiação', seasonPrize, `Premiação T${season.currentSeason} - ${clubPos}º lugar`);
    setClub(prev => ({ ...prev, budget: prev.budget + seasonPrize, reputation: Math.min(100, prev.reputation + (clubPos <= 4 ? 5 : -2)) }));
  }, [leagueTeams, club.name, club.stats, club.reputation, addFinance, season.currentSeason]);

  const hasUnplayedMatches = club.matches.some(m => !m.played);
  const totalSalaries = club.players.reduce((s, p) => s + p.salary, 0);

  const getFullState = useCallback((): GameState => ({
    club, tactics, leagueTeams, finances, marketPlayers, infrastructure, youthProspects, youthInvestment, season, sponsors, sponsorOffers,
  }), [club, tactics, leagueTeams, finances, marketPlayers, infrastructure, youthProspects, youthInvestment, season, sponsors, sponsorOffers]);

  return {
    club, tactics, leagueTeams, finances, marketPlayers, totalSalaries, infrastructure, youthProspects, youthInvestment, season, hasUnplayedMatches,
    sponsors, sponsorOffers,
    setTactics, simulateMatch, trainPlayer, restPlayer, buyPlayer, sellPlayer, refreshMarket, getFullState,
    upgradeFacility, promoteYouth, setYouthInvestment, endSeason,
    acceptSponsor, refreshSponsorOffers,
  };
}
