import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAutoSimulator(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    // Trigger simulation every 2 minutes if the tab is open
    const interval = setInterval(async () => {
      console.log('[AutoSim] Verificando partidas pendentes...');
      try {
        await supabase.functions.invoke('world-match-simulator');
      } catch (err) {
        console.error('[AutoSim] Erro ao invocar simulador:', err);
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