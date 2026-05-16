import { useState, useCallback, useEffect } from 'react';
import {
  Infrastructure, defaultInfrastructure, getUpgradeCost, getAcademyUpgradeCost,
  getStadiumUpgradeCost, getStadiumCapacity, getTrainingCenterUpgradeCost,
  getPhysioUpgradeCost,
  YouthProspect, SeasonData, defaultSeason,
  computeEvolutionStatus, computeYouthTag, getPotentialTier,
  getYouthMinOverall, getYouthMaxOverall, getYouthWeeklyPlayers,
  getYouthTierByMonthlyCost, getYouthInvestmentInfo, potentialTierInfo,
} from '@/types/infrastructure';
import { CTRooms, defaultCTRooms, getCTRoomUpgradeCost } from '@/types/ctRooms';
import { Achievement } from '@/types/achievements';
import { MatchReport } from '@/types/matchReport';
import { PromotionDecision } from '@/types/promotion';
import { simulateYouthMatch, formatYouthMatchNews, YouthMatchReport } from '@/utils/youthMatchSimulator';
import { rollYouthEvent } from '@/utils/youthEvents';
import { supabase } from '@/integrations/supabase/client';
import { generatePlayer } from '@/utils/playerGenerator';
import { toast } from 'sonner';
import { FinanceType, FinanceCategory } from '@/types/finance';


