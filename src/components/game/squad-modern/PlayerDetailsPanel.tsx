import React, { useState } from 'react';
import { Player, personalityLabels } from '@/types/game';
import { ShieldCrest } from '../ShieldCrest';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Target, 
  Activity, 
  Heart, 
  BarChart3, 
  Hash, 
  FileText,
  User,
  ArrowUpRight,
  TrendingUp,
  Info
} from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { getPlayerValue } from '@/utils/playerGenerator';
import { cn } from '@/lib/utils';

interface PlayerDetailsPanelProps {
  player: Player | null;
  onClose?: () => void;
}

export function PlayerDetailsPanel({ player, onClose }: PlayerDetailsPanelProps) {
  if (!player) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#0a0c14]/40 border-l border-white/5 backdrop-blur-xl">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <User className="h-10 w-10 text-white/20" />
        </div>
        <h3 className="text-white/40 font-bold uppercase tracking-widest text-sm">Selecione um jogador</h3>
        <p className="text-white/20 text-xs mt-2 max-w-[200px]">Clique em um jogador na lista central para ver seus detalhes completos.</p>
      </div>
    );
  }

  const avgRating = player.seasonRatings && player.seasonRatings.length > 0
    ? (player.seasonRatings.reduce((a, b) => a + b, 0) / player.seasonRatings.length) : null;

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0c14]/60 backdrop-blur-3xl border-l border-white/5 overflow-hidden animate-in fade-in slide-in-from-right-10 duration-500">
      {/* Player Header */}
      <div className="relative h-[280px] shrink-0 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#8b5cf6]/10 to-transparent" />
        
        {/* Abstract Pattern background */}
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Hash className="w-64 h-64 text-white rotate-12" />
        </div>

        <div className="relative h-full flex flex-col items-center justify-end p-8 pb-6">
           {/* Overall Circle */}
           <div className="absolute top-8 left-8 w-16 h-16 rounded-full border-2 border-[#8b5cf6]/30 flex items-center justify-center bg-[#05070a]/80 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.2)]">
              <div className="text-center">
                 <span className="block text-2xl font-black text-[#8b5cf6] leading-none">{player.overall}</span>
                 <span className="text-[8px] font-bold text-[#8b5cf6]/60 uppercase tracking-tighter">OVR</span>
              </div>
           </div>

           {/* Player Avatar placeholder */}
           <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-white/5 to-white/10 border border-white/10 flex items-center justify-center mb-6 shadow-2xl relative group">
              <User className="h-20 w-20 text-white/10 group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-[#8b5cf6] flex items-center justify-center shadow-[0_0_15px_#8b5cf6]">
                 <span className="text-white font-black italic">#{player.shirtNumber || player.id.slice(0, 2)}</span>
              </div>
           </div>

           <div className="text-center w-full min-w-0">
              <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase truncate drop-shadow-lg">{player.name}</h3>
              <div className="flex items-center justify-center gap-3 mt-2">
                 <Badge className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30 font-black italic tracking-wide">{player.position}</Badge>
                 <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{player.age} Anos</span>
                 <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">•</span>
                 <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Brasil 🇧🇷</span>
              </div>
           </div>
        </div>
      </div>

      {/* Main Info Scroll Area */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 smooth-scroll space-y-8">
         {/* Value & Contract */}
         <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all duration-300">
               <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-3 w-3 text-[#10b981]" />
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Valor de Mercado</span>
               </div>
               <span className="text-lg font-black text-white tracking-tighter">{formatMoney(getPlayerValue(player))}</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all duration-300">
               <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-3 w-3 text-[#f59e0b]" />
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Contrato</span>
               </div>
               <span className="text-lg font-black text-white tracking-tighter">{player.contract} Anos</span>
            </div>
         </div>

         {/* Physical & Morale */}
         <div className="space-y-4">
            <div className="space-y-2">
               <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                     <Activity className="h-3.5 w-3.5 text-[#10b981]" />
                     <span className="text-[10px] font-bold text-white uppercase tracking-widest">Condição Física</span>
                  </div>
                  <span className="text-xs font-black text-[#10b981]">{Math.round(player.stamina)}%</span>
               </div>
               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                     className="h-full bg-gradient-to-r from-[#10b981]/50 to-[#10b981] shadow-[0_0_8px_#10b981]" 
                     style={{ width: `${player.stamina}%` }} 
                  />
               </div>
            </div>

            <div className="space-y-2">
               <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                     <Heart className="h-3.5 w-3.5 text-[#ef4444]" />
                     <span className="text-[10px] font-bold text-white uppercase tracking-widest">Moral do Jogador</span>
                  </div>
                  <span className="text-xs font-black text-[#ef4444]">{player.morale}%</span>
               </div>
               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                     className="h-full bg-gradient-to-r from-[#ef4444]/50 to-[#ef4444] shadow-[0_0_8px_#ef4444]" 
                     style={{ width: `${player.morale}%` }} 
                  />
               </div>
            </div>
         </div>

         {/* Season Stats */}
         <div className="space-y-4">
            <h4 className="text-[11px] font-black text-[#8b5cf6] uppercase tracking-[0.2em] italic">Estatísticas da Temporada</h4>
            <div className="grid grid-cols-2 gap-3">
               {[
                  { label: 'Partidas', value: player.gamesPlayed || 0, icon: Target },
                  { label: 'Gols', value: player.goals || 0, icon: Zap },
                  { label: 'Assistências', value: player.assists || 0, icon: ArrowUpRight },
                  { label: 'Média', value: avgRating ? avgRating.toFixed(1) : '—', icon: BarChart3 },
               ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                     <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <stat.icon className="h-4 w-4 text-white/40" />
                     </div>
                     <div>
                        <span className="block text-sm font-black text-white leading-none">{stat.value}</span>
                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider">{stat.label}</span>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Full Profile Link */}
         <Button className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] hover:opacity-90 transition-all duration-300 font-black italic uppercase tracking-widest group shadow-[0_0_30px_rgba(139,92,246,0.2)]">
            Ver Perfil Completo
            <ArrowUpRight className="h-5 w-5 ml-2 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
         </Button>
      </div>
    </div>
  );
}
