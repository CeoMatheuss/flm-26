import { useState } from 'react';
import { HelpCircle, X, Dumbbell, Zap, HeartPulse, Target, Brain, Shield, Footprints, Wind, Eye, Crosshair, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrainTip {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  attrs: string[];
  desc: string;
  risk: 'baixo' | 'médio' | 'alto';
  positions: string[];
}

const tips: TrainTip[] = [
  {
    key: 'físico',
    label: 'Físico',
    icon: Dumbbell,
    color: 'text-orange-400',
    attrs: ['physical', 'stamina'],
    desc: 'Aumenta resistência física e potência muscular. Jogadores ficam mais fortes nas disputas e aguentam mais tempo em alto ritmo.',
    risk: 'médio',
    positions: ['VOL', 'ZAG', 'LAT'],
  },
  {
    key: 'finalização',
    label: 'Finalização',
    icon: Target,
    color: 'text-red-400',
    attrs: ['shooting', 'longShots', 'positioning'],
    desc: 'Melhora precisão e potência dos chutes. Atacantes evoluem mais rápido. Ideal para quem quer aumentar gols.',
    risk: 'baixo',
    positions: ['ATA', 'MEI'],
  },
  {
    key: 'passe',
    label: 'Passe',
    icon: Footprints,
    color: 'text-blue-400',
    attrs: ['passing', 'vision', 'crossing'],
    desc: 'Aprimora qualidade e precisão dos passes curtos, longos e cruzamentos. Essencial para meias e laterais.',
    risk: 'baixo',
    positions: ['MEI', 'LAT', 'VOL'],
  },
  {
    key: 'defesa',
    label: 'Defesa',
    icon: Shield,
    color: 'text-cyan-400',
    attrs: ['defending', 'marking', 'heading'],
    desc: 'Fortalece posicionamento defensivo, marcação e duelos aéreos. Zagueiros e volantes se beneficiam mais.',
    risk: 'baixo',
    positions: ['ZAG', 'VOL', 'LAT'],
  },
  {
    key: 'velocidade',
    label: 'Velocidade',
    icon: Wind,
    color: 'text-yellow-400',
    attrs: ['speed', 'dribbling'],
    desc: 'Aumenta velocidade de sprint e agilidade. Atenção: treino intenso de velocidade tem risco médio de lesão muscular.',
    risk: 'médio',
    positions: ['ATA', 'LAT', 'MEI'],
  },
  {
    key: 'tático',
    label: 'Tático',
    icon: Brain,
    color: 'text-purple-400',
    attrs: ['vision', 'positioning', 'workRate'],
    desc: 'Melhora leitura de jogo, posicionamento e esforço tático. Jogadores tomam decisões melhores. Baixo risco físico.',
    risk: 'baixo',
    positions: ['MEI', 'VOL', 'ZAG'],
  },
  {
    key: 'goleiro',
    label: 'Goleiro',
    icon: Crosshair,
    color: 'text-emerald-400',
    attrs: ['goalkeeping', 'positioning', 'composure'],
    desc: 'Treino específico para goleiros: reflexos, posicionamento, saídas e bolas aéreas. Não evolui outros jogadores.',
    risk: 'baixo',
    positions: ['GOL'],
  },
  {
    key: 'entrosamento',
    label: 'Entrosamento',
    icon: Users,
    color: 'text-pink-400',
    attrs: ['composure', 'workRate'],
    desc: 'Melhora o entrosamento coletivo, moral e comunicação entre jogadores. Efeito em todo o elenco.',
    risk: 'baixo',
    positions: ['todos'],
  },
];

const intensityInfo = [
  {
    label: '🟢 Leve',
    desc: 'Evolução lenta e segura. Ideal para recuperação pós-jogo. Risco de lesão: muito baixo.',
    fatigue: '-5 stamina/semana',
    injRisk: '<1%',
    evolSpeed: 'Lenta (1x)',
  },
  {
    label: '🟡 Moderado',
    desc: 'Equilíbrio entre evolução e segurança. Recomendado para a maioria dos jogadores.',
    fatigue: '-12 stamina/semana',
    injRisk: '~3%',
    evolSpeed: 'Normal (1.5x)',
  },
  {
    label: '🔴 Pesado',
    desc: 'Evolução acelerada mas alto risco de lesão. Use com cautela, especialmente com stamina baixa.',
    fatigue: '-20 stamina/semana',
    injRisk: '~8%',
    evolSpeed: 'Rápida (2x)',
  },
];

interface Props {
  className?: string;
}

export function TrainingHelpButton({ className }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'focos' | 'intensidade' | 'dicas'>('focos');

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 text-muted-foreground hover:text-primary ${className}`}
        onClick={() => setOpen(true)}
        title="Ajuda sobre treinos"
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <Card className="w-full max-w-md max-h-[85vh] flex flex-col border-primary/30">
            <CardHeader className="pb-2 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" /> Central de Treinos
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* Tabs */}
              <div className="flex gap-1 pt-1">
                {(['focos', 'intensidade', 'dicas'] as const).map(t => (
                  <Button
                    key={t}
                    size="sm"
                    variant={tab === t ? 'default' : 'ghost'}
                    className="flex-1 h-7 text-[10px] capitalize"
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="overflow-y-auto space-y-2 pb-4">
              {/* ── Focos de Treino ── */}
              {tab === 'focos' && (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground">Cada foco melhora atributos específicos. Selecione o foco mais adequado para a posição do jogador.</p>
                  {tips.map(tip => (
                    <div key={tip.key} className="border border-border/30 rounded-lg p-2.5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <tip.icon className={`h-4 w-4 ${tip.color} shrink-0`} />
                        <span className="text-xs font-semibold">{tip.label}</span>
                        <Badge
                          variant="outline"
                          className={`ml-auto text-[8px] px-1 h-4 ${tip.risk === 'alto' ? 'text-destructive border-destructive/40' : tip.risk === 'médio' ? 'text-yellow-400 border-yellow-400/40' : 'text-emerald-400 border-emerald-400/40'}`}
                        >
                          Risco {tip.risk}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{tip.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] text-muted-foreground">Atributos:</span>
                        {tip.attrs.map(a => (
                          <Badge key={a} variant="secondary" className="text-[8px] px-1 h-3.5">{a}</Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[9px] text-muted-foreground">Posições ⭐:</span>
                        {tip.positions.map(p => (
                          <Badge key={p} variant="outline" className={`text-[8px] px-1 h-3.5 ${tip.color} border-current/40`}>{p}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Intensidade ── */}
              {tab === 'intensidade' && (
                <div className="space-y-3">
                  <p className="text-[10px] text-muted-foreground">A intensidade afeta velocidade de evolução, gasto de stamina e risco de lesão.</p>
                  {intensityInfo.map(int => (
                    <div key={int.label} className="border border-border/30 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-bold">{int.label}</p>
                      <p className="text-[10px] text-muted-foreground">{int.desc}</p>
                      <div className="grid grid-cols-3 gap-1">
                        <div className="text-center bg-muted/30 rounded p-1.5">
                          <p className="text-[8px] text-muted-foreground">Fadiga</p>
                          <p className="text-[10px] font-bold">{int.fatigue}</p>
                        </div>
                        <div className="text-center bg-muted/30 rounded p-1.5">
                          <p className="text-[8px] text-muted-foreground">Risco Lesão</p>
                          <p className="text-[10px] font-bold">{int.injRisk}</p>
                        </div>
                        <div className="text-center bg-muted/30 rounded p-1.5">
                          <p className="text-[8px] text-muted-foreground">Evolução</p>
                          <p className="text-[10px] font-bold">{int.evolSpeed}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Dicas Gerais ── */}
              {tab === 'dicas' && (
                <div className="space-y-2">
                  {[
                    { icon: '🎯', title: 'Focos por posição', desc: 'Use focos recomendados (⭐) para cada posição. Treinar fora da posição ainda funciona, mas é menos eficiente.' },
                    { icon: '🧪', title: 'Jogadores jovens evoluem mais', desc: 'Jogadores abaixo de 25 anos têm bônus de +50% na velocidade de desenvolvimento. Invista neles!' },
                    { icon: '💤', title: 'Stamina abaixo de 40% = risco', desc: 'Com stamina baixa, treinos pesados têm chance alta de lesão. Prefira treinos leves para recuperar.' },
                    { icon: '🏋️', title: 'CT Nível alto = mais evolução', desc: 'Centro de Treinamento de nível alto reduz o número de semanas necessárias para evoluir atributos.' },
                    { icon: '🔄', title: 'Processe 1 semana por vez', desc: 'Clique em "Processar Semana" para avançar o treino. Os resultados aparecem imediatamente no log.' },
                    { icon: '⚽', title: 'Treinos ligados à tática', desc: 'O sistema sugere focos baseados na sua formação e estilo de jogo. Use as sugestões para um time mais coeso.' },
                    { icon: '👨‍⚕️', title: 'Fisioterapia protege dos treinos', desc: 'Nível alto de Fisioterapia reduz o risco de lesões durante treinos pesados.' },
                    { icon: '📊', title: 'Dedique = mais chance de avanço', desc: 'Jogadores com personalidade "dedicado" têm eventos especiais de treino com boosters extras.' },
                  ].map((d, i) => (
                    <div key={i} className="flex gap-2.5 p-2.5 border border-border/30 rounded-lg">
                      <span className="text-lg shrink-0 mt-0.5">{d.icon}</span>
                      <div>
                        <p className="text-xs font-semibold">{d.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{d.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
