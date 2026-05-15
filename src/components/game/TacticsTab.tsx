import { useState } from 'react';
import { TacticsConfig, Formation, formationDescriptions, tacticsPresets, PlayStyle, Pressing, Tempo, Marking, PassingStyle, DefenseLine, Width, playStyleEffects, MAIN_PLAY_STYLES, ADVANCED_PLAY_STYLES } from '@/types/tactics';
import { formationRequirements } from '@/utils/lineupManager';
import { Player } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormationView } from './FormationView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Shield, Zap, Target, Users, Star, Info, ChevronRight, Lock, Sparkles, ArrowRightLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { SeasonStartWidget } from './SeasonStartWidget';
import { useActiveMatch } from '@/hooks/useActiveMatch';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props {
  tactics: TacticsConfig;
  players: Player[];
  onUpdate: (tactics: TacticsConfig) => void;
  onChangePosition?: (playerId: string, newPos: Player['position'], side?: 'L' | 'R' | 'C') => void;
  season?: number;
  userId?: string;
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

// Descrições contextuais para cada opção tática
const tacticInfo: Record<string, Record<string, { title: string; desc: string; pros: string; cons: string }>> = {
  pressing: {
    'baixo': { title: '🛡️ Pressão Baixa', desc: 'Time recua e espera o adversário no campo defensivo.', pros: '+ Economiza fôlego, fecha espaços', cons: '- Cede posse, ataque lento' },
    'medio': { title: '⚖️ Pressão Média', desc: 'Marca a partir do meio-campo, postura equilibrada.', pros: '+ Equilíbrio entre defesa e ataque', cons: '- Sem vantagem clara' },
    'alto': { title: '🔥 Pressão Alta', desc: 'Marca o adversário próximo da área deles.', pros: '+ Recupera bola perto do gol', cons: '- Desgaste físico maior' },
    'ultra-alto': { title: '⚡ Pressão Ultra', desc: 'Asfixia total: 11 jogadores pressionando sempre.', pros: '+ Domínio territorial absoluto', cons: '- Stamina cai rápido, defesa exposta' },
  },
  tempo: {
    'lento': { title: '🐢 Ritmo Lento', desc: 'Posse paciente, troca de passes calma.', pros: '+ Cansa o adversário, controla o jogo', cons: '- Poucas chances diretas' },
    'normal': { title: '🚶 Ritmo Normal', desc: 'Velocidade equilibrada nas jogadas.', pros: '+ Versatilidade tática', cons: '- Sem surpresa' },
    'rapido': { title: '🏃 Ritmo Rápido', desc: 'Transições verticais e jogadas objetivas.', pros: '+ Pega defesa desorganizada', cons: '- Mais erros de passe' },
    'muito-rapido': { title: '💨 Ritmo Intenso', desc: 'Velocidade máxima, tudo em transição.', pros: '+ Cria muitas chances rápidas', cons: '- Stamina cai 2x mais rápido' },
  },
  marking: {
    'zona': { title: '📐 Por Zona', desc: 'Cada jogador defende uma região do campo.', pros: '+ Mantém forma compacta', cons: '- Pode deixar atacante livre na zona' },
    'misto': { title: '🔀 Misto', desc: 'Combina marcação por zona e individual.', pros: '+ Adaptável a vários estilos', cons: '- Exige inteligência tática alta' },
    'individual': { title: '👤 Individual', desc: 'Cada zagueiro marca um atacante específico.', pros: '+ Anula craques adversários', cons: '- Vulnerável a movimentação rápida' },
  },
  passingStyle: {
    'curto': { title: '🎯 Passe Curto', desc: 'Toques rápidos e precisos no meio-campo.', pros: '+ Mantém posse, pouca perda', cons: '- Avança lentamente' },
    'misto': { title: '⚖️ Passe Misto', desc: 'Alterna entre passes curtos e longos.', pros: '+ Versatilidade ofensiva', cons: '- Sem identidade clara' },
    'longo': { title: '🎯 Passe Longo', desc: 'Lançamentos para inverter o jogo.', pros: '+ Surpreende com mudança de jogo', cons: '- Menos precisão' },
    'direto': { title: '🚀 Passe Direto', desc: 'Bola longa direto para o ataque.', pros: '+ Chega rápido ao gol', cons: '- Perde muita posse' },
  },
  defenseLine: {
    'baixa': { title: '⬇️ Linha Baixa', desc: 'Defensores próximos da própria área.', pros: '+ Pouco espaço atrás dos zagueiros', cons: '- Time fica esticado, meio cede' },
    'media': { title: '➖ Linha Média', desc: 'Linha defensiva equilibrada no meio-campo.', pros: '+ Compactação geral', cons: '- Sem extremos' },
    'alta': { title: '⬆️ Linha Alta', desc: 'Defensores adiantados, encurtando o campo.', pros: '+ Pressiona adversário, recupera alto', cons: '- Vulnerável a contra-ataque' },
  },
  width: {
    'estreita': { title: '◀▶ Estreita', desc: 'Jogadores concentrados pelo centro.', pros: '+ Domínio do meio, jogadas curtas', cons: '- Laterais ficam expostos' },
    'normal': { title: '◀ ▶ Normal', desc: 'Largura equilibrada do campo.', pros: '+ Cobertura completa', cons: '- Sem vantagem específica' },
    'larga': { title: '◀  ▶ Larga', desc: 'Abre o campo, usa as pontas.', pros: '+ Cruzamentos e jogadas pelos lados', cons: '- Meio fica desfalcado' },
  },
};

function TacticInfoCard({ category, value }: { category: string; value: string }) {
  const info = tacticInfo[category]?.[value];
  if (!info) return null;
  return (
    <div className="mt-1.5 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-md p-2 space-y-1">
      <p className="text-[10px] sm:text-[11px] font-bold text-primary">{info.title}</p>
      <p className="text-[9px] sm:text-[10px] text-foreground/80 italic leading-tight">{info.desc}</p>
      <div className="flex flex-col gap-0.5 pt-0.5">
        <p className="text-[9px] text-success leading-tight">{info.pros}</p>
        <p className="text-[9px] text-warning leading-tight">{info.cons}</p>
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 flex items-center gap-1 font-semibold uppercase tracking-wider">
      <Icon className="w-3 h-3 text-primary" /> {label}
    </p>
  );
}

export function TacticsTab({ tactics, players, onUpdate, onChangePosition, season, userId }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { isInLiveMatch } = useActiveMatch();

  const activePlayers = players.filter(p => !p.injury);
  const injuredCount = players.length - activePlayers.length;

  // Block permanent tactical changes during a live match.
  // Quick changes via "⚡ Aplicar Tática" inside MatchPage remain allowed (separate handler).
  const guardedUpdate = (next: TacticsConfig) => {
    if (isInLiveMatch) {
      toast.error('🔒 Ação indisponível durante a partida', {
        description: 'Use o botão "⚡ Aplicar Tática" dentro da partida para mudanças rápidas.',
      });
      return;
    }
    onUpdate(next);
  };

  const setField = <K extends keyof TacticsConfig>(key: K, value: TacticsConfig[K]) => {
    guardedUpdate({ ...tactics, [key]: value });
  };

  const applyPreset = (preset: typeof tacticsPresets[0]) => {
    guardedUpdate({ ...tactics, ...preset.config });
  };

  const setSpecialRole = (role: 'captainId' | 'freeKickTakerId' | 'penaltyTakerId' | 'cornerTakerId', playerId: string) => {
    guardedUpdate({ ...tactics, [role]: playerId });
    setSelectedPlayer(null);
  };

  // Tactical rating based on config
  const getTacticalRating = () => {
    let rating = 30; // Base rating
    
    // Positional alignment (Starters are first 11)
    const starters = players.slice(0, 11);
    const requirements = formationRequirements[tactics.formation];
    if (requirements) {
      let alignedCount = 0;
      starters.forEach((p, i) => {
        if (p.position === requirements[i]) alignedCount++;
        else if (p.secondaryPosition === requirements[i]) alignedCount += 0.5;
      });
      rating += (alignedCount / 11) * 40; // Max 40 points from alignment
    }

    if (tactics.playStyle === 'equilibrado') rating += 5;
    if (tactics.pressing === 'alto') rating += 5;
    if (tactics.captainId) rating += 5;
    if (tactics.freeKickTakerId) rating += 3;
    if (tactics.penaltyTakerId) rating += 3;
    if (tactics.cornerTakerId) rating += 3;
    
    // Chemistry based on age diversity and stamina
    const avgStamina = starters.reduce((s, p) => s + p.stamina, 0) / 11;
    rating += (avgStamina / 100) * 10;

    return Math.min(100, Math.round(rating));
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Auto-Lineup Toggle */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/20 p-1.5 rounded-lg">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <div>
            <Label htmlFor="auto-lineup" className="text-xs font-bold block">Sistema Inteligente Loja FLM</Label>
            <p className="text-[9px] text-muted-foreground leading-tight">Atualização automática de escalação ativada</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[9px] font-mono text-primary font-bold uppercase tracking-tighter">AI Active</span>
           <Switch 
            id="auto-lineup" 
            checked={tactics.autoUpdateLineup} 
            onCheckedChange={(val) => {
              setField('autoUpdateLineup', val);
              if (val) toast.success('Auto-Escalação Ativada', { description: 'O sistema reorganizará o time automaticamente.' });
            }}
          />
        </div>
      </div>

      {/* Season Start Widget — shows countdown / current season info */}
      <SeasonStartWidget seasonNumber={season ?? 1} userId={userId} />

      {/* Live match lock banner */}
      {isInLiveMatch && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-[11px] sm:text-xs text-destructive">
              <strong>Táticas bloqueadas durante a partida ao vivo.</strong> Use "⚡ Aplicar Tática" dentro do jogo para mudanças rápidas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tactical Overview Bar */}
      <Card className="border-primary/20">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-bold">{tactics.formation}</span>
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] capitalize">{tactics.playStyle}</Badge>
              <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-primary/5 text-primary border-primary/20">
                OVR: {players.length >= 11 ? Math.round(players.slice(0, 11).reduce((s, p) => s + p.overall, 0) / 11) : '—'}
              </Badge>
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
                <SectionLabel icon={Target} label="Mentalidade / Estilo Principal" />
                <div className="grid grid-cols-3 gap-1.5">
                  {MAIN_PLAY_STYLES.map(s => {
                    const eff = playStyleEffects[s];
                    const isActive = tactics.playStyle === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setField('playStyle', s)}
                        className={`text-[10px] py-2 px-1 rounded-md font-medium transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 border ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md border-primary scale-[1.02]'
                            : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground border-border/40'
                        }`}
                      >
                        <span className="text-base">{eff.icon}</span>
                        <span className="truncate w-full text-center leading-tight">{eff.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Descriptive card */}
                {(() => {
                  const eff = playStyleEffects[tactics.playStyle];
                  return (
                    <div className="mt-2 bg-primary/5 border border-primary/20 rounded-md p-2.5 space-y-1">
                      <p className="text-[11px] font-bold flex items-center gap-1.5">
                        <span className="text-base">{eff.icon}</span>{eff.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground italic leading-tight">{eff.philosophy}</p>
                      <div className="space-y-0.5">
                        {eff.bullets.map((b, i) => (
                          <p key={i} className="text-[10px] text-foreground/80">{b}</p>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Advanced styles accordion */}
                <Accordion type="single" collapsible className="mt-2">
                  <AccordionItem value="advanced" className="border border-border/40 rounded-md">
                    <AccordionTrigger className="text-[10px] px-2.5 py-2 hover:no-underline">
                      <span className="flex items-center gap-1.5">
                        <Star className="w-3 h-3 text-primary" />
                        Estilos Avançados ({ADVANCED_PLAY_STYLES.length})
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-2">
                      <div className="grid grid-cols-3 gap-1">
                        {ADVANCED_PLAY_STYLES.map(s => {
                          const eff = playStyleEffects[s];
                          const isActive = tactics.playStyle === s;
                          return (
                            <button
                              key={s}
                              onClick={() => setField('playStyle', s)}
                              className={`text-[9px] py-1.5 px-1 rounded-md font-medium transition-all flex items-center justify-center gap-1 min-w-0 ${
                                isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
                              }`}
                            >
                              <span>{eff.icon}</span>
                              <span className="truncate">{eff.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              <div>
                <SectionLabel icon={Zap} label="Pressão" />
                <div className="flex gap-1">
                  {(['baixo', 'medio', 'alto', 'ultra-alto'] as Pressing[]).map(p => (
                    <TacticButton key={p} value={p} current={tactics.pressing} label={p === 'ultra-alto' ? 'ultra' : p} onClick={v => setField('pressing', v)} />
                  ))}
                </div>
                <TacticInfoCard category="pressing" value={tactics.pressing} />
              </div>
              <div>
                <SectionLabel icon={Zap} label="Ritmo" />
                <div className="flex gap-1">
                  {(['lento', 'normal', 'rapido', 'muito-rapido'] as Tempo[]).map(t => (
                    <TacticButton key={t} value={t} current={tactics.tempo} label={t === 'rapido' ? 'rápido' : t === 'muito-rapido' ? 'intenso' : t} onClick={v => setField('tempo', v)} />
                  ))}
                </div>
                <TacticInfoCard category="tempo" value={tactics.tempo} />
              </div>
              <div>
                <SectionLabel icon={Shield} label="Marcação" />
                <div className="flex gap-1">
                  {(['zona', 'misto', 'individual'] as Marking[]).map(m => (
                    <TacticButton key={m} value={m} current={tactics.marking} onClick={v => setField('marking', v)} />
                  ))}
                </div>
                <TacticInfoCard category="marking" value={tactics.marking} />
              </div>
              <div>
                <SectionLabel icon={Target} label="Passe" />
                <div className="flex gap-1">
                  {(['curto', 'misto', 'longo', 'direto'] as PassingStyle[]).map(p => (
                    <TacticButton key={p} value={p} current={tactics.passingStyle} onClick={v => setField('passingStyle', v)} />
                  ))}
                </div>
                <TacticInfoCard category="passingStyle" value={tactics.passingStyle} />
              </div>
              <div>
                <SectionLabel icon={Shield} label="Linha Defensiva" />
                <div className="flex gap-1">
                  {(['baixa', 'media', 'alta'] as DefenseLine[]).map(d => (
                    <TacticButton key={d} value={d} current={tactics.defenseLine} label={d === 'media' ? 'média' : d} onClick={v => setField('defenseLine', v)} />
                  ))}
                </div>
                <TacticInfoCard category="defenseLine" value={tactics.defenseLine} />
              </div>
              <div>
                <SectionLabel icon={Users} label="Largura" />
                <div className="flex gap-1">
                  {(['estreita', 'normal', 'larga'] as Width[]).map(w => (
                    <TacticButton key={w} value={w} current={tactics.width} onClick={v => setField('width', v)} />
                  ))}
                </div>
                <TacticInfoCard category="width" value={tactics.width} />
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
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-primary" /> Alterar Posição (Experimental)
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'].map(pos => (
                    <Button
                      key={pos}
                      size="sm"
                      variant={selectedPlayer.position === pos ? 'default' : 'outline'}
                      className={`h-8 text-[10px] font-bold ${selectedPlayer.position === pos ? 'shadow-md shadow-primary/20' : ''}`}
                      onClick={() => {
                        onChangePosition?.(selectedPlayer.id, pos as any);
                        setSelectedPlayer(prev => prev ? { ...prev, position: pos as any } : null);
                      }}
                    >
                      {pos}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" /> Atribuir função no time
                </p>
                <div className="grid grid-cols-2 gap-1.5">
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
                      className="text-[10px] h-8 justify-center font-medium"
                      onClick={() => setSpecialRole(role.key, selectedPlayer.id)}
                    >
                      {role.label} {tactics[role.key] === selectedPlayer.id && '✓'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
