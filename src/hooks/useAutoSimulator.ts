import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAutoSimulator(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    // Trigger initial simulation
    const runSim = async () => {
      console.log('[AutoSim] Executando simulação inicial...');
      try {
        await Promise.all([
          supabase.functions.invoke('world-match-simulator'),
          supabase.functions.invoke('national-cup-manager', { body: { action: 'advance_phase' } }),
          supabase.functions.invoke('process-transfer', { body: { action: 'resolve-decisions' } })
        ]);
      } catch (err) {
        console.error('[AutoSim] Erro na simulação inicial:', err);
      }
    };
    runSim();

    // Trigger simulation every 2 minutes if the tab is open
    const interval = setInterval(async () => {
      console.log('[AutoSim] Verificando partidas pendentes...');
      try {
        await Promise.all([
          supabase.functions.invoke('world-match-simulator'),
          supabase.functions.invoke('national-cup-manager', { body: { action: 'advance_phase' } }),
          supabase.functions.invoke('process-transfer', { body: { action: 'resolve-decisions' } })
        ]);
      } catch (err) {
        console.error('[AutoSim] Erro ao invocar simuladores:', err);
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [userId]);
}

export function triggerAutoSim() {
  supabase.functions.invoke('world-match-simulator').then(() => {
    console.log('[AutoSim] Simulação disparada manualmente.');
  });
}
