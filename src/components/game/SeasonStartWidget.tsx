import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Trophy, Zap, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  seasonNumber?: number;
}

export function SeasonStartWidget({ seasonNumber = 1 }: Props) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    const update = () => {
      // Target: May 1, 2026 at midnight (local time)
      const target = new Date(2026, 4, 1, 0, 0, 0); // month is 0-indexed
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      
      if (diff <= 0) {
        setIsStarted(true);
        setTimeLeft('');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (seasonNumber > 1) return null;

  return (
    <Card className="border-cyan-500/30 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(190 80% 50% / 0.06), hsl(var(--primary) / 0.03))' }}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl shrink-0" style={{ background: 'linear-gradient(135deg, hsl(190 80% 50% / 0.25), hsl(var(--primary) / 0.15))' }}>
            {isStarted ? (
              <Zap className="h-6 w-6 text-cyan-400" />
            ) : (
              <CalendarDays className="h-6 w-6 text-cyan-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-black">
                {isStarted ? '🏟️ Temporada em Andamento!' : '🏟️ Temporada vai Começar!'}
              </p>
              <Badge variant="outline" className="text-[7px] border-cyan-500/30 text-cyan-400 shrink-0">
                T{seasonNumber}
              </Badge>
            </div>
            {isStarted ? (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                A primeira temporada oficial já começou! Participe dos campeonatos e evolua seu clube.
              </p>
            ) : (
              <>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Início oficial: <span className="font-bold text-foreground">01/05/2026</span>
                </p>
                {timeLeft && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-3 w-3 text-cyan-400" />
                    <span className="text-[10px] font-mono font-bold text-cyan-400">{timeLeft}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex flex-wrap gap-1 mt-1.5">
              <Badge variant="secondary" className="text-[7px] gap-0.5">
                <Trophy className="h-2.5 w-2.5" /> Campeonatos
              </Badge>
              <Badge variant="secondary" className="text-[7px] gap-0.5">
                <Zap className="h-2.5 w-2.5" /> 4 Divisões
              </Badge>
              <Badge variant="secondary" className="text-[7px] gap-0.5">
                🌍 38 Países
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
