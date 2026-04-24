import { useState, useCallback, useEffect } from 'react';
import { Club, Player, Scout, ScoutReport, PlayerAttributes } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { TrainingFocus } from '@/components/game/TrainingTab';
import { ClubProfile, defaultClubProfile } from '@/types/clubProfile';
import { getPlayerValue, generateMarketPlayers, generateFreeAgents, generateScoutReport } from '@/utils/playerGenerator';
import { initialClub } from '@/data/initialData';
import { toast } from 'sonner';
import {
  buildStadiumModules,
} from '@/match/stadiumEconomics';
import {
  generateEventProposals, resolveEvent, emptyStadiumOps,
  getInsuranceMonthlyCost, INSURANCE_PLANS, EVENT_CATALOG, DAMAGE_PROFILES,
  type StadiumEventProposal, type StadiumOpsState, type StadiumDamage, type StadiumInsurance,
} from '@/match/stadiumEvents';
import { rollDailyWeather, summarizeFinance, type StadiumFinanceEntry } from '@/match/stadiumWeather';
import {
  generateStadiumSponsorOffers, acceptSponsorOffer,
  detectNewAchievements, getAchievement,
  type StadiumSponsorOffer,
} from '@/match/stadiumExtras';
import {
  MEMBERSHIP_CATALOG, getMembershipConfig, recomputeMembers, billMembership,
  computeUpgradeEffects, MODULAR_UPGRADES, getUpgradeConfig, emptyPhase6State,
  type MembershipTier, type ModularUpgradeId, type StadiumPhase6State,
} from '@/match/stadiumPhase6';


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

  // ── V3: Auto-gerador de olheiros (1 a cada 7 dias) e refresh do staff (15 dias) ──
  useEffect(() => {
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    setClub(prev => {
      let changed = false;
      let next = { ...prev };

      // Scout auto-gen
      const lastScoutTs = prev.lastScoutGeneratedAt ? new Date(prev.lastScoutGeneratedAt).getTime() : 0;
      if (!lastScoutTs || now - lastScoutTs >= SEVEN_DAYS) {
        const skill = Math.max(1, Math.min(8, Math.floor(Math.random() * 8) + 1));
        const names = ['Carlos', 'Pedro', 'João', 'Rafael', 'Bruno', 'Eduardo', 'Henrique', 'Marcos', 'Felipe', 'Gustavo'];
        const surnames = ['Silva', 'Souza', 'Costa', 'Lima', 'Pereira', 'Oliveira', 'Santos', 'Ferreira'];
        const newScout: Scout = {
          id: Math.random().toString(36).substr(2, 9),
          name: `${names[Math.floor(Math.random() * names.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`,
          skill,
          salary: skill * 12000,
          contract: 2,
        };
        next.availableScouts = [...(prev.availableScouts || []), newScout].slice(-5); // máximo 5 disponíveis
        next.lastScoutGeneratedAt = new Date(now).toISOString();
        changed = true;
      }

      // Staff market refresh
      const lastStaffTs = prev.lastStaffMarketRefreshAt ? new Date(prev.lastStaffMarketRefreshAt).getTime() : 0;
      if (!lastStaffTs || now - lastStaffTs >= FIFTEEN_DAYS || !(prev.staffMarket && prev.staffMarket.length)) {
        const generateStaff = (role: 'assistente' | 'medico' | 'preparador_fisico', count: number) => {
          return Array.from({ length: count }, () => {
            const skill = Math.floor(Math.random() * 7) + 3; // 3-9
            const names = ['Carlos Mendes', 'Ricardo Souza', 'Fernando Lima', 'André Santos', 'Paulo Costa', 'Marcos Silva', 'João Ferreira', 'Pedro Almeida', 'Luis Gomes', 'Felipe Rocha'];
            return {
              id: Math.random().toString(36).substr(2, 9),
              name: names[Math.floor(Math.random() * names.length)],
              role,
              skill,
              salary: skill * 18000,
              contract: 2,
            };
          });
        };
        next.staffMarket = [
          ...generateStaff('assistente', 5),
          ...generateStaff('medico', 2),
          ...generateStaff('preparador_fisico', 2),
        ];
        next.lastStaffMarketRefreshAt = new Date(now).toISOString();
        changed = true;
      }

      return changed ? next : prev;
    });
  }, []);

  // ── Stadium Ops V2: gerar propostas, expirar antigas, resolver eventos vencidos, cobrar seguro ──
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

      setClub(prev => {
        const stadiumLevel = (prev as any).infrastructure?.stadium?.level
          ?? (prev.vipBoxesBuilt ? 3 : 1);
        const ops: StadiumOpsState = prev.stadiumOps ?? emptyStadiumOps();
        let next = { ...prev };
        const nextOps: StadiumOpsState = {
          ...ops,
          proposals: [...ops.proposals],
          damages: [...ops.damages],
          acceptedEvents: [...ops.acceptedEvents],
          recentLog: [...ops.recentLog],
          financeLog: [...(ops.financeLog ?? [])],
        };
        const pushFin = (entry: StadiumFinanceEntry) => {
          nextOps.financeLog = [entry, ...(nextOps.financeLog ?? [])].slice(0, 200);
        };
        let changed = false;

        // 1) expirar propostas vencidas
        const before = nextOps.proposals.length;
        nextOps.proposals = nextOps.proposals.filter(p => new Date(p.expiresAt).getTime() > now);
        if (nextOps.proposals.length !== before) changed = true;

        // 2) resolver eventos cuja data passou
        const due = nextOps.acceptedEvents.filter(e => new Date(e.scheduledFor).getTime() <= now);
        if (due.length > 0) {
          const upgEffEvents = computeUpgradeEffects(nextOps.phase6?.upgrades);
          for (const e of due) {
            const baseProposal = ops.proposals.find(p => p.id === e.proposalId)
              ?? ({ id: e.proposalId, category: e.category, damageChance: 0.2, damageSeverity: 'medio', revenue: e.revenue } as StadiumEventProposal);
            // Aplica redução de chance de dano por upgrades modulares (gramado híbrido, etc.)
            const proposal: StadiumEventProposal = { ...baseProposal, damageChance: Math.max(0, Math.min(1, baseProposal.damageChance * upgEffEvents.eventDamageMult)) };
            const res = resolveEvent(proposal);
            next.budget = (next.budget ?? 0) + e.revenue;
            const evLabel = EVENT_CATALOG.find(c => c.category === e.category)?.label ?? e.category;
            pushFin({ at: new Date().toISOString(), category: 'evento', label: evLabel, amount: e.revenue });
            nextOps.recentLog = [{ at: new Date().toISOString(), message: `💰 +R$ ${(e.revenue / 1000).toFixed(0)}k de "${evLabel}"`, type: 'success' as const }, ...nextOps.recentLog].slice(0, 12);
            if (res.damageOccurred && res.damage) {
              const dmg = { ...res.damage };
              if (nextOps.insurance.tier && nextOps.insurance.coverage > 0) {
                const reduction = Math.round(dmg.repairCost * nextOps.insurance.coverage);
                dmg.repairCost = Math.max(0, dmg.repairCost - reduction);
                nextOps.recentLog = [{ at: new Date().toISOString(), message: `🛡️ Seguro cobriu R$ ${(reduction / 1000).toFixed(0)}k do reparo`, type: 'info' as const }, ...nextOps.recentLog].slice(0, 12);
              }
              nextOps.damages.push(dmg);
              nextOps.recentLog = [{ at: new Date().toISOString(), message: res.message, type: 'danger' as const }, ...nextOps.recentLog].slice(0, 12);
              toast.error(res.message);
            } else {
              toast.success(res.message);
            }
          }
          nextOps.acceptedEvents = nextOps.acceptedEvents.filter(e => new Date(e.scheduledFor).getTime() > now);
          changed = true;
        }

        // 3) finalizar reparos
        const finishedRepairs = nextOps.damages.filter(d => d.repairing && d.repairCompletesAt && new Date(d.repairCompletesAt).getTime() <= now);
        if (finishedRepairs.length > 0) {
          for (const d of finishedRepairs) {
            nextOps.recentLog = [{ at: new Date().toISOString(), message: `🛠️ Reparo concluído: ${d.sourceLabel}`, type: 'success' as const }, ...nextOps.recentLog].slice(0, 12);
          }
          nextOps.damages = nextOps.damages.filter(d => !(d.repairing && d.repairCompletesAt && new Date(d.repairCompletesAt).getTime() <= now));
          changed = true;
        }

        // 4) gerar novas propostas a cada 2 dias
        const lastGenTs = nextOps.lastProposalGenAt ? new Date(nextOps.lastProposalGenAt).getTime() : 0;
        if ((!lastGenTs || now - lastGenTs >= TWO_DAYS) && nextOps.proposals.length < 4) {
          const modules = buildStadiumModules(stadiumLevel, prev.vipBoxesBuilt);
          const newProps = generateEventProposals({
            modules, reputation: prev.reputation ?? 50, existingCount: nextOps.proposals.length,
          });
          if (newProps.length > 0) {
            nextOps.proposals = [...nextOps.proposals, ...newProps];
            nextOps.lastProposalGenAt = new Date(now).toISOString();
            changed = true;
          }
        }

        // 5) cobrar seguro mensal
        if (nextOps.insurance.tier && nextOps.insurance.renewsAt && new Date(nextOps.insurance.renewsAt).getTime() <= now) {
          const modules = buildStadiumModules(stadiumLevel, prev.vipBoxesBuilt);
          const cost = getInsuranceMonthlyCost(nextOps.insurance.tier, modules);
          if ((next.budget ?? 0) >= cost) {
            next.budget = (next.budget ?? 0) - cost;
            pushFin({ at: new Date().toISOString(), category: 'seguro', label: `Mensalidade ${nextOps.insurance.tier}`, amount: -cost });
            nextOps.insurance = {
              ...nextOps.insurance, monthlyCost: cost,
              renewsAt: new Date(now + 30 * 24 * 3600_000).toISOString(),
            };
            nextOps.recentLog = [{ at: new Date().toISOString(), message: `🛡️ Seguro renovado: -R$ ${(cost / 1000).toFixed(0)}k`, type: 'info' as const }, ...nextOps.recentLog].slice(0, 12);
          } else {
            nextOps.insurance = { tier: null, monthlyCost: 0, coverage: 0 };
            nextOps.recentLog = [{ at: new Date().toISOString(), message: '🛡️ Seguro CANCELADO por falta de saldo!', type: 'warning' as const }, ...nextOps.recentLog].slice(0, 12);
            toast.error('🛡️ Seguro do estádio cancelado por falta de saldo!');
          }
          changed = true;
        }

        // 6) Fase 4 — clima diário
        const ONE_DAY = 24 * 3600_000;
        const lastWeatherTs = nextOps.lastWeatherRollAt ? new Date(nextOps.lastWeatherRollAt).getTime() : 0;
        if (!lastWeatherTs || now - lastWeatherTs >= ONE_DAY) {
          const modules = buildStadiumModules(stadiumLevel, prev.vipBoxesBuilt);
          const upgEffWeather = computeUpgradeEffects(nextOps.phase6?.upgrades);
          const roll = rollDailyWeather(modules, nextOps.insurance, upgEffWeather.weatherDamageMult);
          nextOps.lastWeatherRollAt = new Date(now).toISOString();
          if (roll.triggered && roll.message) {
            if (roll.damage) {
              const dmg = { ...roll.damage };
              if (nextOps.insurance.tier && nextOps.insurance.coverage > 0) {
                const reduction = Math.round(dmg.repairCost * nextOps.insurance.coverage);
                dmg.repairCost = Math.max(0, dmg.repairCost - reduction);
                nextOps.recentLog = [{ at: new Date().toISOString(), message: `🛡️ Seguro cobriu R$ ${(reduction / 1000).toFixed(0)}k do reparo do clima`, type: 'info' as const }, ...nextOps.recentLog].slice(0, 12);
              }
              nextOps.damages.push(dmg);
              nextOps.recentLog = [{ at: new Date().toISOString(), message: roll.message, type: 'danger' as const }, ...nextOps.recentLog].slice(0, 12);
              toast.error(roll.message);
            } else if (roll.prevented) {
              nextOps.recentLog = [{ at: new Date().toISOString(), message: roll.message, type: 'success' as const }, ...nextOps.recentLog].slice(0, 12);
              toast.success(roll.message);
            } else {
              nextOps.recentLog = [{ at: new Date().toISOString(), message: roll.message, type: 'info' as const }, ...nextOps.recentLog].slice(0, 12);
            }
          }
          changed = true;
        }

        // 7) Fase 5 — gerar ofertas de sponsors do estádio (a cada 3 dias)
        const THREE_DAYS = 3 * 24 * 3600_000;
        nextOps.sponsorOffers = (nextOps.sponsorOffers ?? []).filter(o => new Date(o.expiresAt).getTime() > now);
        nextOps.sponsorContracts = nextOps.sponsorContracts ?? [];
        const lastSponsTs = nextOps.lastSponsorGenAt ? new Date(nextOps.lastSponsorGenAt).getTime() : 0;
        if ((!lastSponsTs || now - lastSponsTs >= THREE_DAYS) && (nextOps.sponsorOffers?.length ?? 0) < 3) {
          const modules = buildStadiumModules(stadiumLevel, prev.vipBoxesBuilt);
          const newOffers = generateStadiumSponsorOffers({
            modules, reputation: prev.reputation ?? 50,
            existingContracts: nextOps.sponsorContracts,
            existingOffersCount: nextOps.sponsorOffers?.length ?? 0,
          });
          if (newOffers.length > 0) {
            nextOps.sponsorOffers = [...(nextOps.sponsorOffers ?? []), ...newOffers];
            nextOps.lastSponsorGenAt = new Date(now).toISOString();
            for (const o of newOffers) {
              nextOps.recentLog = [{ at: new Date().toISOString(), message: `📩 Oferta: ${o.brand} (${o.slot}) — R$ ${(o.monthlyPay/1000).toFixed(0)}k/mês`, type: 'info' as const }, ...nextOps.recentLog].slice(0, 12);
            }
            changed = true;
          }
        }

        // 8) Fase 5 — payout mensal de sponsors ativos (com bônus se sem dano)
        const activeDamagesCount = nextOps.damages.filter(d => !d.repairing).length;
        for (let i = 0; i < (nextOps.sponsorContracts?.length ?? 0); i++) {
          const c = nextOps.sponsorContracts![i];
          if (new Date(c.endsAt).getTime() <= now) continue;
          if (new Date(c.nextPayoutAt).getTime() <= now) {
            const bonus = activeDamagesCount === 0 ? c.bonusIfHealthy : 0;
            const total = c.monthlyPay + bonus;
            next.budget = (next.budget ?? 0) + total;
            pushFin({ at: new Date().toISOString(), category: 'evento', label: `Patrocínio ${c.brand}`, amount: total });
            nextOps.sponsorContracts![i] = { ...c, nextPayoutAt: new Date(now + 30 * 24 * 3600_000).toISOString() };
            const bonusMsg = bonus > 0 ? ` (+R$${(bonus/1000).toFixed(0)}k bônus estádio íntegro)` : '';
            nextOps.recentLog = [{ at: new Date().toISOString(), message: `💼 ${c.brand} pagou R$ ${(c.monthlyPay/1000).toFixed(0)}k${bonusMsg}`, type: 'success' as const }, ...nextOps.recentLog].slice(0, 12);
            changed = true;
          }
        }
        const beforeContracts = nextOps.sponsorContracts.length;
        nextOps.sponsorContracts = nextOps.sponsorContracts.filter(c => new Date(c.endsAt).getTime() > now);
        if (nextOps.sponsorContracts.length !== beforeContracts) {
          nextOps.recentLog = [{ at: new Date().toISOString(), message: '📅 Contrato(s) de patrocínio expiraram.', type: 'warning' as const }, ...nextOps.recentLog].slice(0, 12);
          changed = true;
        }

        // 9) Fase 5 — verificar conquistas
        const ach = nextOps.achievements ?? { unlocked: [], progress: {} };
        const modulesNow = buildStadiumModules(stadiumLevel, prev.vipBoxesBuilt);
        const finSummary = summarizeFinance(nextOps.financeLog ?? [], 30);
        const newly = detectNewAchievements(ach, {
          ops: nextOps, modules: modulesNow, financeNet30d: finSummary.net,
        });
        if (newly.length > 0) {
          for (const id of newly) {
            const a = getAchievement(id);
            next.budget = (next.budget ?? 0) + a.reward;
            next.fans = Math.max(100, (next.fans ?? 1000) + (a.fanReward ?? 0));
            next.reputation = Math.min(100, Math.max(1, (next.reputation ?? 50) + (a.reputationReward ?? 0)));
            pushFin({ at: new Date().toISOString(), category: 'evento', label: `Conquista: ${a.label}`, amount: a.reward });
            nextOps.recentLog = [{ at: new Date().toISOString(), message: `🏆 Conquista desbloqueada: ${a.emoji} ${a.label} (+R$${(a.reward/1000).toFixed(0)}k)`, type: 'success' as const }, ...nextOps.recentLog].slice(0, 12);
            toast.success(`🏆 ${a.emoji} ${a.label} desbloqueada! +R$${(a.reward/1000).toFixed(0)}k`);
          }
          nextOps.achievements = { ...ach, unlocked: [...ach.unlocked, ...newly] };
          changed = true;
        } else {
          nextOps.achievements = ach;
        }

        // 10) Fase 6 — cobrança/recálculo mensal de sócios + manutenção upgrades
        const phase6 = nextOps.phase6 ?? emptyPhase6State();
        const lastBill = nextOps.lastMembershipBilledAt ? new Date(nextOps.lastMembershipBilledAt).getTime() : 0;
        const THIRTY_DAYS = 30 * 24 * 3600_000;
        if (!lastBill || now - lastBill >= THIRTY_DAYS) {
          // Recalcula nº de sócios baseado na torcida atual
          const newMembers = recomputeMembers(phase6.membership.activeTiers, prev.fans ?? 1000, prev.reputation ?? 50);
          const updatedMembership = { ...phase6.membership, membersByTier: newMembers, lastBilledAt: new Date(now).toISOString() };
          const billing = billMembership(updatedMembership);
          if (billing.totalRevenue > 0) {
            next.budget = (next.budget ?? 0) + billing.totalRevenue;
            pushFin({ at: new Date().toISOString(), category: 'evento', label: `Sócio-Torcedor (${billing.totalMembers.toLocaleString()} sócios)`, amount: billing.totalRevenue });
            nextOps.recentLog = [{ at: new Date().toISOString(), message: `🎟️ Mensalidade dos sócios: +R$ ${(billing.totalRevenue/1000).toFixed(0)}k (${billing.totalMembers} sócios)`, type: 'success' as const }, ...nextOps.recentLog].slice(0, 12);
          }
          // Manutenção dos upgrades modulares
          const upgEff = computeUpgradeEffects(phase6.upgrades);
          if (upgEff.totalMonthlyCost > 0) {
            if ((next.budget ?? 0) >= upgEff.totalMonthlyCost) {
              next.budget = (next.budget ?? 0) - upgEff.totalMonthlyCost;
              pushFin({ at: new Date().toISOString(), category: 'reparo', label: 'Manutenção upgrades modulares', amount: -upgEff.totalMonthlyCost });
              nextOps.recentLog = [{ at: new Date().toISOString(), message: `🔧 Manutenção upgrades: -R$ ${(upgEff.totalMonthlyCost/1000).toFixed(0)}k`, type: 'info' as const }, ...nextOps.recentLog].slice(0, 12);
            } else {
              nextOps.recentLog = [{ at: new Date().toISOString(), message: '⚠️ Saldo insuficiente para manutenção dos upgrades!', type: 'warning' as const }, ...nextOps.recentLog].slice(0, 12);
              toast.error('⚠️ Saldo insuficiente para manutenção dos upgrades modulares!');
            }
          }
          nextOps.phase6 = { ...phase6, membership: updatedMembership };
          nextOps.lastMembershipBilledAt = new Date(now).toISOString();
          changed = true;
        } else {
          nextOps.phase6 = phase6;
        }

        if (!changed) return prev;
        next.stadiumOps = nextOps;
        return next;
      });
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

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

  const buildVipBox = useCallback((tier: 'bronze' | 'prata' | 'ouro' | 'master', cost: number, cap: number) => {
    setClub(prev => {
      const current = prev.vipBoxesBuilt?.[tier] ?? 0;
      if (current >= cap) {
        toast.error(`👑 Limite de camarotes ${tier} atingido para o nível atual do estádio!`);
        return prev;
      }
      if (prev.budget < cost) {
        toast.error(`💸 Orçamento insuficiente! Custo: R$ ${(cost / 1000).toFixed(0)}k`);
        return prev;
      }
      toast.success(`👑 Camarote ${tier.toUpperCase()} construído!`, {
        description: `+R$ ${(cost / 1000).toFixed(0)}k investidos. Renda mensal de empresas aumentada.`,
      });
      return {
        ...prev,
        budget: prev.budget - cost,
        vipBoxesBuilt: { ...prev.vipBoxesBuilt, [tier]: current + 1 },
      };
    });
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

  // ── Stadium Ops handlers ──────────────────────────────────────────────
  const acceptStadiumEvent = useCallback((proposalId: string) => {
    setClub(prev => {
      const ops = prev.stadiumOps ?? emptyStadiumOps();
      const proposal = ops.proposals.find(p => p.id === proposalId);
      if (!proposal) { toast.error('Proposta não encontrada'); return prev; }
      const cfg = EVENT_CATALOG.find(c => c.category === proposal.category);
      toast.success(`✅ Aceito: ${cfg?.label} — R$ ${(proposal.revenue/1000).toFixed(0)}k em ${new Date(proposal.scheduledFor).toLocaleDateString('pt-BR')}`);
      return {
        ...prev,
        fans: Math.max(100, (prev.fans ?? 1000) + Math.round((prev.fans ?? 1000) * proposal.fanImpact / 1000)),
        stadiumOps: {
          ...ops,
          proposals: ops.proposals.filter(p => p.id !== proposalId),
          acceptedEvents: [...ops.acceptedEvents, { proposalId, category: proposal.category, scheduledFor: proposal.scheduledFor, revenue: proposal.revenue }],
          recentLog: [{ at: new Date().toISOString(), message: `📅 ${cfg?.label} agendado para ${new Date(proposal.scheduledFor).toLocaleDateString('pt-BR')}`, type: 'info' as const }, ...ops.recentLog].slice(0, 12),
        },
      };
    });
  }, []);

  const rejectStadiumEvent = useCallback((proposalId: string) => {
    setClub(prev => {
      const ops = prev.stadiumOps ?? emptyStadiumOps();
      return {
        ...prev,
        stadiumOps: {
          ...ops,
          proposals: ops.proposals.filter(p => p.id !== proposalId),
        },
      };
    });
    toast.info('Proposta recusada');
  }, []);

  const startStadiumRepair = useCallback((damageId: string) => {
    setClub(prev => {
      const ops = prev.stadiumOps ?? emptyStadiumOps();
      const dmg = ops.damages.find(d => d.id === damageId);
      if (!dmg) return prev;
      if ((prev.budget ?? 0) < dmg.repairCost) {
        toast.error(`💸 Orçamento insuficiente! Reparo custa R$ ${(dmg.repairCost/1000).toFixed(0)}k`);
        return prev;
      }
      toast.success(`🛠️ Reparo iniciado: ${dmg.sourceLabel} (${dmg.repairDays} dia(s))`);
      const completesAt = new Date(Date.now() + dmg.repairDays * 24 * 3600_000).toISOString();
      const finEntry: StadiumFinanceEntry = { at: new Date().toISOString(), category: 'reparo', label: dmg.sourceLabel, amount: -dmg.repairCost };
      return {
        ...prev,
        budget: (prev.budget ?? 0) - dmg.repairCost,
        stadiumOps: {
          ...ops,
          damages: ops.damages.map(d => d.id === damageId ? { ...d, repairing: true, repairCompletesAt: completesAt } : d),
          recentLog: [{ at: new Date().toISOString(), message: `🛠️ Reparo iniciado: ${dmg.sourceLabel} (-R$ ${(dmg.repairCost/1000).toFixed(0)}k)`, type: 'info' as const }, ...ops.recentLog].slice(0, 12),
          financeLog: [finEntry, ...(ops.financeLog ?? [])].slice(0, 200),
        },
      };
    });
  }, []);

  const buyStadiumInsurance = useCallback((tier: NonNullable<StadiumInsurance['tier']>) => {
    setClub(prev => {
      const stadiumLevel = (prev as any).infrastructure?.stadium?.level ?? 1;
      const modules = buildStadiumModules(stadiumLevel, prev.vipBoxesBuilt);
      const cost = getInsuranceMonthlyCost(tier, modules);
      if ((prev.budget ?? 0) < cost) {
        toast.error(`💸 Orçamento insuficiente! Mensalidade: R$ ${(cost/1000).toFixed(0)}k`);
        return prev;
      }
      const plan = INSURANCE_PLANS.find(p => p.tier === tier)!;
      const ops = prev.stadiumOps ?? emptyStadiumOps();
      toast.success(`🛡️ Seguro ${plan.label} contratado!`);
      const finEntry: StadiumFinanceEntry = { at: new Date().toISOString(), category: 'seguro', label: `Contratação ${plan.label}`, amount: -cost };
      return {
        ...prev,
        budget: (prev.budget ?? 0) - cost,
        stadiumOps: {
          ...ops,
          insurance: { tier, monthlyCost: cost, coverage: plan.coverage, renewsAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString() },
          recentLog: [{ at: new Date().toISOString(), message: `🛡️ Contratou seguro ${plan.label} (-R$ ${(cost/1000).toFixed(0)}k/mês)`, type: 'success' as const }, ...ops.recentLog].slice(0, 12),
          financeLog: [finEntry, ...(ops.financeLog ?? [])].slice(0, 200),
        },
      };
    });
  }, []);

  const cancelStadiumInsurance = useCallback(() => {
    setClub(prev => {
      const ops = prev.stadiumOps ?? emptyStadiumOps();
      if (!ops.insurance.tier) return prev;
      toast.info('🛡️ Seguro cancelado');
      return {
        ...prev,
        stadiumOps: {
          ...ops,
          insurance: { tier: null, monthlyCost: 0, coverage: 0 },
          recentLog: [{ at: new Date().toISOString(), message: '🛡️ Seguro cancelado', type: 'warning' as const }, ...ops.recentLog].slice(0, 12),
        },
      };
    });
  }, []);

  // ── Fase 5 — sponsors do estádio ───────────────────────────────────────
  const acceptStadiumSponsor = useCallback((offerId: string) => {
    setClub(prev => {
      const ops = prev.stadiumOps ?? emptyStadiumOps();
      const offer = (ops.sponsorOffers ?? []).find(o => o.id === offerId);
      if (!offer) { toast.error('Oferta não encontrada'); return prev; }
      const contract = acceptSponsorOffer(offer);
      toast.success(`💼 Patrocínio aceito: ${offer.brand} (R$${(offer.monthlyPay/1000).toFixed(0)}k/mês)`);
      return {
        ...prev,
        stadiumOps: {
          ...ops,
          sponsorOffers: (ops.sponsorOffers ?? []).filter(o => o.id !== offerId),
          sponsorContracts: [...(ops.sponsorContracts ?? []), contract],
          recentLog: [{ at: new Date().toISOString(), message: `💼 ${offer.brand} (${offer.slot}) firmou contrato`, type: 'success' as const }, ...ops.recentLog].slice(0, 12),
        },
      };
    });
  }, []);

  const rejectStadiumSponsor = useCallback((offerId: string) => {
    setClub(prev => {
      const ops = prev.stadiumOps ?? emptyStadiumOps();
      return {
        ...prev,
        stadiumOps: {
          ...ops,
          sponsorOffers: (ops.sponsorOffers ?? []).filter(o => o.id !== offerId),
        },
      };
    });
    toast.info('Oferta de patrocínio recusada');
  }, []);


  // ── Fase 6 — Sócio-Torcedor ─────────────────────────────────────────────
  const toggleMembershipTier = useCallback((tier: MembershipTier) => {
    setClub(prev => {
      const ops = prev.stadiumOps ?? emptyStadiumOps();
      const phase6 = ops.phase6 ?? emptyPhase6State();
      const cfg = getMembershipConfig(tier);
      const stadiumLevel = (prev as any).infrastructure?.stadium?.level ?? 1;
      if (stadiumLevel < cfg.minStadiumLevel) {
        toast.error(`Programa ${cfg.label} requer estádio Nv ${cfg.minStadiumLevel}.`);
        return prev;
      }
      const isActive = phase6.membership.activeTiers.includes(tier);
      const newTiers = isActive
        ? phase6.membership.activeTiers.filter(t => t !== tier)
        : [...phase6.membership.activeTiers, tier];
      const newMembers = recomputeMembers(newTiers, prev.fans ?? 1000, prev.reputation ?? 50);
      toast.success(isActive ? `${cfg.label} encerrado.` : `${cfg.label} aberto! ${(newMembers[tier] ?? 0).toLocaleString()} sócios estimados.`);
      return {
        ...prev,
        stadiumOps: {
          ...ops,
          phase6: {
            ...phase6,
            membership: { ...phase6.membership, activeTiers: newTiers, membersByTier: newMembers },
          },
          recentLog: [{ at: new Date().toISOString(), message: isActive ? `🎟️ ${cfg.label} encerrado` : `🎟️ ${cfg.label} aberto à torcida`, type: 'info' as const }, ...ops.recentLog].slice(0, 12),
        },
      };
    });
  }, []);

  // ── Fase 6 — Upgrades modulares ─────────────────────────────────────────
  const buyModularUpgrade = useCallback((id: ModularUpgradeId) => {
    setClub(prev => {
      const cfg = getUpgradeConfig(id);
      const ops = prev.stadiumOps ?? emptyStadiumOps();
      const phase6 = ops.phase6 ?? emptyPhase6State();
      const stadiumLevel = (prev as any).infrastructure?.stadium?.level ?? 1;
      if (phase6.upgrades.owned.includes(id)) {
        toast.error(`${cfg.label} já adquirido.`);
        return prev;
      }
      if (stadiumLevel < cfg.minStadiumLevel) {
        toast.error(`${cfg.label} requer estádio Nv ${cfg.minStadiumLevel}.`);
        return prev;
      }
      if ((prev.budget ?? 0) < cfg.cost) {
        toast.error(`Orçamento insuficiente! Custo: R$ ${(cfg.cost/1_000_000).toFixed(2)}M`);
        return prev;
      }
      toast.success(`${cfg.emoji} ${cfg.label} instalado!`, { description: cfg.effect });
      return {
        ...prev,
        budget: (prev.budget ?? 0) - cfg.cost,
        stadiumOps: {
          ...ops,
          phase6: {
            ...phase6,
            upgrades: {
              owned: [...phase6.upgrades.owned, id],
              purchasedAt: { ...phase6.upgrades.purchasedAt, [id]: new Date().toISOString() },
            },
          },
          recentLog: [{ at: new Date().toISOString(), message: `${cfg.emoji} ${cfg.label} instalado (-R$${(cfg.cost/1000).toFixed(0)}k)`, type: 'success' as const }, ...ops.recentLog].slice(0, 12),
        },
      };
    });
  }, []);

  return {
    club, setClub, marketPlayers, setMarketPlayers, freeAgents, setFreeAgents,
    loanedPlayers, setLoanedPlayers, trainingFocus, trainingIntensity, listedForSale, clubProfile, setClubProfile,
    totalSalaries, loansOut, loansIn,
    transferBudget, salaryBudget, reservaBudget, salaryBudgetRemaining, annualSalaries,
    trainPlayer, setPlayerTrainingFocus, setPlayerTrainingIntensity, restPlayer, buyPlayer, signFreeAgent, renewContract,
    listForSale, sellPlayer, refreshMarket, refreshFreeAgents,
    loanOutPlayer, loanInPlayer, renameClub, renameStadium, updateShield, setTicketPrice, buildVipBox,
    hireScout, fireScout, changeShirtNumber, updateClubProfile, updatePlayers, addPackPlayers, addBonus,
    rescindPlayer,
    acceptStadiumEvent, rejectStadiumEvent, startStadiumRepair, buyStadiumInsurance, cancelStadiumInsurance,
    acceptStadiumSponsor, rejectStadiumSponsor,
    toggleMembershipTier, buyModularUpgrade,
  };

}
