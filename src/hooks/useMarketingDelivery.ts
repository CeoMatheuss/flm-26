import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Entrega diária de torcedores das campanhas de marketing ativas.
 * - Para cada efeito ativo da categoria 'marketing', calcula quantos dias se passaram
 *   desde a última entrega e credita `torcidaPorDia * dias` ao clube.
 * - Mostra um toast + notificação ("Hoje você recebeu X torcedores via Campanha Y").
 * - Roda 1x ao montar e a cada 5 min enquanto o app está aberto.
 */
export function useMarketingDelivery(clubId: string | undefined, userId: string | undefined) {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!clubId || !userId) return;
    let cancelled = false;

    const run = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        const client = supabase as any;
        const nowIso = new Date().toISOString();

        const { data: effects, error } = await client
          .from('club_active_effects')
          .select('*')
          .eq('club_id', clubId)
          .eq('category', 'marketing');
        if (error || !effects?.length || cancelled) return;

        const { data: clubRow } = await client
          .from('clubs').select('fans').eq('id', clubId).maybeSingle();
        let fans = Number(clubRow?.fans ?? 0);

        let totalAdded = 0;
        const deliveries: { name: string; gained: number }[] = [];

        for (const ef of effects) {
          if (ef.expires_at && new Date(ef.expires_at).getTime() <= Date.now()) continue;
          const perDay = Number(ef?.bonus_data?.torcidaPorDia ?? 0);
          if (perDay <= 0) continue;
          const last = ef.last_delivery_at ? new Date(ef.last_delivery_at).getTime() : new Date(ef.created_at).getTime();
          const days = Math.floor((Date.now() - last) / MS_DAY);
          if (days < 1) continue;

          const gained = perDay * days;
          fans += gained;
          totalAdded += gained;
          deliveries.push({ name: ef?.bonus_data?.name || 'Campanha', gained });

          await client.from('club_active_effects')
            .update({ last_delivery_at: nowIso })
            .eq('id', ef.id);
        }

        if (totalAdded > 0 && !cancelled) {
          await client.from('clubs').update({ fans }).eq('id', clubId);
          for (const d of deliveries) {
            toast.success(`📣 Hoje você recebeu +${d.gained.toLocaleString('pt-BR')} torcedores via ${d.name}`);
          }
          // Notificação persistente
          try {
            await client.from('user_notifications').insert({
              user_id: userId,
              type: 'marketing_delivery',
              title: '📣 Marketing entregou torcedores',
              message: deliveries.map(d => `+${d.gained.toLocaleString('pt-BR')} via ${d.name}`).join(' · '),
              importance: 1,
            });
          } catch (_) { /* notif opcional */ }
          window.dispatchEvent(new CustomEvent('flm:refresh-club-data'));
        }
      } catch (e) {
        console.warn('[marketing-delivery] erro', e);
      } finally {
        runningRef.current = false;
      }
    };

    run();
    const id = setInterval(run, 5 * 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [clubId, userId]);
}
