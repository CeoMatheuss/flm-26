import { useState, useCallback } from 'react';
import {
  Infrastructure, defaultInfrastructure, getUpgradeCost, getAcademyUpgradeCost,
  getStadiumUpgradeCost, getStadiumCapacity, YouthProspect, SeasonData, defaultSeason,
} from '@/types/infrastructure';
import { CTRooms, defaultCTRooms, getCTRoomUpgradeCost } from '@/types/ctRooms';
import { Achievement } from '@/types/achievements';
import { MatchReport } from '@/types/matchReport';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useInfraState(initialState: any, userId?: string) {
  const [infrastructure, setInfrastructure] = useState<Infrastructure>(initialState?.infrastructure ?? defaultInfrastructure);
  const [youthProspects, setYouthProspects] = useState<YouthProspect[]>(initialState?.youthProspects ?? []);
  const [youthInvestment, setYouthInvestment] = useState(initialState?.youthInvestment ?? 100000);
  const [season, setSeason] = useState<SeasonData>(initialState?.season ?? defaultSeason);
  const [ctRooms, setCTRooms] = useState<CTRooms>(initialState?.ctRooms ?? defaultCTRooms);
  const [achievements, setAchievements] = useState<Achievement[]>(initialState?.achievements ?? []);
  const [lastMatchReport, setLastMatchReport] = useState<MatchReport | undefined>(initialState?.lastMatchReport);
  const [youthPromotedCount, setYouthPromotedCount] = useState(initialState?.youthPromotedCount ?? 0);

  const upgradeFacility = useCallback((
    facility: 'trainingCenter' | 'youthAcademy' | 'stadium' | 'physiotherapy',
    clubBudget: number,
    clubName: string,
    addFinance: (type: 'receita' | 'despesa', cat: string, amount: number, desc: string) => void,
    deductBudget: (cost: number) => void,
  ) => {
    let cost: number;
    if (facility === 'stadium') cost = getStadiumUpgradeCost(infrastructure[facility].level);
    else if (facility === 'youthAcademy') cost = getAcademyUpgradeCost(infrastructure[facility].level);
    else cost = getUpgradeCost(infrastructure[facility].level);

    if (clubBudget < cost) return;
    const label = facility === 'trainingCenter' ? 'Centro de Treinamento' : facility === 'youthAcademy' ? 'Academia' : facility === 'physiotherapy' ? 'Fisioterapia' : 'Estádio';
    const newLevel = infrastructure[facility].level + 1;

    deductBudget(cost);
    addFinance('despesa', 'Infraestrutura', cost, `Upgrade: ${label} → Nv${newLevel}`);
    setInfrastructure(prev => ({
      ...prev,
      [facility]: { ...prev[facility], level: prev[facility].level + 1 },
    }));

    const isStadium = facility === 'stadium';
    const desc = isStadium
      ? `${label} expandido para nível ${newLevel}! Capacidade: ${getStadiumCapacity(newLevel).toLocaleString()} lugares.`
      : `${label} atualizado para nível ${newLevel}!`;

    if (userId) {
      const facilityEmoji = facility === 'trainingCenter' ? '⚽' : facility === 'youthAcademy' ? '🎓' : facility === 'physiotherapy' ? '🏥' : '🏟️';
      const fanReactions = ['"Era hora de investir!"', '"Com isso vamos longe!"', '"Infraestrutura de primeiro mundo!"', '"A diretoria está de parabéns!"'];
      const fanComment = fanReactions[Math.floor(Math.random() * fanReactions.length)];
      const newsText = `${facilityEmoji} ${clubName}: ${desc} — Torcida reage: ${fanComment}`;
      supabase.from('newspaper_entries').insert([{ user_id: userId, text: newsText, category: 'EVOLUÇÃO', is_event: true }]).then(() => {});
    }
  }, [infrastructure, userId]);

  const chargeYouthInvestment = useCallback((
    clubBudget: number,
    addFinance: (type: 'receita' | 'despesa', cat: string, amount: number, desc: string) => void,
    deductBudget: (cost: number) => void,
  ) => {
    if (youthInvestment <= 0) return false;
    if (clubBudget < youthInvestment) {
      toast.error('Orçamento insuficiente para investimento na Base!');
      return false;
    }
    deductBudget(youthInvestment);
    addFinance('despesa', 'Base', youthInvestment, `Investimento Base (ciclo de geração)`);
    return true;
  }, [youthInvestment]);

  const promoteYouth = useCallback((youthId: string, addPlayerToClub: (p: any) => void) => {
    const prospect = youthProspects.find(p => p.id === youthId);
    if (!prospect) return;
    const player = {
      id: prospect.id, name: prospect.name, position: prospect.position,
      overall: prospect.overall, attributes: prospect.attributes,
      age: prospect.age, salary: prospect.salary,
      stamina: prospect.stamina, morale: 90, goals: 0, assists: 0,
      contract: 3, gamesPlayed: 0, trainingProgress: 0, personality: prospect.personality,
    };
    addPlayerToClub(player);
    setYouthProspects(prev => prev.filter(p => p.id !== youthId));
    toast.success(`${prospect.name} promovido ao time principal!`);
  }, [youthProspects]);

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
    youthInvestment, setYouthInvestment, season, setSeason,
    ctRooms, setCTRooms, achievements, setAchievements,
    lastMatchReport, setLastMatchReport, youthPromotedCount, setYouthPromotedCount,
    upgradeFacility, promoteYouth, upgradeCTRoom,
  };
}
