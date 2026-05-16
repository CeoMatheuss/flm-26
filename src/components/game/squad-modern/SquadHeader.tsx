import { ArrowLeft, Menu, Wallet, Activity, Star, Info, LayoutDashboard, Users, Zap, Shield, ArrowLeftRight, X } from 'lucide-react';
import { ClubShield } from '../ClubShield';
import { Club } from '@/types/game';
import { SeasonData } from '@/types/infrastructure';
import { formatMoney } from '@/lib/formatMoney';
import { avgStamina } from './squadHelpers';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  club: Club;
  season?: SeasonData;
  onBack?: () => void;
  onMenu?: () => void;
  viewMode: 'list' | 'pitch';
  onViewModeChange: (mode: 'list' | 'pitch') => void;
  pendingSwap?: { id: string; name: string } | null;
  onCancelSwap?: () => void;
  isTacticsOpen: boolean;
  onToggleTactics: () => void;
}

export function SquadHeader({ club, season, onBack, onMenu, viewMode, onViewModeChange, pendingSwap, onCancelSwap, isTacticsOpen, onToggleTactics }: Props) {
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
      
      <div className="relative px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Club & Stats */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={handleBack}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all active:scale-95 shrink-0"
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-2xl font-black text-white truncate leading-none tracking-tighter flex items-center gap-2 sm:gap-3">
                <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
                <span className="truncate">{club.name}</span>
              </h1>
              <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400/80 truncate">
                   {club.country || 'Brasil'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-bold text-white/40 uppercase tracking-widest truncate">
                  T{season?.currentSeason ?? 1}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Swap Info or Stats (hidden on mobile to free space for club name) */}
        <div className={cn("flex items-center justify-center", pendingSwap ? "flex-1" : "hidden md:flex flex-1")}>
          <AnimatePresence mode="wait">
            {pendingSwap ? (
              <motion.div 
                key="swap-info"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-primary/20 border border-primary/30 px-4 py-2 rounded-2xl flex items-center gap-3 animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.2)]"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/70">Trocando {pendingSwap.name}</span>
                  <span className="text-xs font-black text-white uppercase italic">Selecione o substituto...</span>
                </div>
                <button 
                  onClick={onCancelSwap}
                  className="ml-2 w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </motion.div>
            ) : (
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
            )}
          </AnimatePresence>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Tactics Button */}
          <button 
            onClick={onToggleTactics}
            className={cn(
              "hidden xl:flex h-12 px-6 rounded-2xl border transition-all gap-3 font-black uppercase text-[10px] tracking-widest group shadow-lg",
              isTacticsOpen 
                ? "bg-zinc-900 border-white/5 text-white/40 hover:text-red-400 hover:border-red-400/20" 
                : "bg-emerald-500 border-emerald-400/50 text-zinc-950 hover:bg-emerald-400"
            )}
          >
            {isTacticsOpen ? <X className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
            {isTacticsOpen ? 'Fechar Tático' : 'Abrir Tático'}
          </button>

          {/* Optimization Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('flm:auto-lineup'))}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95 shrink-0"
                >
                  <Zap className="w-4 h-4 fill-emerald-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Otimizar Escalação (Titulares e Reserva)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Mobile View Toggle */}
          <div className="flex xl:hidden bg-white/5 border border-white/10 p-1 rounded-2xl h-10 gap-1 shrink-0">
             <button 
                onClick={() => onViewModeChange('list')}
                className={cn(
                  "px-2 sm:px-3 rounded-xl flex items-center gap-2 transition-all",
                  viewMode === 'list' ? "bg-emerald-500 text-zinc-950 shadow-lg" : "text-white/40"
                )}
             >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline text-[10px] font-black uppercase">Lista</span>
             </button>
             <button 
                onClick={() => onViewModeChange('pitch')}
                className={cn(
                  "px-2 sm:px-3 rounded-xl flex items-center gap-2 transition-all",
                  viewMode === 'pitch' ? "bg-emerald-500 text-zinc-950 shadow-lg" : "text-white/40"
                )}
             >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline text-[10px] font-black uppercase">Tático</span>
             </button>
          </div>

          <button
            onClick={handleMenu}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all active:scale-95 shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Stats Bar */}
      <div className="md:hidden flex items-center justify-between px-3 sm:px-6 py-2 bg-white/[0.02] border-t border-white/5">
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
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-1">{label}</span>
      <div className="flex items-center gap-3">
        <span className={cn('text-lg font-black tracking-tighter', color)}>{value}</span>
        <div className={cn('p-1 rounded-lg bg-white/5 border border-white/5', color.replace('text', 'text'))}>
          {icon}
        </div>
      </div>
    </div>
  );
}
