import { useEffect, useMemo } from 'react';
import { Player, personalityLabels } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  X, ArrowUp, ArrowDown, Star, Target, Zap, Trophy, Activity,
  Heart, FileText, TrendingUp, Award, Flag, Footprints, Ruler,
  Shield, ArrowUpRight, Bandage, ArrowDownRight, BedDouble, ShoppingCart, Crown,
} from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { getPlayerValue } from '@/utils/playerGenerator';
import { cn } from '@/lib/utils';
import {
  PlayerStatus, statusMeta, ovrTier, positionColors, attrConfig, getAttrValue, attrColorClass, flagFor,
} from './squadHelpers';
import { AttrDelta, evolutionReason } from './useAttributeEvolution';
import { motion } from 'framer-motion';

interface Props {
  player: Player | null;
  status: PlayerStatus | null;
  delta: AttrDelta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction?: (action: 'lineup' | 'bench' | 'transfer' | 'renew' | 'train' | 'medical' | 'captain', player: Player) => void;
}

export function PlayerDetailPanel({ player, status, delta, open, onOpenChange, onAction }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 bg-zinc-950/98 backdrop-blur-3xl border-l border-white/5 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]"
      >
        {player ? (
          <PlayerDetailContent
            player={player}
            status={status ?? 'reserva'}
            delta={delta}
            onClose={() => onOpenChange(false)}
            onAction={onAction}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function PlayerDetailContent({
  player, status, delta, onClose, onAction,
}: {
  player: Player;
  status: PlayerStatus;
  delta: AttrDelta;
  onClose: () => void;
  onAction?: Props['onAction'];
}) {
  const tier = ovrTier(player.overall);
  const sm = statusMeta[status] || statusMeta.reserva;
  const value = getPlayerValue(player);
  const overallDelta = delta.overall ?? 0;

  const avgRating = useMemo(() => {
    if (!player.seasonRatings?.length) return null;
    return (player.seasonRatings.reduce((a, b) => a + b, 0) / player.seasonRatings.length).toFixed(1);
  }, [player]);

  const potential = (player as any).potential ?? Math.min(99, player.overall + 5);
  const potentialStars = Math.max(1, Math.min(5, Math.round(potential / 20)));

  const personality = player.personality ? personalityLabels[player.personality] : null;
  const height = (player as any).height ?? (170 + ((parseInt(player.id.slice(0, 2), 16) || 0) % 25));
  const foot = (player as any).preferredFoot ?? (player.id.charCodeAt(0) % 5 === 0 ? 'Esquerdo' : 'Direito');

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-full flex flex-col bg-transparent text-white selection:bg-emerald-500/30">
        {/* Premium Header */}
        <div className="relative shrink-0 px-6 pt-10 pb-6 border-b border-white/5 overflow-hidden">
          <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", tier.bg)} />
          
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all z-20 active:scale-90"
          >
            <X className="h-5 w-5 text-white/70" />
          </button>

          <div className="flex items-start gap-6 relative z-10">
            <motion.div 
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              className={cn(
                'shrink-0 w-24 h-24 rounded-[2.5rem] border-4 flex flex-col items-center justify-center bg-zinc-950/80 shadow-2xl relative',
                tier.ring, tier.glow,
              )}
            >
              <span className={cn('text-4xl font-black italic leading-none tracking-tighter', tier.color)}>
                {player.overall}
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-white/40">OVR</span>
                {overallDelta !== 0 && (
                  <motion.div 
                    animate={{ y: [0, -2, 0] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    {overallDelta > 0 
                      ? <ArrowUp className="h-3 w-3 text-emerald-400" /> 
                      : <ArrowDown className="h-3 w-3 text-red-400" />}
                  </motion.div>
                )}
              </div>
            </motion.div>

            <div className="min-w-0 flex-1 pt-2">
              <motion.h2 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl sm:text-3xl font-black text-white italic truncate leading-none uppercase tracking-tighter"
              >
                {player.name}
              </motion.h2>
              
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={cn('px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest', positionColors[player.position])}>
                  {player.position}
                </span>
                <span className={cn('px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest', sm.bg, sm.border, sm.color)}>
                  {sm.label}
                </span>
                <span className="text-xl filter drop-shadow-lg">{flagFor((player as any).country)}</span>
              </div>

              <div className="flex items-center gap-3 mt-4 text-[11px] font-bold text-white/40 uppercase tracking-widest">
                <span>#{player.shirtNumber ?? '–'}</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>{player.age} anos</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>{height}cm</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>{foot}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
          {/* Market & Contract Tiles */}
          <div className="grid grid-cols-3 gap-3">
            <InfoTile icon={<TrendingUp className="h-4 w-4" />} label="Valor" value={formatMoney(value)} accent="text-emerald-400" />
            <InfoTile icon={<FileText className="h-4 w-4" />} label="Salário" value={`${formatMoney(player.salary)}/s`} accent="text-amber-300" />
            <InfoTile icon={<Award className="h-4 w-4" />} label="Contrato" value={`${player.contract} Anos`} accent="text-sky-300" />
          </div>

          {/* Vitals */}
          <section className="space-y-4">
            <BarBlock icon={<Activity className="h-4 w-4 text-emerald-400" />} label="Energia" value={player.stamina} color="from-emerald-400 to-emerald-500" />
            <BarBlock icon={<Heart className="h-4 w-4 text-pink-400" />} label="Moral" value={player.morale} color="from-pink-400 to-pink-500" />
          </section>

          {/* Attributes Grid */}
          <section>
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <Zap className="w-4 h-4" /> Atributos Detalhados
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {attrConfig.map((cfg) => {
                const { value: val, sourceKey } = getAttrValue(player, cfg.from as any);
                const d = (delta as any)[sourceKey] ?? 0;
                return (
                  <Tooltip key={cfg.key as string}>
                    <TooltipTrigger asChild>
                      <div className="cursor-help group">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider group-hover:text-white transition-colors">{cfg.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white tabular-nums">{val}</span>
                            {d !== 0 && (
                              <span className={cn(
                                'text-[10px] font-black',
                                d > 0 ? 'text-emerald-400' : 'text-red-400'
                              )}>
                                {d > 0 ? '+' : ''}{d}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${val}%` }}
                            className={cn('h-full bg-gradient-to-r rounded-full transition-all duration-700', attrColorClass(val))}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-zinc-900 border-white/10 p-3 shadow-2xl">
                      <div className="font-black text-xs mb-1 uppercase tracking-widest">{cfg.label}: {val}</div>
                      <p className="text-[10px] text-white/50 leading-relaxed italic">{evolutionReason(player, cfg.label, d)}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </section>

          {/* Statistics Grid */}
          <section>
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <Trophy className="w-4 h-4" /> Desempenho na Temporada
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <StatTile icon={<Target className="h-4 w-4" />} label="Jogos" value={player.gamesPlayed || 0} />
              <StatTile icon={<Zap className="h-4 w-4" />} label="Gols" value={player.goals || 0} />
              <StatTile icon={<ArrowUpRight className="h-4 w-4" />} label="Assist" value={player.assists || 0} />
              <StatTile icon={<Star className="h-4 w-4" />} label="Nota Média" value={avgRating ?? '—'} />
              <StatTile icon={<Activity className="h-4 w-4" />} label="Minutos" value={(player.gamesPlayed || 0) * 90} />
              <StatTile icon={<Flag className="h-4 w-4" />} label="Cartões" value={(player as any).cards ?? 0} />
            </div>
          </section>

          {/* Potential Card */}
          <section className="p-6 rounded-[2rem] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Star className="w-20 h-20 text-amber-400" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] italic">Potencial de Carreira</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('h-4 w-4', i < potentialStars ? 'text-amber-400 fill-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'text-white/10')} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-white/40 uppercase tracking-widest">Teto Estimado: <span className="text-white font-black">{potential} OVR</span></span>
              <span className={cn(
                'px-3 py-1 rounded-full uppercase tracking-widest text-[10px]',
                overallDelta > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'
              )}>
                {overallDelta > 0 ? `+${overallDelta} Evolução` : 'Estável'}
              </span>
            </div>
          </section>

          {/* Quick Actions Grid */}
          <section className="pb-10">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.3em] mb-6">Operações do Clube</h3>
            <div className="grid grid-cols-2 gap-3">
              <ActionBtn icon={<Shield className="w-4 h-4" />} label="Escalar" onClick={() => onAction?.('lineup', player)} />
              <ActionBtn icon={<BedDouble className="w-4 h-4" />} label="Banco" onClick={() => onAction?.('bench', player)} />
              <ActionBtn icon={<ShoppingCart className="w-4 h-4" />} label="Negociar" onClick={() => onAction?.('transfer', player)} />
              <ActionBtn icon={<FileText className="w-4 h-4" />} label="Renovar" onClick={() => onAction?.('renew', player)} />
              <ActionBtn icon={<TrendingUp className="w-4 h-4" />} label="Treino Focado" onClick={() => onAction?.('train', player)} />
              <ActionBtn icon={<Bandage className="w-4 h-4" />} label="Médico" onClick={() => onAction?.('medical', player)} />
              <ActionBtn icon={<Crown className="w-4 h-4" />} label="Capitão" onClick={() => onAction?.('captain', player)} className="col-span-2" />
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}

function InfoTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all">
      <div className="flex items-center gap-2 text-white/30 mb-2">
        {icon}
        <span className="text-[9px] uppercase font-black tracking-widest">{label}</span>
      </div>
      <span className={cn('text-xs font-black truncate block italic tracking-tight', accent || 'text-white')}>
        {value}
      </span>
    </div>
  );
}

function BarBlock({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[11px] font-black text-white/60 group-hover:text-white uppercase tracking-widest transition-colors">
            {label}
          </span>
        </div>
        <span className="text-xs font-black text-white italic">{v}%</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          className={cn('h-full bg-gradient-to-r rounded-full shadow-lg', color)}
        />
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center gap-3 group hover:border-emerald-500/20 transition-all">
      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-base font-black text-white leading-none italic">{value}</div>
        <div className="text-[9px] uppercase font-black tracking-widest text-white/30 mt-1">{label}</div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, className }: { icon: React.ReactNode; label: string; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2.5 px-4 py-4 rounded-3xl',
        'bg-white/[0.03] border border-white/5 text-white/80',
        'hover:bg-emerald-500 hover:text-zinc-950 hover:border-emerald-400 hover:shadow-[0_10px_20px_rgba(16,185,129,0.2)]',
        'transition-all duration-300 text-xs font-black uppercase tracking-widest active:scale-95',
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}
