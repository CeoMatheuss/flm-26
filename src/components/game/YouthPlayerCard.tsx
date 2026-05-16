import { YouthProspect, potentialTierInfo, evolutionStatusInfo } from '@/types/infrastructure';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Zap, Heart, Trophy, DollarSign, Crown } from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';

interface Props {
  prospect: YouthProspect;
  onClick: (prospect: YouthProspect) => void;
}

export function YouthPlayerCard({ prospect, onClick }: Props) {
  const potTier = prospect.potentialTier ?? 'comum';
  const potInfo = potentialTierInfo[potTier] || potentialTierInfo.comum;
  const evoStatus = prospect.evolutionStatus ?? 'estavel';
  const evoInfo = evolutionStatusInfo[evoStatus] || evolutionStatusInfo.estavel;
  
  const rarity = prospect.rarity || 'Comum';
  const isWonderkid = rarity === 'Promessa' || rarity === 'Joia da Base';
  const isGenerational = rarity === 'Craque geracional' || rarity === 'Craque Geracional';

  const getRarityColor = (r: string) => {
    switch (r) {
      case 'Craque geracional': 
      case 'Craque Geracional': return 'from-amber-600/20 to-purple-600/30 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]';
      case 'Promessa': return 'from-purple-600/20 to-blue-600/30 border-purple-500/50';
      case 'Joia da Base': return 'from-cyan-600/20 to-blue-600/30 border-cyan-500/50';
      case 'Bom talento': return 'from-emerald-600/20 to-blue-600/30 border-blue-500/50';
      default: return 'from-card to-accent/10 border-white/5';
    }
  };

  const getRarityBadge = (r: string) => {
    switch (r) {
      case 'Craque geracional':
      case 'Craque Geracional': return 'bg-amber-500 text-black font-black border-amber-400';
      case 'Promessa': return 'bg-purple-600 text-white font-bold border-purple-400';
      case 'Joia da Base': return 'bg-cyan-600 text-white font-bold border-cyan-400';
      case 'Bom talento': return 'bg-blue-600 text-white font-bold border-blue-400';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getEvoTag = () => {
    if (isGenerational) return { label: '🌟 Grande promessa', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    if (prospect.potential >= 90) return { label: '💎 Joia da base', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
    if (evoStatus === 'evoluindo' && (prospect.trainingProgress || 0) > 70) return { label: '⚡ Evoluindo rápido', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    if (prospect.tacticalIQ && prospect.tacticalIQ > 80) return { label: '🧠 Muito inteligente', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    if (prospect.rarity === 'Promessa') return { label: '🔥 Talento raro', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    return null;
  };

  const evoTag = getEvoTag();

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300 }}
      onClick={() => onClick(prospect)}
      className="cursor-pointer"
    >
      <Card className={`overflow-hidden border-2 bg-gradient-to-br ${getRarityColor(rarity)} group relative backdrop-blur-sm rounded-[1.5rem]`}>
        {isGenerational && (
          <div className="absolute top-2 right-2 z-20">
            <Crown className="h-6 w-6 text-amber-400 fill-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          </div>
        )}
        
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Player Avatar */}
            <div className="relative shrink-0">
              <div className={`w-20 h-20 rounded-2xl bg-black/40 flex items-center justify-center border-2 ${getRarityColor(rarity).split(' ').pop()} transition-all overflow-hidden group-hover:scale-105 duration-500`}>
                <span className="text-4xl grayscale group-hover:grayscale-0 transition-all duration-500">👤</span>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 flex justify-center">
                  <span className="text-[10px] uppercase font-black tracking-widest">{prospect.nationality?.substring(0, 3)}</span>
                </div>
              </div>
              <div className="absolute -top-3 -left-3 rotate-[-12deg]">
                <Badge className={`${getRarityBadge(rarity)} text-[10px] font-black h-6 min-w-[38px] justify-center px-2 shadow-lg border-2 uppercase tracking-tighter`}>
                  {prospect.position}
                </Badge>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-0.5 mb-1.5">
                <h3 className="text-base font-black uppercase italic tracking-tighter truncate group-hover:text-emerald-400 transition-colors">{prospect.name}</h3>
                <div className="flex items-center gap-2">
                   <Badge variant="outline" className="text-[10px] font-bold bg-white/5 border-white/10 h-5 px-1.5 uppercase">OVR {prospect.overall}</Badge>
                   <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">{prospect.age} anos</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/30 border ${potInfo.border}`}>
                  <span className="text-xs">{potInfo.emoji}</span>
                  <span className={`text-[10px] font-black uppercase tracking-tight ${potInfo.color}`}>{potInfo.label}</span>
                </div>
                {evoTag && (
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${evoTag.color} animate-in fade-in zoom-in duration-300`}>
                    <span className="text-[9px] font-black uppercase tracking-tighter leading-none">{evoTag.label}</span>
                  </div>
                )}
              </div>

              {/* Development Status */}
              <div className="space-y-1.5 bg-black/20 p-2 rounded-xl border border-white/5">
                <div className="flex items-center justify-between text-[9px] uppercase font-black">
                  <span className="text-white/40 flex items-center gap-1">
                    {evoStatus === 'evoluindo' ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : evoStatus === 'travado' ? <TrendingDown className="h-3 w-3 text-red-400" /> : <Minus className="h-3 w-3 text-amber-400" />}
                    {evoInfo.label}
                  </span>
                  <span className="text-emerald-400">{prospect.trainingProgress || 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${prospect.trainingProgress || 0}%` }}
                    className={`h-full ${evoStatus === 'evoluindo' ? 'bg-emerald-500' : evoStatus === 'travado' ? 'bg-red-500' : 'bg-amber-500'} shadow-[0_0_8px_rgba(16,185,129,0.4)]`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
            <div className="flex flex-col items-center p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <Zap className="h-3.5 w-3.5 text-amber-400 mb-1" />
              <span className="text-[8px] uppercase font-black text-white/30 tracking-widest">Energia</span>
              <span className="text-xs font-black italic">{prospect.energy ?? 100}%</span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <Heart className="h-3.5 w-3.5 text-red-400 mb-1" />
              <span className="text-[8px] uppercase font-black text-white/30 tracking-widest">Moral</span>
              <span className="text-xs font-black italic">{prospect.morale ?? 60}</span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400 mb-1" />
              <span className="text-[8px] uppercase font-black text-white/30 tracking-widest">Valor</span>
              <span className="text-xs font-black italic text-emerald-400">R${(Number(prospect.marketValue || 0) / 1000).toFixed(0)}k</span>
            </div>
          </div>
          
          {prospect.promotionReady && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-8 text-[10px] font-black uppercase italic tracking-tighter gap-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(prospect); // Open modal which has the promotion button
                }}
              >
                <ArrowUp className="h-3 w-3" /> Pronto p/ Profissional
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
