import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, Users, DollarSign, Clock, 
  Rocket, Shirt, Crown, Package, AlertCircle 
} from 'lucide-react';
import { ActiveEffect, StoreStats } from '@/types/store';
import { formatMoney } from '@/lib/formatMoney';
import { motion } from 'framer-motion';

interface StoreDashboardProps {
  stats: StoreStats;
}

export function StoreDashboard({ stats }: StoreDashboardProps) {
  const marketingEffects = stats.activeEffects.filter(e => e.category === 'marketing');
  const activeSponsors = stats.activeEffects.filter(e => e.category === 'sponsorship');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Active Marketing Campaigns */}
      <Card className="bg-slate-900/60 border-emerald-500/20 backdrop-blur-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2 text-emerald-400">
            <Rocket className="h-4 w-4" /> Marketing Ativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {marketingEffects.length === 0 ? (
            <p className="text-xs text-white/40 italic">Nenhuma campanha ativa</p>
          ) : (
            marketingEffects.map(effect => {
              const daysLeft = effect.expiresAt ? Math.ceil((new Date(effect.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
              return (
                <div key={effect.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white/80">{effect.bonusData.name || 'Campanha'}</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      {daysLeft} dias restantes
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-100/60">
                    <Users className="h-3 w-3" />
                    <span>+{effect.bonusData.torcidaPorDia?.toLocaleString()} torcedores/dia</span>
                  </div>
                  <Progress value={(daysLeft / 30) * 100} className="h-1 bg-white/5" />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Sponsorships */}
      <Card className="bg-slate-900/60 border-blue-500/20 backdrop-blur-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2 text-blue-400">
            <DollarSign className="h-4 w-4" /> Patrocínios Ativos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSponsors.length === 0 ? (
            <p className="text-xs text-white/40 italic">Sem patrocinadores master</p>
          ) : (
            activeSponsors.map(sponsor => (
              <div key={sponsor.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black uppercase text-white">{sponsor.bonusData.plan_id?.toUpperCase()}</span>
                  <span className="text-[10px] font-bold text-blue-400">Ativo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40">Receita Semanal</span>
                  <span className="text-xs font-black text-emerald-400">{formatMoney(sponsor.bonusData.dinheiroSemanal || 0)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Membership (Sócios) */}
      <Card className="bg-slate-900/60 border-amber-500/20 backdrop-blur-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2 text-amber-400">
            <Crown className="h-4 w-4" /> Sócios Torcedores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/60">Base de Sócios</span>
            <span className="text-sm font-black">{stats.membership.totalMembers.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/60">Receita Mensal</span>
            <span className="text-sm font-black text-emerald-400">{formatMoney(stats.membership.monthlyRevenue)}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-white/40">Engajamento</span>
              <span className="text-amber-400 font-bold">{stats.membership.happiness}%</span>
            </div>
            <Progress value={stats.membership.happiness} className="h-1 bg-white/5" />
          </div>
        </CardContent>
      </Card>

      {/* Uniform Sales */}
      <Card className="bg-slate-900/60 border-purple-500/20 backdrop-blur-md lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2 text-purple-400">
            <Shirt className="h-4 w-4" /> Vendas de Uniformes & Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <p className="text-[10px] text-white/40 uppercase font-black">Hype da Marca</p>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-lg font-black italic">84%</span>
              </div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <p className="text-[10px] text-white/40 uppercase font-black">Receita Diária</p>
              <p className="text-lg font-black italic text-emerald-400">{formatMoney(stats.dailyRevenue)}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <p className="text-[10px] text-white/40 uppercase font-black">Lançamentos 2026</p>
              <div className="flex gap-1 mt-1">
                {['Home', 'Away', 'Third'].map(t => (
                  <Badge key={t} variant="outline" className="text-[8px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <p className="text-[10px] text-white/40 uppercase font-black">Vendas Totais</p>
              <p className="text-lg font-black italic">{formatMoney(stats.totalRevenue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
