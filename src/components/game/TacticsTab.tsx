import { useState } from 'react';
import { TacticsConfig, Formation, formationDescriptions, tacticsPresets, PlayStyle, Pressing, Tempo, Marking, PassingStyle, DefenseLine, Width } from '@/types/tactics';
import { Player } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormationView } from './FormationView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Zap, Target, Users, Star, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  return (
    <Button
      size="sm"
      variant={current === value ? 'default' : 'outline'}
      className="flex-1 capitalize text-[10px] sm:text-sm min-w-0"
      onClick={() => onClick(value)}
    >
      {label ?? value}
    </Button>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <p className="text-[10px] sm:text-sm text-muted-foreground mb-1.5 sm:mb-2 flex items-center gap-1">
      <Icon className="w-3 h-3 sm:w-4 sm:h-4" /> {label}
    </p>
  );
}

export function TacticsTab({ tactics, players, onUpdate }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const activePlayers = players.filter(p => !p.injury);
  const injuredCount = players.length - activePlayers.length;

  const setField = <K extends keyof TacticsConfig>(key: K, value: TacticsConfig[K]) => {
    onUpdate({ ...tactics, [key]: value });
  };

  const applyPreset = (preset: typeof tacticsPresets[0]) => {
    onUpdate({ ...tactics, ...preset.config });
    setShowPresets(false);
  };

  const setSpecialRole = (role: 'captainId' | 'freeKickTakerId' | 'penaltyTakerId' | 'cornerTakerId', playerId: string) => {
    onUpdate({ ...tactics, [role]: playerId });
    setSelectedPlayer(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Presets */}
      <Card>
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
          <CardTitle className="text-sm sm:text-lg flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> Estilos Predefinidos</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">{tacticsPresets.length} estilos</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
            {tacticsPresets.map(preset => (
              <Button
                key={preset.name}
                size="sm"
                variant="outline"
                className="text-[10px] sm:text-sm h-auto py-2"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2D Formation View */}
      <Card>
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
          <CardTitle className="text-sm sm:text-lg flex items-center justify-between">
            <span>Escalação — {tactics.formation}</span>
            <div className="flex gap-1.5">
              {injuredCount > 0 && <Badge variant="destructive" className="text-[10px] sm:text-xs">🏥 {injuredCount}</Badge>}
              <Badge variant="secondary" className="text-[10px] sm:text-xs">{players.length} jogadores</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <FormationView
            formation={tactics.formation}
            players={players}
            captainId={tactics.captainId}
            onPlayerClick={setSelectedPlayer}
          />
          <p className="text-[9px] sm:text-xs text-muted-foreground mt-2 text-center">Clique em um jogador para atribuir funções</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="formation" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="formation" className="text-[10px] sm:text-sm"><Shield className="w-3 h-3 mr-1" />Formação</TabsTrigger>
          <TabsTrigger value="style" className="text-[10px] sm:text-sm"><Target className="w-3 h-3 mr-1" />Estilo</TabsTrigger>
          <TabsTrigger value="roles" className="text-[10px] sm:text-sm"><Users className="w-3 h-3 mr-1" />Funções</TabsTrigger>
        </TabsList>

        {/* Formation Tab */}
        <TabsContent value="formation">
          <Card>
            <CardContent className="pt-4 px-3 sm:px-6 pb-3 sm:pb-6 space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2">
                {allFormations.map(f => (
                  <Button
                    key={f}
                    size="sm"
                    variant={tactics.formation === f ? 'default' : 'outline'}
                    onClick={() => setField('formation', f)}
                    className="text-[10px] sm:text-sm"
                  >
                    {f}
                  </Button>
                ))}
              </div>
              <div className="bg-muted/50 rounded-lg p-2 sm:p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{formationDescriptions[tactics.formation]}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Style Tab */}
        <TabsContent value="style">
          <Card>
            <CardContent className="space-y-4 pt-4 px-3 sm:px-6 pb-3 sm:pb-6">
              <div>
                <SectionLabel icon={Target} label="Mentalidade" />
                <div className="flex gap-1 sm:gap-2 flex-wrap">
                  {(['defensivo', 'contra-ataque', 'equilibrado', 'posse', 'ofensivo'] as PlayStyle[]).map(s => (
                    <TacticButton key={s} value={s} current={tactics.playStyle} onClick={v => setField('playStyle', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Zap} label="Pressão" />
                <div className="flex gap-1 sm:gap-2">
                  {(['baixo', 'medio', 'alto', 'ultra-alto'] as Pressing[]).map(p => (
                    <TacticButton key={p} value={p} current={tactics.pressing} label={p === 'ultra-alto' ? 'ultra' : p} onClick={v => setField('pressing', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Zap} label="Ritmo" />
                <div className="flex gap-1 sm:gap-2">
                  {(['lento', 'normal', 'rapido', 'muito-rapido'] as Tempo[]).map(t => (
                    <TacticButton key={t} value={t} current={tactics.tempo} label={t === 'rapido' ? 'rápido' : t === 'muito-rapido' ? 'intenso' : t} onClick={v => setField('tempo', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Shield} label="Marcação" />
                <div className="flex gap-1 sm:gap-2">
                  {(['zona', 'misto', 'individual'] as Marking[]).map(m => (
                    <TacticButton key={m} value={m} current={tactics.marking} onClick={v => setField('marking', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Target} label="Passe" />
                <div className="flex gap-1 sm:gap-2">
                  {(['curto', 'misto', 'longo', 'direto'] as PassingStyle[]).map(p => (
                    <TacticButton key={p} value={p} current={tactics.passingStyle} onClick={v => setField('passingStyle', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Shield} label="Linha Defensiva" />
                <div className="flex gap-1 sm:gap-2">
                  {(['baixa', 'media', 'alta'] as DefenseLine[]).map(d => (
                    <TacticButton key={d} value={d} current={tactics.defenseLine} label={d === 'media' ? 'média' : d} onClick={v => setField('defenseLine', v)} />
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel icon={Users} label="Largura" />
                <div className="flex gap-1 sm:gap-2">
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
            <CardContent className="space-y-3 pt-4 px-3 sm:px-6 pb-3 sm:pb-6">
              {[
                { label: 'Capitão', key: 'captainId' as const, icon: '©️' },
                { label: 'Cobrador de Falta', key: 'freeKickTakerId' as const, icon: '🎯' },
                { label: 'Cobrador de Pênalti', key: 'penaltyTakerId' as const, icon: '⚽' },
                { label: 'Cobrador de Escanteio', key: 'cornerTakerId' as const, icon: '🚩' },
              ].map(role => {
                const assigned = players.find(p => p.id === tactics[role.key]);
                return (
                  <div key={role.key} className="flex items-center justify-between bg-muted/50 rounded-lg p-2 sm:p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{role.icon}</span>
                      <div>
                        <p className="text-[11px] sm:text-sm font-medium">{role.label}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {assigned ? `${assigned.name} (OVR ${assigned.overall})` : 'Não definido'}
                        </p>
                      </div>
                    </div>
                    <select
                      className="text-[10px] sm:text-xs bg-background border rounded px-1.5 py-1 max-w-[120px] sm:max-w-[180px]"
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

      {/* Tactical Summary */}
      <Card>
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-1.5"><Star className="w-4 h-4" /> Resumo Tático</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Badge className="text-[10px] sm:text-sm">{tactics.formation}</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-sm capitalize">{tactics.playStyle}</Badge>
            <Badge variant="outline" className="text-[10px] sm:text-sm">Pressão: {tactics.pressing}</Badge>
            <Badge variant="outline" className="text-[10px] sm:text-sm">Ritmo: {tactics.tempo === 'rapido' ? 'rápido' : tactics.tempo === 'muito-rapido' ? 'intenso' : tactics.tempo}</Badge>
            <Badge variant="outline" className="text-[10px] sm:text-sm">Marcação: {tactics.marking}</Badge>
            <Badge variant="outline" className="text-[10px] sm:text-sm">Passe: {tactics.passingStyle}</Badge>
            <Badge variant="outline" className="text-[10px] sm:text-sm">Linha: {tactics.defenseLine}</Badge>
            <Badge variant="outline" className="text-[10px] sm:text-sm">Largura: {tactics.width}</Badge>
          </div>
          {tactics.captainId && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              ©️ Capitão: {players.find(p => p.id === tactics.captainId)?.name ?? '—'}
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
          {selectedPlayer && (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge>{selectedPlayer.position}</Badge>
                <Badge variant="secondary">OVR {selectedPlayer.overall}</Badge>
                <Badge variant="outline">{selectedPlayer.age} anos</Badge>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <span>Velocidade: {selectedPlayer.attributes.speed}</span>
                <span>Finalização: {selectedPlayer.attributes.shooting}</span>
                <span>Passe: {selectedPlayer.attributes.passing}</span>
                <span>Defesa: {selectedPlayer.attributes.defending}</span>
                <span>Físico: {selectedPlayer.attributes.physical}</span>
                <span>Drible: {selectedPlayer.attributes.dribbling}</span>
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
