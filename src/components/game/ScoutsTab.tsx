import { Scout, ScoutReport, PlayerAttributes } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, UserPlus, Trash2, Star } from 'lucide-react';
import { useState } from 'react';
import { useLiveMatchGuard } from './LiveMatchGuard';

interface Props {
  scouts: Scout[];
  scoutReports: ScoutReport[];
  matchesSinceLastScout: number;
  budget: number;
  availableScouts?: Scout[];
  lastScoutGeneratedAt?: string;
  onHireScout: (skill: number) => void;
  onFireScout: (scoutId: string) => void;
  onAcceptAvailableScout?: (scoutId: string) => void;
  onBuyPremiumScout?: () => void;
}

const scoutOptions = [
  { skill: 1, name: 'Amador Local', salary: 5000, description: 'Observa jogadores da região. Relatórios básicos.' },
  { skill: 2, name: 'Observador Iniciante', salary: 12000, description: 'Alguma experiência. Identifica posição e idade.' },
  { skill: 3, name: 'Olheiro Regional', salary: 25000, description: 'Conhece a divisão. Revela alguns atributos.' },
  { skill: 4, name: 'Olheiro Experiente', salary: 45000, description: 'Bom olho para talentos. Boa precisão.' },
  { skill: 5, name: 'Analista Profissional', salary: 70000, description: 'Relatórios detalhados. Alta precisão.' },
  { skill: 6, name: 'Scout Nacional', salary: 100000, description: 'Rede nacional de contatos. Relatórios completos.' },
  { skill: 7, name: 'Scout Internacional', salary: 150000, description: 'Visão global. Descobre joias escondidas.' },
  { skill: 8, name: 'Especialista Elite', salary: 220000, description: 'Top do mercado. Quase 100% de precisão.' },
  { skill: 9, name: 'Lenda da Observação', salary: 300000, description: 'O melhor dos melhores. Nunca erra.' },
  { skill: 10, name: 'Gênio Supremo', salary: 500000, description: 'Lendário. Relatórios perfeitos e instantâneos.' },
];

const attrLabels: Record<string, string> = {
  speed: '⚡ Vel',
  shooting: '🎯 Fin',
  passing: '📐 Pas',
  defending: '🛡️ Def',
  physical: '💪 Fís',
  dribbling: '🎨 Dri',
  setPieces: '🎱 BP',
  positioning: '📍 Pos',
  heading: '🗣️ Cab',
  marking: '🔒 Mar',
  vision: '👁️ Vis',
  crossing: '🎯 Cru',
  longShots: '🚀 CL',
  workRate: '🔥 Int',
  composure: '🧠 Com',
  aggression: '⚔️ Agr',
};

