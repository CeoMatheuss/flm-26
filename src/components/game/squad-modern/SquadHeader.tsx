import { ArrowLeft, Menu, Wallet, Activity, Star, Info, LayoutDashboard, Users, Zap, Shield } from 'lucide-react';
import { ClubShield } from '../ClubShield';
import { Club } from '@/types/game';
import { SeasonData } from '@/types/infrastructure';
import { formatMoney } from '@/lib/formatMoney';
import { avgStamina } from './squadHelpers';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  club: Club;
  season?: SeasonData;
  onBack?: () => void;
  onMenu?: () => void;
  viewMode: 'list' | 'pitch';
  onViewModeChange: (mode: 'list' | 'pitch') => void;
}

export function SquadHeader({ club, season, onBack, onMenu, viewMode, onViewModeChange }: Props) {
  const energy = avgStamina(club.players);
  const energyColor = energy >= 70 ? 'text-emerald-400' : energy >= 40 ? 'text-amber-400' : 'text-red-400';

  const handleBack = () => {
    if (onBack) return onBack();
    window.dispatchEvent(new CustomEvent('flm:navigate-to-tab', { detail: { tab: 'dashboard' } }));
  };
  
  const handleMenu = () => {
    if (onMenu) return onMenu();
    window.dispatchEvent(new CustomEvent('flm:open-mobile-menu'));
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5" />
      
      <div className="relative px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        {/* Left: Back & Club */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-white truncate leading-none tracking-tight flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                {club.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400/80">
                   {club.country || 'Brasil'}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Temporada {season?.currentSeason ?? 1}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center/Right: Stats */}
        <div className="hidden md:flex items-center gap-6">
          <StatItem 
            icon={<Wallet className="w-3.5 h-3.5" />} 
            label="Orçamento" 
            value={formatMoney(club.budget)} 
            color="text-emerald-400" 
          />
          <div className="h-8 w-px bg-white/10" />
          <StatItem 
            icon={<Activity className="w-3.5 h-3.5" />} 
            label="Energia Média" 
            value={`${energy}%`} 
            color={energyColor} 
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Optimization Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('flm:auto-lineup'))}
                  className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95"
                >
                  <Zap className="w-4 h-4 fill-emerald-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Otimizar Escalação (Titulares e Reserva)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Mobile View Toggle */}
          <div className="flex xl:hidden bg-white/5 border border-white/10 p-1 rounded-2xl h-10 gap-1">
             <button 
               onClick={() => onViewModeChange('list')}
               className={cn(
                 "px-3 rounded-xl flex items-center gap-2 transition-all",
                 viewMode === 'list' ? "bg-emerald-500 text-zinc-950 shadow-lg" : "text-white/40"
               )}
             >
               <Users className="w-4 h-4" />
               <span className="hidden sm:inline text-[10px] font-black uppercase">Lista</span>
             </button>
             <button 
               onClick={() => onViewModeChange('pitch')}
               className={cn(
                 "px-3 rounded-xl flex items-center gap-2 transition-all",
                 viewMode === 'pitch' ? "bg-emerald-500 text-zinc-950 shadow-lg" : "text-white/40"
               )}
             >
               <LayoutDashboard className="w-4 h-4" />
               <span className="hidden sm:inline text-[10px] font-black uppercase">Tático</span>
             </button>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                 <button className="hidden sm:flex w-10 h-10 rounded-xl bg-white/5 border border-white/10 items-center justify-center text-white/40 hover:text-white transition-all">
                   <Info className="w-4 h-4" />
                 </button>
              </TooltipTrigger>
              <TooltipContent>Informações do Clube</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button
            onClick={handleMenu}
            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Stats Bar */}
      <div className="md:hidden flex items-center justify-between px-6 py-2 bg-white/[0.02] border-t border-white/5">
         <div className="flex items-center gap-1.5">
           <Wallet className="w-3 h-3 text-emerald-400" />
           <span className="text-[11px] font-black text-white">{formatMoney(club.budget)}</span>
         </div>
         <div className="flex items-center gap-1.5">
           <Activity className="w-3 h-3 text-emerald-400" />
           <span className={cn('text-[11px] font-black', energyColor)}>{energy}% Energia</span>
         </div>
      </div>
    </header>
  );
}

function StatItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-black tracking-tight', color)}>{value}</span>
        <div className={cn('p-1 rounded-lg bg-white/5 border border-white/5', color.replace('text', 'text'))}>
          {icon}
        </div>
      </div>
    </div>
  );
}
