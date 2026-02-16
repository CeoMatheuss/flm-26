import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy as TrophyIcon } from 'lucide-react';
import { Trophy } from '@/types/clubProfile';

interface Props {
  trophies: Trophy[];
}

export function TrophiesTab({ trophies }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm sm:text-lg flex items-center gap-2">
        <TrophyIcon className="h-5 w-5 text-yellow-500" /> 🏆 Galeria de Troféus
      </h3>

      {trophies.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <TrophyIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum troféu conquistado ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Vença campeonatos e premiações para colecionar troféus!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trophies.map((trophy, i) => (
            <Card key={i} className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-xl">🏆</span> {trophy.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Temporada {trophy.season}</p>
                <p className="text-[10px] text-muted-foreground">{trophy.date}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
