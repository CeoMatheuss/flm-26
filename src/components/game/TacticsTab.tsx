import { useState } from 'react';
import { TacticsConfig, Formation, formationDescriptions, tacticsPresets, PlayStyle, Pressing, Tempo, Marking, PassingStyle, DefenseLine, Width } from '@/types/tactics';
import { Player } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormationView } from './FormationView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Zap, Target, Users, Star, Info, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface Props {
  tactics: TacticsConfig;
  players: Player[];
  onUpdate: (tactics: TacticsConfig) => void;
}

const allFormations: Formation[] = [
  '4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2',
  '4-1-4-1', '4-4-1-1', '3-4-3', '5-4-1', '4-5-1',
  '4-3-2-1', '4-2-4-0', '3-4-1-2', '4-1-2-1-2',
];

function TacticButton<T extends string>({ value, current, label, onClick }: { value: T; current: T; label?: string; onClick: (v: T) => void }) {
  const isActive = current === value;
  return (
    <button
      className={`flex-1 capitalize text-[10px] sm:text-xs min-w-0 px-2 py-1.5 sm:py-2 rounded-md font-medium transition-all ${
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
      }`}
      onClick={() => onClick(value)}
    >
      {label ?? value}
    </button>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 flex items-center gap-1 font-semibold uppercase tracking-wider">
      <Icon className="w-3 h-3 text-primary" /> {label}
    </p>
  );
}

