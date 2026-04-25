import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Sparkles, X } from 'lucide-react';
import { useDismissibleWidget } from '@/hooks/useDismissibleWidget';

interface Props {
  /** Temporada atual (ex: 1, 2…). Usado para gerar id único persistente. */
  season: number;
  /** Semana atual da temporada. */
  currentWeek: number;
  /** Total de semanas da temporada (default 38). */
  totalWeeks?: number;
  userId?: string;
}

/**
 * Widget físico "Quem será o campeão da Bola de Ouro?" — surge automaticamente
 * nas últimas 4 semanas da temporada. Persistente: uma vez fechado, NUNCA mais
 * reaparece para a mesma temporada (ver useDismissibleWidget).
 */
export function BallonDorTeaserWidget({ season, currentWeek, totalWeeks = 38, userId }: Props) {
  const isFinalStretch = currentWeek >= totalWeeks - 3 && currentWeek <= totalWeeks;

  const { isVisible, dismiss } = useDismissibleWidget(
    `ballon_dor_teaser_${season}`,
    userId,
    { type: 'ballon_dor_teaser' },
    isFinalStretch,
  );

  if (!isFinalStretch || !isVisible) return null;

  const weeksLeft = Math.max(0, totalWeeks - currentWeek);

  return (
    <Card
      className="border-yellow-500/40 overflow-hidden relative"
      style={{
        background:
          'linear-gradient(135deg, hsl(45 90% 50% / 0.12), hsl(35 95% 55% / 0.08), hsl(45 80% 40% / 0.04))',
      }}
    >
      <Button
        size="icon"
        variant="ghost"
        onClick={dismiss}
        aria-label="Fechar widget Bola de Ouro"
        className="absolute top-1.5 right-1.5 h-6 w-6 z-10 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl shrink-0"
            style={{
              background:
                'linear-gradient(135deg, hsl(45 95% 55% / 0.35), hsl(35 90% 45% / 0.20))',
            }}
          >
            <Trophy className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-400 drop-shadow" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base sm:text-lg font-black">
                🏆 Quem será o campeão da Bola de Ouro?
              </p>
              <Badge variant="outline" className="text-[10px] sm:text-xs border-yellow-500/40 text-yellow-400 shrink-0">
                T{season}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {weeksLeft > 0 ? (
                <>
                  Faltam <span className="font-bold text-foreground">{weeksLeft}</span> rodada{weeksLeft === 1 ? '' : 's'} para o fim da temporada.
                </>
              ) : (
                <>Esta é a rodada decisiva da temporada!</>
              )}
            </p>
            <p className="text-[11px] sm:text-xs text-muted-foreground/80 mt-0.5">
              Os melhores artilheiros, garçons e goleiros disputam o prêmio máximo.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1">
                <Sparkles className="h-3 w-3 text-yellow-400" /> Premiação ao final
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