export function ScoutsTab({ scouts, scoutReports, matchesSinceLastScout, budget, availableScouts = [], lastScoutGeneratedAt, onHireScout: _onHireScout, onFireScout: _onFireScout, onAcceptAvailableScout: _onAcceptAvailableScout, onBuyPremiumScout: _onBuyPremiumScout }: Props) {
  const { guard } = useLiveMatchGuard();
  const onHireScout = guard(_onHireScout);
  const onFireScout = guard(_onFireScout);
  const onAcceptAvailableScout = guard(_onAcceptAvailableScout || (() => {}));
  const onBuyPremiumScout = guard(_onBuyPremiumScout || (() => {}));
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [showHire, setShowHire] = useState(false);

  const bestScoutSkill = scouts.length > 0 ? Math.max(...scouts.map(s => s.skill)) : 0;
  const totalScoutSalary = scouts.reduce((s, sc) => s + sc.salary, 0);
  const reportsPerCycle = scouts.length;

  // Próximo olheiro auto em (7d - tempo decorrido)
  const nextScoutMs = (() => {
    if (!lastScoutGeneratedAt) return 0;
    const elapsed = Date.now() - new Date(lastScoutGeneratedAt).getTime();
    return Math.max(0, 7 * 24 * 60 * 60 * 1000 - elapsed);
  })();
  const nextScoutLabel = nextScoutMs > 0
    ? `${Math.floor(nextScoutMs / (24 * 60 * 60 * 1000))}d ${Math.floor((nextScoutMs / (60 * 60 * 1000)) % 24)}h`
    : 'Disponível agora!';

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-primary">🔍 Departamento de Olheiros</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {scouts.length === 0
                  ? 'Contrate olheiros para avaliar jogadores livres!'
                  : `${scouts.length} olheiro(s) • ${reportsPerCycle} relatório(s) a cada 5 jogos`}
              </p>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="text-[10px] text-muted-foreground">Próximo relatório</p>
              <p className="text-sm font-bold text-primary">{scouts.length > 0 ? `${5 - matchesSinceLastScout} jogos` : '—'}</p>
            </div>
          </div>
          {scouts.length > 0 && <Progress value={(matchesSinceLastScout / 5) * 100} className="h-1.5 mt-2" />}
        </CardContent>
      </Card>

      {/* V3: Olheiros Disponíveis (auto-gerados a cada 7 dias) + Premium */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-background">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-400">🎁 Olheiros Disponíveis</p>
              <p className="text-[10px] text-muted-foreground">Próximo automático em: <strong>{nextScoutLabel}</strong></p>
            </div>
            {_onBuyPremiumScout && (
              <Button size="sm" onClick={onBuyPremiumScout} className="h-7 text-[10px] gap-1 bg-amber-500 hover:bg-amber-600 text-black">
                🌟 Olheiro Lendário (Premium)
              </Button>
            )}
          </div>
          {availableScouts.length > 0 ? (
            <div className="space-y-1.5">
              {availableScouts.map(s => (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-0.5 shrink-0 w-14">
                    {Array.from({ length: Math.min(5, s.skill) }).map((_, i) => (
                      <Star key={i} className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                    ))}
                    {s.skill > 5 && <span className="text-[8px] text-yellow-400 font-bold">+{s.skill - 5}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate">{s.name}</p>
                    <p className="text-[9px] text-muted-foreground">Hab {s.skill}/10 • R${(s.salary / 1000).toFixed(0)}k/mês</p>
                  </div>
                  <Button size="sm" onClick={() => onAcceptAvailableScout(s.id)} className="h-6 text-[10px] px-2">Aceitar</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground text-center py-2">Aguardando geração automática...</p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Olheiros</p>
            <p className="text-lg font-bold">{scouts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Melhor Habilidade</p>
            <p className="text-lg font-bold text-primary">{bestScoutSkill || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Custo Mensal</p>
            <p className="text-lg font-bold text-yellow-400">R${(totalScoutSalary / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
      </div>

      {/* My Scouts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Meus Olheiros</h3>
          <Button size="sm" variant="outline" onClick={() => setShowHire(!showHire)} className="text-xs gap-1 h-7">
            <UserPlus className="h-3 w-3" /> Contratar
          </Button>
        </div>

        {scouts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum olheiro contratado.</p>
              <p className="text-[10px] text-muted-foreground">Contrate olheiros para avaliar jogadores livres antes de assinar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {scouts.map(scout => (
              <Card key={scout.id}>
                <CardContent className="p-2 sm:p-3 flex items-center gap-2">
                  <div className="flex items-center gap-1 shrink-0">
                    {Array.from({ length: Math.min(5, scout.skill) }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                    {scout.skill > 5 && <span className="text-[9px] text-yellow-400 font-bold">+{scout.skill - 5}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{scout.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Hab: {scout.skill}/10 • Contrato: {scout.contract}T • R${(scout.salary / 1000).toFixed(0)}k/mês
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onFireScout(scout.id)} className="h-6 px-2 text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Hire */}
      {showHire && (
        <div>
          <h3 className="font-semibold text-sm mb-2">Contratar Olheiro</h3>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {scoutOptions.map(opt => {
              const hireCost = opt.salary * 3; // 3 months signing fee
              return (
                <Card key={opt.skill} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-2 sm:p-3 flex items-center gap-2">
                    <div className="flex items-center gap-0.5 shrink-0 w-16">
                      {Array.from({ length: Math.min(5, opt.skill) }).map((_, i) => (
                        <Star key={i} className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      ))}
                      {opt.skill > 5 && <span className="text-[8px] text-yellow-400 font-bold ml-0.5">+{opt.skill - 5}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[11px] truncate">{opt.name}</p>
                      <p className="text-[9px] text-muted-foreground">{opt.description}</p>
                      <p className="text-[9px] text-muted-foreground">Salário: R${(opt.salary / 1000).toFixed(0)}k/mês • Contratação: R${(hireCost / 1000).toFixed(0)}k</p>
                    </div>
                    <Button size="sm" onClick={() => { onHireScout(opt.skill); setShowHire(false); }} disabled={budget < hireCost} className="h-6 px-2 text-[10px]">
                      <UserPlus className="h-3 w-3 mr-1" /> Contratar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Reports */}
      <div>
        <h3 className="font-semibold text-sm mb-2">Relatórios ({scoutReports.length})</h3>
        {scoutReports.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">
                {scouts.length === 0 ? 'Contrate olheiros primeiro!' : 'Dispute partidas para receber relatórios.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {scoutReports.map(report => (
              <Card key={report.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedReport(selectedReport === report.id ? null : report.id)}>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] shrink-0">{report.player.position}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{report.player.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {report.player.age}a • Por: {report.scoutName} • Precisão: {report.accuracy}%
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">~OVR {report.estimatedOverall}</Badge>
                  </div>
                  {selectedReport === report.id && (
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {(Object.entries(report.estimatedAttributes) as [keyof PlayerAttributes, number][]).map(([key, val]) => (
                        <div key={key} className="text-center bg-muted/30 rounded px-1 py-0.5">
                          <p className="text-[8px] text-muted-foreground">{attrLabels[key]}</p>
                          <p className="text-[10px] font-bold">{val}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
