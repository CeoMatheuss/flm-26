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

    // Sincronização em tempo real via Realtime do Supabase
    // Isso garante que se o servidor mudar algo no banco, a interface reflete na hora sem F5
    const channel = supabase.channel(`sync-${userId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'game_saves', 
        filter: `user_id=eq.${userId}` 
      }, (payload) => {
        console.log('[Realtime] Mudança detectada no save do servidor:', payload);
        // Despacha evento para Index.tsx recarregar o estado
        window.dispatchEvent(new CustomEvent('flm:external-data-update', { detail: payload.new }));
      })
      .subscribe();

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

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

export function triggerAutoSim() {
  supabase.functions.invoke('world-match-simulator').then(() => {
    console.log('[AutoSim] Simulação disparada manualmente.');
  });
}