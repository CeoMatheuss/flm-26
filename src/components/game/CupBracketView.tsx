import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  cupId: string;
  matches: any[];
}

export function CupBracketView({ matches }: Props) {
  // Simplificação: agrupar por rodada
  const rounds = [1, 2, 3, 4, 5, 6].map(r => matches.filter(m => m.round === r));

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-[800px] p-4">
        {rounds.map((roundMatches, idx) => (
          roundMatches.length > 0 && (
            <div key={idx} className="flex-1 space-y-4">
              <h4 className="text-[10px] font-black uppercase text-muted-foreground text-center mb-4 border-b border-border/50 pb-1">
                Fase {idx + 1}
              </h4>
              {roundMatches.map(m => (
                <div key={m.id} className="relative">
                  <Card className={`border-l-4 ${m.status === 'finished' ? 'border-l-emerald-500' : 'border-l-primary/30'} bg-card/40`}>
                    <CardContent className="p-2 space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold truncate max-w-[80px]">{m.home?.club_name || 'TBD'}</span>
                        <span className="font-black">{m.home_goals ?? '-'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold truncate max-w-[80px]">{m.away?.club_name || 'TBD'}</span>
                        <span className="font-black">{m.away_goals ?? '-'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  );
}
