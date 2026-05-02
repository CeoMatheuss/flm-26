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
      console.log('LeagueFixer: Verificando integridade global (world_matches)...');
      
      try {
        // sync_league_integrity implements the new robust verification logic
        const { data, error } = await supabase.rpc('sync_league_integrity', { _user_id: userId });
        
        if (error) {
          console.error('LeagueFixer: Erro ao sincronizar integridade:', error);
          return;
        }

        const result = data as any;
        if (result?.action === 'regenerated') {
          console.log('LeagueFixer: Liga regenerada com sucesso baseada em MATCHES.');
        } else {
          console.log('LeagueFixer: Integridade validada. Status:', result?.action || 'ok');
        }
      } catch (e) {
        console.error('LeagueFixer: Exceção na verificação:', e);
      }
    };

    runFix();
  }, [userId]);
}
