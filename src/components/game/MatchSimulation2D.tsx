import { useState, useEffect, useRef, useCallback } from 'react';
import { Player } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FastForward, SkipForward } from 'lucide-react';

interface SimEvent {
  minute: number;
  type: 'goal' | 'shot' | 'save' | 'pass' | 'tackle' | 'foul' | 'corner' | 'freekick' | 'yellow' | 'red' | 'offside' | 'header' | 'cross' | 'dribble' | 'counterattack' | 'halftime' | 'kickoff';
  description: string;
  team: 'home' | 'away';
}

interface SimPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  team: 'home' | 'away';
  ovr: number;
}

interface Props {
  homeTeam: string;
  awayTeam: string;
  homePlayers: Player[];
  homeStrength: number;
  awayStrength: number;
  onFinish: (homeGoals: number, awayGoals: number, events: SimEvent[]) => void;
  onSkip: () => void;
}

const HOME_SLOTS = [
  { x: 8, y: 50 },
  { x: 22, y: 25 }, { x: 22, y: 50 }, { x: 22, y: 75 },
  { x: 40, y: 15 }, { x: 38, y: 40 }, { x: 38, y: 60 }, { x: 40, y: 85 },
  { x: 58, y: 30 }, { x: 62, y: 50 }, { x: 58, y: 70 },
];
const AWAY_SLOTS = [
  { x: 92, y: 50 },
  { x: 78, y: 75 }, { x: 78, y: 50 }, { x: 78, y: 25 },
  { x: 60, y: 85 }, { x: 62, y: 60 }, { x: 62, y: 40 }, { x: 60, y: 15 },
  { x: 42, y: 70 }, { x: 38, y: 50 }, { x: 42, y: 30 },
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export function MatchSimulation2D({ homeTeam, awayTeam, homePlayers, homeStrength, awayStrength, onFinish, onSkip }: Props) {
  const [minute, setMinute] = useState(0);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [commentary, setCommentary] = useState('⚽ A bola vai rolar!');
  const [speed, setSpeed] = useState(2);
  const [isFinished, setIsFinished] = useState(false);
  const [lastEventType, setLastEventType] = useState<string>('');
  const [goalFlash, setGoalFlash] = useState(false);

  const playersRef = useRef<SimPlayer[]>([]);
  const ballRef = useRef({ x: 50, y: 50 });
  const intervalRef = useRef<number | null>(null);
  const minuteRef = useRef(0);
  const homeGoalsRef = useRef(0);
  const awayGoalsRef = useRef(0);
  const eventsRef = useRef<SimEvent[]>([]);
  const rafRef = useRef<number | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);

  // Init players once
  useEffect(() => {
    const home: SimPlayer[] = homePlayers.slice(0, 11).map((p, i) => {
      const slot = HOME_SLOTS[i] || HOME_SLOTS[HOME_SLOTS.length - 1];
      return { id: p.id, name: p.name.split(' ').pop() || p.name, x: slot.x, y: slot.y, homeX: slot.x, homeY: slot.y, team: 'home', ovr: p.overall };
    });
    const away: SimPlayer[] = AWAY_SLOTS.map((slot, i) => ({
      id: `a${i}`, name: `Jog. ${i + 1}`, x: slot.x, y: slot.y, homeX: slot.x, homeY: slot.y, team: 'away', ovr: Math.floor(awayStrength + (Math.random() * 8 - 4)),
    }));
    playersRef.current = [...home, ...away];
  }, []);

  // Render loop for smooth movement
  useEffect(() => {
    const tick = () => {
      const players = playersRef.current;
      const bx = ballRef.current.x;
      const by = ballRef.current.y;

      for (const p of players) {
        // Drift toward home + slight pull toward ball
        const pullStrength = p.team === 'home' ? (p.homeX > 30 ? 0.008 : 0.003) : (p.homeX < 70 ? 0.008 : 0.003);
        const jx = (Math.random() - 0.5) * 1.2;
        const jy = (Math.random() - 0.5) * 1.5;
        const toBallX = (bx - p.x) * pullStrength;
        const toBallY = (by - p.y) * pullStrength;
        const toHomeX = (p.homeX - p.x) * 0.02;
        const toHomeY = (p.homeY - p.y) * 0.02;
        p.x = clamp(p.x + jx + toBallX + toHomeX, 2, 98);
        p.y = clamp(p.y + jy + toBallY + toHomeY, 2, 98);
      }

      // Render to DOM directly for performance
      if (pitchRef.current) {
        const els = pitchRef.current.querySelectorAll<HTMLElement>('[data-pid]');
        els.forEach(el => {
          const pid = el.dataset.pid!;
          const pl = players.find(pp => pp.id === pid);
          if (pl) {
            el.style.left = `${pl.x}%`;
            el.style.top = `${pl.y}%`;
          }
        });
        const ballEl = pitchRef.current.querySelector<HTMLElement>('[data-ball]');
        if (ballEl) {
          ballEl.style.left = `${ballRef.current.x}%`;
          ballEl.style.top = `${ballRef.current.y}%`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const pickName = useCallback((team: 'home' | 'away') => {
    if (team === 'home') {
      const hp = homePlayers[Math.floor(Math.random() * Math.min(11, homePlayers.length))];
      return hp?.name.split(' ').pop() || 'Jogador';
    }
    return `Jogador do ${awayTeam}`;
  }, [homePlayers, awayTeam]);

  const moveBall = useCallback((x: number, y: number) => {
    ballRef.current = { x: clamp(x, 3, 97), y: clamp(y, 3, 97) };
  }, []);

  const generateEvent = useCallback((min: number): SimEvent | null => {
    if (min === 45) return { minute: 45, type: 'halftime', description: '⏱️ Intervalo!', team: 'home' };
    if (min === 46) return { minute: 46, type: 'kickoff', description: '⚽ Segundo tempo!', team: 'away' };

    if (Math.random() > 0.15) return null;

    const ratio = homeStrength / (homeStrength + awayStrength);
    const team: 'home' | 'away' = Math.random() < ratio ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const pName = pickName(team);
    const r = Math.random();

    if (r < 0.07) {
      moveBall(team === 'home' ? 92 : 8, 45 + Math.random() * 10);
      const descs = [
        `⚽ GOOOOL! ${pName} marca para o ${tName}!`,
        `⚽ GOOOOL! ${pName} não perdoa e balança as redes!`,
        `⚽ GOOOOL! Que golaço de ${pName}!`,
        `⚽ GOOOOL! ${pName} cabeceia e é gol do ${tName}!`,
        `⚽ GOOOOL! Jogada ensaiada e ${pName} finaliza! ${tName} comemora!`,
      ];
      return { minute: min, type: 'goal', description: descs[Math.floor(Math.random() * descs.length)], team };
    }
    if (r < 0.18) {
      moveBall(team === 'home' ? 85 : 15, 40 + Math.random() * 20);
      const descs = [`🎯 ${pName} chuta forte, goleiro defende!`, `💥 Finalização de ${pName}! Passa perto!`, `🧤 Goleiro salva após chute de ${pName}!`];
      return { minute: min, type: 'shot', description: descs[Math.floor(Math.random() * descs.length)], team };
    }
    if (r < 0.30) {
      moveBall(ballRef.current.x + (team === 'home' ? 8 : -8), 25 + Math.random() * 50);
      return { minute: min, type: 'pass', description: `📍 ${tName} troca passes buscando espaço.`, team };
    }
    if (r < 0.40) {
      moveBall(40 + Math.random() * 20, 20 + Math.random() * 60);
      const descs = [`💪 ${pName} faz desarme firme!`, `⚔️ Dividida no meio. ${pName} recupera!`, `🦶 Carrinho de ${pName}! Bola recuperada!`];
      return { minute: min, type: 'tackle', description: descs[Math.floor(Math.random() * descs.length)], team };
    }
    if (r < 0.50) {
      moveBall(team === 'home' ? 80 : 20, 20 + Math.random() * 60);
      return { minute: min, type: 'cross', description: `↗️ ${pName} cruza na área! A defesa tenta afastar.`, team };
    }
    if (r < 0.58) {
      moveBall(35 + Math.random() * 30, 30 + Math.random() * 40);
      return { minute: min, type: 'foul', description: `⚠️ Falta de ${pName}. Jogo parado.`, team };
    }
    if (r < 0.66) {
      moveBall(ballRef.current.x + (team === 'home' ? 12 : -12), ballRef.current.y + (Math.random() - 0.5) * 20);
      const descs = [`✨ ${pName} dribla com classe!`, `🌀 Que drible! ${pName} passou por dois!`, `💫 Jogada individual brilhante de ${pName}!`];
      return { minute: min, type: 'dribble', description: descs[Math.floor(Math.random() * descs.length)], team };
    }
    if (r < 0.74) {
      moveBall(team === 'home' ? 97 : 3, Math.random() > 0.5 ? 8 : 92);
      return { minute: min, type: 'corner', description: `🚩 Escanteio para o ${tName}!`, team };
    }
    if (r < 0.82) {
      moveBall(team === 'home' ? 70 : 30, 30 + Math.random() * 40);
      return { minute: min, type: 'counterattack', description: `🏃 Contra-ataque do ${tName}! Perigo!`, team };
    }
    if (r < 0.88) {
      moveBall(team === 'home' ? 82 : 18, 40 + Math.random() * 20);
      return { minute: min, type: 'header', description: `🤕 ${pName} cabeceia! Defesa corta.`, team };
    }
    if (r < 0.94) {
      return { minute: min, type: 'yellow', description: `🟨 Cartão amarelo para ${pName}!`, team };
    }
    return { minute: min, type: 'offside', description: `🏳️ Impedimento contra o ${tName}.`, team };
  }, [homeStrength, awayStrength, homeTeam, awayTeam, pickName, moveBall]);

  // Game clock
  useEffect(() => {
    if (isFinished) return;

    const tickMs = Math.max(60, 300 / speed);

    intervalRef.current = window.setInterval(() => {
      minuteRef.current += 1;
      const min = minuteRef.current;

      if (min > 90) {
        setIsFinished(true);
        setCommentary('🏁 Fim de jogo!');
        onFinish(homeGoalsRef.current, awayGoalsRef.current, eventsRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      setMinute(min);

      const event = generateEvent(min);
      if (event) {
        if (event.type === 'goal') {
          if (event.team === 'home') { homeGoalsRef.current++; setHomeGoals(homeGoalsRef.current); }
          else { awayGoalsRef.current++; setAwayGoals(awayGoalsRef.current); }
          setGoalFlash(true);
          setTimeout(() => setGoalFlash(false), 800);
        }
        eventsRef.current.push(event);
        setEvents(prev => [...prev, event]);
        setCommentary(event.description);
        setLastEventType(event.type);
      } else {
        // Idle ball drift
        moveBall(
          ballRef.current.x + (Math.random() - 0.5) * 8,
          ballRef.current.y + (Math.random() - 0.5) * 8
        );
      }
    }, tickMs);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isFinished, speed, generateEvent, onFinish, moveBall]);

  const eventColor = (type: string) => {
    switch (type) {
      case 'goal': return 'text-emerald-400 font-bold';
      case 'shot': case 'header': return 'text-yellow-400';
      case 'yellow': return 'text-yellow-300';
      case 'red': return 'text-red-400';
      case 'foul': return 'text-orange-400';
      case 'tackle': return 'text-blue-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-2 animate-fade-in">
      {/* Scoreboard */}
      <Card className="p-3">
        <div className="flex items-center gap-3 justify-center">
          <p className="text-xs sm:text-sm font-bold truncate text-right flex-1">{homeTeam}</p>
          <div className="text-2xl sm:text-3xl font-black font-mono px-3 py-1 rounded-lg bg-muted/30 min-w-[80px] text-center">
            {homeGoals} <span className="text-muted-foreground text-sm">x</span> {awayGoals}
          </div>
          <p className="text-xs sm:text-sm font-bold truncate text-left flex-1">{awayTeam}</p>
        </div>
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <Badge variant={minute <= 45 ? 'default' : 'secondary'} className="text-xs font-mono">
            {minute > 90 ? '90' : minute}' {minute <= 45 ? '1ºT' : '2ºT'}
          </Badge>
        </div>
      </Card>

      {/* Pitch */}
      <div ref={pitchRef} className="relative w-full aspect-[16/10] bg-emerald-800 rounded-xl overflow-hidden border border-emerald-600/30 select-none">
        {/* Markings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[15%] aspect-square border border-white/20 rounded-full" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/30 rounded-full" />
          <div className="absolute left-0 top-[20%] w-[16%] h-[60%] border border-l-0 border-white/20" />
          <div className="absolute left-0 top-[32%] w-[7%] h-[36%] border border-l-0 border-white/15" />
          <div className="absolute right-0 top-[20%] w-[16%] h-[60%] border border-r-0 border-white/20" />
          <div className="absolute right-0 top-[32%] w-[7%] h-[36%] border border-r-0 border-white/15" />
          <div className="absolute left-0 top-[42%] w-[2%] h-[16%] bg-white/10 border border-l-0 border-white/25" />
          <div className="absolute right-0 top-[42%] w-[2%] h-[16%] bg-white/10 border border-r-0 border-white/25" />
        </div>

        {/* Players rendered via ref for performance */}
        {playersRef.current.map(p => (
          <div
            key={p.id}
            data-pid={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] font-bold text-white shadow-lg border ${
              p.team === 'home' ? 'bg-blue-600 border-blue-400/40' : 'bg-red-600 border-red-400/40'
            }`}>
              {p.ovr}
            </div>
            <span className="text-[5px] sm:text-[7px] text-white/70 font-medium truncate max-w-[36px] drop-shadow-md leading-tight">
              {p.name}
            </span>
          </div>
        ))}

        {/* Ball */}
        <div data-ball className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ left: '50%', top: '50%' }}>
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.7)] border border-gray-300" />
        </div>

        {/* Goal flash */}
        {goalFlash && <div className="absolute inset-0 bg-yellow-400/15 animate-pulse pointer-events-none" />}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={() => setSpeed(s => s >= 8 ? 1 : s * 2)} className="h-7 gap-1 text-[10px]" disabled={isFinished}>
          <FastForward className="h-3 w-3" /> {speed}x
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip} className="h-7 gap-1 text-[10px] text-muted-foreground">
          <SkipForward className="h-3 w-3" /> Pular
        </Button>
      </div>

      {/* Commentary */}
      <Card className="p-2">
        <p className={`text-[11px] sm:text-xs text-center font-medium ${eventColor(lastEventType)}`}>
          {commentary}
        </p>
      </Card>

      {/* Event log - last 6 */}
      {events.length > 0 && (
        <Card className="p-1.5 max-h-[100px] overflow-y-auto">
          <div className="space-y-0.5">
            {[...events].reverse().slice(0, 6).map((ev, i) => (
              <div key={i} className={`flex items-center gap-1.5 text-[9px] sm:text-[10px] px-1 py-0.5 rounded ${ev.team === 'home' ? 'bg-primary/5' : 'bg-destructive/5'}`}>
                <Badge variant="outline" className="text-[6px] w-6 justify-center shrink-0 font-mono">{ev.minute}'</Badge>
                <span className={eventColor(ev.type)}>{ev.description}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}