import { Player } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Target, 
  Zap, 
  Shield, 
  ArrowRightLeft, 
  Crown,
  Heart,
  TrendingUp,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDynamicOverall } from '@/utils/positionUtils';
import { toast } from 'sonner';

interface Props {
  player: Player;
  position: string;
  isCaptain: boolean;
  onClose: () => void;
  onSetCaptain?: (id: string) => void;
  onSwap?: () => void;
}

export function PlayerTacticsPanel({ 
  player, 
  position, 
  isCaptain, 
  onClose,
  onSetCaptain,
  onSwap 
}: Props) {
  const dynamicOverall = getDynamicOverall(player, position as Player['position']);
  const posColor: Record<string, string> = {
    GOL: 'bg-amber-500',
    ZAG: 'bg-sky-600',
    LAT: 'bg-sky-500',
    VOL: 'bg-emerald-500',
    MEI: 'bg-orange-500',
    ATA: 'bg-rose-600',
  };

  return (
    <Card className="bg-zinc-950/90 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
      <CardContent className="p-0">
        <div className="relative h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
          </div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-4 left-6 flex items-end gap-4">
            <div className="relative">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-xl",
                posColor[player.position] || "bg-zinc-800"
              )}>
                <span className="text-2xl font-black text-white">{player.overall}</span>
              </div>
              <Badge className="absolute -bottom-2 -right-2 bg-white text-zinc-950 font-black border-none">
                {player.position}
              </Badge>
            </div>
            
            <div className="mb-1">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">
                {player.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  {player.age} anos • {player.nationality || 'Brasil'}
                </span>
                {isCaptain && (
                  <Badge variant="outline" className="h-4 border-amber-500/50 text-amber-500 text-[8px] font-black uppercase px-1">
                    Capitão
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <StatBox 
              icon={<Zap className="w-3 h-3 text-amber-400" />}
              label="Físico"
              value={`${player.stamina}%`}
              color={player.stamina > 70 ? "text-emerald-400" : player.stamina > 40 ? "text-amber-400" : "text-rose-500"}
            />
            <StatBox 
              icon={<Heart className="w-3 h-3 text-rose-400" />}
              label="Moral"
              value={String(player.morale)}
              color="text-white"
            />
            <StatBox 
              icon={<Target className="w-3 h-3 text-sky-400" />}
              label="Eficácia na Pos."
              value={`${Math.round((dynamicOverall / player.overall) * 100)}%`}
              color="text-white"
            />
            <StatBox 
              icon={<TrendingUp className="w-3 h-3 text-emerald-400" />}
              label="Rating Médio"
              value={player.matchRating?.toFixed(1) || '0.0'}
              color="text-white"
            />
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
              <Shield className="w-3 h-3" /> Instruções Táticas
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {['atacar-mais', 'defender-mais', 'ficar-aberto', 'infiltrar', 'economizar-stamina'].map((instr) => (
                <Button
                  key={instr}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 text-[9px] font-bold uppercase tracking-tight bg-white/5 border-white/10 hover:bg-emerald-500/20",
                    // Aqui viria a lógica de marcar se a instrução está ativa
                  )}
                  onClick={() => {
                    toast.success(`Instrução: ${instr} definida para ${player.name}`);
                  }}
                >
                  {instr.replace('-', ' ')}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/5">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold h-12"
                onClick={onSwap}
              >
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                Trocar Jogador
              </Button>
              
              {!isCaptain && onSetCaptain && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold h-12"
                  onClick={() => onSetCaptain(player.id)}
                >
                  <Crown className="w-4 h-4 text-amber-400" />
                  Tornar Capitão
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{label}</span>
      </div>
      <span className={cn("text-lg font-black", color)}>{value}</span>
    </div>
  );
}
