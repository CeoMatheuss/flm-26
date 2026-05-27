import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCrest } from '../ShieldCrest';
import { cn } from '@/lib/utils';
import { Send, Eye, Crown, Sparkles, Flame, Shield, Zap, Heart, ArrowLeftRight, Star } from 'lucide-react';

const posStyle: Record<string, { ring: string; text: string; chip: string; glow: string }> = {
  GOL: { ring: 'ring-amber-400/30', text: 'text-amber-300', chip: 'bg-amber-500/15 border-amber-500/30', glow: 'shadow-[0_0_24px_-6px_hsl(45_90%_55%/0.55)]' },
  ZAG: { ring: 'ring-blue-400/30', text: 'text-blue-300', chip: 'bg-blue-500/15 border-blue-500/30', glow: 'shadow-[0_0_24px_-6px_hsl(220_80%_55%/0.55)]' },
  LAT: { ring: 'ring-cyan-400/30', text: 'text-cyan-300', chip: 'bg-cyan-500/15 border-cyan-500/30', glow: 'shadow-[0_0_24px_-6px_hsl(190_80%_55%/0.55)]' },
  VOL: { ring: 'ring-emerald-400/30', text: 'text-emerald-300', chip: 'bg-emerald-500/15 border-emerald-500/30', glow: 'shadow-[0_0_24px_-6px_hsl(150_70%_50%/0.55)]' },
  MEI: { ring: 'ring-purple-400/30', text: 'text-purple-300', chip: 'bg-purple-500/15 border-purple-500/30', glow: 'shadow-[0_0_24px_-6px_hsl(270_70%_60%/0.55)]' },
  ATA: { ring: 'ring-rose-400/30', text: 'text-rose-300', chip: 'bg-rose-500/15 border-rose-500/30', glow: 'shadow-[0_0_24px_-6px_hsl(0_80%_60%/0.55)]' },
};

function ovrTier(ovr: number) {
  if (ovr >= 88) return { color: 'text-amber-300', stroke: 'hsl(45 95% 60%)', from: 'from-amber-500/15', to: 'to-amber-500/0', label: 'ELITE' };
  if (ovr >= 80) return { color: 'text-amber-300', stroke: 'hsl(45 90% 55%)', from: 'from-amber-500/10', to: 'to-amber-500/0', label: 'CRAQUE' };
  if (ovr >= 72) return { color: 'text-emerald-300', stroke: 'hsl(150 70% 50%)', from: 'from-emerald-500/10', to: 'to-emerald-500/0', label: 'TITULAR' };
  if (ovr >= 62) return { color: 'text-sky-300', stroke: 'hsl(200 80% 55%)', from: 'from-sky-500/15', to: 'to-sky-500/0', label: 'PROMISSOR' };
  return { color: 'text-muted-foreground', stroke: 'hsl(220 10% 50%)', from: 'from-muted/20', to: 'to-muted/0', label: 'BASE' };
}

export interface PremiumListingCardProps {
  listing: any;
  isOwn: boolean;
  canAfford: boolean;
  loading?: boolean;
  onOffer: () => void;
  onBuyNow?: () => void;
  onViewSeller: () => void;
}

