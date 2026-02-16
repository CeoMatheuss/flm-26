import { useState, useEffect, useRef, useCallback } from 'react';
import { Player } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FastForward, Play, Pause, SkipForward } from 'lucide-react';

interface SimPlayer {
  id: string;
  name: string;
  position: string;
  overall: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  homeX: number;
  homeY: number;
  team: 'home' | 'away';
  hasBall: boolean;
  color: string;
}

interface SimEvent {
  minute: number;
  type: 'goal' | 'shot' | 'save' | 'pass' | 'tackle' | 'foul' | 'corner' | 'freekick' | 'yellow' | 'red' | 'offside' | 'chance' | 'header' | 'cross' | 'dribble' | 'counterattack' | 'halftime' | 'kickoff';
  description: string;
  team: 'home' | 'away';
  playerName?: string;
}

interface Ball {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  visible: boolean;
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

const HOME_POSITIONS: Record<string, { x: number; y: number }[]> = {
  GOL: [{ x: 8, y: 50 }],
  ZAG: [{ x: 22, y: 30 }, { x: 22, y: 70 }],
  LAT: [{ x: 25, y: 12 }, { x: 25, y: 88 }],
  VOL: [{ x: 38, y: 35 }, { x: 38, y: 65 }],
  MEI: [{ x: 50, y: 25 }, { x: 50, y: 50 }, { x: 50, y: 75 }],
  ATA: [{ x: 68, y: 35 }, { x: 68, y: 65 }],
};

const AWAY_POSITIONS = [
  { x: 92, y: 50 }, // GK
  { x: 78, y: 25 }, { x: 78, y: 45 }, { x: 78, y: 55 }, { x: 78, y: 75 }, // DEF
  { x: 62, y: 30 }, { x: 62, y: 50 }, { x: 62, y: 70 }, // MID
  { x: 45, y: 25 }, { x: 38, y: 50 }, { x: 45, y: 75 }, // ATK
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function MatchSimulation2D({ homeTeam, awayTeam, homePlayers, homeStrength, awayStrength, onFinish, onSkip }: Props) {
  const [minute, setMinute] = useState(0);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [simPlayers, setSimPlayers] = useState<SimPlayer[]>([]);
  const [ball, setBall] = useState<Ball>({ x: 50, y: 50, targetX: 50, targetY: 50, speed: 3, visible: true });
  const [commentary, setCommentary] = useState('⚽ A bola vai rolar!');
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const [lastEvent, setLastEvent] = useState<SimEvent | null>(null);
  const intervalRef = useRef<number | null>(null);
  const eventsRef = useRef<SimEvent[]>([]);
  const homeGoalsRef = useRef(0);
  const awayGoalsRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize players
  useEffect(() => {
    const posCount: Record<string, number> = {};
    const homeSim: SimPlayer[] = homePlayers.slice(0, 11).map((p) => {
      const pos = p.position;
      if (!posCount[pos]) posCount[pos] = 0;
      const slots = HOME_POSITIONS[pos] || HOME_POSITIONS.MEI;
      const slot = slots[posCount[pos] % slots.length];
      posCount[pos]++;
      return {
        id: p.id,
        name: p.name.split(' ').pop() || p.name,
        position: pos,
        overall: p.overall,
        x: slot.x,
        y: slot.y,
        targetX: slot.x,
        targetY: slot.y,
        homeX: slot.x,
        homeY: slot.y,
        team: 'home',
        hasBall: false,
        color: 'hsl(var(--primary))',
      };
    });

    const awaySim: SimPlayer[] = AWAY_POSITIONS.map((pos, i) => ({
      id: `away-${i}`,
      name: `Jogador ${i + 1}`,
      position: i === 0 ? 'GOL' : i < 5 ? 'DEF' : i < 8 ? 'MID' : 'ATK',
      overall: Math.floor(awayStrength + (Math.random() * 10 - 5)),
      x: pos.x,
      y: pos.y,
      targetX: pos.x,
      targetY: pos.y,
      homeX: pos.x,
      homeY: pos.y,
      team: 'away',
      hasBall: false,
      color: 'hsl(0, 70%, 55%)',
    }));

    setSimPlayers([...homeSim, ...awaySim]);
  }, [homePlayers, awayStrength]);

  const generateEvent = useCallback((min: number): SimEvent | null => {
    const roll = Math.random();
    const strengthRatio = homeStrength / (homeStrength + awayStrength);
    const isHome = Math.random() < strengthRatio;
    const team = isHome ? 'home' : 'away';
    const teamName = isHome ? homeTeam : awayTeam;
    const playerName = isHome
      ? (homePlayers[Math.floor(Math.random() * Math.min(11, homePlayers.length))]?.name.split(' ').pop() || 'Jogador')
      : `Jogador do ${awayTeam}`;

    // Halftime
    if (min === 45) {
      return { minute: 45, type: 'halftime', description: '⏱️ Intervalo! Os times vão para o vestiário.', team: 'home' };
    }
    if (min === 46) {
      return { minute: 46, type: 'kickoff', description: '⚽ Segundo tempo! A bola volta a rolar.', team: 'away' };
    }

    // Low chance per tick of something happening
    if (roll > 0.12) return null;

    const eventRoll = Math.random();

    // Goal chance (~8% of events)
    if (eventRoll < 0.08) {
      const goalDescs = [
        `⚽ GOOOOL! ${playerName} marca de forma espetacular para o ${teamName}!`,
        `⚽ GOOOOL! ${playerName} não perdoa e balança a rede!`,
        `⚽ GOOOOL! Belo chute de ${playerName}! ${teamName} comemora!`,
        `⚽ GOOOOL! ${playerName} cabeceia e a bola entra! Que golaço!`,
        `⚽ GOOOOL! Jogada ensaiada e ${playerName} completa para o gol!`,
      ];
      return { minute: min, type: 'goal', description: goalDescs[Math.floor(Math.random() * goalDescs.length)], team, playerName };
    }

    // Shot on target (~12%)
    if (eventRoll < 0.20) {
      const shotDescs = [
        `🎯 ${playerName} chuta forte, mas o goleiro defende!`,
        `💥 Finalização perigosa de ${playerName}! Passa perto!`,
        `🧤 Grande defesa do goleiro após chute de ${playerName}!`,
        `🎯 ${playerName} tenta de longe, mas a bola vai por cima!`,
      ];
      return { minute: min, type: 'shot', description: shotDescs[Math.floor(Math.random() * shotDescs.length)], team, playerName };
    }

    // Pass/buildup (~15%)
    if (eventRoll < 0.35) {
      const passDescs = [
        `📍 ${teamName} troca passes no meio-campo com tranquilidade.`,
        `🔄 Bela troca de passes do ${teamName}. Buscando espaço.`,
        `➡️ ${playerName} recebe e toca para o companheiro. ${teamName} constrói a jogada.`,
      ];
      return { minute: min, type: 'pass', description: passDescs[Math.floor(Math.random() * passDescs.length)], team, playerName };
    }

    // Tackle (~12%)
    if (eventRoll < 0.47) {
      const tackleDescs = [
        `💪 ${playerName} faz um desarme firme!`,
        `🦶 Carrinho perfeito de ${playerName}! Recuperou a bola!`,
        `⚔️ Dividida dura no meio-campo. ${playerName} leva a melhor.`,
      ];
      return { minute: min, type: 'tackle', description: tackleDescs[Math.floor(Math.random() * tackleDescs.length)], team, playerName };
    }

    // Cross (~10%)
    if (eventRoll < 0.57) {
      const crossDescs = [
        `↗️ ${playerName} cruza na área! A defesa afasta.`,
        `🎯 Cruzamento rasteiro de ${playerName}! Ninguém alcançou.`,
        `↗️ Bola levantada na área por ${playerName}!`,
      ];
      return { minute: min, type: 'cross', description: crossDescs[Math.floor(Math.random() * crossDescs.length)], team, playerName };
    }

    // Foul (~10%)
    if (eventRoll < 0.67) {
      const foulDescs = [
        `⚠️ Falta cometida por ${playerName}. Jogo parado.`,
        `🛑 ${playerName} derruba o adversário. Falta marcada.`,
        `⚠️ Lance duro de ${playerName}. O juiz marca falta.`,
      ];
      return { minute: min, type: 'foul', description: foulDescs[Math.floor(Math.random() * foulDescs.length)], team, playerName };
    }

    // Dribble (~8%)
    if (eventRoll < 0.75) {
      const dribDescs = [
        `✨ ${playerName} dribla com classe e avança!`,
        `🌀 Que drible de ${playerName}! Passou por dois!`,
        `💫 ${playerName} faz jogada individual brilhante!`,
      ];
      return { minute: min, type: 'dribble', description: dribDescs[Math.floor(Math.random() * dribDescs.length)], team, playerName };
    }

    // Corner (~6%)
    if (eventRoll < 0.81) {
      return { minute: min, type: 'corner', description: `🚩 Escanteio para o ${teamName}!`, team, playerName };
    }

    // Counter attack (~6%)
    if (eventRoll < 0.87) {
      return { minute: min, type: 'counterattack', description: `🏃 Contra-ataque rápido do ${teamName}! Perigo!`, team, playerName };
    }

    // Yellow card (~6%)
    if (eventRoll < 0.93) {
      return { minute: min, type: 'yellow', description: `🟨 Cartão amarelo para ${playerName}!`, team, playerName };
    }

    // Header (~4%)
    if (eventRoll < 0.97) {
      return { minute: min, type: 'header', description: `🤕 ${playerName} cabeceia! A defesa corta.`, team, playerName };
    }

    // Offside (~3%)
    return { minute: min, type: 'offside', description: `🏳️ Impedimento marcado contra o ${teamName}.`, team, playerName };
  }, [homeStrength, awayStrength, homeTeam, awayTeam, homePlayers]);

  // Move players toward their targets
  const updatePositions = useCallback(() => {
    setSimPlayers(prev => prev.map(p => {
      const moveSpeed = 0.15;
      const newX = lerp(p.x, p.targetX, moveSpeed);
      const newY = lerp(p.y, p.targetY, moveSpeed);

      // Occasionally pick a new target near home position
      let tX = p.targetX;
      let tY = p.targetY;
      if (Math.random() < 0.05) {
        const jitterX = (Math.random() - 0.5) * 20;
        const jitterY = (Math.random() - 0.5) * 25;
        tX = Math.max(2, Math.min(98, p.homeX + jitterX));
        tY = Math.max(2, Math.min(98, p.homeY + jitterY));
      }

      return { ...p, x: newX, y: newY, targetX: tX, targetY: tY };
    }));

    setBall(prev => ({
      ...prev,
      x: lerp(prev.x, prev.targetX, 0.2),
      y: lerp(prev.y, prev.targetY, 0.2),
    }));
  }, []);

  // Move ball based on event
  const moveBallForEvent = useCallback((event: SimEvent) => {
    const isHomeEvent = event.team === 'home';
    switch (event.type) {
      case 'goal':
        setBall({ x: isHomeEvent ? 88 : 12, y: 50 + (Math.random() * 10 - 5), targetX: isHomeEvent ? 95 : 5, targetY: 50, speed: 5, visible: true });
        break;
      case 'shot':
        setBall(prev => ({ ...prev, targetX: isHomeEvent ? 90 : 10, targetY: 40 + Math.random() * 20, speed: 4 }));
        break;
      case 'pass':
        setBall(prev => ({ ...prev, targetX: prev.x + (isHomeEvent ? 10 : -10) + Math.random() * 5, targetY: 20 + Math.random() * 60, speed: 2 }));
        break;
      case 'cross':
        setBall(prev => ({ ...prev, targetX: isHomeEvent ? 82 : 18, targetY: 35 + Math.random() * 30, speed: 3 }));
        break;
      case 'corner':
        setBall({ x: isHomeEvent ? 97 : 3, y: Math.random() > 0.5 ? 5 : 95, targetX: isHomeEvent ? 85 : 15, targetY: 40 + Math.random() * 20, speed: 3, visible: true });
        break;
      case 'counterattack':
        setBall(prev => ({ ...prev, targetX: isHomeEvent ? 75 : 25, targetY: 30 + Math.random() * 40, speed: 4 }));
        break;
      case 'tackle':
      case 'foul':
        setBall(prev => ({ ...prev, targetX: 40 + Math.random() * 20, targetY: 20 + Math.random() * 60, speed: 1 }));
        break;
      case 'kickoff':
      case 'halftime':
        setBall({ x: 50, y: 50, targetX: 50, targetY: 50, speed: 1, visible: true });
        break;
      default:
        setBall(prev => ({ ...prev, targetX: 30 + Math.random() * 40, targetY: 20 + Math.random() * 60, speed: 2 }));
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (isPaused || isFinished || simPlayers.length === 0) return;

    const tickMs = Math.max(80, 400 / speed);
    let currentMin = minute;

    intervalRef.current = window.setInterval(() => {
      currentMin += 1;
      if (currentMin > 90) {
        setIsFinished(true);
        setCommentary('🏁 Fim de jogo! O árbitro apita!');
        onFinish(homeGoalsRef.current, awayGoalsRef.current, eventsRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      setMinute(currentMin);
      updatePositions();

      const event = generateEvent(currentMin);
      if (event) {
        if (event.type === 'goal') {
          if (event.team === 'home') {
            homeGoalsRef.current++;
            setHomeGoals(homeGoalsRef.current);
          } else {
            awayGoalsRef.current++;
            setAwayGoals(awayGoalsRef.current);
          }
        }
        eventsRef.current = [...eventsRef.current, event];
        setEvents(prev => [...prev, event]);
        setCommentary(event.description);
        setLastEvent(event);
        moveBallForEvent(event);
      } else {
        // Idle ball movement
        if (Math.random() < 0.3) {
          setBall(prev => ({
            ...prev,
            targetX: Math.max(5, Math.min(95, prev.targetX + (Math.random() - 0.5) * 15)),
            targetY: Math.max(5, Math.min(95, prev.targetY + (Math.random() - 0.5) * 15)),
          }));
        }
        updatePositions();
      }
    }, tickMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, isFinished, speed, simPlayers.length]);

  const eventTypeColor = (type: string) => {
    switch (type) {
      case 'goal': return 'text-emerald-400 font-bold';
      case 'shot': case 'chance': return 'text-yellow-400';
      case 'yellow': return 'text-yellow-300';
      case 'red': return 'text-red-400';
      case 'foul': return 'text-orange-400';
      case 'tackle': return 'text-blue-400';
      case 'save': return 'text-purple-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-2">
      {/* Scoreboard */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-right flex-1">
              <p className="text-xs sm:text-sm font-bold truncate">{homeTeam}</p>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono px-3 py-1 rounded-lg bg-muted/30 min-w-[80px] text-center">
              {homeGoals} <span className="text-muted-foreground text-sm">x</span> {awayGoals}
            </div>
            <div className="text-left flex-1">
              <p className="text-xs sm:text-sm font-bold truncate">{awayTeam}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant={minute <= 45 ? 'default' : 'secondary'} className="text-xs font-mono">
            {minute > 90 ? '90' : minute}' {minute <= 45 ? '1ºT' : '2ºT'}
          </Badge>
        </div>
      </Card>

      {/* Pitch */}
      <div ref={canvasRef} className="relative w-full aspect-[16/10] bg-emerald-800 rounded-xl overflow-hidden border border-emerald-600/30 select-none">
        {/* Pitch markings */}
        <div className="absolute inset-0">
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20" />
          {/* Center circle */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[15%] aspect-square border border-white/20 rounded-full" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/30 rounded-full" />
          {/* Left penalty area */}
          <div className="absolute left-0 top-[20%] w-[16%] h-[60%] border border-l-0 border-white/20" />
          <div className="absolute left-0 top-[32%] w-[7%] h-[36%] border border-l-0 border-white/15" />
          {/* Right penalty area */}
          <div className="absolute right-0 top-[20%] w-[16%] h-[60%] border border-r-0 border-white/20" />
          <div className="absolute right-0 top-[32%] w-[7%] h-[36%] border border-r-0 border-white/15" />
          {/* Goals */}
          <div className="absolute left-0 top-[42%] w-[2%] h-[16%] bg-white/10 border border-l-0 border-white/25" />
          <div className="absolute right-0 top-[42%] w-[2%] h-[16%] bg-white/10 border border-r-0 border-white/25" />
          {/* Grass stripes */}
          {[20, 40, 60, 80].map(pct => (
            <div key={pct} className="absolute top-0 bottom-0 w-[20%] opacity-[0.03] bg-white" style={{ left: `${pct}%` }} />
          ))}
        </div>

        {/* Players */}
        {simPlayers.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-linear flex flex-col items-center pointer-events-none"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] font-bold text-white shadow-lg border ${
                p.team === 'home' ? 'bg-blue-600 border-blue-300/50' : 'bg-red-600 border-red-300/50'
              }`}
            >
              {p.overall}
            </div>
            <span className="text-[6px] sm:text-[7px] text-white/80 font-medium truncate max-w-[40px] drop-shadow-md leading-tight mt-0.5">
              {p.name}
            </span>
          </div>
        ))}

        {/* Ball */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ease-linear pointer-events-none z-10"
          style={{ left: `${ball.x}%`, top: `${ball.y}%` }}
        >
          <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)] border border-gray-300" />
        </div>

        {/* Goal flash */}
        {lastEvent?.type === 'goal' && (
          <div className="absolute inset-0 bg-yellow-400/10 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPaused(!isPaused)}
          className="h-8 gap-1 text-xs"
          disabled={isFinished}
        >
          {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {isPaused ? 'Retomar' : 'Pausar'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSpeed(s => s >= 4 ? 1 : s * 2)}
          className="h-8 gap-1 text-xs"
          disabled={isFinished}
        >
          <FastForward className="h-3 w-3" /> {speed}x
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="h-8 gap-1 text-xs text-muted-foreground"
        >
          <SkipForward className="h-3 w-3" /> Pular
        </Button>
      </div>

      {/* Commentary */}
      <Card className="p-2.5">
        <p className={`text-xs sm:text-sm text-center font-medium ${lastEvent ? eventTypeColor(lastEvent.type) : 'text-muted-foreground'}`}>
          {commentary}
        </p>
      </Card>

      {/* Event log */}
      {events.length > 0 && (
        <Card className="p-2 max-h-[120px] overflow-y-auto">
          <div className="space-y-0.5">
            {[...events].reverse().slice(0, 8).map((ev, i) => (
              <div key={i} className={`flex items-center gap-2 text-[10px] sm:text-xs px-1.5 py-0.5 rounded ${ev.team === 'home' ? 'bg-blue-500/5' : 'bg-red-500/5'}`}>
                <Badge variant="outline" className="text-[7px] w-7 justify-center shrink-0 font-mono">{ev.minute}'</Badge>
                <span className={eventTypeColor(ev.type)}>{ev.description}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}