import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Benign edge function errors that should not be logged/reported:
// - 429: cooldown ativo (rate limit esperado)
// - 504/IDLE_TIMEOUT: operação longa que continua no servidor
const isBenignEdgeError = (err: any): boolean => {
  const status = err?.context?.status;
  const msg = (err?.message || String(err || '')).toLowerCase();
  if (status === 429 || status === 504) return true;
  return (
    msg.includes('429') ||
    msg.includes('504') ||
    msg.includes('cooldown') ||
    msg.includes('idle_timeout') ||
    msg.includes('idle timeout')
  );
};

const safeInvoke = async (name: string, options?: any) => {
  try {
    const { error } = await supabase.functions.invoke(name, options);
    if (error && !isBenignEdgeError(error)) {
      console.warn(`[AutoSim] ${name}:`, error.message || error);
    }
  } catch (err) {
    if (!isBenignEdgeError(err)) {
      console.warn(`[AutoSim] ${name} threw:`, err);
    }
  }
};

export function useAutoSimulator(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const runSim = async () => {
      console.log('[AutoSim] Executando simulação de segurança...');
      await Promise.allSettled([
        safeInvoke('world-match-simulator'),
        safeInvoke('national-cup-manager', { body: { action: 'advance_phase' } }),
        safeInvoke('process-transfer', { body: { action: 'resolve-decisions' } }),
        supabase.rpc('process_all_uniform_sales').then(() => {}, () => {}),
        safeInvoke('legacy-auto-sim'),
      ]);
    };

    runSim();

    // Verificação agressiva a cada 30 segundos para o sistema antigo de 5min
    const interval = setInterval(runSim, 30000);

    return () => clearInterval(interval);
  }, [userId]);
}

export function triggerAutoSim() {
  // Centralized trigger for all simulation engines
  Promise.allSettled([
    safeInvoke('world-match-simulator'),
    safeInvoke('legacy-auto-sim'),
  ]).then(() => {
    console.log('[AutoSim] Simulação global disparada manualmente.');
    // Notify UI that league data might have changed
    window.dispatchEvent(new CustomEvent('league_match_updated'));
    window.dispatchEvent(new CustomEvent('flm:match-finalized'));
  });
}
