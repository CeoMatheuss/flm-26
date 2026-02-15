import { TacticsConfig, Formation } from '@/types/tactics';
import { Player } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormationView } from './FormationView';

interface Props {
  tactics: TacticsConfig;
  players: Player[];
  onUpdate: (tactics: TacticsConfig) => void;
}

const formations: Formation[] = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2'];

export function TacticsTab({ tactics, players, onUpdate }: Props) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 2D Formation View */}
      <Card>
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
          <CardTitle className="text-sm sm:text-lg flex items-center justify-between">
            <span>Escalação — {tactics.formation}</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{players.length} jogadores</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <FormationView formation={tactics.formation} players={players} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
          <CardTitle className="text-sm sm:text-lg">Formação</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {formations.map(f => (
              <Button
                key={f}
                size="sm"
                variant={tactics.formation === f ? 'default' : 'outline'}
                onClick={() => onUpdate({ ...tactics, formation: f })}
                className="text-xs sm:text-sm"
              >
                {f}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
          <CardTitle className="text-sm sm:text-lg">Estilo de Jogo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
          <div>
            <p className="text-[10px] sm:text-sm text-muted-foreground mb-1.5 sm:mb-2">Mentalidade</p>
            <div className="flex gap-1.5 sm:gap-2">
              {(['defensivo', 'equilibrado', 'ofensivo'] as const).map(s => (
                <Button key={s} size="sm" variant={tactics.playStyle === s ? 'default' : 'outline'} className="flex-1 capitalize text-[10px] sm:text-sm" onClick={() => onUpdate({ ...tactics, playStyle: s })}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] sm:text-sm text-muted-foreground mb-1.5 sm:mb-2">Pressão</p>
            <div className="flex gap-1.5 sm:gap-2">
              {(['baixo', 'medio', 'alto'] as const).map(p => (
                <Button key={p} size="sm" variant={tactics.pressing === p ? 'default' : 'outline'} className="flex-1 capitalize text-[10px] sm:text-sm" onClick={() => onUpdate({ ...tactics, pressing: p })}>
                  {p}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] sm:text-sm text-muted-foreground mb-1.5 sm:mb-2">Ritmo</p>
            <div className="flex gap-1.5 sm:gap-2">
              {(['lento', 'normal', 'rapido'] as const).map(t => (
                <Button key={t} size="sm" variant={tactics.tempo === t ? 'default' : 'outline'} className="flex-1 capitalize text-[10px] sm:text-sm" onClick={() => onUpdate({ ...tactics, tempo: t })}>
                  {t === 'rapido' ? 'rápido' : t}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
          <CardTitle className="text-sm sm:text-lg">Resumo Tático</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Badge className="text-[10px] sm:text-sm">{tactics.formation}</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-sm capitalize">{tactics.playStyle}</Badge>
            <Badge variant="outline" className="text-[10px] sm:text-sm">Pressão: {tactics.pressing}</Badge>
            <Badge variant="outline" className="text-[10px] sm:text-sm">Ritmo: {tactics.tempo === 'rapido' ? 'rápido' : tactics.tempo}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
