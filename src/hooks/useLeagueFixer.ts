import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * useLeagueFixer Hook
 * Refactored to use the single-source-of-truth logic based on world_matches.
 */
export function useLeagueFixer(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const runFix = async () => {
      console.log('LeagueFixer: Executando simulação de rodadas atrasadas...');
      try {
        await supabase.rpc('simulate_overdue_matches');
      } catch (e) {
        console.error('LeagueFixer: Erro ao simular partidas:', e);
      }
    };

    runFix();
  }, [userId]);
}
