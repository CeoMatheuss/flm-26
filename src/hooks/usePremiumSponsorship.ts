import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PremiumSponsorshipRow {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  total_value: number;
  received_value: number;
  payout_days: number;
  daily_value: number;
  active: boolean;
  activated_at: string;
  last_payout_at: string | null;
  completed_at: string | null;
}

const MS_DAY = 24 * 60 * 60 * 1000;
const MAX_TOTAL = 10_000_000; // teto duro de balanceamento

interface ActivateInput {
  planId: string;
  planName: string;
  totalValue: number;
  payoutDays: number;
}

/**
 * Patrocínio Premium SmartPit (compra única + pagamento progressivo).
 * - 1 ativo por vez (garantido por índice único no DB).
 * - Paga `daily_value` por dia até `received_value >= total_value`.
 * - Quando finaliza: marca `active=false` e libera para nova compra.
 */
export function usePremiumSponsorship(
  userId: string | undefined,
  addBonus?: (amount: number, description: string) => void,
) {
  const [active, setActive] = useState<PremiumSponsorshipRow | null>(null);
  const [loading, setLoading] = useState(true);
  const processingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('premium_sponsorships' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .maybeSingle();
    if (error) {
      console.warn('[premium-sponsorship] refresh err', error.message);
    }
    setActive((data as PremiumSponsorshipRow | null) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Tick de pagamento progressivo (1x ao montar + a cada 60s)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const tick = async () => {
      if (processingRef.current) return;
      processingRef.current = true;
      try {
        const { data: row } = await supabase
          .from('premium_sponsorships' as any)
          .select('*')
          .eq('user_id', userId)
          .eq('active', true)
          .maybeSingle();
        if (!row || cancelled) return;
        const r = row as PremiumSponsorshipRow;

        const lastTs = r.last_payout_at ? new Date(r.last_payout_at).getTime() : new Date(r.activated_at).getTime();
        const elapsedDays = Math.floor((Date.now() - lastTs) / MS_DAY);
        if (elapsedDays < 1) return;

        const remaining = Math.max(0, r.total_value - r.received_value);
        if (remaining <= 0) {
          await supabase.from('premium_sponsorships' as any)
            .update({ active: false, completed_at: new Date().toISOString() })
            .eq('id', r.id);
          await refresh();
          return;
        }

        const payout = Math.min(remaining, r.daily_value * elapsedDays);
        const newReceived = r.received_value + payout;
        const isDone = newReceived >= r.total_value;

        const { error: upErr } = await supabase
          .from('premium_sponsorships' as any)
          .update({
            received_value: newReceived,
            last_payout_at: new Date().toISOString(),
            active: !isDone,
            completed_at: isDone ? new Date().toISOString() : null,
          })
          .eq('id', r.id)
          .eq('received_value', r.received_value); // optimistic lock

        if (!upErr && payout > 0) {
          addBonus?.(payout, `Patrocínio Premium ${r.plan_name}`);
          if (isDone) {
            toast.success(`🏁 Contrato ${r.plan_name} concluído! Total recebido: R$ ${(r.total_value/1000).toFixed(0)}k`);
          }
        }
        await refresh();
      } finally {
        processingRef.current = false;
      }
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [userId, addBonus, refresh]);

  const activate = useCallback(async (input: ActivateInput): Promise<boolean> => {
    if (!userId) return false;
    if (active) {
      toast.error('Você já possui um patrocínio premium ativo. Aguarde finalizar para comprar outro.');
      return false;
    }
    const total = Math.min(MAX_TOTAL, Math.max(1, Math.floor(input.totalValue)));
    const days = Math.min(90, Math.max(1, Math.floor(input.payoutDays)));
    const daily = Math.max(1, Math.floor(total / days));

    const { error } = await supabase.from('premium_sponsorships' as any).insert({
      user_id: userId,
      plan_id: input.planId,
      plan_name: input.planName,
      total_value: total,
      received_value: 0,
      payout_days: days,
      daily_value: daily,
      active: true,
    });
    if (error) {
      console.warn('[premium-sponsorship] activate err', error);
      toast.error('Não foi possível ativar o patrocínio premium.');
      return false;
    }
    toast.success(`✨ ${input.planName} ativado! Você receberá R$ ${(daily/1000).toFixed(1)}k por dia.`);
    await refresh();
    return true;
  }, [userId, active, refresh]);

  return { active, loading, activate, refresh };
}
