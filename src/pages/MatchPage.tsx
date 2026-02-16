import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Player } from '@/types/game';
import { TacticsConfig, Formation, PlayStyle, Pressing, Tempo, Marking, PassingStyle, DefenseLine, Width } from '@/types/tactics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw, Star, Users, Settings2, Film, LogOut } from 'lucide-react';

// ---- Types ----
interface SimEvent {
  minute: number;
  type: 'goal' | 'shot' | 'save' | 'pass' | 'tackle' | 'foul' | 'corner' | 'yellow' | 'red' | 'offside' | 'header' | 'cross' | 'dribble' | 'counterattack' | 'halftime' | 'kickoff' | 'chance';
  description: string;
  team: 'home' | 'away';
  playerName?: string;
  assistName?: string;
  goalType?: string;
}

interface SimPlayer {
  id: string;
  name: string;
  fullName: string;
  position: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  team: 'home' | 'away';
  ovr: number;
  rating: number;
  goals: number;
  assists: number;
  cards: number;
  isOnPitch: boolean;
}

interface MatchPageState {
  homeTeam: string;
  awayTeam: string;
  homePlayers: Player[];
  homeStrength: number;
  awayStrength: number;
  matchId: string;
  tactics: TacticsConfig;
  stadiumName: string;
  stadiumCapacity: number;
  isHome: boolean;
}

// ---- Constants ----
const HALF_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const HALFTIME_DURATION_MS = 2 * 60 * 1000; // 2 minutes
const TICK_MS = 1000; // 1 second per tick
const MINUTES_PER_HALF = 45;

const HOME_SLOTS = [
  { x: 8, y: 50 }, { x: 22, y: 20 }, { x: 22, y: 45 }, { x: 22, y: 55 }, { x: 22, y: 80 },
  { x: 40, y: 15 }, { x: 38, y: 40 }, { x: 38, y: 60 }, { x: 40, y: 85 },
  { x: 58, y: 35 }, { x: 58, y: 65 },
];
const AWAY_SLOTS = [
  { x: 92, y: 50 }, { x: 78, y: 80 }, { x: 78, y: 55 }, { x: 78, y: 45 }, { x: 78, y: 20 },
  { x: 60, y: 85 }, { x: 62, y: 60 }, { x: 62, y: 40 }, { x: 60, y: 15 },
  { x: 42, y: 65 }, { x: 42, y: 35 },
];

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export default function MatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as MatchPageState | null;

  // If no state, redirect back
  useEffect(() => {
    if (!state) navigate('/', { replace: true });
  }, [state, navigate]);

  // Store match-in-progress in sessionStorage so Dashboard can show "AO VIVO"
  useEffect(() => {
    if (state) {
      sessionStorage.setItem('match_live', JSON.stringify({
        homeTeam: state.homeTeam,
        awayTeam: state.awayTeam,
        stadiumName: state.stadiumName,
        matchId: state.matchId,
      }));
    }
    return () => {
      // cleanup on unmount (match ended or abandoned)
    };
  }, [state]);

  if (!state) return null;

  const handleAbandon = () => {
    sessionStorage.removeItem('match_live');
    navigate('/', { replace: true });
  };

  return <MatchSimulation {...state} onEnd={(hg, ag, ratings) => {
    sessionStorage.removeItem('match_live');
    navigate('/', { state: { matchResult: { matchId: state.matchId, homeGoals: hg, awayGoals: ag, playerRatings: ratings } } });
  }} onAbandon={handleAbandon} />;
}

