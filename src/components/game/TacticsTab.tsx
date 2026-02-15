import { TacticsConfig, Formation } from '@/types/tactics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  tactics: TacticsConfig;
  onUpdate: (tactics: TacticsConfig) => void;
}

const formations: Formation[] = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2'];

export function TacticsTab({ tactics, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Formação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {formations.map(f => (
              <Button
                key={f}
                variant={tactics.formation === f ? 'default' : 'outline'}
                onClick={() => onUpdate({ ...tactics, formation: f })}
              >
                {f}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estilo de Jogo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Mentalidade</p>
            <div className="flex gap-2">
              {(['defensivo', 'equilibrado', 'ofensivo'] as const).map(s => (
                <Button key={s} variant={tactics.playStyle === s ? 'default' : 'outline'} className="flex-1 capitalize" onClick={() => onUpdate({ ...tactics, playStyle: s })}>
                  {s}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Pressão</p>
            <div className="flex gap-2">
              {(['baixo', 'medio', 'alto'] as const).map(p => (
                <Button key={p} variant={tactics.pressing === p ? 'default' : 'outline'} className="flex-1 capitalize" onClick={() => onUpdate({ ...tactics, pressing: p })}>
                  {p}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Ritmo</p>
            <div className="flex gap-2">
              {(['lento', 'normal', 'rapido'] as const).map(t => (
                <Button key={t} variant={tactics.tempo === t ? 'default' : 'outline'} className="flex-1 capitalize" onClick={() => onUpdate({ ...tactics, tempo: t })}>
                  {t === 'rapido' ? 'rápido' : t}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo Tático</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge className="text-sm">{tactics.formation}</Badge>
            <Badge variant="secondary" className="text-sm capitalize">{tactics.playStyle}</Badge>
            <Badge variant="outline" className="text-sm">Pressão: {tactics.pressing}</Badge>
            <Badge variant="outline" className="text-sm">Ritmo: {tactics.tempo === 'rapido' ? 'rápido' : tactics.tempo}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