export function TacticsTab({ tactics, players, onUpdate }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const activePlayers = players.filter(p => !p.injury);
  const injuredCount = players.length - activePlayers.length;

  const setField = <K extends keyof TacticsConfig>(key: K, value: TacticsConfig[K]) => {
    onUpdate({ ...tactics, [key]: value });
  };

  const applyPreset = (preset: typeof tacticsPresets[0]) => {
    onUpdate({ ...tactics, ...preset.config });
  };

  const setSpecialRole = (role: 'captainId' | 'freeKickTakerId' | 'penaltyTakerId' | 'cornerTakerId', playerId: string) => {
    onUpdate({ ...tactics, [role]: playerId });
    setSelectedPlayer(null);
  };

  // Tactical rating based on config
  const getTacticalRating = () => {
    let rating = 50;
    if (tactics.playStyle === 'equilibrado') rating += 5;
    if (tactics.pressing === 'alto') rating += 5;
    if (tactics.captainId) rating += 10;
    if (tactics.freeKickTakerId) rating += 5;
    if (tactics.penaltyTakerId) rating += 5;
    if (tactics.cornerTakerId) rating += 5;
    return Math.min(100, rating);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Tactical Overview Bar */}
      <Card className="border-primary/20">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-bold">{tactics.formation}</span>
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] capitalize">{tactics.playStyle}</Badge>
            </div>
            <div className="flex items-center gap-1.5">
              {injuredCount > 0 && <Badge variant="destructive" className="text-[9px]">🏥 {injuredCount}</Badge>}
              <Badge variant="outline" className="text-[9px]">{players.length} jog.</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Organização Tática</span>
            <Progress value={getTacticalRating()} className="flex-1 h-1.5" />
            <span className="text-[10px] font-bold text-primary">{getTacticalRating()}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Presets - compact horizontal scroll */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {tacticsPresets.map(preset => (
          <button
            key={preset.name}
            className="shrink-0 text-[9px] sm:text-[10px] px-2.5 py-1.5 rounded-full border border-border bg-card hover:bg-primary/10 hover:border-primary/30 transition-all font-medium whitespace-nowrap"
            onClick={() => applyPreset(preset)}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* 2D Formation View */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <FormationView
            formation={tactics.formation}
            players={players}
            captainId={tactics.captainId}
            onPlayerClick={setSelectedPlayer}
          />
          <p className="text-[8px] sm:text-[10px] text-muted-foreground mt-2 text-center">Toque em um jogador para atribuir funções</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="formation" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-9">
          <TabsTrigger value="formation" className="text-[10px] sm:text-xs gap-1"><Shield className="w-3 h-3" />Formação</TabsTrigger>
          <TabsTrigger value="style" className="text-[10px] sm:text-xs gap-1"><Target className="w-3 h-3" />Estilo</TabsTrigger>
          <TabsTrigger value="roles" className="text-[10px] sm:text-xs gap-1"><Users className="w-3 h-3" />Funções</TabsTrigger>
        </TabsList>

        {/* Formation Tab */}
        <TabsContent value="formation">
          <Card>
            <CardContent className="pt-3 px-3 sm:px-4 pb-3 space-y-3">
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                {allFormations.map(f => (
                  <button
                    key={f}
                    className={`text-[10px] sm:text-xs py-2 rounded-md font-mono font-bold transition-all ${
                      tactics.formation === f
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                    }`}
                    onClick={() => setField('formation', f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 flex items-start gap-2 border border-border/50">
                <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-[9px] sm:text-[11px] text-muted-foreground leading-relaxed">{formationDescriptions[tactics.formation]}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Style Tab */}
        <TabsContent value="style">
          <Card>
            <CardContent className="space-y-3 pt-3 px-3 sm:px-4 pb-3">
              <div>
                <SectionLabel icon={Target} label="Mentalidade" />
                <div className="flex gap-1">
                  {(['defensivo', 'contra-ataque', 'equilibrado', 'posse', 'ofensivo'] as PlayStyle[]).map(s => (
                    <TacticButton key={s} value={s} current={tactics.playStyle} onClick={v => setField('playStyle', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Zap} label="Pressão" />
                <div className="flex gap-1">
                  {(['baixo', 'medio', 'alto', 'ultra-alto'] as Pressing[]).map(p => (
                    <TacticButton key={p} value={p} current={tactics.pressing} label={p === 'ultra-alto' ? 'ultra' : p} onClick={v => setField('pressing', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Zap} label="Ritmo" />
                <div className="flex gap-1">
                  {(['lento', 'normal', 'rapido', 'muito-rapido'] as Tempo[]).map(t => (
                    <TacticButton key={t} value={t} current={tactics.tempo} label={t === 'rapido' ? 'rápido' : t === 'muito-rapido' ? 'intenso' : t} onClick={v => setField('tempo', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Shield} label="Marcação" />
                <div className="flex gap-1">
                  {(['zona', 'misto', 'individual'] as Marking[]).map(m => (
                    <TacticButton key={m} value={m} current={tactics.marking} onClick={v => setField('marking', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Target} label="Passe" />
                <div className="flex gap-1">
                  {(['curto', 'misto', 'longo', 'direto'] as PassingStyle[]).map(p => (
                    <TacticButton key={p} value={p} current={tactics.passingStyle} onClick={v => setField('passingStyle', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Shield} label="Linha Defensiva" />
                <div className="flex gap-1">
                  {(['baixa', 'media', 'alta'] as DefenseLine[]).map(d => (
                    <TacticButton key={d} value={d} current={tactics.defenseLine} label={d === 'media' ? 'média' : d} onClick={v => setField('defenseLine', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Users} label="Largura" />
                <div className="flex gap-1">
                  {(['estreita', 'normal', 'larga'] as Width[]).map(w => (
                    <TacticButton key={w} value={w} current={tactics.width} onClick={v => setField('width', v)} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <Card>
            <CardContent className="space-y-2 pt-3 px-3 sm:px-4 pb-3">
              {[
                { label: 'Capitão', key: 'captainId' as const, icon: '©️' },
                { label: 'Cobrador de Falta', key: 'freeKickTakerId' as const, icon: '🎯' },
                { label: 'Cobrador de Pênalti', key: 'penaltyTakerId' as const, icon: '⚽' },
                { label: 'Cobrador de Escanteio', key: 'cornerTakerId' as const, icon: '🚩' },
              ].map(role => {
                const assigned = players.find(p => p.id === tactics[role.key]);
                return (
                  <div key={role.key} className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5 border border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{role.icon}</span>
                      <div>
                        <p className="text-[10px] sm:text-xs font-semibold">{role.label}</p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                          {assigned ? (
                            <span className="text-primary font-medium">{assigned.name} <span className="text-muted-foreground">(OVR {assigned.overall})</span></span>
                          ) : (
                            <span className="text-destructive/70">Não definido</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <select
                      className="text-[9px] sm:text-[10px] bg-background border border-border rounded-md px-1.5 py-1 max-w-[110px] sm:max-w-[160px]"
                      value={tactics[role.key] || ''}
                      onChange={e => setField(role.key, e.target.value || undefined)}
                    >
                      <option value="">Selecionar...</option>
                      {players.filter(p => !p.injury).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.position} {p.overall})</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tactical Summary - compact */}
      <Card className="border-primary/10">
        <CardContent className="p-3 sm:p-4">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <Star className="w-3 h-3 text-primary" /> Resumo Tático
          </p>
          <div className="flex flex-wrap gap-1">
            <Badge className="text-[9px] sm:text-[10px]">{tactics.formation}</Badge>
            <Badge variant="secondary" className="text-[9px] sm:text-[10px] capitalize">{tactics.playStyle}</Badge>
            <Badge variant="outline" className="text-[9px] sm:text-[10px]">⬆ {tactics.pressing}</Badge>
            <Badge variant="outline" className="text-[9px] sm:text-[10px]">⏱ {tactics.tempo === 'rapido' ? 'rápido' : tactics.tempo === 'muito-rapido' ? 'intenso' : tactics.tempo}</Badge>
            <Badge variant="outline" className="text-[9px] sm:text-[10px]">🛡 {tactics.marking}</Badge>
            <Badge variant="outline" className="text-[9px] sm:text-[10px]">📐 {tactics.passingStyle}</Badge>
            <Badge variant="outline" className="text-[9px] sm:text-[10px]">📏 {tactics.defenseLine}</Badge>
            <Badge variant="outline" className="text-[9px] sm:text-[10px]">↔ {tactics.width}</Badge>
          </div>
          {tactics.captainId && (
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1.5">
              ©️ {players.find(p => p.id === tactics.captainId)?.name ?? '—'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Player detail dialog */}
      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">{selectedPlayer?.name}</DialogTitle>
          </DialogHeader>
          {selectedPlayer && (() => {
            const attrLabels: Record<string, { label: string; icon: string }> = {
              speed: { label: 'Velocidade', icon: '⚡' },
              shooting: { label: 'Finalização', icon: '🎯' },
              passing: { label: 'Passe', icon: '📐' },
              defending: { label: 'Defesa', icon: '🛡️' },
              physical: { label: 'Físico', icon: '💪' },
              dribbling: { label: 'Drible', icon: '🎨' },
              setPieces: { label: 'Bola Parada', icon: '🎱' },
              positioning: { label: 'Posicionamento', icon: '📍' },
              heading: { label: 'Cabeceio', icon: '🗣️' },
              marking: { label: 'Marcação', icon: '🔒' },
              vision: { label: 'Visão de Jogo', icon: '👁️' },
              crossing: { label: 'Cruzamento', icon: '🎯' },
              longShots: { label: 'Chute de Longe', icon: '🚀' },
              workRate: { label: 'Intensidade', icon: '🔥' },
              composure: { label: 'Compostura', icon: '🧠' },
              aggression: { label: 'Agressividade', icon: '⚔️' },
              goalkeeping: { label: 'Defesa de Goleiro', icon: '🧤' },
            };
            const getAttrColor = (val: number) => {
              if (val >= 80) return 'text-emerald-400';
              if (val >= 60) return 'text-primary';
              if (val >= 40) return 'text-yellow-400';
              return 'text-red-400';
            };
            return (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge>{selectedPlayer.position}</Badge>
                <Badge variant="secondary">OVR {selectedPlayer.overall}</Badge>
                <Badge variant="outline">{selectedPlayer.age} anos</Badge>
              </div>
              {/* Energia e Moral */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Energia', icon: '⚡', value: selectedPlayer.stamina ?? 100 },
                  { label: 'Moral', icon: '❤️', value: selectedPlayer.morale ?? 50 },
                ].map(stat => (
                  <div key={stat.label} className="bg-muted/30 rounded-lg p-2 border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-muted-foreground">{stat.icon} {stat.label}</span>
                      <span className={`text-[10px] font-bold ${stat.value >= 70 ? 'text-emerald-400' : stat.value >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{stat.value}%</span>
                    </div>
                    <Progress value={stat.value} className="h-1.5" />
                  </div>
                ))}
              </div>
              {/* Goalkeeping highlight for GK */}
              {selectedPlayer.position === 'GOL' && selectedPlayer.attributes.goalkeeping != null && (
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">🧤 Defesa de Goleiro</span>
                    <span className={`text-sm font-bold ${getAttrColor(selectedPlayer.attributes.goalkeeping)}`}>{selectedPlayer.attributes.goalkeeping}</span>
                  </div>
                  <Progress value={selectedPlayer.attributes.goalkeeping} className="h-1.5 mt-1" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto">
                {Object.entries(selectedPlayer.attributes)
                  .filter(([key, val]) => val != null && !(selectedPlayer.position === 'GOL' && key === 'goalkeeping'))
                  .map(([key, val]) => (
                  <div key={key} className="bg-muted/30 rounded p-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">{attrLabels[key]?.icon} {attrLabels[key]?.label || key}</span>
                      <span className={`text-[10px] font-bold ${getAttrColor(val as number)}`}>{val}</span>
                    </div>
                    <Progress value={val as number} className="h-1 mt-0.5" />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Atribuir função:</p>
                {[
                  { label: '©️ Capitão', key: 'captainId' as const },
                  { label: '🎯 Falta', key: 'freeKickTakerId' as const },
                  { label: '⚽ Pênalti', key: 'penaltyTakerId' as const },
                  { label: '🚩 Escanteio', key: 'cornerTakerId' as const },
                ].map(role => (
                  <Button
                    key={role.key}
                    size="sm"
                    variant={tactics[role.key] === selectedPlayer.id ? 'default' : 'outline'}
                    className="w-full text-xs justify-start"
                    onClick={() => setSpecialRole(role.key, selectedPlayer.id)}
                  >
                    {role.label} {tactics[role.key] === selectedPlayer.id && '✓'}
                  </Button>
                ))}
              </div>
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
