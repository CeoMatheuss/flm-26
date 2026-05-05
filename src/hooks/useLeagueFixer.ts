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
        await supabase.rpc('sync_league_integrity', { _user_id: userId });
        // After syncing, trigger one pass of the auto-simulator via Edge Function
        await supabase.functions.invoke('world-match-simulator', { body: { force_until_empty: true, max: 10 } });
      } catch (e) {
        console.error('LeagueFixer: Erro ao sincronizar liga:', e);
      }
    };

    runFix();
  }, [userId]);
}
