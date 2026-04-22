import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe2, Trophy, Medal } from 'lucide-react';
import { INTERNATIONAL_CUPS, ALL_CONTINENTS } from '@/data/internationalCompetitions';

interface IntlCup {
  id: string;
  name: string;
  cup_type: string;
  tier: string | null;
  continent: string | null;
  season_year: number | null;
  status: string | null;
  current_round: number | null;
  total_rounds: number | null;
}

interface Props {
  cups: IntlCup[];
  teamCount: (cupId: string) => number;
  countriesPerCup: (cupId: string) => number;
}

export function InternationalCupsSection({ cups, teamCount, countriesPerCup }: Props) {
  const currentYear = new Date().getFullYear();
  const intlCups = cups.filter(c => c.cup_type === 'continental' && c.season_year === currentYear);

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-primary" />
          🌎 Copas Continentais (Temporada {currentYear})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ALL_CONTINENTS.map(cont => {
          const meta = INTERNATIONAL_CUPS[cont];
          const principal = intlCups.find(c => c.continent === cont && c.tier === 'principal');
          const secundaria = intlCups.find(c => c.continent === cont && c.tier === 'secundaria');

          return (
            <div key={cont} className="p-2 rounded-lg border border-border/40 bg-muted/10">
              <p className="text-[11px] font-bold flex items-center gap-1.5 mb-1.5">
                <span className="text-base">{meta.emoji}</span> {cont}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {/* Principal */}
                <div className={`p-1.5 rounded border ${principal ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-dashed border-muted-foreground/20'}`}>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <Trophy className="h-3 w-3 text-yellow-400 shrink-0" />
                      <span className="text-[10px] font-semibold truncate">{meta.principal}</span>
                    </div>
                    {principal ? (
                      <div className="flex gap-0.5 shrink-0">
                        <Badge variant="outline" className="text-[8px]">{teamCount(principal.id)}/32</Badge>
                        <Badge variant="outline" className="text-[8px]">{principal.status}</Badge>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[8px] text-muted-foreground">não criada</Badge>
                    )}
                  </div>
                  {principal && (
                    <p className="text-[8px] text-muted-foreground mt-0.5">
                      R{principal.current_round || 0}/{principal.total_rounds || 0} • {countriesPerCup(principal.id)} países
                    </p>
                  )}
                </div>

                {/* Secundaria */}
                <div className={`p-1.5 rounded border ${secundaria ? 'border-slate-400/40 bg-slate-400/5' : 'border-dashed border-muted-foreground/20'}`}>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <Medal className="h-3 w-3 text-slate-300 shrink-0" />
                      <span className="text-[10px] font-semibold truncate">{meta.secundaria}</span>
                    </div>
                    {secundaria ? (
                      <div className="flex gap-0.5 shrink-0">
                        <Badge variant="outline" className="text-[8px]">{teamCount(secundaria.id)}/32</Badge>
                        <Badge variant="outline" className="text-[8px]">{secundaria.status}</Badge>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[8px] text-muted-foreground">não criada</Badge>
                    )}
                  </div>
                  {secundaria && (
                    <p className="text-[8px] text-muted-foreground mt-0.5">
                      R{secundaria.current_round || 0}/{secundaria.total_rounds || 0} • {countriesPerCup(secundaria.id)} países
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
