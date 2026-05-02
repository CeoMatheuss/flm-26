import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useLeagueFixer(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const runFix = async () => {
      console.log('LeagueFixer: Iniciando verificação global...');
      
      try {
        const { data, error } = await supabase.rpc('sync_league_state', { _user_id: userId });
        
        if (error) {
          console.error('LeagueFixer: Erro ao sincronizar liga:', error);
          return;
        }

        if (data) {
          const result = data as any;
          if (result.matches < 380 && result.league_id) {
            console.log('Liga detectada sem jogos (ou incompleta)');
            console.log('Corrigindo liga...');
            const { data: fixData, error: fixError } = await supabase.rpc('fix_league_forcefully', { p_league_id: result.league_id });
            if (fixError) {
              console.error('Erro na correção forçada:', fixError);
            } else {
              const total = (fixData as any)?.new_match_count || 380;
              console.log('Jogos criados:', total);
              console.log('Sincronização forçada concluída com sucesso.');
            }
          } else {
            console.log(`Liga OK. Jogos encontrados: ${result.matches}`);
          }
        }
      } catch (e) {
        console.error('LeagueFixer: Exceção na verificação:', e);
      }
    };

    runFix();
  }, [userId]);
}
