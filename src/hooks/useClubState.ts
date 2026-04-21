import { useState, useCallback, useEffect } from 'react';
import { Club, Player, Scout, ScoutReport, PlayerAttributes } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { TrainingFocus } from '@/components/game/TrainingTab';
import { ClubProfile, defaultClubProfile } from '@/types/clubProfile';
import { getPlayerValue, generateMarketPlayers, generateFreeAgents, generateScoutReport } from '@/utils/playerGenerator';
import { initialClub } from '@/data/initialData';
import { toast } from 'sonner';

export interface LoanedPlayer {
  player: Player;
  fromClub: string;
  direction: 'in' | 'out';
  seasonStart: number;
}

export function useClubState(initialState: any, userId?: string) {
  const [club, setClub] = useState<Club>(initialState?.club ?? initialClub);
  const [marketPlayers, setMarketPlayers] = useState<Player[]>(initialState?.marketPlayers ?? generateMarketPlayers(8));
  const [freeAgents, setFreeAgents] = useState<Player[]>(initialState?.freeAgents ?? generateFreeAgents(12));
  const [loanedPlayers, setLoanedPlayers] = useState<LoanedPlayer[]>(initialState?.loanedPlayers ?? []);
  const [trainingFocus, setTrainingFocus] = useState<Record<string, TrainingFocus>>(initialState?.trainingFocus ?? {});
  const [trainingIntensity, setTrainingIntensity] = useState<Record<string, 'leve' | 'moderado' | 'pesado'>>(initialState?.trainingIntensity ?? {});
  const [listedForSale, setListedForSale] = useState<string[]>([]);
  const [clubProfile, setClubProfile] = useState<ClubProfile>(initialState?.clubProfile ?? defaultClubProfile);

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

  const setPlayerTrainingIntensity = useCallback((playerId: string, intensity: 'leve' | 'moderado' | 'pesado') => {
    setTrainingIntensity(prev => ({ ...prev, [playerId]: intensity }));
    console.log('[Persist] trainingIntensity', playerId, intensity);
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
      return { ...prev, budget: prev.budget - value, players: [...prev.players, player] };
    });
    setMarketPlayers(prev => prev.filter(p => p.id !== player.id));
    return { value };
  }, []);

  const signFreeAgent = useCallback((player: Player, offeredSalary?: number) => {
    const salary = offeredSalary || Math.floor(player.overall * 200 + player.age * 100);
    setClub(prev => {
      const signed = { ...player, salary, contract: Math.floor(Math.random() * 3 + 2) };
      return { ...prev, budget: prev.budget - salary * 3, players: [...prev.players, signed] };
    });
    setFreeAgents(prev => prev.filter(p => p.id !== player.id));
    toast.success(`${player.name} assinou! Salário: R$${(salary / 1000).toFixed(0)}k/mês`);
    return { salary };
  }, []);

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
      toast.success(`${player.name} renovou por +${duration} anos! Novo salário: R$${(newSalary / 1000).toFixed(0)}k/mês`);
      return {
        ...prev,
        budget: prev.budget - renewalCost,
        players: prev.players.map(p => p.id === playerId ? { ...p, salary: newSalary, contract: p.contract + duration } : p),
      };
    });
    return { duration };
  }, []);

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
      return { ...prev, budget: prev.budget + value, players: prev.players.filter(p => p.id !== player.id) };
    });
    setListedForSale(l => l.filter(id => id !== player.id));
    return { value };
  }, []);

  const refreshMarket = useCallback(() => setMarketPlayers(generateMarketPlayers(8)), []);
  const refreshFreeAgents = useCallback(() => setFreeAgents(generateFreeAgents(12)), []);

  const loansOut = loanedPlayers.filter(l => l.direction === 'out');
  const loansIn = loanedPlayers.filter(l => l.direction === 'in');

  const loanOutPlayer = useCallback((playerId: string, currentSeason: number) => {
    if (loansOut.length >= 3) { toast.error('Limite de 3 empréstimos atingido!'); return; }
    setClub(prev => {
      const player = prev.players.find(p => p.id === playerId);
      if (!player) return prev;
      if (prev.players.length <= 11) { toast.error('Elenco muito pequeno para emprestar!'); return prev; }
      if (loanedPlayers.some(l => l.player.id === playerId)) { toast.error('Este jogador já está emprestado!'); return prev; }
      setLoanedPlayers(lp => [...lp, { player, fromClub: 'player', direction: 'out', seasonStart: currentSeason }]);
      toast.success(`${player.name} emprestado por 1 temporada! O clube receptor paga o salário.`);
      return { ...prev, players: prev.players.filter(p => p.id !== playerId) };
    });
  }, [loansOut.length, loanedPlayers]);

  const loanInPlayer = useCallback((player: Player, currentSeason: number) => {
    if (loansIn.length >= 3) { toast.error('Limite de 3 empréstimos recebidos atingido!'); return; }
    setLoanedPlayers(lp => [...lp, { player, fromClub: 'bot', direction: 'in', seasonStart: currentSeason }]);
    setClub(prev => ({ ...prev, players: [...prev.players, player] }));
    setMarketPlayers(prev => prev.filter(p => p.id !== player.id));
    toast.success(`${player.name} emprestado ao seu clube! Você arca com o salário.`);
    return { salary: player.salary };
  }, [loansIn.length]);

  const renameClub = useCallback((newName: string) => {
    setClub(prev => ({ ...prev, name: newName }));
    toast.success(`Clube renomeado para ${newName}!`);
  }, []);

  const renameStadium = useCallback((newName: string) => {
    setClub(prev => ({ ...prev, stadiumName: newName }));
    toast.success(`Estádio renomeado para ${newName}!`);
  }, []);

  const updateShield = useCallback((cfg: any) => {
    setClub(prev => ({
      ...prev,
      shieldConfig: cfg,
      // Also mirror to legacy fields for backward compatibility
      primaryColor: cfg?.primaryColor ?? prev.primaryColor,
      secondaryColor: cfg?.secondaryColor ?? prev.secondaryColor,
      detailColor: cfg?.detailColor ?? (prev as any).detailColor,
      shieldPattern: cfg?.pattern ?? prev.shieldPattern,
      shieldShape: cfg?.shape ?? prev.shieldShape,
      shieldIcon: cfg?.icon ?? (prev as any).shieldIcon,
    } as any));
    toast.success('Escudo atualizado!');
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
        name: opt.name, skill: opt.skill, salary: opt.salary, contract: 2,
      };
      toast.success(`${opt.name} contratado! Hab: ${opt.skill}/10`);
      return { ...prev, budget: prev.budget - hireCost, scouts: [...prev.scouts, newScout] };
    });
    return { hireCost, opt };
  }, []);

  const fireScout = useCallback((scoutId: string) => {
    setClub(prev => {
      const scout = prev.scouts.find(s => s.id === scoutId);
      if (scout) toast.info(`${scout.name} dispensado.`);
      return { ...prev, scouts: prev.scouts.filter(s => s.id !== scoutId) };
    });
  }, []);

  const changeShirtNumber = useCallback((playerId: string, number: number) => {
    setClub(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === playerId ? { ...p, shirtNumber: number } : p),
    }));
    toast.success(`Numeração alterada para #${number}`);
  }, []);

  const updateClubProfile = useCallback((profile: ClubProfile) => {
    setClubProfile(profile);
  }, []);

  const updatePlayers = useCallback((players: Player[]) => {
    setClub(prev => ({ ...prev, players }));
  }, []);

  const addPackPlayers = useCallback((newPlayers: Player[], cost: number) => {
    setClub(prev => {
      if (prev.budget < cost) return prev;
      return { ...prev, budget: prev.budget - cost, players: [...prev.players, ...newPlayers.map(p => ({ ...p, contract: 2 }))] };
    });
    return { cost };
  }, []);

  const addBonus = useCallback((amount: number, description: string) => {
    setClub(prev => ({ ...prev, budget: prev.budget + amount }));
    return { amount, description };
  }, []);

  const totalSalaries = club.players.reduce((s, p) => s + p.salary, 0);

  // ── Budget breakdown (40/40/20) ──
  const transferBudget = Math.floor(club.budget * 0.4);
  const salaryBudget = Math.floor(club.budget * 0.4);
  const reservaBudget = Math.floor(club.budget * 0.2);
  const annualSalaries = totalSalaries * 12;
  const salaryBudgetRemaining = Math.max(0, salaryBudget - annualSalaries);

  // ── Rescind contract: debits transfer budget, removes player, lists in free market ──
  const rescindPlayer = useCallback(async (player: Player, fee: number) => {
    if (!userId) { toast.error('Sessão expirada'); return; }
    if (club.players.length <= 11) { toast.error('Elenco muito pequeno para rescindir!'); return; }
    if (transferBudget < fee) {
      toast.error(`Verba de transferências insuficiente: ${fee}`);
      return;
    }

    const res = await supabase.functions.invoke('process-free-agent', {
      body: { action: 'rescind-player', player, fee, clubName: club.name },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao rescindir contrato');
      return;
    }

    setClub(prev => ({
      ...prev,
      budget: prev.budget - fee,
      players: prev.players.filter(p => p.id !== player.id),
    }));
    toast.success(`${player.name} liberado para o Mercado Livre. Taxa: R$${(fee / 1000).toFixed(0)}k`);
  }, [club.budget, club.players.length, club.name, transferBudget, userId]);

  return {
    club, setClub, marketPlayers, setMarketPlayers, freeAgents, setFreeAgents,
    loanedPlayers, setLoanedPlayers, trainingFocus, trainingIntensity, listedForSale, clubProfile, setClubProfile,
    totalSalaries, loansOut, loansIn,
    transferBudget, salaryBudget, reservaBudget, salaryBudgetRemaining, annualSalaries,
    trainPlayer, setPlayerTrainingFocus, setPlayerTrainingIntensity, restPlayer, buyPlayer, signFreeAgent, renewContract,
    listForSale, sellPlayer, refreshMarket, refreshFreeAgents,
    loanOutPlayer, loanInPlayer, renameClub, renameStadium, updateShield, setTicketPrice,
    hireScout, fireScout, changeShirtNumber, updateClubProfile, updatePlayers, addPackPlayers, addBonus,
    rescindPlayer,
  };
}