export function useInfraState(initialState: any, userId?: string, isPremium: boolean = false) {
  const [infrastructure, setInfrastructure] = useState<Infrastructure>(initialState?.infrastructure ?? defaultInfrastructure);
  const [lastYouthGenAt, setLastYouthGenAt] = useState<string>(initialState?.lastYouthGenAt ?? new Date().toISOString());
  const [youthProspects, setYouthProspects] = useState<YouthProspect[]>(() => {
    const list: YouthProspect[] = initialState?.youthProspects ?? [];
    return list.map(p => ({
      ...p,
      potentialTier: p.potentialTier ?? getPotentialTier(p.potential ?? 60, p.overall ?? 40),
      evolutionStatus: p.evolutionStatus ?? 'estavel',
      youthTag: p.youthTag ?? computeYouthTag(p as YouthProspect),
      highlightStreak: p.highlightStreak ?? 0,
      stagnationCycles: p.stagnationCycles ?? 0,
      injuredCycles: p.injuredCycles ?? 0,
    }));
  });
  const [youthInvestment, setYouthInvestment] = useState(initialState?.youthInvestment ?? 0);
  const [trainingInvestment, setTrainingInvestment] = useState<number>(
    (initialState as { trainingInvestment?: number } | undefined)?.trainingInvestment ?? 0
  );
  const [season, setSeason] = useState<SeasonData>(initialState?.season ?? defaultSeason);
  const [ctRooms, setCTRooms] = useState<CTRooms>(initialState?.ctRooms ?? defaultCTRooms);
  const [achievements, setAchievements] = useState<Achievement[]>(initialState?.achievements ?? []);
  const [lastMatchReport, setLastMatchReport] = useState<MatchReport | undefined>(initialState?.lastMatchReport);
  const [youthPromotedCount, setYouthPromotedCount] = useState(initialState?.youthPromotedCount ?? 0);
  const [lastYouthMatchReport, setLastYouthMatchReport] = useState<YouthMatchReport | null>(null);

  const upgradeFacility = useCallback((
    facility: 'trainingCenter' | 'youthAcademy' | 'stadium' | 'physiotherapy',
    clubBudget: number,
    clubName: string,
    addFinance: (type: FinanceType, cat: FinanceCategory, amount: number, desc: string) => void,
    deductBudget: (cost: number) => void,
  ) => {

    let cost: number;
    const label = facility === 'trainingCenter' ? 'Centro de Treinamento' : facility === 'youthAcademy' ? 'Academia' : facility === 'physiotherapy' ? 'Fisioterapia' : 'Estádio';

    if (facility === 'stadium') cost = getStadiumUpgradeCost(infrastructure.stadium.level);
    else if (facility === 'youthAcademy') cost = getAcademyUpgradeCost(infrastructure.youthAcademy.level);
    else if (facility === 'trainingCenter') cost = getTrainingCenterUpgradeCost(infrastructure.trainingCenter.level);
    else cost = getPhysioUpgradeCost(infrastructure.physiotherapy.level);

    // 🛡️ Bloqueio Anti-Exploit/Gasto Indevido: Verificamos o status da obra ANTES de cobrar
    const existingPending = infrastructure[facility].upgradeCompletesAt;
    if (existingPending && new Date(existingPending).getTime() > Date.now()) {
      toast.error(`🏗️ Já existe uma obra em andamento em ${label}!`);
      return;
    }

    // Hard cap on physiotherapy at level 20
    if (facility === 'physiotherapy' && infrastructure.physiotherapy.level >= 20) {
      toast.error('🏥 Fisioterapia já está no nível máximo (20)!');
      return;
    }

    if (clubBudget < cost) {
      toast.error(`💸 Orçamento insuficiente para upgrade!`);
      return;
    }
    const newLevel = infrastructure[facility].level + 1;

    // Cobramos APENAS após todas as verificações passarem
    deductBudget(cost);
    addFinance('despesa', 'Infraestrutura', cost, `Upgrade: ${label} → Nv${newLevel}`);

    // Não-Premium: TODAS as obras demoram 24h
    if (!isPremium) {
      const completesAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      setInfrastructure(prev => ({
        ...prev,
        [facility]: { ...prev[facility], upgradeCompletesAt: completesAt },
      }));
      toast.success(`🏗️ Obra iniciada em ${label}!`, {
        description: `Conclui em 24h. ⭐ Premium libera obras instantâneas.`,
      });
      if (userId) {
        supabase.from('newspaper_entries').insert([{
          user_id: userId,
          text: `🏗️ ${clubName} iniciou expansão de ${label} — obra prevista para 24h.`,
          category: 'EVOLUÇÃO', is_event: false,
        }]).then(() => {});
      }
      return;
    }

    // Premium (ou acelerado por item da loja): instantâneo
    // Itens de acelerador (ct_upgrade, stadium_upgrade) também podem triggerar isso.
    setInfrastructure(prev => ({
      ...prev,
      [facility]: { ...prev[facility], level: prev[facility].level + 1, upgradeCompletesAt: undefined },
    }));

    const isStadium = facility === 'stadium';
    const desc = isStadium
      ? `${label} expandido para nível ${newLevel}! Capacidade: ${getStadiumCapacity(newLevel).toLocaleString()} lugares.`
      : `${label} atualizado para nível ${newLevel}!`;

    toast.success(`⭐ ${label} Nv.${newLevel} (Premium — instantâneo)`, { description: desc });
    console.log('[Persist] infrastructure upgrade', { facility, newLevel });

    if (userId) {
      const facilityEmoji = facility === 'trainingCenter' ? '⚽' : facility === 'youthAcademy' ? '🎓' : facility === 'physiotherapy' ? '🏥' : '🏟️';
      const fanReactions = ['"Era hora de investir!"', '"Com isso vamos longe!"', '"Infraestrutura de primeiro mundo!"', '"A diretoria está de parabéns!"'];
      const fanComment = fanReactions[Math.floor(Math.random() * fanReactions.length)];
      const newsText = `${facilityEmoji} ${clubName}: ${desc} — Torcida reage: ${fanComment}`;
      supabase.from('newspaper_entries').insert([{ user_id: userId, text: newsText, category: 'EVOLUÇÃO', is_event: true }]).then(() => {});
    }
  }, [infrastructure, userId, isPremium]);

  // Tick: completa qualquer obra pendente (todas as 4 instalações) após o tempo decorrer.
  // Premium ativo conclui instantaneamente.
  useEffect(() => {
    const facilityList: Array<'trainingCenter' | 'youthAcademy' | 'stadium' | 'physiotherapy'> = [
      'trainingCenter', 'youthAcademy', 'stadium', 'physiotherapy',
    ];
    const labelOf: Record<string, string> = {
      trainingCenter: 'Centro de Treinamento',
      youthAcademy: 'Academia',
      stadium: 'Estádio',
      physiotherapy: 'Fisioterapia',
    };
    const emojiOf: Record<string, string> = {
      trainingCenter: '⚽', youthAcademy: '🎓', stadium: '🏟️', physiotherapy: '🏥',
    };

    const completePending = (instant: boolean) => {
      facilityList.forEach((f) => {
        const completesAt = infrastructure[f].upgradeCompletesAt;
        if (!completesAt) return;
        const ts = new Date(completesAt).getTime();
        if (!instant && Date.now() < ts) return;

        setInfrastructure(prev => {
          if (!prev[f].upgradeCompletesAt) return prev;
          const newLevel = prev[f].level + 1;
          const label = labelOf[f];
          const emoji = emojiOf[f];
          if (instant) {
            toast.success(`⭐ ${label} Nv.${newLevel} (Premium — instantâneo)`);
          } else {
            toast.success(`${emoji} Obra concluída!`, { description: `${label} agora é nível ${newLevel}.` });
          }
          if (userId) {
            supabase.from('newspaper_entries').insert([{
              user_id: userId,
              text: instant
                ? `⭐ Premium: obra em ${label} concluída instantaneamente — Nv.${newLevel}.`
                : `${emoji} Obra concluída! ${label} elevado(a) ao nível ${newLevel}.`,
              category: 'EVOLUÇÃO', is_event: true,
            }]).then(() => {});
          }
          return {
            ...prev,
            [f]: { ...prev[f], level: newLevel, upgradeCompletesAt: undefined },
          };
        });
      });
    };

    completePending(isPremium);
    if (isPremium) return;
    const interval = setInterval(() => completePending(false), 60_000);
    return () => clearInterval(interval);
  }, [
    isPremium, userId,
    infrastructure.trainingCenter.upgradeCompletesAt,
    infrastructure.youthAcademy.upgradeCompletesAt,
    infrastructure.stadium.upgradeCompletesAt,
    infrastructure.physiotherapy.upgradeCompletesAt,
  ]);

  // V5 — Geração automática da Base: 1 ciclo = 7 dias (Semanas).
  // Agora utiliza o Edge Function centralizado para garantir integridade e sincronização.
  useEffect(() => {
    if (!userId || infrastructure.youthAcademy.level < 1) return;
    
    const checkYouthGen = async () => {
      const now = Date.now();
      const lastGen = new Date(lastYouthGenAt).getTime();
      const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
      
      if (now - lastGen >= ONE_WEEK) {
        try {
          const { data, error } = await supabase.functions.invoke('process-youth-generation');
          
          if (error) {
            console.error('[Base] Erro ao processar geração:', error);
            return;
          }

          if (data?.success && data?.prospect) {
            const p = data.prospect;
            const newProspect: YouthProspect = {
              id: p.id,
              name: p.name,
              age: p.age,
              position: p.position as any,
              overall: p.overall,
              potential: p.potential,
              attributes: p.attributes as any,
              marketValue: Number(p.market_value),
              personality: p.personality as any,
              dominantFoot: p.dominant_foot,
              rarity: p.rarity,
              nationality: p.nationality,
              morale: p.morale || 100,
              monthsInAcademy: p.months_in_academy || 0,
              potentialTier: getPotentialTier(p.potential, p.overall),
              evolutionStatus: 'evoluindo',
              height: p.height,
              weight: p.weight,
              tacticalIQ: p.tactical_iq,
              interception: p.interception,
              staminaStat: p.stamina_stat,
              energy: p.energy || 100,
              fatigue: p.fatigue || 0,
              contractStatus: p.contract_status || 'base',
              evolutionHistory: p.evolution_history ? JSON.parse(typeof p.evolution_history === 'string' ? p.evolution_history : JSON.stringify(p.evolution_history)) : [],
              salary: 500,
              stamina: 100,
              goals: 0,
              assists: 0,
              contract: 3,
              gamesPlayed: 0,
              trainingProgress: 0
            };

            setYouthProspects(prev => [...prev, newProspect]);
            setLastYouthGenAt(new Date().toISOString());
            
            toast.success(`🌟 Novo junior chegou: ${p.name}!`, {
              description: `${p.rarity === 'Comum' ? 'Um novo talento' : `Um talento ${p.rarity}`} surgiu na academia.`,
              icon: '🎓'
            });
          }
        } catch (err) {
          console.error('[Base] Exception na geração:', err);
        }
      }
    };
    
    const interval = setInterval(checkYouthGen, 300_000); // Check every 5 minutes
    checkYouthGen();
    return () => clearInterval(interval);
  }, [userId, lastYouthGenAt, infrastructure.youthAcademy.level]);

  const chargeYouthInvestment = useCallback((
    clubBudget: number,
    addFinance: (type: FinanceType, cat: FinanceCategory, amount: number, desc: string) => void,
    deductBudget: (cost: number) => void,
  ) => {

    if (youthInvestment <= 0) return false;
    const tierInfo = getYouthTierByMonthlyCost(youthInvestment);
    const weeklyCost = tierInfo.weeklyCost;
    
    if (clubBudget < weeklyCost) {
      toast.error('Orçamento insuficiente para manter a Academia de Base!');
      return false;
    }
    deductBudget(weeklyCost);
    addFinance('despesa', 'Base', weeklyCost, `Custo Semanal Academia (${tierInfo.label})`);
    return true;
  }, [youthInvestment]);

  const chargeTrainingInvestment = useCallback((
    clubBudget: number,
    addFinance: (type: FinanceType, cat: FinanceCategory, amount: number, desc: string) => void,
    deductBudget: (cost: number) => void,
  ) => {

    if (trainingInvestment <= 0) return false;
    if (clubBudget < trainingInvestment) {
      toast.error('Orçamento insuficiente para o investimento mensal em treino!');
      // Auto-rebaixa para 0 para evitar loop
      setTrainingInvestment(0);
      return false;
    }
    deductBudget(trainingInvestment);
    addFinance('despesa', 'CT', trainingInvestment, 'Investimento mensal em Treino');
    toast.success(`💰 Investimento mensal em treino debitado: R$ ${trainingInvestment.toLocaleString('pt-BR')}`);
    return true;
  }, [trainingInvestment]);

  /** Run end-of-cycle: simulate youth match + roll dynamic event. Updates prospects in place. */
  const processYouthCycle = useCallback((clubName: string) => {
    setYouthProspects(prev => {
      // Simulate match
      const { report, updatedProspects } = simulateYouthMatch(prev);
      setLastYouthMatchReport(report);

      // Decrement stagnation cycles
      let next: YouthProspect[] = updatedProspects.map(p => ({
        ...p,
        stagnationCycles: Math.max(0, (p.stagnationCycles ?? 0) - 1),
        monthsInAcademy: (p.monthsInAcademy ?? 0) + 1,
      }));

      // Roll dynamic event
      const { event, updatedProspects: afterEvent } = rollYouthEvent(next, infrastructure.youthAcademy.level);
      next = afterEvent;

      // Recompute derived fields and process evolution
      next = next.map(p => {
        let currentOverall = p.overall;
        let currentProgress = p.trainingProgress ?? 0;
        const evolutionStatus = computeEvolutionStatus(p);

        // Process evolution: every 100 points = +1 OVR
        // Influenced by Academy Level (faster progress)
        const academyBonus = Math.floor(infrastructure.youthAcademy.level / 10);
        if (evolutionStatus === 'evoluindo') {
          currentProgress += 5 + academyBonus;
        }

        if (currentProgress >= 100) {
          if (currentOverall < p.potential) {
            currentOverall += 1;
            toast.info(`📈 ${p.name} evoluiu para OVR ${currentOverall}!`);
          }
          currentProgress -= 100;
        }

        const potential = p.potential;
        const age = p.age;
        
        // Logic for Promotion Ready
        const isReady = (currentOverall >= 62) || (potential >= 88 && age >= 17 && currentOverall >= 55) || (evolutionStatus === 'evoluindo' && currentOverall >= 58 && Math.random() < 0.3);

        return {
          ...p,
          overall: currentOverall,
          trainingProgress: currentProgress,
          potentialTier: getPotentialTier(potential, currentOverall),
          evolutionStatus,
          youthTag: computeYouthTag(p),
          promotionReady: p.promotionReady || isReady,
        };
      });


      // News entries
      if (userId) {
        supabase.from('newspaper_entries').insert([{
          user_id: userId,
          text: formatYouthMatchNews(clubName, report),
          category: 'BASE',
          is_event: false,
        }]).then(() => {});

        if (event) {
          supabase.from('newspaper_entries').insert([{
            user_id: userId,
            text: `${event.emoji} BASE — ${event.title}: ${event.description}`,
            category: 'BASE',
            is_event: true,
          }]).then(() => {});
          toast.success(`${event.emoji} ${event.title}`, { description: event.description });
        }
      }

      return next;
    });
  }, [infrastructure.youthAcademy.level, userId]);

  const promoteYouth = useCallback((youthId: string, addPlayerToClub: (p: any) => void) => {
    setYouthProspects(prev => {
      const prospect = prev.find(p => p.id === youthId);
      if (!prospect) return prev;

      if (prospect.age < 18 && prospect.overall < 60) {
        toast.warning('⚠️ Promovido muito cedo', {
          description: `${prospect.name} pode ter dificuldade no profissional. Continue acompanhando.`,
        });
      }
      
      const player = {
        id: prospect.id, name: prospect.name, position: prospect.position,
        overall: prospect.overall, attributes: prospect.attributes,
        age: prospect.age, salary: prospect.salary,
        stamina: prospect.stamina, morale: 90, goals: 0, assists: 0,
        contract: 3, gamesPlayed: 0, trainingProgress: 0, personality: prospect.personality,
      };
      
      addPlayerToClub(player);
      setYouthPromotedCount((c: number) => c + 1);
      toast.success(`${prospect.name} promovido ao time principal!`);
      
      return prev.filter(p => p.id !== youthId);
    });
  }, []);

  const handlePromotionDecision = useCallback((
    prospectId: string, 
    decision: PromotionDecision, 
    contractDetails?: any,
    addPlayerToClub?: (p: any) => void,
    addFinance?: (type: 'receita' | 'despesa', cat: string, amount: number, desc: string) => void,
    addBudget?: (amount: number) => void
  ) => {
    setYouthProspects(prev => {
      const prospect = prev.find(p => p.id === prospectId);
      if (!prospect) return prev;

      if (decision === 'promoted' && addPlayerToClub) {
        const player = {
          id: prospect.id, 
          name: prospect.name, 
          position: prospect.position,
          overall: prospect.overall, 
          attributes: prospect.attributes,
          age: prospect.age, 
          salary: contractDetails?.salary ?? prospect.salary,
          stamina: prospect.stamina, 
          morale: 100, // Very happy to be promoted
          goals: 0, 
          assists: 0,
          contract: contractDetails?.years ?? 3, 
          gamesPlayed: 0, 
          trainingProgress: 0, 
          personality: prospect.personality,
          isYouth: true,
          squadRole: contractDetails?.squadRole ?? 'promessa',
          marketValue: prospect.overall * 100000, // Value increases after turning pro
          potential: prospect.potential,
        };

        // Automatic Lineup Optimization will be triggered by useGame's useEffect
        addPlayerToClub(player);
        setYouthPromotedCount((c: number) => c + 1);
        toast.success(`🎉 ${prospect.name} agora é profissional!`, {
          description: `Contrato assinado por ${player.contract} anos.`
        });
        
        if (userId) {
          supabase.from('newspaper_entries').insert([{
            user_id: userId,
            text: `📝 OFICIAL: O jovem ${prospect.name} assinou seu primeiro contrato profissional com o clube!`,
            category: 'BASE', is_event: true,
          }]).then(() => {});
        }
      } else if (decision === 'released') {
        toast.info(`${prospect.name} foi dispensado da academia.`);
      } else if (decision === 'stayed') {
        // No action needed, stays in base but we might want to unset promotionReady if we want to stop notifying
        // Actually, we'll keep it in base.
      } else if (decision === 'observing') {
        // Stays in base
      }

      return prev.filter(p => p.id !== prospectId || (decision !== 'promoted' && decision !== 'released'));
    });
  }, [userId]);

  const sellYouth = useCallback((
    youthId: string,
    addFinance: (type: 'receita' | 'despesa', cat: string, amount: number, desc: string) => void,
    addBudget: (amount: number) => void,
  ) => {
    // 🛡️ Anti-Exploit: Usamos o callback do estado para garantir atomicidade
    setYouthProspects(prev => {
      const prospect = prev.find(p => p.id === youthId);
      if (!prospect) return prev;
      
      const value = prospect.overall * 50_000;
      addBudget(value);
      addFinance('receita', 'Venda Base', value, `Venda jovem: ${prospect.name}`);
      toast.success(`${prospect.name} vendido por R$ ${(value / 1000).toFixed(0)}k! 💰`);
      return prev.filter(p => p.id !== youthId);
    });
  }, []); // youthProspects removed from deps to avoid stale closures in some patterns, but here we use functional update so it's fine.

  const enrollCopinha = useCallback((clubName: string, updateClubProfile: (fn: (prev: any) => any) => void) => {
    const eligible = youthProspects.filter(p => p.age <= 20 && (p.injuredCycles ?? 0) === 0);
    if (eligible.length < 5) {
      toast.error('Você precisa de pelo menos 5 jovens elegíveis (≤20 anos) para inscrever na Copinha.');
      return;
    }

    // Simulate 5 knockout matches
    const ourAvg = eligible.reduce((s, p) => s + p.overall, 0) / eligible.length;
    let wins = 0;
    for (let r = 0; r < 5; r++) {
      const rivalAvg = 50 + Math.random() * 20 + r * 2; // gets harder
      const winChance = 0.5 + (ourAvg - rivalAvg) * 0.02;
      if (Math.random() < winChance) wins++;
      else break;
    }

    const won = wins === 5;
    const finalist = wins === 4;

    let boost = 0;
    if (won) boost = 15;
    else if (finalist) boost = 8;
    else boost = Math.max(2, wins);

    setYouthProspects(prev => prev.map(p => {
      if (p.age > 20) return p;
      const newOvr = Math.min(p.potential, p.overall + boost);
      const becomesRevelation = wins >= 3 && Math.random() < 0.3;
      return {
        ...p,
        overall: newOvr,
        highlightStreak: becomesRevelation ? 3 : (p.highlightStreak ?? 0),
        youthTag: becomesRevelation ? 'revelacao' : p.youthTag,
        morale: Math.min(100, (p.morale ?? 70) + (won ? 15 : finalist ? 10 : 5)),
      };
    }));

    if (won) {
      updateClubProfile(prev => ({
        ...prev,
        trophies: [...(prev.trophies ?? []), {
          id: crypto.randomUUID(),
          name: 'Copinha Sub-20',
          season: season.currentSeason,
          year: new Date().getFullYear(),
          competition: 'Copinha',
        }],
      }));
      toast.success('🏆 CAMPEÕES DA COPINHA!', { description: `Toda a base ganhou +${boost} OVR de boost!` });
    } else if (finalist) {
      toast.success('🥈 Vice-campeões da Copinha!', { description: `Base ganhou +${boost} OVR de boost.` });
    } else {
      toast.info(`Eliminados na ${wins + 1}ª fase da Copinha`, { description: `Base ganhou +${boost} OVR de experiência.` });
    }

    if (userId) {
      const text = won
        ? `🏆 ${clubName} CAMPEÃO DA COPINHA! Toda a base ganhou destaque nacional.`
        : finalist
          ? `🥈 ${clubName} foi vice-campeão da Copinha após 4 vitórias seguidas.`
          : `📰 ${clubName} caiu na ${wins + 1}ª fase da Copinha. Base ganhou experiência.`;
      supabase.from('newspaper_entries').insert([{
        user_id: userId, text, category: 'BASE', is_event: true,
      }]).then(() => {});
    }
  }, [youthProspects, season.currentSeason, userId]);

  const upgradeCTRoom = useCallback((
    room: keyof CTRooms,
    clubBudget: number,
    addFinance: (type: 'receita' | 'despesa', cat: string, amount: number, desc: string) => void,
    deductBudget: (cost: number) => void,
  ) => {
    const cost = getCTRoomUpgradeCost(room, ctRooms[room]);
    if (clubBudget < cost) { toast.error('Orçamento insuficiente!'); return; }
    const roomNames: Record<string, string> = { gym: 'Musculação', pool: 'Piscina', cryotherapy: 'Crioterapia', videoRoom: 'Sala de Vídeo', nutrition: 'Nutrição', meditation: 'Meditação' };
    deductBudget(cost);
    setCTRooms(prev => ({ ...prev, [room]: prev[room] + 1 }));
    addFinance('despesa', 'CT', cost, `Sala: ${roomNames[room]} → Nv.${ctRooms[room] + 1}`);
    toast.success(`${roomNames[room]} melhorada para nível ${ctRooms[room] + 1}!`);
  }, [ctRooms]);

  return {
    infrastructure, setInfrastructure, youthProspects, setYouthProspects,
    lastYouthGenAt, setLastYouthGenAt,
    youthInvestment, setYouthInvestment,
    trainingInvestment, setTrainingInvestment,
    season, setSeason,
    ctRooms, setCTRooms, achievements, setAchievements,
    lastMatchReport, setLastMatchReport, youthPromotedCount, setYouthPromotedCount,
    lastYouthMatchReport, setLastYouthMatchReport,
    upgradeFacility, promoteYouth, sellYouth, enrollCopinha,
    processYouthCycle, upgradeCTRoom, chargeYouthInvestment, chargeTrainingInvestment,
    handlePromotionDecision,
  };
}
