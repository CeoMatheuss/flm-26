import { useState } from 'react';
import { QuickSwapPanel } from './squad/QuickSwapPanel';
import { Button } from '@/components/ui/button';
import { Repeat } from 'lucide-react';

import { TacticsConfig, Formation, formationDescriptions, tacticsPresets, Pressing, Tempo, Marking, PassingStyle, DefenseLine, Width, playStyleEffects, MAIN_PLAY_STYLES, ADVANCED_PLAY_STYLES } from '@/types/tactics';
import { formationRequirements, validateLineup } from '@/utils/lineupManager';
import { Player } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormationView } from './FormationView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Shield, Zap, Target, Users, Star, Info, Lock, Sparkles, Heart, Activity, LayoutGrid, TrendingUp, TrendingDown, Minus, Crown, ArrowRightLeft } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { SeasonStartWidget } from './SeasonStartWidget';
import { useActiveMatch } from '@/hooks/useActiveMatch';
import { toast } from 'sonner';

interface Props {
  tactics: TacticsConfig;
  players: Player[];
  onUpdate: (tactics: TacticsConfig) => void;
  onUpdatePlayers?: (players: Player[]) => void;
  onChangePosition?: (playerId: string, newPos: Player['position'], side?: 'L' | 'R' | 'C') => void;
  season?: number;
  userId?: string;
  hideSwapButton?: boolean;
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
      className={`flex-1 capitalize text-[11px] sm:text-sm min-w-0 px-3 py-2.5 sm:py-3 rounded-xl font-bold transition-all ${
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

export function TacticsTab({ tactics, players, onUpdate, onUpdatePlayers, season, userId, hideSwapButton }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isQuickSwapOpen, setIsQuickSwapOpen] = useState(false);

  const { isInLiveMatch } = useActiveMatch();

  const swapPlayers = (playerAId: string, playerBId: string) => {
    if (!onUpdatePlayers) return;
    const idxA = players.findIndex(p => p.id === playerAId);
    const idxB = players.findIndex(p => p.id === playerBId);
    if (idxA < 0 || idxB < 0) return;
    
    const newOrder = [...players];
    [newOrder[idxA], newOrder[idxB]] = [newOrder[idxB], newOrder[idxA]];
    
    const validation = validateLineup(newOrder);
    if (!validation.valid) {
      toast.error(validation.message);
      if (validation.autoFix) onUpdatePlayers(validation.autoFix);
      return;
    }

    const pA = players[idxA];
    const pB = players[idxB];
    toast.success(`${pA.name} ↔ ${pB.name}`);
    onUpdatePlayers(newOrder);
  };

  const activePlayers = players.filter(p => !p.injury);
  const starters = players.slice(0, 11);
  const reserves = players.slice(11);
  const injuredCount = players.length - activePlayers.length;

  const guardedUpdate = (next: TacticsConfig) => {
    if (isInLiveMatch) {
      toast.error('🔒 Ação indisponível durante a partida');
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

  const getTacticalRating = () => {
    let rating = 30;
    const starters = players.slice(0, 11);
    const requirements = formationRequirements[tactics.formation];
    if (requirements) {
      let alignedCount = 0;
      starters.forEach((p, i) => {
        if (p.position === requirements[i]) alignedCount++;
        else if (p.secondaryPosition === requirements[i]) alignedCount += 0.5;
      });
      rating += (alignedCount / 11) * 40;
    }
    if (tactics.playStyle === 'equilibrado') rating += 5;
    if (tactics.pressing === 'alto') rating += 5;
    if (tactics.captainId) rating += 5;
    const avgStamina = starters.reduce((s, p) => s + p.stamina, 0) / 11;
    rating += (avgStamina / 100) * 10;
    return Math.min(100, Math.round(rating));
  };

  return (
    <div className="space-y-4">
      <SeasonStartWidget seasonNumber={season ?? 1} userId={userId} />

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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-8 space-y-6">
          <Card className="border-primary/20 bg-slate-900/40 rounded-[2.5rem] overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Shield className="w-32 h-32 text-primary rotate-12" />
            </div>
            
            <CardContent className="p-6 space-y-6 relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] sm:text-[12px] font-black text-primary uppercase tracking-[0.2em] mb-2">CENTRO TÁTICO PROFISSIONAL</p>
                  <div className="flex items-center gap-4">
                    <select 
                      className="bg-transparent text-2xl sm:text-3xl lg:text-5xl font-black text-white tracking-tighter outline-none cursor-pointer hover:text-primary transition-all duration-300 max-w-full"
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
                
                <div className="flex items-center gap-3 sm:gap-6 bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                  <div className="text-center px-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">GERAL</p>
                    <p className="text-3xl font-black text-white tracking-tighter">
                      {players.length >= 11 ? Math.round(starters.reduce((s, p) => s + p.overall, 0) / 11) : '—'}
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
                    <Progress value={getTacticalRating()} className="h-full bg-gradient-to-r from-primary/50 to-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">ENTROSAMENTO</span>
                    <span className="text-emerald-400">
                      {Math.min(100, Math.round((getTacticalRating() * 0.7) + (starters.reduce((s, p) => s + p.stamina, 0) / 11) * 0.3))}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <Progress 
                      value={Math.min(100, Math.round((getTacticalRating() * 0.7) + (starters.reduce((s, p) => s + p.stamina, 0) / 11) * 0.3))} 
                      className="h-full bg-gradient-to-r from-emerald-600/50 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative group">
            <FormationView
              formation={tactics.formation}
              players={players}
              captainId={tactics.captainId}
              onPlayerClick={setSelectedPlayer}
              onSwapPlayers={swapPlayers}
              isInteractive={!isInLiveMatch}
            />
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
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Idade Média', val: (starters.reduce((s, p) => s + p.age, 0) / 11).toFixed(1), color: 'text-white' },
              { label: 'Vigor Médio', val: `${Math.round(starters.reduce((s, p) => s + p.stamina, 0) / 11)}%`, color: 'text-emerald-400' },
              { label: 'Valor Elenco', val: `$${(players.reduce((s, p) => s + (p.marketValue || 0), 0) / 1000000).toFixed(1)}M`, color: 'text-primary' },
              { label: 'Base/Juniores', val: players.filter(p => p.isYouth).length, color: 'text-blue-400' }
            ].map(stat => (
              <Card key={stat.label} className="bg-slate-900/40 border-white/5">
                <CardContent className="p-3 text-center">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">{stat.label}</p>
                  <p className={`text-lg font-black ${stat.color}`}>{stat.val}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6 min-w-0 xl:min-w-[380px]">
          <Tabs defaultValue="style" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-14 bg-slate-900/80 border border-white/10 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
              <TabsTrigger value="style" className="text-[11px] font-black uppercase tracking-tighter gap-2 rounded-lg data-[state=active]:bg-primary">
                <Target className="w-4 h-4" />Estilo
              </TabsTrigger>
              <TabsTrigger value="roles" className="text-[11px] font-black uppercase tracking-tighter gap-2 rounded-lg data-[state=active]:bg-primary">
                <Users className="w-4 h-4" />Banco
              </TabsTrigger>
              <TabsTrigger value="details" className="text-[11px] font-black uppercase tracking-tighter gap-2 rounded-lg data-[state=active]:bg-primary">
                <LayoutGrid className="w-4 h-4" />Funções
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="style" className="m-0 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tacticsPresets.map(preset => (
                    <button
                      key={preset.name}
                      className={`text-[11px] font-black px-4 py-4 rounded-xl border-2 transition-all duration-300 uppercase tracking-widest
                        ${tactics.playStyle === preset.config.playStyle 
                          ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.4)]' 
                          : 'bg-slate-900/60 border-white/5 text-muted-foreground hover:border-white/20 hover:bg-slate-800'}`}
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <SectionLabel icon={Target} label="Filosofia de Jogo" />
                    <div className="grid grid-cols-2 gap-3">
                      {MAIN_PLAY_STYLES.map(s => (
                        <button
                          key={s}
                          onClick={() => setField('playStyle', s)}
                          className={`text-[11px] py-4 rounded-xl font-black transition-all border-2 ${
                            tactics.playStyle === s ? 'bg-primary border-primary text-primary-foreground' : 'bg-slate-900/40 text-muted-foreground border-white/5'
                          }`}
                        >
                          {playStyleEffects[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Accordion type="single" collapsible>
                    <AccordionItem value="advanced" className="border-white/5">
                      <AccordionTrigger className="text-xs font-black uppercase tracking-widest hover:no-underline">Estilos Avançados</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-2">
                          {ADVANCED_PLAY_STYLES.map(s => (
                            <button key={s} onClick={() => setField('playStyle', s)} className={`text-[10px] py-2 rounded-lg font-bold border ${tactics.playStyle === s ? 'bg-primary border-primary' : 'bg-slate-900 border-white/5 text-muted-foreground'}`}>
                              {playStyleEffects[s].label}
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {[
                    { label: 'Pressão', icon: Zap, key: 'pressing' as const, options: ['baixo', 'medio', 'alto', 'ultra-alto'] },
                    { label: 'Ritmo', icon: Zap, key: 'tempo' as const, options: ['lento', 'normal', 'rapido', 'muito-rapido'] },
                    { label: 'Passe', icon: Target, key: 'passingStyle' as const, options: ['curto', 'misto', 'longo', 'direto'] }
                  ].map(ctrl => (
                    <div key={ctrl.label}>
                      <SectionLabel icon={ctrl.icon} label={ctrl.label} />
                      <div className="flex flex-wrap gap-2">
                        {ctrl.options.map(opt => (
                          <TacticButton key={opt} value={opt} current={tactics[ctrl.key] as string} label={opt} onClick={v => setField(ctrl.key, v as any)} />
                        ))}
                      </div>
                      <TacticInfoCard category={ctrl.key} value={tactics[ctrl.key] as string} />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="roles" className="m-0">
                <Card className="bg-slate-950/40 border-white/5">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Users className="w-3 h-3 text-blue-400" /> BANCO DE RESERVAS ({reserves.length})
                    </p>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                      {reserves.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic text-center py-4">Nenhum reserva disponível</p>
                      ) : (
                        reserves.map((p, idx) => (
                          <div 
                            key={p.id} 
                            onClick={() => setSelectedPlayer(p)}
                            className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] border-2 border-white/10 ${p.injury ? 'grayscale opacity-50 bg-slate-800' : 'bg-slate-800'}`}>
                                {p.overall}
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-white group-hover:text-primary transition-colors">{p.name}</p>
                                <p className="text-[9px] text-muted-foreground font-bold">{p.position} • {p.age} anos</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {p.injury && <Activity className="w-3 h-3 text-red-500" />}
                              <div className="w-12 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                <div className={`h-full ${p.stamina < 50 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${p.stamina}%` }} />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="m-0 space-y-3">
                {[
                  { label: 'Capitão', key: 'captainId' as const, icon: '©️' },
                  { label: 'Faltas', key: 'freeKickTakerId' as const, icon: '🎯' },
                  { label: 'Pênaltis', key: 'penaltyTakerId' as const, icon: '⚽' },
                  { label: 'Escanteios', key: 'cornerTakerId' as const, icon: '🚩' },
                ].map(role => {
                  const assigned = players.find(p => p.id === tactics[role.key]);
                  return (
                    <div key={role.key} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{role.icon}</span>
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase">{role.label}</p>
                          <p className="text-xs font-bold text-white">{assigned?.name || 'Não definido'}</p>
                        </div>
                      </div>
                      <select
                        className="bg-slate-800 text-[10px] font-bold border-white/10 rounded-lg px-2 py-1.5 text-white"
                        value={tactics[role.key] || ''}
                        onChange={e => setField(role.key, e.target.value || undefined)}
                      >
                        <option value="">SELECIONAR...</option>
                        {starters.map(p => <option key={p.id} value={p.id}>{p.name} ({p.overall})</option>)}
                      </select>
                    </div>
                  );
                })}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="max-w-md border-primary/20 bg-slate-900/95 backdrop-blur-xl p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          {selectedPlayer && (
            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-primary/30 to-slate-900 p-8 border-b border-white/10 relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Star className="w-32 h-32 text-primary" />
                </div>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-white/20 flex items-center justify-center text-5xl font-black text-white shadow-2xl">
                      {selectedPlayer.overall}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{selectedPlayer.name}</h2>
                      <div className="flex items-center gap-3 mt-3">
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-black px-3 py-1">{selectedPlayer.position}</Badge>
                        <Badge variant="outline" className="text-white/60 text-xs font-bold px-3 py-1">#{selectedPlayer.shirtNumber || '--'}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase text-muted-foreground">
                      <span>VIGOR FÍSICO</span>
                      <span className="text-emerald-400">{selectedPlayer.stamina}%</span>
                    </div>
                    <Progress value={selectedPlayer.stamina} className="h-2 bg-white/5" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase text-muted-foreground">
                      <span>MORAL</span>
                      <span className="text-primary">{selectedPlayer.morale}%</span>
                    </div>
                    <Progress value={selectedPlayer.morale} className="h-2 bg-white/5" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'IDADE', val: `${selectedPlayer.age} anos`, icon: <Users className="w-4 h-4 text-blue-400" /> },
                    { label: 'VALOR', val: `$${((selectedPlayer.marketValue || 0) / 1000000).toFixed(1)}M`, icon: <Zap className="w-4 h-4 text-primary" /> },
                    { label: 'STATUS', val: selectedPlayer.evolutionTrend === 'up' ? 'EM ALTA' : 'ESTÁVEL', icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> }
                  ].map(card => (
                    <div key={card.label} className="bg-white/5 border border-white/5 p-4 rounded-2xl text-center">
                      <div className="flex justify-center mb-2">{card.icon}</div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{card.label}</p>
                      <p className="text-sm font-black text-white">{card.val}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                   <button 
                     onClick={() => {
                       // Logic to initiate swap from modal if needed
                       // For now, we use the field-based swap, but we can add a shortcut here
                       toast.info("Para trocar, selecione o jogador no campo e depois o substituto.");
                       setSelectedPlayer(null);
                     }}
                     className="flex-1 bg-primary text-primary-foreground py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                   >
                     <ArrowRightLeft className="w-5 h-5" /> TROCAR JOGADOR
                   </button>
                   <button className="flex-1 bg-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10">
                     RENOVAÇÃO
                   </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!hideSwapButton && (
        <>
          <QuickSwapPanel
            isOpen={isQuickSwapOpen}
            onClose={() => setIsQuickSwapOpen(false)}
            players={players}
            onSwap={swapPlayers}
          />

          <Button
            onClick={() => setIsQuickSwapOpen(true)}
            className="fixed bottom-24 right-6 h-16 px-6 rounded-2xl shadow-2xl bg-emerald-600 hover:bg-emerald-500 text-white z-40 border-4 border-white/10 flex items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 group shadow-emerald-500/20"
          >
            <ArrowRightLeft className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
            <span className="font-black uppercase tracking-tighter text-sm">🔄 Trocar Jogador</span>
          </Button>
        </>
      )}
    </div>
  );
}