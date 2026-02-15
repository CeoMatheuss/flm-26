import { Infrastructure, getUpgradeCost } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, ArrowUp, Landmark, Trophy } from 'lucide-react';

interface Props {
  infrastructure: Infrastructure;
  budget: number;
  onUpgrade: (facility: 'youthAcademy') => void;
}

const facilityInfo = {
  youthAcademy: {
    name: 'Base / Academia',
    icon: GraduationCap,
    desc: 'Gera jogadores jovens melhores. Quanto maior o nível, maior o overall dos jovens gerados pela base.',
    color: 'text-purple-400',
  },
};

export function InfrastructureTab({ infrastructure, budget, onUpgrade }: Props) {
  return (
    <div className="space-y-4">
      {(Object.keys(facilityInfo) as Array<keyof typeof facilityInfo>).map(key => {
        const facility = infrastructure?.[key] ?? { level: 1, maxLevel: 10 };
        const info = facilityInfo[key];
        const Icon = info.icon;
        const cost = getUpgradeCost(facility.level);
        const isMaxed = facility.level >= facility.maxLevel;

        return (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Icon className={`h-5 w-5 ${info.color}`} />
                {info.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{info.desc}</p>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Nível {facility.level}/{facility.maxLevel}</span>
                <Progress value={(facility.level / facility.maxLevel) * 100} className="flex-1 h-3" />
                {'getExtra' in info && (
                  <span className="text-xs font-semibold text-primary">{(info as any).getExtra(facility.level)}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {Array.from({ length: facility.maxLevel }, (_, i) => (
                  <div
                    key={i}
                    className={`h-3 flex-1 rounded-sm ${i < facility.level ? 'bg-primary' : 'bg-muted'}`}
                  />
                ))}
              </div>

              {!isMaxed ? (
                <Button onClick={() => onUpgrade(key)} disabled={budget < cost} className="w-full gap-2">
                  <ArrowUp className="h-4 w-4" />
                  Melhorar para Nível {facility.level + 1} — R$ {(cost / 1000000).toFixed(2)}M
                </Button>
              ) : (
                <p className="text-sm text-center text-emerald-400 font-semibold py-2">✅ Nível Máximo!</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
