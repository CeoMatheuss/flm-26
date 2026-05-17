import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormationView } from './FormationView';
import { TacticsConfig, MAIN_PLAY_STYLES, ADVANCED_PLAY_STYLES, playStyleEffects, type PlayStyle } from '@/types/tactics';
import { Player } from '@/types/game';
import { ArrowLeft, Zap, Target, Shield, X, Sparkles, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { getDynamicOverall } from '@/utils/positionUtils';

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

const FORMATIONS = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '3-4-3', '4-5-1', '4-1-4-1'] as const;

export function TacticsTab({ tactics, players, onUpdate, onUpdatePlayers, hideSwapButton }: Props) {
  const isMobile = useIsMobile();
  const [benchOpen, setBenchOpen] = useState(false);
  const [pendingFieldId, setPendingFieldId] = useState<string | null>(null);

  // Guardas defensivas: evita crash (tela preta) quando players/tactics ainda não carregaram
  const safePlayers: Player[] = Array.isArray(players) ? players : [];
  const rawTactics: any = tactics || {};
  // Se playStyle salvo for um valor legado/desconhecido, cai pra 'equilibrado' (que existe sempre)
  const validStyle: PlayStyle = (playStyleEffects as any)[rawTactics.playStyle] ? rawTactics.playStyle : 'equilibrado';
  const safeTactics: TacticsConfig = {
    formation: rawTactics.formation || '4-4-2',
    playStyle: validStyle,
    tempo: rawTactics.tempo || 'normal',
    pressing: rawTactics.pressing || 'medio',
    marking: rawTactics.marking || 'zona',
    passingStyle: rawTactics.passingStyle || 'misto',
    defenseLine: rawTactics.defenseLine || 'media',
    width: rawTactics.width || 'normal',
    playerInstructions: Array.isArray(rawTactics.playerInstructions) ? rawTactics.playerInstructions : [],
    autoUpdateLineup: rawTactics.autoUpdateLineup ?? true,
    captainId: rawTactics.captainId,
    freeKickTakerId: rawTactics.freeKickTakerId,
    penaltyTakerId: rawTactics.penaltyTakerId,
    cornerTakerId: rawTactics.cornerTakerId,
  };
  const canUseInMatch = (player: Player) => {
    const raw = player as any;
    const isBaseYouth = raw.isYouth && raw.contractStatus !== 'profissional';
    return !isBaseYouth && !player.injury && !raw.isInjured && !raw.isSuspended && !raw.suspended && !raw.isLoaned && !raw.loanedOut && !raw.inactive && !raw.removed;
  };
  const starters = safePlayers.slice(0, 11);
  const bench = safePlayers.slice(11).filter(canUseInMatch);

  const setField = <K extends keyof TacticsConfig>(key: K, value: TacticsConfig[K]) => {
    onUpdate({ ...safeTactics, [key]: value });
  };

  const avgStamina = starters.length
    ? Math.round(starters.reduce((s, p) => s + (p.stamina || 0), 0) / starters.length)
    : 0;
  const avgOverall = starters.length
    ? Math.round(starters.reduce((s, p) => s + p.overall, 0) / starters.length)
    : 0;
  const tacticalRating = Math.min(100, Math.round(65 + (avgStamina / 100) * 10));

  const swapInLineup = (idA: string, idB: string) => {
    if (!onUpdatePlayers) return;
    const idxA = safePlayers.findIndex(p => p.id === idA);
    const idxB = safePlayers.findIndex(p => p.id === idB);
    if (idxA < 0 || idxB < 0) return;
    const next = [...players];
    [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
    onUpdatePlayers(next);
    toast.success('Escalação atualizada');
  };

  const handleBenchPick = (benchId: string) => {
    if (!pendingFieldId) {
      toast.message('Toque em um titular no campo para trocar');
      return;
    }
    swapInLineup(pendingFieldId, benchId);
    setPendingFieldId(null);
    setBenchOpen(false);
  };

  return (
    <div className={cn(
      hideSwapButton
        ? 'w-full min-h-[70vh] flex flex-col overflow-hidden overflow-x-hidden bg-zinc-950'
        : 'fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden overflow-x-hidden animate-in fade-in duration-200'
    )}>
      {/* Header compacto */}
      <header className="shrink-0 border-b border-white/5 bg-zinc-950/90 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {!hideSwapButton && (
            <button
              onClick={() => window.history.back()}
              className="shrink-0 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-4 h-4 text-white/70" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-black text-white uppercase italic tracking-tight leading-none truncate">
              Centro Tático
            </h1>
            <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
              {safeTactics.formation} · {safeTactics.playStyle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-4 bg-white/5 px-4 py-1.5 rounded-xl border border-white/10">
            <Stat label="OVR" value={String(avgOverall)} color="text-white" />
            <div className="w-px h-5 bg-white/10" />
            <Stat label="Entros." value={`${tacticalRating}%`} color="text-emerald-400" />
          </div>

          {/* Banco (mobile + desktop) */}
          <Sheet open={benchOpen} onOpenChange={setBenchOpen}>
            <SheetTrigger asChild>
              <button
                className="h-9 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 transition-colors"
                aria-label="Abrir banco de reservas"
              >
                <Users className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Banco</span>
                <span className="text-[10px] font-black">{bench.length}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] bg-zinc-950 border-white/10 p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-white/5 shrink-0">
                <SheetTitle className="text-white text-left">
                  Banco de Reservas
                  {pendingFieldId && (
                    <span className="block text-[10px] font-bold text-emerald-400 mt-1 normal-case tracking-normal">
                      Toque em um reserva para entrar no lugar do titular selecionado
                    </span>
                  )}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {bench.length === 0 && (
                  <p className="text-white/40 text-sm text-center py-10 col-span-full">Sem reservas disponíveis</p>
                )}
                {bench.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleBenchPick(p.id)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center font-black text-white">
                      {p.overall}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{p.name}</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                        {p.position} · {p.age}a · Fis {p.stamina}%
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {!hideSwapButton && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => window.history.back()}
              className="h-9 px-3 rounded-xl font-black uppercase text-[10px] tracking-widest"
            >
              <X className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          )}
        </div>
      </header>

      {/* Conteúdo: mobile = stack, desktop = split */}
      <div className="flex-1 overflow-y-auto lg:overflow-hidden">
        <div className="h-full flex flex-col lg:flex-row gap-3 sm:gap-4 p-2 sm:p-4">
          {/* Campo */}
          <div className="lg:flex-1 bg-zinc-900/40 rounded-xl sm:rounded-2xl border-0 sm:border sm:border-white/5 p-0 sm:p-4 flex items-center justify-center min-h-0">
            {safePlayers.length < 11 ? (
              <div className="w-full aspect-[4/5] sm:aspect-[16/10] flex flex-col items-center justify-center text-white/40 gap-2">
                <div className="w-10 h-10 rounded-full border-2 border-emerald-500/40 border-t-emerald-500 animate-spin" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Carregando elenco...</p>
              </div>
            ) : (
              <FormationView
                formation={safeTactics.formation}
                players={safePlayers}
                captainId={safeTactics.captainId}
                orientation="portrait"
                selectedId={pendingFieldId}
                onSlotSelect={(id) => setPendingFieldId(prev => (prev === id ? null : id))}
                onSwapPlayers={onUpdatePlayers ? swapInLineup : undefined}
              />
            )}
          </div>

          {/* Painel de ajustes */}
          <aside className="lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-3 lg:overflow-y-auto lg:pr-1">
            {/* Formação */}
            <Card className="bg-zinc-900/60 border-white/5 rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <SectionTitle icon={<Shield className="w-4 h-4 text-emerald-400" />} label="Sistema de Jogo" />
                <div className="grid grid-cols-4 gap-1.5">
                  {FORMATIONS.map(f => (
                    <button
                      key={f}
                      onClick={() => setField('formation', f)}
                      className={cn(
                        'h-10 rounded-lg text-[11px] font-black tracking-tight transition-all border',
                        safeTactics.formation === f
                          ? 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20'
                          : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Estilo & ritmo */}
            <Card className="bg-zinc-900/60 border-white/5 rounded-2xl">
              <CardContent className="p-4 space-y-4">
                <SectionTitle icon={<Zap className="w-4 h-4 text-amber-400" />} label="Dinâmica" />
                <Group label="Estilo de Jogo">
                  <StylePicker
                    value={safeTactics.playStyle as PlayStyle}
                    onPick={(v) => setField('playStyle', v as any)}
                  />
                </Group>
                <Group label="Ritmo">
                  <Grid items={['lento','normal','rapido','muito-rapido'] as const}
                        value={safeTactics.tempo} onPick={(v) => setField('tempo', v as any)}
                        activeClass="bg-amber-500 border-amber-400 text-zinc-950" />
                </Group>
                <Group label="Linha Defensiva">
                  <Grid items={['baixa','media','alta'] as const}
                        value={(safeTactics as any).defenseLine || 'media'} onPick={(v) => setField('defenseLine' as any, v as any)}
                        activeClass="bg-sky-500 border-sky-400 text-zinc-950" />
                </Group>
              </CardContent>
            </Card>

            {/* Defesa */}
            <Card className="bg-zinc-900/60 border-white/5 rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <SectionTitle icon={<Target className="w-4 h-4 text-red-400" />} label="Defesa" />
                <Group label="Pressão">
                  <Grid items={['baixo','medio','alto','ultra-alto'] as const}
                        value={safeTactics.pressing} onPick={(v) => setField('pressing', v as any)}
                        activeClass="bg-red-500 border-red-400 text-zinc-950" />
                </Group>
              </CardContent>
            </Card>

            {/* Poder Tático */}
            <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-zinc-950" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Poder Tático</p>
                  <p className="text-2xl font-black text-white leading-none">{tacticalRating}<span className="text-sm text-emerald-400">%</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40">OVR</p>
                  <p className="text-2xl font-black text-white leading-none">{avgOverall}</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest leading-none mb-0.5">{label}</p>
      <p className={cn('text-sm font-black leading-none', color)}>{value}</p>
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-[10px] font-black uppercase tracking-widest text-white/60">{label}</h3>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.18em]">{label}</label>
      {children}
    </div>
  );
}

function Grid<T extends string>({ items, value, onPick, activeClass }: { items: readonly T[]; value: T; onPick: (v: T) => void; activeClass: string }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map(it => (
        <button
          key={it}
          onClick={() => onPick(it)}
          className={cn(
            'h-9 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border',
            value === it ? activeClass + ' shadow-lg' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
          )}
        >
          {it}
        </button>
      ))}
    </div>
  );
}

function StylePicker({ value, onPick }: { value: PlayStyle; onPick: (v: PlayStyle) => void }) {
  const [showAll, setShowAll] = useState(false);
  const visible: PlayStyle[] = showAll
    ? [...MAIN_PLAY_STYLES, ...ADVANCED_PLAY_STYLES]
    : MAIN_PLAY_STYLES;
  const current = playStyleEffects[value];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
        {visible.filter(s => playStyleEffects[s]).map((s) => {
          const e = playStyleEffects[s];
          const active = value === s;
          return (
            <button
              key={s}
              onClick={() => onPick(s)}
              className={cn(
                'h-12 px-2 rounded-lg border flex flex-col items-start justify-center text-left transition-all',
                active
                  ? 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-lg'
                  : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              )}
              title={e.philosophy}
            >
              <span className="text-[11px] font-black leading-none">{e.icon} {e.label}</span>
              <span className={cn('text-[8px] mt-0.5 uppercase tracking-wide truncate w-full', active ? 'text-zinc-900/80' : 'text-white/30')}>
                {e.philosophy}
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setShowAll(s => !s)}
        className="w-full h-7 rounded-md text-[9px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white/60 border border-white/5"
      >
        {showAll ? '− Estilos principais' : `+ ${ADVANCED_PLAY_STYLES.length} estilos avançados`}
      </button>
      {current && (
        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2 space-y-0.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">{current.icon} {current.label}</p>
          {current.bullets.slice(0, 3).map((b, i) => (
            <p key={i} className="text-[10px] text-white/60 leading-tight">{b}</p>
          ))}
        </div>
      )}
    </div>
  );
}