export const PremiumListingCard = memo(function PremiumListingCard({
  listing, isOwn, canAfford, loading, onOffer, onBuyNow, onViewSeller,
}: PremiumListingCardProps) {
  const pd = listing.player_data || {};
  const shield = listing.seller_shield as any;
  const pos = posStyle[listing.player_position] || posStyle.MEI;
  const tier = ovrTier(listing.player_overall);
  const age = listing.player_age;
  const isYoung = age <= 21;
  const isVeteran = age >= 31;
  const isStar = listing.player_overall >= 82;
  const form = Math.min(100, Math.max(0, pd.form ?? pd.morale ?? 70));
  const stam = Math.min(100, Math.max(0, pd.stamina ?? 100));

  const ovrCirc = 56;
  const ovrR = 24;
  const ovrC = 2 * Math.PI * ovrR;
  const ovrProgress = Math.min(99, listing.player_overall) / 99;

  return (
    <div
      className={cn(
        'group relative rounded-2xl overflow-hidden border transition-all duration-300 animate-fade-in',
        'backdrop-blur-sm hover:-translate-y-0.5',
        isOwn
          ? 'border-amber-400/20 shadow-[0_0_30px_-10px_hsl(45_90%_55%/0.5)]'
          : 'border-white/5 hover:border-emerald-400/25 hover:shadow-[0_8px_40px_-12px_hsl(150_70%_45%/0.45)]',
      )}
      style={{
        background: isOwn
          ? 'linear-gradient(135deg, hsl(45 60% 12% / 0.55), hsl(220 40% 8% / 0.85))'
          : 'linear-gradient(135deg, hsl(220 35% 9% / 0.85), hsl(220 40% 6% / 0.92))',
      }}
    >
      {/* Top shimmer ribbon */}
      <div className={cn('absolute inset-x-0 top-0 h-[2px] opacity-80',
        isOwn ? 'bg-gradient-to-r from-amber-500/0 via-amber-300 to-amber-500/0'
              : 'bg-gradient-to-r from-emerald-500/0 via-emerald-300 to-emerald-500/0')} />

      {/* Corner status pill */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {!isOwn && (
          <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wider bg-gradient-to-r from-emerald-500 to-emerald-400 text-emerald-950 flex items-center gap-0.5 shadow-lg">
            <Zap className="h-2.5 w-2.5 fill-current" /> COMPRA IMEDIATA
          </span>
        )}
        {isStar && (
          <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wider bg-amber-500/90 text-amber-950 flex items-center gap-0.5 shadow-lg">
            <Star className="h-2.5 w-2.5 fill-current" /> CRAQUE
          </span>
        )}
        {isYoung && !isStar && (
          <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wider bg-sky-500/90 text-sky-950 flex items-center gap-0.5 shadow-lg">
            <Sparkles className="h-2.5 w-2.5" /> JOVEM
          </span>
        )}
        {isVeteran && (
          <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wider bg-purple-500/90 text-purple-950 flex items-center gap-0.5 shadow-lg">
            <Shield className="h-2.5 w-2.5" /> VETERANO
          </span>
        )}
        {isOwn && (
          <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wider bg-amber-400 text-amber-950 flex items-center gap-0.5 shadow-lg">
            <Crown className="h-2.5 w-2.5" /> SEU
          </span>
        )}
      </div>

      {/* Background flare */}
      <div className={cn('pointer-events-none absolute -top-20 -right-10 w-48 h-48 rounded-full blur-3xl opacity-40 bg-gradient-to-br', tier.from, tier.to)} />

      <div className="relative p-3 flex items-stretch gap-3">
        {/* OVR ring */}
        <div className="shrink-0 relative" style={{ width: ovrCirc, height: ovrCirc }}>
          <svg width={ovrCirc} height={ovrCirc} className="-rotate-90">
            <circle cx={ovrCirc / 2} cy={ovrCirc / 2} r={ovrR} stroke="hsl(220 20% 18%)" strokeWidth="3" fill="none" />
            <circle
              cx={ovrCirc / 2} cy={ovrCirc / 2} r={ovrR}
              stroke={tier.stroke} strokeWidth="3" fill="none"
              strokeDasharray={ovrC} strokeDashoffset={ovrC * (1 - ovrProgress)} strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-lg font-black leading-none', tier.color)}>{listing.player_overall}</span>
            <span className={cn('text-[8px] font-bold leading-none mt-0.5', pos.text)}>{listing.player_position}</span>
          </div>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <p className="font-black text-[13px] truncate leading-tight">{listing.player_name}</p>
              <button
                className="group/club inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors truncate max-w-full"
                onClick={onViewSeller}
              >
                {shield ? (
                  <ShieldCrest primaryColor={shield.primaryColor} secondaryColor={shield.secondaryColor} pattern={shield.pattern} shape={shield.shape || 'classic'} size={12} />
                ) : <span>⚽</span>}
                <span className="truncate group-hover/club:underline">{listing.seller_club_name}</span>
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-1.5 flex items-center gap-2 text-[9px] text-muted-foreground flex-wrap">
            <span className="font-semibold text-foreground/80">{age}a</span>
            <span className="inline-flex items-center gap-0.5"><Zap className="h-2.5 w-2.5 text-emerald-400" />{stam}%</span>
            <span className="inline-flex items-center gap-0.5"><Heart className={cn('h-2.5 w-2.5', form >= 70 ? 'text-rose-400' : 'text-amber-400')} />{form}%</span>
            {pd?.gamesPlayed != null && <span>{pd.gamesPlayed}j</span>}
            {pd?.goals != null && <span>⚽{pd.goals}</span>}
            {pd?.assists != null && <span>🅰️{pd.assists}</span>}
            {listing.transfer_count > 2 && (
              <Badge variant="outline" className="text-[8px] h-3.5 border-amber-500/30 text-amber-400 gap-0.5 px-1">
                <ArrowLeftRight className="h-2 w-2" /> {listing.transfer_count}x
              </Badge>
            )}
          </div>

          {/* Mini bars: form & stamina */}
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <div>
              <div className="flex items-center justify-between text-[8px] text-muted-foreground"><span>Forma</span><span className="font-bold text-foreground/70">{form}</span></div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', form >= 70 ? 'bg-emerald-400' : form >= 40 ? 'bg-amber-400' : 'bg-rose-400')} style={{ width: `${form}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[8px] text-muted-foreground"><span>Energia</span><span className="font-bold text-foreground/70">{stam}</span></div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', stam >= 70 ? 'bg-sky-400' : stam >= 40 ? 'bg-amber-400' : 'bg-rose-400')} style={{ width: `${stam}%` }} />
              </div>
            </div>
          </div>

          {pd?.salary != null && (
            <p className="text-[9px] text-muted-foreground mt-1.5">
              Salário: <span className="font-semibold text-foreground/90">R${(pd.salary / 1000).toFixed(1)}k</span>/mês
            </p>
          )}
        </div>

        {/* Price + actions */}
        <div className="shrink-0 flex flex-col items-end justify-between gap-2">
          <div className="text-right">
            <p className="text-[7px] uppercase tracking-[0.15em] text-emerald-300/70 font-bold">Pedido</p>
            <p className="text-base font-black text-emerald-300 leading-none">
              R${(listing.asking_price / 1000).toFixed(0)}k
            </p>
            {!canAfford && !isOwn && (
              <p className="text-[8px] text-rose-400/80 mt-0.5 flex items-center gap-0.5 justify-end">
                <Flame className="h-2.5 w-2.5" /> Caixa baixo
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 w-full">
            <Button
              size="sm"
              onClick={onOffer}
              disabled={loading || isOwn}
              className={cn(
                'h-7 px-2.5 text-[10px] rounded-lg gap-1 font-bold transition-all',
                'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400',
                'text-white shadow-[0_4px_14px_-4px_hsl(150_70%_45%/0.6)] hover:shadow-[0_6px_20px_-4px_hsl(150_70%_45%/0.8)]',
                'group-hover:scale-[1.02]',
              )}
            >
              <Send className="h-3 w-3" /> Proposta
            </Button>
            <Button
              size="sm" variant="outline"
              onClick={onViewSeller}
              className="h-7 px-2 text-[10px] rounded-lg gap-1 border-white/10 hover:border-white/20 hover:bg-white/5"
            >
              <Eye className="h-3 w-3" /> Clube
            </Button>
          </div>
        </div>
      </div>

      {/* Subtle bottom gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
});
