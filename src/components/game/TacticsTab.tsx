import { useState } from 'react';
import { TacticsConfig, Formation, formationDescriptions, tacticsPresets, PlayStyle, Pressing, Tempo, Marking, PassingStyle, DefenseLine, Width, playStyleEffects, MAIN_PLAY_STYLES, ADVANCED_PLAY_STYLES } from '@/types/tactics';
import { formationRequirements, validateLineup, canChangePosition } from '@/utils/lineupManager';
import { Player } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormationView } from './FormationView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Shield, Zap, Target, Users, Star, Info, ChevronRight, Lock, Sparkles, ArrowRightLeft, Heart, Activity, UserPlus, Trash2, ListFilter, LayoutGrid } from 'lucide-react';
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
  onUpdatePlayers?: (players: Player[]) => void;
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

export function TacticsTab({ tactics, players, onUpdate, onUpdatePlayers, onChangePosition, season, userId }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { isInLiveMatch } = useActiveMatch();

  // Implement swap players directly in TacticsTab
  const swapPlayers = (playerAId: string, playerBId: string) => {
    if (!onUpdatePlayers) return;
    const idxA = players.findIndex(p => p.id === playerAId);
    const idxB = players.findIndex(p => p.id === playerBId);
    if (idxA < 0 || idxB < 0) return;
    
    const newOrder = [...players];
    [newOrder[idxA], newOrder[idxB]] = [newOrder[idxB], newOrder[idxA]];
    
    // Position Protection Validation
    const validation = validateLineup(newOrder);
    if (!validation.valid) {
      toast.error(validation.message);
      if (validation.autoFix) {
        onUpdatePlayers(validation.autoFix);
      }
      return;
    }

    const pA = players[idxA];
    const pB = players[idxB];
    toast.success(`${pA.name} ↔ ${pB.name}`);
    onUpdatePlayers(newOrder);
  };

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
    
    // Validation for formation changes
    const validation = validateLineup(players);
    if (!validation.valid && next.formation !== tactics.formation) {
       // If it's a formation change, we check if the current lineup is valid for it
       // In this context, validateLineup mostly checks for GOL count which is formation-independent (always 1)
       toast.error(validation.message);
       if (validation.autoFix) {
         // This is tricky because we don't have onReorderPlayers here
         // But we can at least block the change or show a warning
       }
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
    <div className="space-y-4">
      {/* Hidden Auto-Lineup Logic (Internal) */}
      {!tactics.autoUpdateLineup && (
         <div className="hidden">
           {/* Logic to keep it active internally if requested by user, but here we just hide the toggle */}
         </div>
      )}

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

      {/* Main Tactical Grid (Responsive) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left/Main Column: Pitch View */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tactical Hub Header */}
          <Card className="border-primary/20 bg-slate-950/60 backdrop-blur-xl overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Shield className="w-32 h-32 text-primary rotate-12" />
            </div>
            
            <CardContent className="p-6 space-y-6 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] sm:text-[12px] font-black text-primary uppercase tracking-[0.2em] mb-2 drop-shadow-sm">CENTRO TÁTICO PROFISSIONAL</p>
                  <div className="flex items-center gap-4">
                    <select 
                      className="bg-transparent text-3xl sm:text-5xl font-black text-white tracking-tighter outline-none cursor-pointer hover:text-primary transition-all duration-300"
                      value={tactics.formation}
                      onChange={(e) => setField('formation', e.target.value as any)}
                    >
                      {allFormations.map(f => <option key={f} value={f} className="bg-slate-900 text-sm font-sans">{f}</option>)}
                    </select>
                    <Badge className="bg-primary/20 text-primary border-primary/30 py-1.5 px-3 text-xs uppercase font-black tracking-wider ring-1 ring-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                      {tactics.playStyle}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                  <div className="text-center px-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">GERAL</p>
                    <p className="text-3xl font-black text-white tracking-tighter">
                      {players.length >= 11 ? Math.round(players.slice(0, 11).reduce((s, p) => s + p.overall, 0) / 11) : '—'}
                    </p>
                  </div>
                  <div className="w-[1px] h-10 bg-white/10" />
                  <div className="text-center px-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">REPUTAÇÃO</p>
                    <p className="text-3xl font-black text-primary tracking-tighter">
                      {getTacticalRating()}<span className="text-xs">%</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">ORGANIZAÇÃO TÁTICA</span>
                    <span className="text-primary">{getTacticalRating()}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <Progress value={getTacticalRating()} className="h-full bg-gradient-to-r from-primary/50 to-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">ENTROSAMENTO</span>
                    <span className="text-emerald-400">
                      {Math.min(100, Math.round((getTacticalRating() * 0.7) + (players.slice(0, 11).reduce((s, p) => s + p.stamina, 0) / 11) * 0.3))}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <Progress 
                      value={Math.min(100, Math.round((getTacticalRating() * 0.7) + (players.slice(0, 11).reduce((s, p) => s + p.stamina, 0) / 11) * 0.3))} 
                      className="h-full bg-gradient-to-r from-emerald-600/50 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Large Pitch Area */}
          <div className="relative group">
            <FormationView
              formation={tactics.formation}
              players={players}
              captainId={tactics.captainId}
              onPlayerClick={setSelectedPlayer}
              onSwapPlayers={swapPlayers}
              isInteractive={!isInLiveMatch}
            />
            
            {/* Legend / Overlay Hint */}
            <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-black text-white/70 uppercase tracking-tighter">
                MODO: {isInLiveMatch ? 'VISUALIZAÇÃO' : 'EDIÇÃO'}
              </div>
            </div>
            
            <div className="absolute bottom-6 right-6 pointer-events-none">
              <div className="bg-emerald-500/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                SISTEMA 2D REALISTA
              </div>
            </div>
          </div>
          
          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-slate-900/40 border-white/5">
              <CardContent className="p-3 text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Média de Idade</p>
                <p className="text-lg font-black text-white">
                  {(players.slice(0, 11).reduce((s, p) => s + p.age, 0) / 11).toFixed(1)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/40 border-white/5">
              <CardContent className="p-3 text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Vigor Médio</p>
                <p className="text-lg font-black text-emerald-400">
                  {Math.round(players.slice(0, 11).reduce((s, p) => s + p.stamina, 0) / 11)}%
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/40 border-white/5">
              <CardContent className="p-3 text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Valor Elenco</p>
                <p className="text-lg font-black text-primary">
                  ${(players.reduce((s, p) => s + (p.marketValue || 0), 0) / 1000000).toFixed(1)}M
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/40 border-white/5">
              <CardContent className="p-3 text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Base/Juniores</p>
                <p className="text-lg font-black text-blue-400">
                  {players.filter(p => p.isYouth).length}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Tactical Settings & Bench */}
        <div className="lg:col-span-4 space-y-4">
          <Tabs defaultValue="formation" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-12 bg-slate-950/40 border-white/5 p-1 rounded-xl">
              <TabsTrigger value="formation" className="text-[11px] font-black uppercase tracking-tighter gap-2 rounded-lg data-[state=active]:bg-primary">
                <LayoutGrid className="w-4 h-4" />Formação
              </TabsTrigger>
              <TabsTrigger value="style" className="text-[11px] font-black uppercase tracking-tighter gap-2 rounded-lg data-[state=active]:bg-primary">
                <Target className="w-4 h-4" />Estilo
              </TabsTrigger>
              <TabsTrigger value="roles" className="text-[11px] font-black uppercase tracking-tighter gap-2 rounded-lg data-[state=active]:bg-primary">
                <Users className="w-4 h-4" />Banco
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {/* Formation Tab */}
              <TabsContent value="formation" className="m-0 space-y-4">
                {/* Presets Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {tacticsPresets.map(preset => (
                    <button
                      key={preset.name}
                      className={`text-[10px] font-black px-4 py-3 rounded-xl border-2 transition-all duration-300 uppercase tracking-widest
                        ${tactics.playStyle === preset.config.playStyle 
                          ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.4)]' 
                          : 'bg-slate-900/60 border-white/5 text-muted-foreground hover:border-white/20 hover:bg-slate-800'}`}
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

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
        <DialogContent className="max-w-xs border-primary/20 bg-slate-900/95 backdrop-blur-xl p-0 overflow-hidden">
          <div className="bg-primary/20 p-4 border-b border-white/10 flex items-center justify-between">
            <div>
               <h3 className="text-base font-black text-white uppercase tracking-tight">{selectedPlayer?.name}</h3>
               <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{selectedPlayer?.position} • OVR {selectedPlayer?.overall}</p>
            </div>
            <Badge className="bg-white/10 text-white border-white/20">#{selectedPlayer?.shirtNumber || '—'}</Badge>
          </div>
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
            <div className="p-4 space-y-4">
              {/* Energia e Moral */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Energia', icon: <Zap className="w-3 h-3" />, value: selectedPlayer.stamina ?? 100, color: 'text-yellow-400' },
                  { label: 'Moral', icon: <Heart className="w-3 h-3" />, value: selectedPlayer.morale ?? 50, color: 'text-emerald-400' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1">{stat.icon} {stat.label}</span>
                      <span className={`text-[10px] font-black ${stat.color}`}>{stat.value}%</span>
                    </div>
                    <Progress value={stat.value} className="h-1.5 bg-white/5" />
                  </div>
                ))}
              </div>

              {/* Goalkeeping highlight for GK */}
              {selectedPlayer.position === 'GOL' && selectedPlayer.attributes.goalkeeping != null && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1">🧤 Defesa de Goleiro</span>
                    <span className={`text-sm font-black ${getAttrColor(selectedPlayer.attributes.goalkeeping)}`}>{selectedPlayer.attributes.goalkeeping}</span>
                  </div>
                  <Progress value={selectedPlayer.attributes.goalkeeping} className="h-1.5" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(selectedPlayer.attributes)
                  .filter(([key, val]) => val != null && !(selectedPlayer.position === 'GOL' && key === 'goalkeeping'))
                  .sort((a, b) => (b[1] as number) - (a[1] as number)) // Sort by value
                  .map(([key, val]) => (
                  <div key={key} className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest truncate max-w-[50px]">{attrLabels[key]?.label || key}</span>
                      <span className={`text-[10px] font-black ${getAttrColor(val as number)}`}>{val}</span>
                    </div>
                    <Progress value={val as number} className="h-1 bg-white/5" />
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
