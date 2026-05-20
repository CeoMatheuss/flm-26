import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAutoSimulator(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const runSim = async () => {
      console.log('[AutoSim] Executando simulação de segurança...');
      try {
        await Promise.all([
          supabase.functions.invoke('world-match-simulator'),
          supabase.functions.invoke('national-cup-manager', { body: { action: 'advance_phase' } }),
          supabase.functions.invoke('process-transfer', { body: { action: 'resolve-decisions' } }),
          supabase.rpc('process_all_uniform_sales'),
          supabase.functions.invoke('legacy-auto-sim'),
        ]);
      } catch (err) {
        console.error('[AutoSim] Erro na simulação:', err);
      }
    };

    runSim();

    // Verificação agressiva a cada 30 segundos para o sistema antigo de 5min
    const interval = setInterval(runSim, 30000);

    return () => clearInterval(interval);
  }, [userId]);
}

export function triggerAutoSim() {
  // Centralized trigger for all simulation engines
  Promise.all([
    supabase.functions.invoke('world-match-simulator'),
    supabase.functions.invoke('legacy-auto-sim')
  ]).then(() => {
    console.log('[AutoSim] Simulação global disparada manualmente.');
    // Notify UI that league data might have changed
    window.dispatchEvent(new CustomEvent('league_match_updated'));
    window.dispatchEvent(new CustomEvent('flm:match-finalized'));
  });
}
