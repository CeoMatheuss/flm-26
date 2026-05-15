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
  
  const isWonderkid = prospect.rarity === 'Promessa' || prospect.rarity === 'Joia da Base';
  const isGenerational = prospect.rarity === 'Craque geracional';

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Craque geracional': return 'from-purple-600/20 to-amber-600/30 border-amber-500/50';
      case 'Promessa': return 'from-blue-600/20 to-purple-600/30 border-purple-500/50';
      case 'Bom talento': return 'from-emerald-600/20 to-blue-600/30 border-blue-500/50';
      default: return 'from-card to-accent/20 border-border/20';
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'Craque geracional': return 'bg-amber-500 text-black font-black border-amber-400';
      case 'Promessa': return 'bg-purple-600 text-white font-bold border-purple-400';
      case 'Bom talento': return 'bg-blue-600 text-white font-bold border-blue-400';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300 }}
      onClick={() => onClick(prospect)}
      className="cursor-pointer"
    >
      <Card className={`overflow-hidden border bg-gradient-to-br ${getRarityColor(prospect.rarity || 'Comum')} group relative`}>
        {isGenerational && (
          <div className="absolute top-0 right-0 p-1">
            <Crown className="h-5 w-5 text-amber-400 fill-amber-400 animate-bounce" />
          </div>
        )}
        
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Player Avatar placeholder */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-accent/50 flex items-center justify-center border border-border/50 group-hover:border-primary/50 transition-colors overflow-hidden">
                <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">👤</span>
                <div className="absolute bottom-0 right-0 w-6 h-4 bg-background/80 rounded-tl-md flex items-center justify-center border-t border-l border-border/50">
                  <span className="text-[10px] uppercase font-bold">{prospect.nationality?.substring(0, 3)}</span>
                </div>
              </div>
              <div className="absolute -top-2 -left-2">
                <Badge className={`${getRarityBadge(prospect.rarity || 'Comum')} text-[8px] h-5 min-w-[32px] justify-center px-1`}>
                  {prospect.position}
                </Badge>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold truncate group-hover:text-primary transition-colors">{prospect.name}</h3>
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">OVR {prospect.overall}</span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">{prospect.age} anos</span>
                <span className="text-muted-foreground/30">•</span>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-bold ${potInfo.color}`}>{potInfo.emoji} {potInfo.label}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {evoStatus === 'evoluindo' ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : evoStatus === 'travado' ? <TrendingDown className="h-3 w-3 text-red-400" /> : <Minus className="h-3 w-3 text-amber-400" />}
                    {evoInfo.label}
                  </span>
                  <span className="font-mono">{prospect.trainingProgress || 0}%</span>
                </div>
                <Progress value={prospect.trainingProgress || 0} className="h-1 bg-background/50" />
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/20">
            <div className="flex flex-col items-center">
              <Zap className="h-3 w-3 text-yellow-400 mb-1" />
              <span className="text-[9px] uppercase font-bold text-muted-foreground">Energia</span>
              <span className="text-[11px] font-bold">{prospect.energy ?? 100}%</span>
            </div>
            <div className="flex flex-col items-center">
              <Heart className="h-3 w-3 text-red-400 mb-1" />
              <span className="text-[9px] uppercase font-bold text-muted-foreground">Moral</span>
              <span className="text-[11px] font-bold">{prospect.morale ?? 60}</span>
            </div>
            <div className="flex flex-col items-center">
              <DollarSign className="h-3 w-3 text-emerald-400 mb-1" />
              <span className="text-[9px] uppercase font-bold text-muted-foreground">Valor</span>
              <span className="text-[11px] font-bold">R${(Number(prospect.marketValue || 0) / 1000).toFixed(0)}k</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
