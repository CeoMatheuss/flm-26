import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCopaBrasilManager(userId: string | undefined, game: any) {
  useEffect(() => {
    if (!userId) return;

    const initCopa = async () => {
      // 1. Reset check - delete old bugged records if exists
      // Just run once per day or on demand
      const today = new Date().toISOString().split('T')[0];
      const { data: lastRun } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'copa_brasil_init')
        .maybeSingle();

      if (lastRun?.value === today) return;

      console.log('[Copa] Verificando Copa do Brasil...');
      
      const now = new Date();
      const day = now.getDate();
      
      // Auto-generate on day 10
      if (day === 10) {
        const { data: existingCups } = await supabase.from('national_cups').select('id').limit(1);
        if (!existingCups || existingCups.length === 0) {
          console.log('[Copa] Gerando copas automaticamente...');
          await supabase.functions.invoke('national-cup-manager', {
            body: { action: 'generate_all_national_cups', password: 'ADM112828' }
          });
        }
      }

      // Reconcile/Sync daily to ensure no phases are stuck
      await supabase.functions.invoke('national-cup-manager', {
        body: { action: 'reconcile_sync' }
      });
      
      await supabase.from('system_settings').upsert({
        key: 'copa_brasil_init',
        value: today
      });
    };

    initCopa();
  }, [userId, game]);
}
