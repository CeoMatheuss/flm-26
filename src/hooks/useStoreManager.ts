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
      const [effectsRes, launchesRes, statsRes, membersRes, ordersRes, productsRes] = await Promise.all([
        client.from('club_active_effects').select('*').eq('club_id', club.id),
        client.from('club_uniform_launches').select('*').eq('club_id', club.id).eq('is_active', true),
        client.from('club_shop_stats').select('*').eq('club_id', club.id).maybeSingle(),
        client.from('club_memberships').select('*').eq('club_id', club.id).maybeSingle(),
        client.from('club_shop_orders').select('*, shipping_companies(*), club_shop_products(*)').eq('club_id', club.id).order('created_at', { ascending: false }).limit(10),
        client.from('club_shop_products').select('*').eq('club_id', club.id)
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

      if (ordersRes.data) {
        setStats(prev => ({
          ...prev,
          recentOrders: ordersRes.data.map((o: any) => ({
            id: o.id,
            product_id: o.product_id,
            shipping_company_id: o.shipping_company_id,
            status: o.status,
            customer_satisfaction: o.customer_satisfaction,
            freight_cents: o.freight_cents,
            distance_km: o.distance_km,
            risk_factor: o.risk_factor,
            estimated_delivery_at: o.estimated_delivery_at,
            actual_delivery_at: o.actual_delivery_at,
            created_at: o.created_at,
            product: o.club_shop_products,
            shipping_company: o.shipping_companies
          }))
        }));
      }

      if (productsRes.data) {
        setStats(prev => ({
          ...prev,
          products: productsRes.data
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

  const processOfflineActivity = async () => {
    if (!club?.id || !userId) return null;

    try {
      // 1. Obter o perfil para checar o último timestamp
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_online_at')
        .eq('id', userId)
        .single();

      if (!profile?.last_online_at) return null;

      const lastOnline = new Date(profile.last_online_at);
      const now = new Date();
      const secondsOffline = Math.floor((now.getTime() - lastOnline.getTime()) / 1000);

      // Só processar se ficou mais de 5 minutos (300s) offline para evitar micro-transações
      if (secondsOffline < 300) return null;

      // 2. Chamar a RPC do banco para processar
      const { data: result, error } = await supabase.rpc('process_offline_shop_activity', {
        p_club_id: club.id,
        p_seconds_offline: secondsOffline
      });

      if (error) throw error;

      // 3. Atualizar o perfil com o novo timestamp online
      await supabase
        .from('profiles')
        .update({ last_online_at: now.toISOString() })
        .eq('id', userId);

      return {
        ...result,
        time_offline_seconds: secondsOffline
      };
    } catch (error) {
      console.error('Error processing offline activity:', error);
      return null;
    }
  };

  const createOrder = async (productId: string, shippingCompanyId: string) => {
    if (!club?.id) return;

    try {
      setLoading(true);
      const { data: product } = await supabase
        .from('club_shop_products')
        .select('*')
        .eq('id', productId)
        .single();
      
      const { data: company } = await supabase
        .from('shipping_companies')
        .select('*')
        .eq('id', shippingCompanyId)
        .single();

      if (!product || !company) return;

      // Cálculo de frete e prazo (simulado baseado em distância aleatória)
      const distance = Math.floor(Math.random() * 1000) + 50; // 50-1050km
      const freight = Math.floor((distance * 2) * company.price_factor);
      const risk = (distance / 2000) + company.delay_risk;
      
      // Base: 1 dia a cada 500km * speed_factor
      const hoursToDeliver = (distance / 500) * 24 * company.speed_factor;
      const estimatedDelivery = new Date();
      estimatedDelivery.setHours(estimatedDelivery.getHours() + hoursToDeliver);

      const { data: order, error } = await supabase
        .from('club_shop_orders')
        .insert({
          club_id: club.id,
          product_id: productId,
          shipping_company_id: shippingCompanyId,
          freight_cents: freight,
          distance_km: distance,
          risk_factor: risk,
          estimated_delivery_at: estimatedDelivery.toISOString(),
          status: 'processing'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Pedido realizado! Estimativa: ${estimatedDelivery.toLocaleDateString()}`);
      fetchStoreData();
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erro ao criar pedido.');
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    loading,
    activateItem,
    processOfflineActivity,
    createOrder,
    refresh: fetchStoreData
  };
}

