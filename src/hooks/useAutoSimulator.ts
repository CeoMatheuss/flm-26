import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAutoSimulator(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    // Trigger simulation every 2 minutes if the tab is open
    const interval = setInterval(async () => {
      console.log('[AutoSim] Verificando partidas pendentes...');
      try {
        await Promise.all([
          supabase.functions.invoke('world-match-simulator'),
          supabase.functions.invoke('national-cup-manager', { body: { action: 'reconcile_sync' } })
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