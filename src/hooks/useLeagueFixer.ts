import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useLeagueFixer(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const runFix = async () => {
      console.log('LeagueFixer: Verificando integridade da liga para o usuário:', userId);
      
      try {
        const { data, error } = await supabase.rpc('sync_league_state', { _user_id: userId });
        
        if (error) {
          console.error('LeagueFixer: Erro ao sincronizar liga:', error);
          return;
        }

        if (data) {
          const result = data as any;
          console.log('LeagueFixer: Sincronização concluída.', result);
          if (result.matches === 0 && result.league_id) {
            console.log('LeagueFixer: Liga detectada sem jogos. Forçando correção...');
            const { data: fixData, error: fixError } = await supabase.rpc('fix_league_forcefully', { p_league_id: result.league_id });
            if (fixError) console.error('LeagueFixer: Erro na correção forçada:', fixError);
            else console.log('LeagueFixer: Resultado da correção:', fixData);
          } else if (result.matches > 0) {
            console.log(`LeagueFixer: Liga OK. Total de jogos: ${result.matches}`);
          }
        }
      } catch (e) {
        console.error('LeagueFixer: Exceção na verificação:', e);
      }
    };

    runFix();
  }, [userId]);
}
