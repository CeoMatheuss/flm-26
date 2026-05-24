import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  ScoutV3, 
  ScoutMarketPool, 
  ScoutMissionV3, 
  ScoutReportV3 
} from '@/types/scoutingV3';
import { toast } from 'sonner';
import { addYears } from 'date-fns';

export function useScouting(userId: string) {
  const [myScouts, setMyScouts] = useState<ScoutV3[]>([]);
  const [marketPool, setMarketPool] = useState<ScoutMarketPool[]>([]);
  const [missions, setMissions] = useState<ScoutMissionV3[]>([]);
  const [reports, setReports] = useState<ScoutReportV3[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [scoutsRes, marketRes, missionsRes, reportsRes] = await Promise.all([
        supabase.from('scouts').select('*').eq('user_id', userId),
        supabase.rpc('get_scout_market'),
        supabase.from('scout_missions').select('*').eq('user_id', userId).eq('status', 'em_andamento'),
        supabase.from('scout_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      if (scoutsRes.data) setMyScouts(scoutsRes.data as unknown as ScoutV3[]);
      if (marketRes.data) setMarketPool(marketRes.data as unknown as ScoutMarketPool[]);
      if (missionsRes.data) setMissions(missionsRes.data as unknown as ScoutMissionV3[]);
      if (reportsRes.data) setReports(reportsRes.data as unknown as ScoutReportV3[]);
    } catch (err) {
      console.error('[Scouting] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
    
    // Setup Realtime subscriptions
    const scoutsChannel = supabase.channel('scouting-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scouts' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scout_missions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scout_reports' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scout_market_pool' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(scoutsChannel);
    };
  }, [userId, fetchData]);

  const handleHire = async (scout: ScoutMarketPool) => {
    if (myScouts.length >= 5) {
      toast.error('Limite de olheiros atingido (Máx: 5)');
      return false;
    }

    const contractEnd = addYears(new Date(), 5).toISOString();

    const { error } = await supabase.from('scouts').insert([{
      user_id: userId,
      name: scout.name,
      country: scout.country,
      level: scout.level as any,
      specialization: scout.specialization,
      potential_evaluation: scout.potential_evaluation,
      technical_evaluation: scout.technical_evaluation,
      analysis_speed: scout.analysis_speed,
      youth_discovery: scout.youth_discovery,
      reputation: scout.reputation,
      salary: scout.salary,
      preferred_region: scout.preferred_region,
      efficiency: (scout.potential_evaluation + scout.technical_evaluation) / 200,
      contract_start: new Date().toISOString(),
      contract_end: contractEnd,
      seasons_remaining: 5,
      is_busy: false,
      is_free_agent: false
    }]);

    if (error) {
      toast.error('Erro ao contratar olheiro');
      return false;
    } else {
      await supabase.from('scout_market_pool').delete().eq('id', scout.id);
      toast.success(`${scout.name} contratado com sucesso!`);
      return true;
    }
  };

  const fireScout = async (scoutId: string) => {
    const { error } = await supabase.from('scouts').delete().eq('id', scoutId);
    if (error) {
      toast.error('Erro ao demitir olheiro');
      return false;
    }
    toast.success('Olheiro demitido.');
    return true;
  };

  return {
    myScouts,
    marketPool,
    missions,
    reports,
    loading,
    refresh: fetchData,
    handleHire,
    fireScout
  };
}