// ---- Main Simulation Component ----
function MatchSimulation({ homeTeam, awayTeam, homePlayers, homeStrength, awayStrength, matchId, tactics: initialTactics, stadiumName, stadiumCapacity, isHome, onEnd, onAbandon }: MatchPageState & { onEnd: (hg: number, ag: number, ratings: Record<string, number>) => void; onAbandon: () => void }) {
  // Game state
  const [phase, setPhase] = useState<'first_half' | 'halftime' | 'second_half' | 'finished'>('first_half');
  const [matchMinute, setMatchMinute] = useState(0);
  const [realTimeLeft, setRealTimeLeft] = useState(HALF_DURATION_MS);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [commentary, setCommentary] = useState('⚽ A bola vai rolar!');
  const [lastEventType, setLastEventType] = useState('');
  const [goalFlash, setGoalFlash] = useState(false);
  const [halftimeCountdown, setHalftimeCountdown] = useState(0);

  // Tactics (modifiable during match) - all fields
  const [formation, setFormation] = useState<Formation>(initialTactics.formation);
  const [playStyle, setPlayStyle] = useState<PlayStyle>(initialTactics.playStyle);
  const [pressing, setPressing] = useState<Pressing>(initialTactics.pressing);
  const [tempo, setTempo] = useState<Tempo>(initialTactics.tempo || 'normal');
  const [marking, setMarking] = useState<Marking>(initialTactics.marking || 'zona');
  const [passingStyle, setPassingStyle] = useState<PassingStyle>(initialTactics.passingStyle || 'misto');
  const [defenseLine, setDefenseLine] = useState<DefenseLine>(initialTactics.defenseLine || 'media');
  const [width, setWidth] = useState<Width>(initialTactics.width || 'normal');

  // Goal replay state
  const [showReplay, setShowReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  // Substitutions
  const [subsUsed, setSubsUsed] = useState(0);
  const MAX_SUBS = 3;
  const [showSubModal, setShowSubModal] = useState(false);
  const [subOut, setSubOut] = useState<string | null>(null);

  // Players
  const allHomePlayers = useMemo(() => homePlayers, [homePlayers]);
  const [startingIds, setStartingIds] = useState<string[]>(() => homePlayers.slice(0, 11).map(p => p.id));
  const [benchIds, setBenchIds] = useState<string[]>(() => homePlayers.slice(11).map(p => p.id));

  // Refs for simulation
  const playersRef = useRef<SimPlayer[]>([]);
  const ballRef = useRef({ x: 50, y: 50 });
  const pitchRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const phaseStartRef = useRef(Date.now());
  const homeGoalsRef = useRef(0);
  const awayGoalsRef = useRef(0);
  const eventsRef = useRef<SimEvent[]>([]);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Init sim players
  useEffect(() => {
    const starters = startingIds.map(id => allHomePlayers.find(p => p.id === id)!).filter(Boolean);
    const home: SimPlayer[] = starters.map((p, i) => {
      const slot = HOME_SLOTS[i] || HOME_SLOTS[HOME_SLOTS.length - 1];
      return {
        id: p.id, name: p.name.split(' ').pop() || p.name, fullName: p.name,
        position: p.position, x: slot.x, y: slot.y, homeX: slot.x, homeY: slot.y,
        team: 'home', ovr: p.overall, rating: 6.0, goals: 0, assists: 0, cards: 0, isOnPitch: true,
      };
    });
    const away: SimPlayer[] = AWAY_SLOTS.map((slot, i) => ({
      id: `a${i}`, name: `Jog. ${i + 1}`, fullName: `Jogador ${i + 1}`,
      position: i === 0 ? 'GOL' : i < 5 ? 'ZAG' : i < 9 ? 'MEI' : 'ATA',
      x: slot.x, y: slot.y, homeX: slot.x, homeY: slot.y,
      team: 'away', ovr: Math.floor(awayStrength + (Math.random() * 8 - 4)),
      rating: 6.0, goals: 0, assists: 0, cards: 0, isOnPitch: true,
    }));
    playersRef.current = [...home, ...away];
  }, [startingIds, allHomePlayers, awayStrength]);

  // Smooth player/ball movement via rAF - use CSS transitions instead of per-frame jitter
  // Target positions are stored separately to avoid shaking
  const playerTargetsRef = useRef<Map<string, { tx: number; ty: number; lastUpdate: number }>>(new Map());

  // Update targets periodically (not every frame) to avoid jitter
  useEffect(() => {
    const updateTargets = () => {
      const players = playersRef.current;
      const bx = ballRef.current.x;
      const by = ballRef.current.y;
      for (const p of players) {
        if (!p.isOnPitch) continue;
        let target = playerTargetsRef.current.get(p.id);
        if (!target) {
          target = { tx: p.homeX, ty: p.homeY, lastUpdate: 0 };
          playerTargetsRef.current.set(p.id, target);
        }
        // Set new target: blend between home position and ball attraction
        const pullStrength = p.team === 'home' ? (p.homeX > 30 ? 0.15 : 0.06) : (p.homeX < 70 ? 0.15 : 0.06);
        const offsetX = (Math.random() - 0.5) * 6;
        const offsetY = (Math.random() - 0.5) * 6;
        target.tx = clamp(p.homeX + (bx - p.homeX) * pullStrength + offsetX, 3, 97);
        target.ty = clamp(p.homeY + (by - p.homeY) * pullStrength + offsetY, 3, 97);
      }
    };
    const interval = setInterval(updateTargets, 800);
    updateTargets();
    return () => clearInterval(interval);
  }, []);

  // Smooth lerp toward targets via rAF - no random noise per frame
  useEffect(() => {
    const tick = () => {
      const players = playersRef.current;
      for (const p of players) {
        if (!p.isOnPitch) continue;
        const target = playerTargetsRef.current.get(p.id);
        if (target) {
          p.x += (target.tx - p.x) * 0.04;
          p.y += (target.ty - p.y) * 0.04;
        }
      }
      // Smooth ball lerp
      ballRef.current.x += (ballTargetRef.current.x - ballRef.current.x) * 0.06;
      ballRef.current.y += (ballTargetRef.current.y - ballRef.current.y) * 0.06;
      if (pitchRef.current) {
        const els = pitchRef.current.querySelectorAll<HTMLElement>('[data-pid]');
        els.forEach(el => {
          const pl = players.find(pp => pp.id === el.dataset.pid);
          if (pl) { el.style.left = `${pl.x}%`; el.style.top = `${pl.y}%`; }
        });
        const ballEl = pitchRef.current.querySelector<HTMLElement>('[data-ball]');
        if (ballEl) { ballEl.style.left = `${ballRef.current.x}%`; ballEl.style.top = `${ballRef.current.y}%`; }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Ball uses lerp too - store target and lerp in rAF
  const ballTargetRef = useRef({ x: 50, y: 50 });
  const moveBall = useCallback((x: number, y: number) => {
    ballTargetRef.current = { x: clamp(x, 3, 97), y: clamp(y, 3, 97) };
  }, []);

  const pickHomeName = useCallback(() => {
    const starters = playersRef.current.filter(p => p.team === 'home' && p.isOnPitch);
    const p = starters[Math.floor(Math.random() * starters.length)];
    return p?.name || 'Jogador';
  }, []);

  const pickHomePlayer = useCallback(() => {
    const starters = playersRef.current.filter(p => p.team === 'home' && p.isOnPitch);
    return starters[Math.floor(Math.random() * starters.length)] || null;
  }, []);

  const pickAwayName = useCallback(() => {
    const awayPlayers = playersRef.current.filter(p => p.team === 'away' && p.isOnPitch);
    const p = awayPlayers[Math.floor(Math.random() * awayPlayers.length)];
    return p?.name || `Jogador do ${awayTeam}`;
  }, [awayTeam]);

  const generateEvent = useCallback((min: number): SimEvent | null => {
    if (Math.random() > 0.40) return null; // ~40% chance per tick
    const ratio = homeStrength / (homeStrength + awayStrength);
    const team: 'home' | 'away' = Math.random() < ratio ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const pName = team === 'home' ? pickHomeName() : pickAwayName();
    const pName2 = team === 'home' ? pickHomeName() : pickAwayName();
    const r = Math.random();

    // GOAL (5%)
    if (r < 0.05) {
      moveBall(team === 'home' ? 92 : 8, 45 + Math.random() * 10);
      let assistName: string | undefined;
      const goalTypes = ['chute rasteiro', 'cabeceio', 'voleio', 'toque de letra', 'chute de fora da área', 'pênalti', 'gol olímpico', 'bicicleta', 'chute colocado'];
      const goalType = goalTypes[Math.floor(Math.random() * goalTypes.length)];
      if (team === 'home') {
        const scorer = pickHomePlayer();
        if (scorer) {
          scorer.goals++;
          scorer.rating = Math.min(10, scorer.rating + 1.2);
          const others = playersRef.current.filter(p => p.team === 'home' && p.id !== scorer.id && p.isOnPitch);
          if (others.length > 0 && Math.random() < 0.65) {
            const assister = others[Math.floor(Math.random() * others.length)];
            assister.assists++;
            assister.rating = Math.min(10, assister.rating + 0.6);
            assistName = assister.name;
          }
        }
      }
      const descs = [
        `⚽ GOOOOL! ${pName} marca para o ${tName}!`,
        `⚽ GOOOOL! ${pName} não perdoa e balança as redes com um ${goalType}!`,
        `⚽ GOOOOL! Que golaço de ${pName}! ${goalType} espetacular!`,
        `⚽ GOOOOL! ${pName} finaliza de ${goalType} e marca!`,
        `⚽ GOOOOL! ${pName} recebe, gira e manda pro fundo das redes!`,
        `⚽ GOOOOL! Bola na rede! ${pName} faz o gol do ${tName}!`,
      ];
      return { minute: min, type: 'goal', description: descs[Math.floor(Math.random() * descs.length)], team, playerName: pName, assistName, goalType };
    }
    // SHOT ON TARGET (7%)
    if (r < 0.12) {
      moveBall(team === 'home' ? 85 : 15, 40 + Math.random() * 20);
      if (team === 'home') { const p = pickHomePlayer(); if (p) p.rating = Math.min(10, p.rating + 0.15); }
      const descs = [
        `🎯 ${pName} finaliza no canto! Goleiro faz grande defesa!`,
        `🎯 ${pName} chuta forte e o goleiro espalma!`,
        `🎯 Finalização perigosa de ${pName}! Defesa!`,
        `🎯 ${pName} bate colocado, goleiro se estica e salva!`,
      ];
      return { minute: min, type: 'shot', description: descs[Math.floor(Math.random() * descs.length)], team, playerName: pName };
    }
    // SHOT OFF TARGET (5%)
    if (r < 0.17) {
      moveBall(team === 'home' ? 88 : 12, 30 + Math.random() * 40);
      const descs = [
        `💨 ${pName} chuta por cima do gol!`,
        `💨 Finalização de ${pName} vai para fora!`,
        `💨 ${pName} tenta de longe mas manda na arquibancada!`,
        `💨 Chute de ${pName} desvia na zaga e sai!`,
      ];
      return { minute: min, type: 'chance', description: descs[Math.floor(Math.random() * descs.length)], team, playerName: pName };
    }
    // PASS SEQUENCE (8%)
    if (r < 0.25) {
      moveBall(ballRef.current.x + (team === 'home' ? 8 : -8), 25 + Math.random() * 50);
      const descs = [
        `📍 ${tName} troca passes buscando espaço no ataque.`,
        `📍 Bela troca de passes entre ${pName} e ${pName2}.`,
        `📍 ${tName} trabalha a bola com paciência no meio-campo.`,
        `📍 Toque, toque... ${tName} circula a bola com qualidade.`,
      ];
      return { minute: min, type: 'pass', description: descs[Math.floor(Math.random() * descs.length)], team };
    }
    // TACKLE (6%)
    if (r < 0.31) {
      moveBall(40 + Math.random() * 20, 20 + Math.random() * 60);
      if (team === 'home') { const p = pickHomePlayer(); if (p) p.rating = Math.min(10, p.rating + 0.1); }
      const descs = [
        `💪 ${pName} faz desarme firme e recupera a posse!`,
        `💪 Carrinho perfeito de ${pName}!`,
        `💪 ${pName} antecipa e corta o passe!`,
        `💪 Grande interceptação de ${pName}!`,
      ];
      return { minute: min, type: 'tackle', description: descs[Math.floor(Math.random() * descs.length)], team, playerName: pName };
    }
    // CROSS (6%)
    if (r < 0.37) {
      moveBall(team === 'home' ? 80 : 20, 15 + Math.random() * 70);
      const descs = [
        `↗️ ${pName} cruza na área! Zaga afasta!`,
        `↗️ Cruzamento rasteiro de ${pName} pela esquerda!`,
        `↗️ ${pName} levanta na segunda trave!`,
        `↗️ Bola cruzada por ${pName}, ninguém alcança!`,
      ];
      return { minute: min, type: 'cross', description: descs[Math.floor(Math.random() * descs.length)], team, playerName: pName };
    }
    // FOUL (7%)
    if (r < 0.44) {
      moveBall(35 + Math.random() * 30, 30 + Math.random() * 40);
      const descs = [
        `⚠️ Falta de ${pName}. Árbitro marca.`,
        `⚠️ ${pName} chega atrasado e comete falta!`,
        `⚠️ Falta dura de ${pName} no meio-campo!`,
        `⚠️ ${pName} puxa a camisa. Falta marcada!`,
      ];
      return { minute: min, type: 'foul', description: descs[Math.floor(Math.random() * descs.length)], team, playerName: pName };
    }
    // DRIBBLE (6%)
    if (r < 0.50) {
      moveBall(ballRef.current.x + (team === 'home' ? 12 : -12), ballRef.current.y + (Math.random() - 0.5) * 20);
      if (team === 'home') { const p = pickHomePlayer(); if (p) p.rating = Math.min(10, p.rating + 0.15); }
      const descs = [
        `✨ ${pName} dribla com classe e avança!`,
        `✨ Olé! ${pName} passa por dois marcadores!`,
        `✨ ${pName} faz jogada individual espetacular!`,
        `✨ Belo drible de corpo de ${pName}!`,
      ];
      return { minute: min, type: 'dribble', description: descs[Math.floor(Math.random() * descs.length)], team, playerName: pName };
    }
    // CORNER (5%)
    if (r < 0.55) {
      moveBall(team === 'home' ? 97 : 3, Math.random() > 0.5 ? 8 : 92);
      const descs = [
        `🚩 Escanteio para o ${tName}!`,
        `🚩 Bola desviada! Escanteio para o ${tName}!`,
        `🚩 Defesa corta e a bola sai pela linha de fundo. Escanteio!`,
      ];
      return { minute: min, type: 'corner', description: descs[Math.floor(Math.random() * descs.length)], team };
    }
    // COUNTERATTACK (6%)
    if (r < 0.61) {
      moveBall(team === 'home' ? 70 : 30, 30 + Math.random() * 40);
      const descs = [
        `🏃 Contra-ataque veloz do ${tName}!`,
        `🏃 ${pName} puxa o contra-ataque em velocidade!`,
        `🏃 Transição rápida! ${tName} sai em velocidade!`,
        `🏃 ${pName} arranca em contra-ataque com ${pName2}!`,
      ];
      return { minute: min, type: 'counterattack', description: descs[Math.floor(Math.random() * descs.length)], team };
    }
    // HEADER (5%)
    if (r < 0.66) {
      moveBall(team === 'home' ? 82 : 18, 40 + Math.random() * 20);
      const descs = [
        `🤕 ${pName} cabeceia! Defesa corta em cima da linha!`,
        `🤕 Cabeçada de ${pName} passa raspando a trave!`,
        `🤕 ${pName} sobe mais que todo mundo e cabeceia!`,
      ];
      return { minute: min, type: 'header', description: descs[Math.floor(Math.random() * descs.length)], team, playerName: pName };
    }
    // SAVE (5%)
    if (r < 0.71) {
      moveBall(team === 'home' ? 8 : 92, 45 + Math.random() * 10);
      const descs = [
        `🧤 Grande defesa do goleiro do ${team === 'home' ? awayTeam : homeTeam}!`,
        `🧤 Goleiro se estica todo e faz defesaça!`,
        `🧤 Mão trocada do goleiro! Salvou o time!`,
      ];
      return { minute: min, type: 'save', description: descs[Math.floor(Math.random() * descs.length)], team };
    }
    // YELLOW CARD (5%)
    if (r < 0.76) {
      if (team === 'home') {
        const p = pickHomePlayer();
        if (p) { p.cards++; p.rating = Math.max(3, p.rating - 0.5); }
      }
      const descs = [
        `🟨 Cartão amarelo para ${pName}!`,
        `🟨 ${pName} recebe amarelo por falta tática!`,
        `🟨 Amarelo! ${pName} exagerou na entrada!`,
      ];
      return { minute: min, type: 'yellow', description: descs[Math.floor(Math.random() * descs.length)], team, playerName: pName };
    }
    // RED CARD (1%)
    if (r < 0.77) {
      if (team === 'home') {
        const p = pickHomePlayer();
        if (p) { p.cards += 2; p.rating = Math.max(2, p.rating - 1.5); }
      }
      return { minute: min, type: 'red', description: `🟥 CARTÃO VERMELHO! ${pName} é expulso!`, team, playerName: pName };
    }
    // OFFSIDE (5%)
    if (r < 0.82) {
      return { minute: min, type: 'offside', description: `🏳️ Impedimento! ${pName} estava adiantado.`, team, playerName: pName };
    }
    // FREE KICK (5%)
    if (r < 0.87) {
      moveBall(team === 'home' ? 75 : 25, 45 + Math.random() * 10);
      const descs = [
        `⚽ Falta perigosa para o ${tName}! ${pName} na bola!`,
        `⚽ Cobrança de falta de ${pName}... na barreira!`,
        `⚽ ${pName} cobra direto no gol! Goleiro defende!`,
      ];
      return { minute: min, type: 'chance', description: descs[Math.floor(Math.random() * descs.length)], team, playerName: pName };
    }
    // GOAL KICK / POSSESSION (5%)
    if (r < 0.92) {
      moveBall(team === 'home' ? 15 : 85, 50);
      const descs = [
        `🔄 Tiro de meta do ${tName}. Jogo recomeça.`,
        `🔄 ${tName} mantém a posse de bola no seu campo.`,
        `🔄 Bola com o goleiro do ${tName}, jogo segue.`,
      ];
      return { minute: min, type: 'pass', description: descs[Math.floor(Math.random() * descs.length)], team };
    }
    // THROW-IN / MISC (8%)
    const descs = [
      `📋 Lateral para o ${tName}.`,
      `📋 Bola sai pela lateral. ${tName} repõe.`,
      `📋 ${pName} recebe na lateral e tenta avançar.`,
      `📋 Jogo truncado no meio-campo.`,
    ];
    return { minute: min, type: 'pass', description: descs[Math.floor(Math.random() * descs.length)], team };
  }, [homeStrength, awayStrength, homeTeam, awayTeam, pickHomeName, pickAwayName, pickHomePlayer, moveBall]);

  // Main game clock
  useEffect(() => {
    if (phase === 'finished') return;

    if (phase === 'halftime') {
      setHalftimeCountdown(HALFTIME_DURATION_MS);
      const htInterval = window.setInterval(() => {
        setHalftimeCountdown(prev => {
          if (prev <= TICK_MS) {
            clearInterval(htInterval);
            setPhase('second_half');
            phaseStartRef.current = Date.now();
            setCommentary('⚽ Segundo tempo! A bola volta a rolar!');
            return 0;
          }
          return prev - TICK_MS;
        });
      }, TICK_MS);
      return () => clearInterval(htInterval);
    }

    // Playing (first_half or second_half)
    phaseStartRef.current = Date.now();
    const isSecondHalf = phase === 'second_half';
    const baseMinute = isSecondHalf ? 45 : 0;

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - phaseStartRef.current;
      const progress = Math.min(1, elapsed / HALF_DURATION_MS);
      const currentMinute = Math.floor(baseMinute + progress * MINUTES_PER_HALF);
      const timeLeft = Math.max(0, HALF_DURATION_MS - elapsed);

      setMatchMinute(currentMinute);
      setRealTimeLeft(timeLeft);

      // Generate events
      const event = generateEvent(currentMinute);
      if (event) {
        if (event.type === 'goal') {
          if (event.team === 'home') { homeGoalsRef.current++; setHomeGoals(homeGoalsRef.current); }
          else { awayGoalsRef.current++; setAwayGoals(awayGoalsRef.current); }
          setGoalFlash(true);
          setTimeout(() => setGoalFlash(false), 1200);
        }
        eventsRef.current.push(event);
        setEvents(prev => [...prev, event]);
        setCommentary(event.description);
        setLastEventType(event.type);
      } else {
        moveBall(ballRef.current.x + (Math.random() - 0.5) * 6, ballRef.current.y + (Math.random() - 0.5) * 6);
      }

      if (elapsed >= HALF_DURATION_MS) {
        clearInterval(interval);
        if (isSecondHalf) {
          setPhase('finished');
          setMatchMinute(90);
          setCommentary('🏁 Fim de jogo! O árbitro apita!');
        } else {
          setPhase('halftime');
          setMatchMinute(45);
          setCommentary('⏱️ Intervalo! Hora de ajustar a equipe.');
        }
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [phase, generateEvent, moveBall]);

  // Player ratings for display
  const homePlayerRatings = useMemo(() => {
    return playersRef.current
      .filter(p => p.team === 'home')
      .sort((a, b) => b.rating - a.rating);
  }, [events, phase]); // re-calc when events change

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Substitution logic
  const doSub = useCallback((outId: string, inId: string) => {
    setStartingIds(prev => prev.map(id => id === outId ? inId : id));
    setBenchIds(prev => [...prev.filter(id => id !== inId), outId]);
    setSubsUsed(s => s + 1);
    // Update sim players
    const outPlayer = playersRef.current.find(p => p.id === outId);
    const inPlayerData = allHomePlayers.find(p => p.id === inId);
    if (outPlayer && inPlayerData) {
      outPlayer.isOnPitch = false;
      const newSim: SimPlayer = {
        id: inId, name: inPlayerData.name.split(' ').pop() || inPlayerData.name, fullName: inPlayerData.name,
        position: inPlayerData.position, x: outPlayer.x, y: outPlayer.y, homeX: outPlayer.homeX, homeY: outPlayer.homeY,
        team: 'home', ovr: inPlayerData.overall, rating: 6.0, goals: 0, assists: 0, cards: 0, isOnPitch: true,
      };
      playersRef.current.push(newSim);
    }
    setShowSubModal(false);
    setSubOut(null);
  }, [allHomePlayers]);

  const ratingColor = (r: number) => r >= 8 ? 'text-emerald-400' : r >= 7 ? 'text-primary' : r >= 6 ? 'text-yellow-400' : 'text-destructive';

  const eventColor = (type: string) => {
    switch (type) {
      case 'goal': return 'text-emerald-400 font-bold';
      case 'shot': case 'header': case 'chance': return 'text-yellow-400';
      case 'yellow': return 'text-yellow-300';
      case 'red': return 'text-red-400';
      case 'foul': return 'text-orange-400';
      case 'tackle': return 'text-blue-400';
      default: return 'text-muted-foreground';
    }
  };

  const starters = startingIds.map(id => allHomePlayers.find(p => p.id === id)!).filter(Boolean);
  const bench = benchIds.map(id => allHomePlayers.find(p => p.id === id)!).filter(Boolean);

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 max-w-2xl mx-auto space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {phase !== 'finished' && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-destructive hover:text-destructive gap-1" onClick={onAbandon}>
              <LogOut className="h-3 w-3" /> Sair
            </Button>
          )}
          <Badge variant={phase === 'halftime' ? 'secondary' : phase === 'finished' ? 'outline' : 'default'} className="text-xs font-mono px-2">
            {matchMinute}' {phase === 'first_half' ? '1ºT' : phase === 'halftime' ? 'INT' : phase === 'second_half' ? '2ºT' : 'FIM'}
          </Badge>
          {phase !== 'finished' && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {phase === 'halftime' ? `Intervalo: ${formatTime(halftimeCountdown)}` : formatTime(realTimeLeft)}
            </span>
          )}
        </div>
        <div className="text-[9px] text-muted-foreground">
          🏟️ {stadiumName} ({stadiumCapacity?.toLocaleString()})
        </div>
      </div>

      {/* Scoreboard */}
      <Card className="p-3">
        <div className="flex items-center gap-3 justify-center">
          <p className="text-xs sm:text-sm font-bold truncate text-right flex-1">{homeTeam}</p>
          <div className={`text-3xl sm:text-4xl font-black font-mono px-4 py-1.5 rounded-lg min-w-[90px] text-center transition-colors ${goalFlash ? 'bg-yellow-400/20' : 'bg-muted/30'}`}>
            {homeGoals} <span className="text-muted-foreground text-base">x</span> {awayGoals}
          </div>
          <p className="text-xs sm:text-sm font-bold truncate text-left flex-1">{awayTeam}</p>
        </div>
      </Card>

      {/* Pitch */}
      <div ref={pitchRef} className="relative w-full aspect-[16/10] bg-emerald-800 rounded-xl overflow-hidden border border-emerald-600/30 select-none">
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
        {playersRef.current.filter(p => p.isOnPitch).map(p => (
          <div key={p.id} data-pid={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] font-bold text-white shadow-lg border ${p.team === 'home' ? 'bg-blue-600 border-blue-400/40' : 'bg-red-600 border-red-400/40'}`}>
              {p.ovr}
            </div>
            <span className="text-[5px] sm:text-[7px] text-white/70 font-medium truncate max-w-[36px] drop-shadow-md leading-tight">{p.name}</span>
          </div>
        ))}
        <div data-ball className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ left: '50%', top: '50%' }}>
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.7)] border border-gray-300" />
        </div>
        {goalFlash && <div className="absolute inset-0 bg-yellow-400/15 animate-pulse pointer-events-none" />}
      </div>

      {/* Commentary */}
      <Card className="p-3">
        <p className={`text-sm sm:text-base text-center font-semibold ${eventColor(lastEventType)}`}>{commentary}</p>
      </Card>

      {/* Bottom tabs: Tactics / Substitutions / Events / Ratings */}
      <Tabs defaultValue="events" className="space-y-1">
        <TabsList className="w-full h-8">
          <TabsTrigger value="events" className="flex-1 text-[10px] gap-1">⚡ Lances</TabsTrigger>
          <TabsTrigger value="tactics" className="flex-1 text-[10px] gap-1"><Settings2 className="h-3 w-3" /> Tática</TabsTrigger>
          <TabsTrigger value="subs" className="flex-1 text-[10px] gap-1"><RefreshCw className="h-3 w-3" /> Sub ({subsUsed}/{MAX_SUBS})</TabsTrigger>
          <TabsTrigger value="ratings" className="flex-1 text-[10px] gap-1"><Star className="h-3 w-3" /> Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card className="p-1.5 max-h-[140px] overflow-y-auto">
            <div className="space-y-0.5">
              {events.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">Aguardando lances...</p>}
              {[...events].reverse().slice(0, 10).map((ev, i) => (
                <div key={i} className={`flex items-center gap-1.5 text-[9px] sm:text-[10px] px-1 py-0.5 rounded ${ev.team === 'home' ? 'bg-primary/5' : 'bg-destructive/5'}`}>
                  <Badge variant="outline" className="text-[6px] w-6 justify-center shrink-0 font-mono">{ev.minute}'</Badge>
                  <span className={eventColor(ev.type)}>{ev.description}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tactics">
          <Card className="p-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] text-muted-foreground mb-1 block">Formação</label>
                <Select value={formation} onValueChange={v => setFormation(v as Formation)} disabled={phase === 'finished'}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['4-4-2','4-3-3','4-2-3-1','3-5-2','5-3-2','4-1-4-1','3-4-3','5-4-1','4-5-1','4-3-2-1','4-1-2-1-2','3-4-1-2'] as Formation[]).map(f => (
                      <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground mb-1 block">Estilo</label>
                <Select value={playStyle} onValueChange={v => setPlayStyle(v as PlayStyle)} disabled={phase === 'finished'}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['ofensivo','equilibrado','defensivo','contra-ataque','posse'] as PlayStyle[]).map(s => (
                      <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground mb-1 block">Pressão</label>
                <Select value={pressing} onValueChange={v => setPressing(v as Pressing)} disabled={phase === 'finished'}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['ultra-alto','alto','medio','baixo'] as Pressing[]).map(p => (
                      <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] text-muted-foreground mb-1 block">Tempo</label>
                <Select value={tempo} onValueChange={v => setTempo(v as Tempo)} disabled={phase === 'finished'}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['muito-rapido','rapido','normal','lento'] as Tempo[]).map(t => (
                      <SelectItem key={t} value={t} className="text-xs capitalize">{t.replace('-',' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground mb-1 block">Marcação</label>
                <Select value={marking} onValueChange={v => setMarking(v as Marking)} disabled={phase === 'finished'}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['individual','zona','misto'] as Marking[]).map(m => (
                      <SelectItem key={m} value={m} className="text-xs capitalize">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground mb-1 block">Passe</label>
                <Select value={passingStyle} onValueChange={v => setPassingStyle(v as PassingStyle)} disabled={phase === 'finished'}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['curto','misto','longo','direto'] as PassingStyle[]).map(ps => (
                      <SelectItem key={ps} value={ps} className="text-xs capitalize">{ps}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-muted-foreground mb-1 block">Linha Defensiva</label>
                <Select value={defenseLine} onValueChange={v => setDefenseLine(v as DefenseLine)} disabled={phase === 'finished'}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['alta','media','baixa'] as DefenseLine[]).map(d => (
                      <SelectItem key={d} value={d} className="text-xs capitalize">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground mb-1 block">Largura</label>
                <Select value={width} onValueChange={v => setWidth(v as Width)} disabled={phase === 'finished'}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['estreita','normal','larga'] as Width[]).map(w => (
                      <SelectItem key={w} value={w} className="text-xs capitalize">{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground text-center">⚡ Mudanças táticas aplicadas em tempo real</p>
          </Card>
        </TabsContent>

        <TabsContent value="subs">
          <Card className="p-3 space-y-2">
            {subsUsed >= MAX_SUBS ? (
              <p className="text-xs text-muted-foreground text-center py-2">Todas as substituições foram usadas.</p>
            ) : phase === 'finished' ? (
              <p className="text-xs text-muted-foreground text-center py-2">Partida encerrada.</p>
            ) : (
              <>
                {!subOut ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Selecione quem SAI:</p>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {starters.map(p => (
                        <Button key={p.id} variant="ghost" size="sm" className="w-full justify-start h-7 text-[10px] gap-2" onClick={() => setSubOut(p.id)}>
                          <Badge variant="outline" className="text-[7px] w-7">{p.position}</Badge>
                          <span className="truncate">{p.name}</span>
                          <span className="text-muted-foreground ml-auto">OVR {p.overall}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px]" onClick={() => setSubOut(null)}>
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                      <p className="text-[10px] text-muted-foreground">Sai: <b>{allHomePlayers.find(p => p.id === subOut)?.name}</b> → Entra:</p>
                    </div>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {bench.map(p => (
                        <Button key={p.id} variant="outline" size="sm" className="w-full justify-start h-7 text-[10px] gap-2" onClick={() => doSub(subOut, p.id)}>
                          <Badge variant="outline" className="text-[7px] w-7">{p.position}</Badge>
                          <span className="truncate">{p.name}</span>
                          <span className="text-muted-foreground ml-auto">OVR {p.overall}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="ratings">
          <Card className="p-2 max-h-[140px] overflow-y-auto">
            <div className="space-y-0.5">
              {homePlayerRatings.map(p => (
                <div key={p.id} className="flex items-center justify-between px-1.5 py-0.5 rounded bg-muted/10 text-[10px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Badge variant="outline" className="text-[7px] w-7 shrink-0">{p.position}</Badge>
                    <span className="truncate">{p.fullName}</span>
                    {p.goals > 0 && <span className="text-emerald-400 shrink-0">⚽{p.goals}</span>}
                    {p.assists > 0 && <span className="text-blue-400 shrink-0">🅰️{p.assists}</span>}
                    {p.cards > 0 && <span className="text-yellow-400 shrink-0">🟨{p.cards}</span>}
                  </div>
                  <span className={`font-bold font-mono text-sm ${ratingColor(p.rating)}`}>{p.rating.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Goal Replay & End */}
      {phase === 'finished' && (() => {
        const goalEvents = events.filter(e => e.type === 'goal');
        const currentGoal = goalEvents[replayIndex];
        return (
          <div className="space-y-2 pt-2">
            {goalEvents.length > 0 && (
              <Card className="border-primary/30">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Film className="h-4 w-4 text-primary" /> Replay dos Gols ({goalEvents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  {!showReplay ? (
                    <Button variant="outline" className="w-full gap-2" onClick={() => { setShowReplay(true); setReplayIndex(0); }}>
                      <Film className="h-4 w-4" /> Ver Replay dos Gols
                    </Button>
                  ) : currentGoal ? (
                    <div className="space-y-3">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center space-y-2 animate-fade-in">
                        <Badge variant="outline" className="font-mono text-xs">{currentGoal.minute}'</Badge>
                        <p className="text-lg font-bold text-emerald-400">⚽ GOOOOL!</p>
                        <p className="text-sm font-semibold">{currentGoal.playerName || 'Jogador'}</p>
                        {currentGoal.goalType && (
                          <Badge variant="secondary" className="text-[10px]">Tipo: {currentGoal.goalType}</Badge>
                        )}
                        {currentGoal.assistName && (
                          <p className="text-xs text-muted-foreground">🅰️ Assistência: <span className="font-medium text-blue-400">{currentGoal.assistName}</span></p>
                        )}
                        <p className="text-xs text-muted-foreground italic mt-1">{currentGoal.description}</p>
                        <div className="flex items-center justify-center gap-1 pt-1">
                          <Badge className="text-sm font-mono px-3">
                            {currentGoal.team === 'home' ? homeTeam : awayTeam}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={replayIndex <= 0} onClick={() => setReplayIndex(i => i - 1)}>
                          ← Anterior
                        </Button>
                        <Badge variant="secondary" className="flex items-center text-[10px] px-2">
                          {replayIndex + 1}/{goalEvents.length}
                        </Badge>
                        <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={replayIndex >= goalEvents.length - 1} onClick={() => setReplayIndex(i => i + 1)}>
                          Próximo →
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowReplay(false)}>
                        Fechar Replay
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">Sem gols para exibir</p>
                  )}
                </CardContent>
              </Card>
            )}
            {goalEvents.length === 0 && (
              <Card className="border-muted/30">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Partida sem gols - 0 x 0</p>
                </CardContent>
              </Card>
            )}
            <Button className="w-full gap-2" onClick={() => {
              const ratings: Record<string, number> = {};
              playersRef.current.filter(p => p.team === 'home').forEach(p => { ratings[p.id] = Math.round(p.rating * 10) / 10; });
              onEnd(homeGoalsRef.current, awayGoalsRef.current, ratings);
            }}>
              <ArrowLeft className="h-4 w-4" /> Voltar ao Jogo
            </Button>
          </div>
        );
      })()}
    </div>
  );
}