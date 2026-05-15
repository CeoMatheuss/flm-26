import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Timer, Users, TrendingUp, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  lastYouthGenAt: string;
  totalPlayers: number;
  academyLevel: number;
  avgPotential: number;
  isConstructing?: boolean;
  constructionRemaining?: string;
  constructionProgress?: number;
}

export function YouthAcademyHeader({
  lastYouthGenAt,
  totalPlayers,
  academyLevel,
  avgPotential,
  isConstructing,
  constructionRemaining,
  constructionProgress,
}: Props) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const lastGen = new Date(lastYouthGenAt).getTime();
      const nextGen = lastGen + 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = nextGen - now;

      if (diff <= 0) {
        setTimeLeft('Disponível agora!');
        return;
      }

      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [lastYouthGenAt]);

  return (
    <div className="space-y-4 mb-6">
      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Countdown Card */}
        <Card className="game-card-accent bg-gradient-to-br from-primary/20 to-accent/30 border-primary/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Timer className="h-20 w-20 rotate-12" />
          </div>
          <CardContent className="p-4 flex flex-col justify-between h-full relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary/80">Próxima Geração</span>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground font-mono">{timeLeft}</p>
              <p className="text-[10px] text-muted-foreground mt-1">1 novo junior a cada 7 dias reais</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Players */}
        <Card className="game-card bg-card/40 border-border/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Jovens Ativos</p>
              <p className="text-2xl font-black">{totalPlayers}</p>
            </div>
          </CardContent>
        </Card>

        {/* Academy Level */}
        <Card className="game-card bg-card/40 border-border/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Nível da Base</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-black leading-none">{academyLevel}</p>
                <span className="text-[10px] text-muted-foreground">Nv {academyLevel}/30</span>
              </div>
              <Progress value={(academyLevel / 30) * 100} className="h-1 mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Avg Potential */}
        <Card className="game-card bg-card/40 border-border/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Potencial Médio</p>
              <p className="text-2xl font-black text-amber-400">{avgPotential.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Construction Banner (if active) */}
      <AnimatePresence>
        {isConstructing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
              <Timer className="h-5 w-5 text-orange-400 animate-spin-slow" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-orange-300 truncate">Expansão da Academia em andamento</p>
                <span className="text-xs font-mono text-orange-400">{constructionRemaining} restantes</span>
              </div>
              <Progress value={constructionProgress} className="h-1.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
