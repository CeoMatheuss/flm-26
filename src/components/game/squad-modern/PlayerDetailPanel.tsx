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
        className="w-full sm:max-w-xl p-0 bg-zinc-950 border-l border-emerald-500/10 overflow-hidden"
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
  const sm = statusMeta[status];
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
      <div className="h-full flex flex-col bg-zinc-950 text-white">
        {/* Header */}
        <div className="relative shrink-0 px-5 pt-5 pb-4 border-b border-white/5 bg-gradient-to-b from-emerald-500/10 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <X className="h-4 w-4 text-white/70" />
          </button>

          <div className="flex items-start gap-4">
            <div className={cn(
              'shrink-0 w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center bg-zinc-950/80',
              tier.ring, tier.glow,
            )}>
              <span className={cn('text-3xl font-black italic leading-none', tier.color)}>{player.overall}</span>
              <div className="flex items-center gap-0.5 mt-1">
                <span className="text-[8px] uppercase font-bold tracking-wider text-white/40">OVR</span>
                {overallDelta !== 0 && (
                  overallDelta > 0
                    ? <ArrowUp className="h-2.5 w-2.5 text-emerald-400 animate-pulse" />
                    : <ArrowDown className="h-2.5 w-2.5 text-red-400 animate-pulse" />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 pr-8">
              <h2 className="text-xl font-black text-white truncate leading-tight">{player.name}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className={cn('px-2 py-0.5 rounded border text-[10px] font-bold', positionColors[player.position])}>
                  {player.position}
                </span>
                <span className={cn('px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider', sm.bg, sm.border, sm.color)}>
                  {sm.label}
                </span>
                <span className="text-[10px] text-white/50 font-medium">{flagFor((player as any).country)} {(player as any).country ?? 'Brasil'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-white/40">#{player.shirtNumber ?? '–'}</span>
                <span className="text-white/20">•</span>
                <span className="text-[10px] text-white/40">{player.age} anos</span>
                <span className="text-white/20">•</span>
                <span className="text-[10px] text-white/40">{height}cm</span>
                <span className="text-white/20">•</span>
                <span className="text-[10px] text-white/40">{foot}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Money / Contract */}
          <div className="grid grid-cols-3 gap-2">
            <InfoTile icon={<TrendingUp className="h-3 w-3" />} label="Valor" value={formatMoney(value)} accent="text-emerald-400" />
            <InfoTile icon={<FileText className="h-3 w-3" />} label="Salário" value={`${formatMoney(player.salary)}/sem`} accent="text-amber-300" />
            <InfoTile icon={<Award className="h-3 w-3" />} label="Contrato" value={`${player.contract}a`} accent="text-sky-300" />
          </div>

          {/* Energy / Morale */}
          <div className="space-y-3">
            <BarBlock icon={<Activity className="h-3.5 w-3.5 text-emerald-400" />} label="Energia" value={player.stamina} color="from-emerald-400 to-emerald-500" />
            <BarBlock icon={<Heart className="h-3.5 w-3.5 text-pink-400" />} label="Moral" value={player.morale} color="from-pink-400 to-pink-500" />
          </div>

          {/* Attributes */}
          <section>
            <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3">Atributos</h3>
            <div className="space-y-2.5">
              {attrConfig.map((cfg) => {
                const { value: val, sourceKey } = getAttrValue(player, cfg.from as any);
                const d = (delta as any)[sourceKey] ?? 0;
                return (
                  <Tooltip key={cfg.key as string}>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-white/70">{cfg.label}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-white tabular-nums">{val}</span>
                            {d !== 0 && (
                              <span className={cn(
                                'inline-flex items-center gap-0.5 text-[10px] font-bold animate-in fade-in slide-in-from-bottom-1',
                                d > 0 ? 'text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'text-red-400'
                              )}>
                                {d > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                {d > 0 ? '+' : ''}{d}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full bg-gradient-to-r rounded-full transition-all duration-700', attrColorClass(val))}
                            style={{ width: `${val}%` }}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[220px] text-xs">
                      <div className="font-bold mb-1">{cfg.label}: {val}</div>
                      <div className="text-white/70">{evolutionReason(player, cfg.label, d)}</div>
                      {d !== 0 && (
                        <div className={cn('mt-1 font-bold', d > 0 ? 'text-emerald-400' : 'text-red-400')}>
                          Última variação: {d > 0 ? '+' : ''}{d}
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </section>

          {/* Stats */}
          <section>
            <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3">Temporada</h3>
            <div className="grid grid-cols-3 gap-2">
              <StatTile icon={<Target className="h-3.5 w-3.5" />} label="Jogos" value={player.gamesPlayed || 0} />
              <StatTile icon={<Zap className="h-3.5 w-3.5" />} label="Gols" value={player.goals || 0} />
              <StatTile icon={<ArrowUpRight className="h-3.5 w-3.5" />} label="Assist" value={player.assists || 0} />
              <StatTile icon={<Trophy className="h-3.5 w-3.5" />} label="Média" value={avgRating ?? '—'} />
              <StatTile icon={<Activity className="h-3.5 w-3.5" />} label="Min" value={(player.gamesPlayed || 0) * 75} />
              <StatTile icon={<Flag className="h-3.5 w-3.5" />} label="Cartões" value={(player as any).cards ?? 0} />
            </div>
          </section>

          {/* Potential */}
          <section className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em]">Potencial</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('h-3.5 w-3.5', i < potentialStars ? 'text-amber-400 fill-amber-400' : 'text-white/10')} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/50">Estimado: <span className="text-white font-bold">{potential}</span></span>
              <span className="text-white/50">Crescimento: <span className={cn('font-bold', overallDelta > 0 ? 'text-emerald-400' : overallDelta < 0 ? 'text-red-400' : 'text-white/50')}>
                {overallDelta > 0 ? `+${overallDelta}` : overallDelta || 'estável'}
              </span></span>
            </div>
          </section>

          {personality && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{personality.emoji}</span>
                <span className="text-xs font-bold text-white">{personality.label}</span>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">{personality.desc}</p>
            </div>
          )}

          {/* Quick actions */}
          <section className="pb-4">
            <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3">Ações rápidas</h3>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn icon={<Footprints className="h-3.5 w-3.5" />} label="Escalar"      onClick={() => onAction?.('lineup', player)} />
              <ActionBtn icon={<BedDouble className="h-3.5 w-3.5" />}  label="Banco"        onClick={() => onAction?.('bench', player)} />
              <ActionBtn icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Transferir" onClick={() => onAction?.('transfer', player)} />
              <ActionBtn icon={<FileText className="h-3.5 w-3.5" />}   label="Renovar"      onClick={() => onAction?.('renew', player)} />
              <ActionBtn icon={<TrendingUp className="h-3.5 w-3.5" />} label="Treinar"      onClick={() => onAction?.('train', player)} />
              <ActionBtn icon={<Bandage className="h-3.5 w-3.5" />}    label="Fisioterapia" onClick={() => onAction?.('medical', player)} />
              <ActionBtn icon={<Crown className="h-3.5 w-3.5" />}      label="Capitão"      onClick={() => onAction?.('captain', player)} className="col-span-2" />
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}

function InfoTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-1 text-white/40 mb-1">{icon}<span className="text-[9px] uppercase font-bold tracking-wider">{label}</span></div>
      <span className={cn('text-xs font-black truncate block', accent || 'text-white')}>{value}</span>
    </div>
  );
}

function BarBlock({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">{icon}<span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">{label}</span></div>
        <span className="text-xs font-black text-white">{v}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={cn('h-full bg-gradient-to-r rounded-full transition-all duration-700', color)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-emerald-400">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-black text-white leading-none">{value}</div>
        <div className="text-[9px] uppercase font-bold tracking-wider text-white/40 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, className }: { icon: React.ReactNode; label: string; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl',
        'bg-white/[0.03] border border-white/5 text-white/80',
        'hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-300',
        'transition-all duration-200 text-xs font-bold',
        className,
      )}
    >
      {icon}{label}
    </button>
  );
}
