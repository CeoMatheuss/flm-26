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
      activePlanId: null,
      monthlyRevenue: 0,
      happiness: 100
    }
  });
  const [loading, setLoading] = useState(false);

  const fetchStoreData = useCallback(async () => {
    if (!club?.id) return;
    
    try {
      const [effectsRes, launchesRes, statsRes, membersRes] = await Promise.all([
        supabase.from('club_active_effects').select('*').eq('club_id', club.id),
        supabase.from('club_uniform_launches').select('*').eq('club_id', club.id).eq('is_active', true),
        supabase.from('club_shop_stats').select('*').eq('club_id', club.id).maybeSingle(),
        supabase.from('club_memberships').select('*').eq('club_id', club.id).maybeSingle()
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
            lastUpdateAt: e.created_at // placeholder
          }))
        }));
      }

      if (launchesRes.data) {
        setStats(prev => ({
          ...prev,
          uniformLaunches: launchesRes.data.map((l: any) => ({
            id: l.id,
            seasonYear: l.season_year,
            type: l.uniform_type,
            designData: l.design_data,
            hypeScore: l.hype_score,
            totalSales: Number(l.total_sales_cents) / 100,
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
    if (!club?.id) return;

    try {
      setLoading(true);
      
      const durationDays = item.duration_days || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // 1. Create Active Effect
      const { error: effectError } = await supabase
        .from('club_active_effects')
        .insert({
          club_id: club.id,
          item_id: item.id,
          category: item.category,
          bonus_data: { ...item.bonus_data, name: item.name },
          expires_at: expiresAt.toISOString()
        });

      if (effectError) throw effectError;

      // 2. Handle category specific immediate effects
      if (item.category === 'sponsorship') {
        const immediateCash = item.bonus_data?.immediate_cash || 0;
        if (immediateCash > 0) {
          await supabase.rpc('add_club_budget', { 
            p_club_id: club.id, 
            p_amount: immediateCash 
          });
          toast.success(`Bônus de assinatura recebido: R$ ${immediateCash.toLocaleString()}`);
        }

        // Also add to sponsorships table for legacy support if needed
        await supabase.from('club_sponsorships').insert({
          club_id: club.id,
          sponsor_name: item.name,
          contract_value_cents: (item.bonus_data?.dinheiroSemanal || 0) * 100,
          payment_type: 'weekly',
          bonus_data: item.bonus_data,
          expires_at: expiresAt.toISOString()
        });
      }

      if (item.category === 'uniform') {
        // Uniform activation often unlocks a slot or launches a mock one
        // For now, let's just toast and fetch
        toast.success('Editor de uniforme desbloqueado!');
      }

      // 3. Generate News
      await supabase.from('club_news').insert({
        club_id: club.id,
        title: `Novo contrato: ${item.name}`,
        content: `O clube oficializou hoje a parceria com ${item.name}. O acordo trará grandes benefícios para o marketing e finanças do clube.`,
        category: 'finance',
        importance: 2
      });

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
