import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Club } from '@/types/game';
import { ActiveEffect, StoreStats, UniformLaunch } from '@/types/store';

export function useStoreManager(club: Club, userId: string) {
  const [stats, setStats] = useState<StoreStats>({
    level: 1,
    dailyRevenue: 0,
    totalRevenue: 0,
    activeEffects: [],
    uniformLaunches: [],
    membership: {
      totalMembers: 0,
      manualMembers: 0,
      activePlanId: null,
      monthlyRevenue: 0,
      happiness: 100
    },
    recentOrders: [],
    products: []
  });

  const [loading, setLoading] = useState(false);

  const fetchStoreData = useCallback(async () => {
    if (!club?.id || club.id === '00000000-0000-0000-0000-000000000000') return;
    
    try {
      const client = supabase as any;
      const [effectsRes, launchesRes, statsRes, membersRes] = await Promise.all([
        client.from('club_active_effects').select('*').eq('club_id', club.id),
        client.from('club_uniform_launches').select('*').eq('club_id', club.id).eq('is_active', true),
        client.from('club_shop_stats').select('*').eq('club_id', club.id).maybeSingle(),
        client.from('club_memberships').select('*').eq('club_id', club.id).maybeSingle()
      ]);

      if (effectsRes.data) {
        setStats(prev => ({
          ...prev,
          activeEffects: effectsRes.data.map((e: any) => ({
            id: e.id,
            itemId: e.item_id,
            category: e.category,
            bonusData: e.bonus_data,
            startedAt: e.started_at,
            expiresAt: e.expires_at,
            lastUpdateAt: e.created_at
          }))
        }));
      }

      if (launchesRes.data) {
        setStats(prev => ({
          ...prev,
          uniformLaunches: (launchesRes.data || []).map((l: any) => ({
            id: l.id,
            seasonYear: l.season_year,
            type: l.type,
            designData: l.config,
            hypeScore: Math.round((l.hype_score || 0) * 100),
            totalSales: Number(l.total_sales_count || 0),
            totalRevenue: Number(l.total_revenue_cents || 0) / 100,
            launchedAt: l.launched_at,
            isActive: l.is_active
          }))
        }));
      }


      if (statsRes.data) {
        setStats(prev => ({
          ...prev,
          level: statsRes.data.level,
          dailyRevenue: Number(statsRes.data.daily_revenue) / 100,
          totalRevenue: Number(statsRes.data.total_revenue) / 100
        }));
      }

      if (membersRes.data) {
        setStats(prev => ({
          ...prev,
          membership: {
            totalMembers: membersRes.data.total_members,
            manualMembers: membersRes.data.manual_members || 0,
            activePlanId: membersRes.data.active_plan_id,
            monthlyRevenue: Number(membersRes.data.monthly_revenue_cents) / 100,
            happiness: membersRes.data.happiness
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching store data:', error);
    }
  }, [club?.id]);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  const activateItem = async (item: any) => {
    if (!club?.id || club.id === '00000000-0000-0000-0000-000000000000') {
      toast.error('Clube não identificado.');
      return;
    }

    try {
      setLoading(true);
      const client = supabase as any;
      
      // Criar o pedido localmente para simular o fluxo de checkout
      const { data: order, error: orderError } = await client
        .from('payment_orders')
        .insert({
          user_id: userId,
          item_id: item.id,
          amount_cents: item.price_cents || 0,
          status: 'pending',
          payment_method: 'in_game',
          metadata: {
            item_name: item.name,
            category: item.category,
            bonus_data: item.bonus_data ?? null,
            source: 'in_game_redeem',
          },
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Chamar a função de entrega (sincronização total)
      const { data: result, error: rpcError } = await client.rpc('deliver_shop_item', {
        p_order_id: order.id
      });

      if (rpcError) throw rpcError;

      if (result?.success) {
        if (result.fans_added > 0) toast.success(`Novos torcedores conquistados: +${result.fans_added.toLocaleString()}`);
        if (result.members_added > 0) toast.success(`Novos sócios adicionados: +${result.members_added.toLocaleString()}`);
        if (result.cash_added > 0) toast.success(`Bônus financeiro recebido: R$ ${result.cash_added.toLocaleString()}`);
      }

      // 3. Handle additional notifications/UI logic based on category
      if (item.category === 'scouting') {
        toast.success('Departamento de scout atualizado!');
      }

      if (item.category === 'fans') {
        toast.success('Sua torcida está mais engajada do que nunca!');
      }

      if (item.category === 'uniform') {
        toast.success('Editor de uniforme desbloqueado!');
      }

      // Logic for SmartPit premium plans (these are not standard shop items)
      if (item.bonus_data?.planId) {
        const totalValue = item.bonus_data.totalValue || 0;
        const payoutDays = item.bonus_data.payoutDays || 30;
        const daily = Math.max(1, Math.floor(totalValue / payoutDays));

        await client.from('premium_sponsorships').insert({
          user_id: userId,
          plan_id: item.bonus_data.planId,
          plan_name: item.bonus_data.planName || item.name,
          total_value: totalValue,
          received_value: 0,
          payout_days: payoutDays,
          daily_value: daily,
          active: true
        });
      }

      // Note: Sponsorships and Memberships are now handled by deliver_shop_item RPC
      // so we don't need manual insertions here anymore for those categories.

      toast.success(`${item.name} ativado com sucesso!`);
      fetchStoreData();
      window.dispatchEvent(new CustomEvent('flm:refresh-club-data'));


      toast.success(`${item.name} ativado com sucesso!`);
      fetchStoreData();
      window.dispatchEvent(new CustomEvent('flm:refresh-club-data'));
    } catch (error) {
      console.error('Error activating item:', error);
      toast.error('Erro ao ativar item.');
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    loading,
    activateItem,
    refresh: fetchStoreData
  };
}
