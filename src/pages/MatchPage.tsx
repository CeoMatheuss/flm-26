import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Player } from '@/types/game';
import { TacticsConfig, Formation, PlayStyle, Pressing, Tempo, Marking, PassingStyle, DefenseLine, Width } from '@/types/tactics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw, Star, Settings2, Film, LogOut, BarChart3 } from 'lucide-react';

// ---- Types ----
type EventCategory =
  | 'kickoff' | 'possession' | 'short_pass_ok' | 'short_pass_fail'
  | 'long_pass_ok' | 'long_pass_fail' | 'switch_play' | 'through_ball'
  | 'bad_touch' | 'dribble_ok' | 'dribble_fail' | 'one_two'
  | 'cross_ok' | 'cross_blocked' | 'cross_fail'
  | 'corner' | 'corner_danger' | 'corner_cleared'
  | 'weak_shot' | 'strong_shot' | 'long_shot' | 'shot_blocked'
  | 'easy_save' | 'great_save' | 'rebound'
  | 'header_goal' | 'foot_goal' | 'own_goal' | 'woodwork'
  | 'midfield_foul' | 'side_foul' | 'dangerous_foul' | 'hard_foul'
  | 'yellow_card' | 'second_yellow' | 'red_card'
  | 'medical' | 'light_injury' | 'serious_injury'
  | 'stoppage' | 'substitution'
  | 'argument' | 'ref_complaint'
  | 'added_time' | 'halftime' | 'final_whistle';

interface SimEvent {
  minute: number;
  type: EventCategory;
  description: string;
  team: 'home' | 'away' | 'neutral';
  playerName?: string;
  assistName?: string;
  goalType?: string;
  isGoal?: boolean;
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
  yellowCards: number;
  isOnPitch: boolean;
  stamina: number;
  morale: number;
  // Individual attributes
  speed: number;
  shooting: number;
  passing: number;
  defending: number;
  physical: number;
  dribbling: number;
  heading: number;
  marking: number;
  vision: number;
  crossing: number;
  longShots: number;
  workRate: number;
  composure: number;
  aggression: number;
  goalkeeping: number;
  setPieces: number;
  positioning: number;
}

interface MatchStats {
  possession: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
  passes: [number, number];
  tackles: [number, number];
  saves: [number, number];
  offsides: [number, number];
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
const HALF_DURATION_MS = 5 * 60 * 1000;
const HALFTIME_DURATION_MS = 2 * 60 * 1000;
const TICK_MS = 1000;
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
function rng() { return Math.random(); }
function pick<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

export default function MatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as MatchPageState | null;

  useEffect(() => {
    if (!state) navigate('/', { replace: true });
  }, [state, navigate]);

  useEffect(() => {
    if (state) {
      sessionStorage.setItem('match_live', JSON.stringify({
        homeTeam: state.homeTeam,
        awayTeam: state.awayTeam,
        stadiumName: state.stadiumName,
        matchId: state.matchId,
      }));
    }
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
  const [phase, setPhase] = useState<'first_half' | 'halftime' | 'second_half' | 'finished'>('first_half');
  const [matchMinute, setMatchMinute] = useState(0);
  const [realTimeLeft, setRealTimeLeft] = useState(HALF_DURATION_MS);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [commentary, setCommentary] = useState('⚽ A bola vai rolar!');
  const [lastEventType, setLastEventType] = useState<string>('');
  const [goalFlash, setGoalFlash] = useState(false);
  const [halftimeCountdown, setHalftimeCountdown] = useState(0);

  // Tactics
  const [formation, setFormation] = useState<Formation>(initialTactics.formation);
  const [playStyle, setPlayStyle] = useState<PlayStyle>(initialTactics.playStyle);
  const [pressing, setPressing] = useState<Pressing>(initialTactics.pressing);
  const [tempo, setTempo] = useState<Tempo>(initialTactics.tempo || 'normal');
  const [marking, setMarking] = useState<Marking>(initialTactics.marking || 'zona');
  const [passingStyle, setPassingStyle] = useState<PassingStyle>(initialTactics.passingStyle || 'misto');
  const [defenseLine, setDefenseLine] = useState<DefenseLine>(initialTactics.defenseLine || 'media');
  const [width, setWidth] = useState<Width>(initialTactics.width || 'normal');

  // Replay
  const [showReplay, setShowReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  // Subs
  const [subsUsed, setSubsUsed] = useState(0);
  const MAX_SUBS = 5;
  const [subOut, setSubOut] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<MatchStats>({
    possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0], corners: [0, 0],
    fouls: [0, 0], yellowCards: [0, 0], redCards: [0, 0], passes: [0, 0],
    tackles: [0, 0], saves: [0, 0], offsides: [0, 0],
  });
  const statsRef = useRef(stats);
  statsRef.current = stats;

  // Players
  const allHomePlayers = useMemo(() => homePlayers, [homePlayers]);
  const [startingIds, setStartingIds] = useState<string[]>(() => homePlayers.slice(0, 11).map(p => p.id));
  const [benchIds, setBenchIds] = useState<string[]>(() => homePlayers.slice(11).map(p => p.id));

  // Refs
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
  const guaranteesRef = useRef({ hasGoalOrChance: false, hasCard: false, hasSub: false });
  const eventCountRef = useRef(0);
  const lastEventMinRef = useRef(-1);
  const ballTargetRef = useRef({ x: 50, y: 50 });
  const playerTargetsRef = useRef<Map<string, { tx: number; ty: number }>>(new Map());

  // ---- Tactical modifiers ----
  const getTacticalMods = useCallback(() => {
    // Home advantage
    const homeAdv = isHome ? 1.08 : 0.95;
    // Morale: avg player morale
    const avgMorale = homePlayers.reduce((s, p) => s + (p.morale || 70), 0) / Math.max(1, homePlayers.length);
    const moraleMod = 0.85 + (avgMorale / 100) * 0.3; // 0.85 to 1.15
    // Fatigue: avg stamina
    const avgStamina = homePlayers.slice(0, 11).reduce((s, p) => s + (p.stamina || 80), 0) / 11;
    const fatigueMod = 0.8 + (avgStamina / 100) * 0.2; // 0.8 to 1.0

    // Pressing affects tackles and fouls
    const pressingMod = pressing === 'ultra-alto' ? 1.3 : pressing === 'alto' ? 1.15 : pressing === 'medio' ? 1.0 : 0.85;
    // PlayStyle affects shots vs possession
    const offensiveMod = playStyle === 'ofensivo' ? 1.25 : playStyle === 'contra-ataque' ? 1.1 : playStyle === 'equilibrado' ? 1.0 : playStyle === 'posse' ? 0.85 : 0.7;
    // Tempo affects event frequency
    const tempoMod = tempo === 'muito-rapido' ? 1.2 : tempo === 'rapido' ? 1.1 : tempo === 'normal' ? 1.0 : 0.85;
    // Passing style
    const longPassMod = passingStyle === 'longo' || passingStyle === 'direto' ? 1.4 : passingStyle === 'misto' ? 1.0 : 0.6;
    const shortPassMod = passingStyle === 'curto' ? 1.4 : passingStyle === 'misto' ? 1.0 : 0.7;
    // Defense line
    const highLineMod = defenseLine === 'alta' ? 1.2 : defenseLine === 'media' ? 1.0 : 0.8;

    return { homeAdv, moraleMod, fatigueMod, pressingMod, offensiveMod, tempoMod, longPassMod, shortPassMod, highLineMod };
  }, [isHome, homePlayers, pressing, playStyle, tempo, passingStyle, defenseLine]);

  // Helper to extract attributes from a Player
  const extractAttrs = useCallback((p: Player) => ({
    speed: p.attributes.speed || 50,
    shooting: p.attributes.shooting || 50,
    passing: p.attributes.passing || 50,
    defending: p.attributes.defending || 50,
    physical: p.attributes.physical || 50,
    dribbling: p.attributes.dribbling || 50,
    heading: p.attributes.heading || 50,
    marking: p.attributes.marking || 50,
    vision: p.attributes.vision || 50,
    crossing: p.attributes.crossing || 50,
    longShots: p.attributes.longShots || 50,
    workRate: p.attributes.workRate || 50,
    composure: p.attributes.composure || 50,
    aggression: p.attributes.aggression || 50,
    goalkeeping: p.attributes.goalkeeping || 0,
    setPieces: p.attributes.setPieces || 50,
    positioning: p.attributes.positioning || 50,
  }), []);

  const genAwayAttrs = useCallback((ovr: number, pos: string) => {
    const base = ovr;
    const variance = () => Math.floor(base + (rng() * 16 - 8));
    const isGK = pos === 'GOL';
    const isDef = pos === 'ZAG' || pos === 'LAT';
    const isAtt = pos === 'ATA';
    return {
      speed: variance(), shooting: isAtt ? variance() + 5 : variance() - 5,
      passing: variance(), defending: isDef ? variance() + 5 : variance() - 5,
      physical: variance(), dribbling: isAtt ? variance() + 3 : variance(),
      heading: isDef ? variance() + 3 : variance(), marking: isDef ? variance() + 5 : variance() - 5,
      vision: variance(), crossing: variance(), longShots: variance(),
      workRate: variance(), composure: variance(), aggression: variance(),
      goalkeeping: isGK ? variance() + 10 : 0, setPieces: variance(), positioning: variance(),
    };
  }, []);

  // Init sim players
  useEffect(() => {
    const starters = startingIds.map(id => allHomePlayers.find(p => p.id === id)!).filter(Boolean);
    const home: SimPlayer[] = starters.map((p, i) => {
      const slot = HOME_SLOTS[i] || HOME_SLOTS[HOME_SLOTS.length - 1];
      const attrs = extractAttrs(p);
      return {
        id: p.id, name: p.name.split(' ').pop() || p.name, fullName: p.name,
        position: p.position, x: slot.x, y: slot.y, homeX: slot.x, homeY: slot.y,
        team: 'home' as const, ovr: p.overall, rating: 6.0, goals: 0, assists: 0, yellowCards: 0,
        isOnPitch: true, stamina: p.stamina || 80, morale: p.morale || 70,
        ...attrs,
      };
    });
    const awayNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Ribeiro', 'Gomes'];
    const away: SimPlayer[] = AWAY_SLOTS.map((slot, i) => {
      const pos = i === 0 ? 'GOL' : i < 5 ? 'ZAG' : i < 9 ? 'MEI' : 'ATA';
      const ovr = Math.floor(awayStrength + (rng() * 8 - 4));
      const attrs = genAwayAttrs(ovr, pos);
      return {
        id: `a${i}`, name: awayNames[i] || `Jog.${i+1}`, fullName: `${awayNames[i] || 'Jogador'} ${i+1}`,
        position: pos, x: slot.x, y: slot.y, homeX: slot.x, homeY: slot.y,
        team: 'away' as const, ovr, rating: 6.0, goals: 0, assists: 0, yellowCards: 0,
        isOnPitch: true, stamina: 70 + Math.floor(rng() * 20), morale: 60 + Math.floor(rng() * 30),
        ...attrs,
      };
    });
    playersRef.current = [...home, ...away];
  }, [startingIds, allHomePlayers, awayStrength, extractAttrs, genAwayAttrs]);

  // Movement targets
  useEffect(() => {
    const interval = setInterval(() => {
      const bx = ballRef.current.x, by = ballRef.current.y;
      for (const p of playersRef.current) {
        if (!p.isOnPitch) continue;
        const pull = p.team === 'home' ? (p.homeX > 30 ? 0.15 : 0.06) : (p.homeX < 70 ? 0.15 : 0.06);
        const ox = (rng() - 0.5) * 6, oy = (rng() - 0.5) * 6;
        playerTargetsRef.current.set(p.id, {
          tx: clamp(p.homeX + (bx - p.homeX) * pull + ox, 3, 97),
          ty: clamp(p.homeY + (by - p.homeY) * pull + oy, 3, 97),
        });
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Animation loop
  useEffect(() => {
    const tick = () => {
      for (const p of playersRef.current) {
        if (!p.isOnPitch) continue;
        const t = playerTargetsRef.current.get(p.id);
        if (t) { p.x += (t.tx - p.x) * 0.04; p.y += (t.ty - p.y) * 0.04; }
      }
      ballRef.current.x += (ballTargetRef.current.x - ballRef.current.x) * 0.06;
      ballRef.current.y += (ballTargetRef.current.y - ballRef.current.y) * 0.06;
      if (pitchRef.current) {
        pitchRef.current.querySelectorAll<HTMLElement>('[data-pid]').forEach(el => {
          const pl = playersRef.current.find(pp => pp.id === el.dataset.pid);
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

  const moveBall = useCallback((x: number, y: number) => {
    ballTargetRef.current = { x: clamp(x, 3, 97), y: clamp(y, 3, 97) };
  }, []);

  // Attribute-weighted player selection
  const pickPlayer = useCallback((team: 'home' | 'away', posFilter?: string): SimPlayer | null => {
    let pool = playersRef.current.filter(p => p.team === team && p.isOnPitch);
    if (posFilter) pool = pool.filter(p => p.position === posFilter);
    if (pool.length === 0) pool = playersRef.current.filter(p => p.team === team && p.isOnPitch);
    return pool.length > 0 ? pick(pool) : null;
  }, []);

  // Pick player weighted by a specific attribute (higher attr = more likely to be chosen)
  const pickByAttr = useCallback((team: 'home' | 'away', attr: keyof SimPlayer, posFilter?: string): SimPlayer | null => {
    let pool = playersRef.current.filter(p => p.team === team && p.isOnPitch);
    if (posFilter) pool = pool.filter(p => p.position === posFilter);
    if (pool.length === 0) pool = playersRef.current.filter(p => p.team === team && p.isOnPitch);
    if (pool.length === 0) return null;
    // Weighted random: higher attribute = more likely
    const weights = pool.map(p => Math.max(1, Number(p[attr]) || 50));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }, []);

  // Get average attribute for a team
  const teamAvgAttr = useCallback((team: 'home' | 'away', attr: keyof SimPlayer): number => {
    const pool = playersRef.current.filter(p => p.team === team && p.isOnPitch);
    if (pool.length === 0) return 50;
    return pool.reduce((s, p) => s + (Number(p[attr]) || 50), 0) / pool.length;
  }, []);

  const playerName = useCallback((team: 'home' | 'away', pos?: string): string => {
    return pickPlayer(team, pos)?.name || (team === 'home' ? 'Jogador' : 'Adversário');
  }, [pickPlayer]);

  const updateStat = useCallback((key: keyof MatchStats, teamIdx: 0 | 1, delta = 1) => {
    setStats(prev => {
      const next = { ...prev };
      const arr = [...next[key]] as [number, number];
      arr[teamIdx] += delta;
      next[key] = arr;
      return next;
    });
  }, []);

  // ---- MAIN EVENT GENERATOR ----
  const generateEvent = useCallback((min: number): SimEvent | null => {
    const mods = getTacticalMods();
    // Base event chance ~55% per tick (tempo mod)
    if (rng() > 0.55 * mods.tempoMod) return null;
    // Don't generate multiple events same minute too often
    if (min === lastEventMinRef.current && rng() > 0.4) return null;
    lastEventMinRef.current = min;
    eventCountRef.current++;

    // Team determination: use avg passing+vision+speed as offensive strength proxy
    const homeOff = (teamAvgAttr('home', 'shooting') + teamAvgAttr('home', 'passing') + teamAvgAttr('home', 'speed')) / 3;
    const awayOff = (teamAvgAttr('away', 'shooting') + teamAvgAttr('away', 'passing') + teamAvgAttr('away', 'speed')) / 3;
    const effectiveHome = homeOff * mods.homeAdv * mods.moraleMod * mods.fatigueMod;
    const effectiveAway = awayOff;
    const ratio = effectiveHome / (effectiveHome + effectiveAway);
    const teamIdx: 0 | 1 = rng() < ratio ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const oppTeamKey: 'home' | 'away' = team === 'home' ? 'away' : 'home';
    const pName = playerName(team);
    const pName2 = playerName(team);
    const oppName = playerName(oppTeamKey);

    // Guarantee checks for late game (after minute 75)
    const g = guaranteesRef.current;
    const isLate = min >= 75;
    
    // Force card if none yet and past minute 60
    if (!g.hasCard && min >= 60 && rng() < 0.3) {
      g.hasCard = true;
      updateStat('fouls', teamIdx);
      updateStat('yellowCards', teamIdx);
      const p = pickPlayer(team);
      if (p && team === 'home') { p.yellowCards++; p.rating = Math.max(3, p.rating - 0.4); }
      return { minute: min, type: 'yellow_card', description: `🟨 Cartão amarelo! ${pName} faz falta dura e é advertido pelo árbitro.`, team, playerName: pName };
    }

    // Force substitution if none yet and past minute 55
    if (!g.hasSub && min >= 55 && rng() < 0.25) {
      g.hasSub = true;
      const p = playerName(team === 'home' ? 'away' : 'home');
      return { minute: min, type: 'substitution', description: `🔄 Substituição no ${opp}! ${p} dá lugar a um jogador fresco.`, team: team === 'home' ? 'away' : 'home', playerName: p };
    }

    // Force clear chance if no goal/chance past minute 80
    if (!g.hasGoalOrChance && isLate && rng() < 0.5) {
      g.hasGoalOrChance = true;
      moveBall(team === 'home' ? 88 : 12, 45 + rng() * 10);
      updateStat('shots', teamIdx);
      updateStat('shotsOnTarget', teamIdx);
      return { minute: min, type: 'great_save', description: `🧤 GRANDE CHANCE! ${pName} finaliza com perigo mas o goleiro do ${opp} faz defesa espetacular!`, team, playerName: pName };
    }

    // --- WEIGHTED EVENT TABLE ---
    const r = rng();
    let cumul = 0;

    // Simple possession / passes (most frequent)
    // Possession in midfield (8%)
    cumul += 0.08;
    if (r < cumul) {
      moveBall(35 + rng() * 30, 25 + rng() * 50);
      updateStat('possession', teamIdx, 1);
      return { minute: min, type: 'possession', description: pick([
        `⚽ ${tName} mantém a posse no meio-campo.`,
        `⚽ Bola circulando entre os jogadores do ${tName}.`,
        `⚽ ${tName} controla o ritmo da partida.`,
      ]), team };
    }

    // Short pass OK (7%)
    cumul += 0.07 * mods.shortPassMod;
    if (r < cumul) {
      moveBall(ballRef.current.x + (team === 'home' ? 5 : -5), ballRef.current.y + (rng() - 0.5) * 15);
      updateStat('passes', teamIdx);
      return { minute: min, type: 'short_pass_ok', description: pick([
        `📍 Passe curto certeiro de ${pName} para ${pName2}.`,
        `📍 ${pName} toca de primeira para ${pName2}.`,
        `📍 Bela triangulação entre ${pName} e ${pName2}.`,
      ]), team };
    }

    // Short pass FAIL (3%)
    cumul += 0.03;
    if (r < cumul) {
      updateStat('passes', teamIdx);
      return { minute: min, type: 'short_pass_fail', description: pick([
        `❌ ${pName} erra o passe curto! ${opp} recupera.`,
        `❌ Passe errado de ${pName}. Bola entregue ao adversário.`,
      ]), team };
    }

    // Long pass OK (4%)
    cumul += 0.04 * mods.longPassMod;
    if (r < cumul) {
      moveBall(team === 'home' ? 65 + rng() * 20 : 15 + rng() * 20, 20 + rng() * 60);
      updateStat('passes', teamIdx);
      return { minute: min, type: 'long_pass_ok', description: pick([
        `🎯 Lançamento perfeito de ${pName}! Bola nas costas da defesa!`,
        `🎯 ${pName} acerta lançamento longo na medida para ${pName2}.`,
        `🎯 Inversão de jogo espetacular de ${pName}!`,
      ]), team };
    }

    // Long pass FAIL (3%)
    cumul += 0.03;
    if (r < cumul) {
      return { minute: min, type: 'long_pass_fail', description: pick([
        `💨 Lançamento longo de ${pName} sai sem direção.`,
        `💨 ${pName} tenta o passe longo mas erra a medida.`,
      ]), team };
    }

    // Switch play (3%)
    cumul += 0.03;
    if (r < cumul) {
      moveBall(ballRef.current.x, rng() > 0.5 ? 15 : 85);
      updateStat('passes', teamIdx);
      return { minute: min, type: 'switch_play', description: pick([
        `↔️ ${pName} inverte o jogo para o lado oposto!`,
        `↔️ Inversão inteligente do ${tName}, bola muda de lado.`,
      ]), team };
    }

    // Through ball (3%)
    cumul += 0.03 * mods.highLineMod;
    if (r < cumul) {
      moveBall(team === 'home' ? 75 : 25, 40 + rng() * 20);
      updateStat('passes', teamIdx);
      return { minute: min, type: 'through_ball', description: pick([
        `🚀 Lançamento nas costas da defesa! ${pName2} sai livre!`,
        `🚀 ${pName} encontra ${pName2} no espaço com passe genial!`,
      ]), team };
    }

    // Bad touch (2%)
    cumul += 0.02;
    if (r < cumul) {
      return { minute: min, type: 'bad_touch', description: pick([
        `😬 ${pName} domina mal e perde a bola!`,
        `😬 Domínio errado de ${pName}, bola escapa.`,
      ]), team, playerName: pName };
    }

    // Dribble OK (4%) - weighted by dribbling attribute
    cumul += 0.04;
    if (r < cumul) {
      const dribblerAttr = teamAvgAttr(team, 'dribbling');
      const defenderAttr = teamAvgAttr(oppTeamKey, 'marking');
      const successChance = dribblerAttr / (dribblerAttr + defenderAttr);
      if (rng() < successChance) {
        moveBall(ballRef.current.x + (team === 'home' ? 12 : -12), ballRef.current.y + (rng() - 0.5) * 15);
        const p = pickByAttr(team, 'dribbling'); if (p) p.rating = Math.min(10, p.rating + 0.15);
        return { minute: min, type: 'dribble_ok', description: pick([
          `✨ ${p?.name || pName} dribla com classe e avança pelo campo!`,
          `✨ Olé! ${p?.name || pName} passa por dois marcadores!`,
          `✨ Drible desconcertante de ${p?.name || pName}!`,
        ]), team, playerName: p?.name || pName };
      } else {
        const def = pickByAttr(oppTeamKey, 'marking');
        return { minute: min, type: 'dribble_fail', description: pick([
          `🛑 ${pName} tenta o dribble mas ${def?.name || oppName} desarma!`,
          `🛑 Dribble interceptado! ${def?.name || oppName} recupera a bola.`,
        ]), team, playerName: pName };
      }
    }

    // Dribble intercepted (3%) - weighted by defender marking
    cumul += 0.03;
    if (r < cumul) {
      const def = pickByAttr(oppTeamKey, 'marking');
      return { minute: min, type: 'dribble_fail', description: pick([
        `🛑 ${pName} tenta o dribble mas ${def?.name || oppName} desarma!`,
        `🛑 Dribble interceptado! ${def?.name || oppName} recupera a bola.`,
      ]), team, playerName: pName };
    }

    // One-two / tabela (2%)
    cumul += 0.02;
    if (r < cumul) {
      moveBall(team === 'home' ? 70 : 30, 35 + rng() * 30);
      updateStat('passes', teamIdx, 2);
      return { minute: min, type: 'one_two', description: pick([
        `⚡ Tabela rápida entre ${pName} e ${pName2}! Jogada ensaiada!`,
        `⚡ Parede perfeita! ${pName} devolve para ${pName2} que avança!`,
      ]), team };
    }

    // Cross OK (3%)
    cumul += 0.03;
    if (r < cumul) {
      moveBall(team === 'home' ? 82 : 18, rng() > 0.5 ? 20 : 80);
      return { minute: min, type: 'cross_ok', description: pick([
        `↗️ ${pName} cruza na medida para a área!`,
        `↗️ Cruzamento preciso de ${pName} pela ${rng() > 0.5 ? 'esquerda' : 'direita'}!`,
      ]), team, playerName: pName };
    }

    // Cross blocked (2%)
    cumul += 0.02;
    if (r < cumul) {
      return { minute: min, type: 'cross_blocked', description: pick([
        `🚫 ${pName} tenta o cruzamento mas ${oppName} bloqueia!`,
        `🚫 Cruzamento de ${pName} travado pela marcação!`,
      ]), team };
    }

    // Cross fail (2%)
    cumul += 0.02;
    if (r < cumul) {
      return { minute: min, type: 'cross_fail', description: pick([
        `💨 Cruzamento de ${pName} sai pela linha de fundo. Sem perigo.`,
        `💨 ${pName} cruza errado. Bola vai direto para fora.`,
      ]), team };
    }

    // Corner (3%)
    cumul += 0.03;
    if (r < cumul) {
      moveBall(team === 'home' ? 97 : 3, rng() > 0.5 ? 8 : 92);
      updateStat('corners', teamIdx);
      return { minute: min, type: 'corner', description: pick([
        `🚩 Escanteio para o ${tName}!`,
        `🚩 Bola desviada pela defesa! Escanteio para o ${tName}.`,
      ]), team };
    }

    // Dangerous corner (1.5%)
    cumul += 0.015;
    if (r < cumul) {
      moveBall(team === 'home' ? 90 : 10, 45 + rng() * 10);
      updateStat('corners', teamIdx);
      g.hasGoalOrChance = true;
      return { minute: min, type: 'corner_danger', description: pick([
        `🚩⚠️ Escanteio perigoso! ${pName} cabeceia mas passa perto da trave!`,
        `🚩⚠️ Cobrança perfeita de escanteio! ${pName} desvia, quase gol!`,
      ]), team, playerName: pName };
    }

    // Corner cleared (2%)
    cumul += 0.02;
    if (r < cumul) {
      updateStat('corners', teamIdx);
      return { minute: min, type: 'corner_cleared', description: pick([
        `🚩 Escanteio cobrado e a defesa do ${opp} afasta sem problemas.`,
        `🚩 ${oppName} sobe e afasta o escanteio de cabeça.`,
      ]), team };
    }

    // Weak shot (2%)
    cumul += 0.02;
    if (r < cumul) {
      moveBall(team === 'home' ? 85 : 15, 40 + rng() * 20);
      updateStat('shots', teamIdx);
      return { minute: min, type: 'weak_shot', description: pick([
        `👟 Finalização fraca de ${pName}. Sem perigo para o goleiro.`,
        `👟 ${pName} chuta fraco, bola vai mansa nas mãos do goleiro.`,
      ]), team, playerName: pName };
    }

    // Strong shot (2.5%) - pick by shooting attribute
    cumul += 0.025 * mods.offensiveMod;
    if (r < cumul) {
      moveBall(team === 'home' ? 88 : 12, 40 + rng() * 20);
      updateStat('shots', teamIdx);
      updateStat('shotsOnTarget', teamIdx);
      const p = pickByAttr(team, 'shooting'); if (p) p.rating = Math.min(10, p.rating + 0.15);
      return { minute: min, type: 'strong_shot', description: pick([
        `🎯 ${p?.name || pName} chuta forte! Goleiro do ${opp} faz boa defesa!`,
        `🎯 Finalização potente de ${p?.name || pName}! Bola desviada para escanteio!`,
        `🎯 ${p?.name || pName} solta a bomba de fora da área! Goleiro espalma!`,
      ]), team, playerName: p?.name || pName };
    }

    // Long shot (2%) - pick by longShots attribute
    cumul += 0.02;
    if (r < cumul) {
      moveBall(team === 'home' ? 75 : 25, 40 + rng() * 20);
      updateStat('shots', teamIdx);
      const p = pickByAttr(team, 'longShots');
      return { minute: min, type: 'long_shot', description: pick([
        `💣 ${p?.name || pName} arrisca de fora da área! Bola passa por cima!`,
        `💣 Chute de longe de ${p?.name || pName}! Quase!`,
        `💣 ${p?.name || pName} tenta o chute de longa distância! Raspa a trave!`,
      ]), team, playerName: p?.name || pName };
    }

    // Shot blocked (2%)
    cumul += 0.02;
    if (r < cumul) {
      updateStat('shots', teamIdx);
      return { minute: min, type: 'shot_blocked', description: pick([
        `🛡️ ${pName} finaliza mas ${oppName} bloqueia o chute!`,
        `🛡️ Chute bloqueado! A defesa do ${opp} se joga na bola.`,
      ]), team, playerName: pName };
    }

    // Easy save (2%)
    cumul += 0.02;
    if (r < cumul) {
      moveBall(team === 'home' ? 8 : 92, 45 + rng() * 10);
      updateStat('shots', teamIdx);
      updateStat('shotsOnTarget', teamIdx);
      updateStat('saves', teamIdx === 0 ? 1 : 0);
      return { minute: min, type: 'easy_save', description: pick([
        `🧤 Defesa fácil do goleiro do ${opp}. Sem sustos.`,
        `🧤 Goleiro do ${opp} agarra firme a finalização de ${pName}.`,
      ]), team };
    }

    // Great save (1.5%)
    cumul += 0.015;
    if (r < cumul) {
      moveBall(team === 'home' ? 8 : 92, 45 + rng() * 10);
      updateStat('shots', teamIdx);
      updateStat('shotsOnTarget', teamIdx);
      updateStat('saves', teamIdx === 0 ? 1 : 0);
      g.hasGoalOrChance = true;
      return { minute: min, type: 'great_save', description: pick([
        `🧤🔥 DEFESAÇA do goleiro do ${opp}! Salvou o time!`,
        `🧤🔥 ${pName} chuta no ângulo e o goleiro faz milagre!`,
        `🧤🔥 Mão trocada! Goleiro do ${opp} salva gol feito!`,
      ]), team, playerName: pName };
    }

    // Rebound (1%)
    cumul += 0.01;
    if (r < cumul) {
      moveBall(team === 'home' ? 85 : 15, 45 + rng() * 10);
      updateStat('shots', teamIdx);
      return { minute: min, type: 'rebound', description: pick([
        `🔄 Rebote do goleiro! ${pName2} não alcança para completar!`,
        `🔄 Goleiro dá rebote, ${pName2} chuta mas a zaga salva!`,
      ]), team };
    }

    // Woodwork (1%)
    cumul += 0.01;
    if (r < cumul) {
      moveBall(team === 'home' ? 92 : 8, 45);
      updateStat('shots', teamIdx);
      updateStat('shotsOnTarget', teamIdx);
      g.hasGoalOrChance = true;
      return { minute: min, type: 'woodwork', description: pick([
        `📐 BOLA NA TRAVE! ${pName} acerta o poste e quase marca!`,
        `📐 No travessão! ${pName} chuta e a bola bate na trave e sai!`,
        `📐 INACREDITÁVEL! ${pName} acerta a trave com o gol aberto!`,
      ]), team, playerName: pName };
    }

    // === GOALS - shooting vs goalkeeping determines if it goes in ===
    // Foot goal attempt (2.5%)
    cumul += 0.025 * mods.offensiveMod;
    if (r < cumul) {
      moveBall(team === 'home' ? 92 : 8, 45 + rng() * 10);
      g.hasGoalOrChance = true;
      // Pick scorer weighted by shooting
      const scorer = pickByAttr(team, 'shooting', rng() > 0.6 ? 'ATA' : undefined);
      const gk = pickByAttr(oppTeamKey, 'goalkeeping', 'GOL');
      const shooterSkill = scorer ? (scorer.shooting * 0.6 + scorer.composure * 0.2 + scorer.positioning * 0.2) : 60;
      const gkSkill = gk ? (gk.goalkeeping * 0.7 + gk.positioning * 0.3) : 55;
      // Goal probability: shooter vs keeper
      const goalProb = clamp(shooterSkill / (shooterSkill + gkSkill) + 0.05, 0.25, 0.75);
      if (rng() < goalProb) {
        const goalTypes = ['chute rasteiro', 'chute colocado', 'voleio', 'toque de primeira', 'chute cruzado', 'pênalti', 'chute de longe'];
        const goalType = pick(goalTypes);
        let assistName: string | undefined;
        if (scorer) {
          scorer.goals++; scorer.rating = Math.min(10, scorer.rating + 1.2);
          if (team === 'home') { homeGoalsRef.current++; setHomeGoals(homeGoalsRef.current); }
          else { awayGoalsRef.current++; setAwayGoals(awayGoalsRef.current); }
          const others = playersRef.current.filter(p => p.team === team && p.id !== scorer.id && p.isOnPitch);
          if (others.length > 0 && rng() < 0.65) {
            const assister = pickByAttr(team, 'vision') || pick(others);
            assister.assists++; assister.rating = Math.min(10, assister.rating + 0.6);
            assistName = assister.name;
          }
        } else {
          if (team === 'home') { homeGoalsRef.current++; setHomeGoals(homeGoalsRef.current); }
          else { awayGoalsRef.current++; setAwayGoals(awayGoalsRef.current); }
        }
        updateStat('shots', teamIdx); updateStat('shotsOnTarget', teamIdx);
        setGoalFlash(true); setTimeout(() => setGoalFlash(false), 1200);
        return { minute: min, type: 'foot_goal', description: pick([
          `⚽ GOOOOL! ${scorer?.name || pName} marca com um ${goalType} para o ${tName}!`,
          `⚽ GOOOOL! Que golaço de ${scorer?.name || pName}! ${goalType} espetacular!`,
          `⚽ GOOOOL! ${scorer?.name || pName} não perdoa! ${goalType} certeiro!`,
        ]), team, playerName: scorer?.name || pName, assistName, goalType, isGoal: true };
      } else {
        // Saved - great save
        updateStat('shots', teamIdx); updateStat('shotsOnTarget', teamIdx);
        updateStat('saves', teamIdx === 0 ? 1 : 0);
        if (gk) gk.rating = Math.min(10, gk.rating + 0.3);
        return { minute: min, type: 'great_save', description: pick([
          `🧤🔥 DEFESAÇA do goleiro do ${opp}! ${scorer?.name || pName} chuta forte e o goleiro salva!`,
          `🧤🔥 ${scorer?.name || pName} finaliza no ângulo mas o goleiro faz milagre!`,
        ]), team, playerName: scorer?.name || pName };
      }
    }

    // Header goal (0.8%) - weighted by heading attribute
    cumul += 0.008;
    if (r < cumul) {
      moveBall(team === 'home' ? 90 : 10, 45 + rng() * 10);
      g.hasGoalOrChance = true;
      const scorer = pickByAttr(team, 'heading') || pickPlayer(team);
      const gk = pickByAttr(oppTeamKey, 'goalkeeping', 'GOL');
      const headingSkill = scorer ? (scorer.heading * 0.7 + scorer.physical * 0.3) : 55;
      const gkSkill = gk ? gk.goalkeeping : 55;
      const goalProb = clamp(headingSkill / (headingSkill + gkSkill) + 0.05, 0.3, 0.7);
      if (rng() < goalProb) {
        let assistName: string | undefined;
        if (scorer) {
          scorer.goals++; scorer.rating = Math.min(10, scorer.rating + 1.2);
          if (team === 'home') { homeGoalsRef.current++; setHomeGoals(homeGoalsRef.current); }
          else { awayGoalsRef.current++; setAwayGoals(awayGoalsRef.current); }
          const others = playersRef.current.filter(p => p.team === team && p.id !== scorer.id && p.isOnPitch);
          if (others.length > 0 && rng() < 0.7) {
            const assister = pickByAttr(team, 'crossing') || pick(others);
            assister.assists++; assister.rating = Math.min(10, assister.rating + 0.6);
            assistName = assister.name;
          }
        } else {
          if (team === 'home') { homeGoalsRef.current++; setHomeGoals(homeGoalsRef.current); }
          else { awayGoalsRef.current++; setAwayGoals(awayGoalsRef.current); }
        }
        updateStat('shots', teamIdx); updateStat('shotsOnTarget', teamIdx);
        setGoalFlash(true); setTimeout(() => setGoalFlash(false), 1200);
        return { minute: min, type: 'header_goal', description: pick([
          `⚽🤕 GOL DE CABEÇA! ${scorer?.name || pName} sobe mais alto que todos!`,
          `⚽🤕 GOL! ${scorer?.name || pName} desvia de cabeça e a bola morre no canto!`,
        ]), team, playerName: scorer?.name || pName, assistName, goalType: 'cabeceio', isGoal: true };
      } else {
        updateStat('shots', teamIdx); updateStat('shotsOnTarget', teamIdx);
        updateStat('saves', teamIdx === 0 ? 1 : 0);
        return { minute: min, type: 'great_save', description: `🧤 Cabeceio de ${scorer?.name || pName} e o goleiro do ${opp} defende!`, team, playerName: scorer?.name || pName };
      }
    }

    // Own goal (0.2%)
    cumul += 0.002;
    if (r < cumul) {
      const oppTeam: 'home' | 'away' = team === 'home' ? 'away' : 'home';
      const oppIdx: 0 | 1 = oppTeam === 'home' ? 0 : 1;
      if (oppTeam === 'home') { homeGoalsRef.current++; setHomeGoals(homeGoalsRef.current); }
      else { awayGoalsRef.current++; setAwayGoals(awayGoalsRef.current); }
      g.hasGoalOrChance = true;
      setGoalFlash(true); setTimeout(() => setGoalFlash(false), 1200);
      return { minute: min, type: 'own_goal', description: `⚽🔴 GOL CONTRA! ${pName} do ${tName} desvia contra o próprio patrimônio!`, team: oppTeam, playerName: pName, goalType: 'gol contra', isGoal: true };
    }

    // === FOULS & CARDS ===
    // Midfield foul (3%)
    cumul += 0.03 * mods.pressingMod;
    if (r < cumul) {
      moveBall(35 + rng() * 30, 30 + rng() * 40);
      updateStat('fouls', teamIdx);
      return { minute: min, type: 'midfield_foul', description: pick([
        `⚠️ Falta de ${pName} no meio-campo. Jogo parado.`,
        `⚠️ ${pName} comete falta tática para cortar o contra-ataque.`,
      ]), team, playerName: pName };
    }

    // Side foul (2%)
    cumul += 0.02;
    if (r < cumul) {
      updateStat('fouls', teamIdx);
      return { minute: min, type: 'side_foul', description: pick([
        `⚠️ Falta lateral de ${pName}. Bola recolocada pela lateral.`,
        `⚠️ ${pName} derruba o adversário perto da lateral.`,
      ]), team, playerName: pName };
    }

    // Dangerous foul (1.5%)
    cumul += 0.015;
    if (r < cumul) {
      moveBall(team === 'home' ? 25 : 75, 45 + rng() * 10);
      updateStat('fouls', teamIdx);
      return { minute: min, type: 'dangerous_foul', description: pick([
        `⚠️🔥 Falta perigosa! ${pName} derruba ${oppName} perto da área!`,
        `⚠️🔥 Falta em posição perigosa! Cobrança para o ${opp}!`,
      ]), team, playerName: pName };
    }

    // Hard foul (1%)
    cumul += 0.01 * mods.pressingMod;
    if (r < cumul) {
      updateStat('fouls', teamIdx);
      return { minute: min, type: 'hard_foul', description: pick([
        `💥 Falta dura de ${pName}! Jogo parado para atendimento!`,
        `💥 Entrada violenta de ${pName}! Árbitro chama atenção!`,
      ]), team, playerName: pName };
    }

    // Yellow card (2%)
    cumul += 0.02;
    if (r < cumul) {
      updateStat('fouls', teamIdx); updateStat('yellowCards', teamIdx);
      g.hasCard = true;
      const p = pickPlayer(team);
      if (p && team === 'home') { p.yellowCards++; p.rating = Math.max(3, p.rating - 0.4); }
      return { minute: min, type: 'yellow_card', description: pick([
        `🟨 Cartão amarelo para ${pName}! Falta imprudente.`,
        `🟨 ${pName} recebe amarelo por reclamação!`,
        `🟨 Amarelo! ${pName} exagerou na entrada.`,
      ]), team, playerName: pName };
    }

    // Second yellow (0.3%)
    cumul += 0.003;
    if (r < cumul) {
      updateStat('yellowCards', teamIdx); updateStat('redCards', teamIdx);
      g.hasCard = true;
      const p = pickPlayer(team);
      if (p && team === 'home') { p.yellowCards += 2; p.rating = Math.max(2, p.rating - 1.5); p.isOnPitch = false; }
      return { minute: min, type: 'second_yellow', description: `🟨🟥 SEGUNDO AMARELO! ${pName} é expulso de campo!`, team, playerName: pName };
    }

    // Red card (0.2%)
    cumul += 0.002;
    if (r < cumul) {
      updateStat('redCards', teamIdx); updateStat('fouls', teamIdx);
      g.hasCard = true;
      const p = pickPlayer(team);
      if (p && team === 'home') { p.yellowCards += 3; p.rating = Math.max(1, p.rating - 2); p.isOnPitch = false; }
      return { minute: min, type: 'red_card', description: `🟥 CARTÃO VERMELHO DIRETO! ${pName} faz entrada brutal e é expulso!`, team, playerName: pName };
    }

    // === TACKLES - weighted by defending/marking ===
    cumul += 0.03 * mods.pressingMod;
    if (r < cumul) {
      moveBall(40 + rng() * 20, 20 + rng() * 60);
      updateStat('tackles', teamIdx);
      const p = pickByAttr(team, 'defending'); if (p) p.rating = Math.min(10, p.rating + 0.1);
      return { minute: min, type: 'dribble_fail', description: pick([
        `💪 Desarme perfeito de ${p?.name || pName}! Recupera a posse!`,
        `💪 ${p?.name || pName} antecipa e intercepta o passe!`,
        `💪 Carrinho impecável de ${p?.name || pName}!`,
        `💪 ${p?.name || pName} corta a jogada com timing perfeito!`,
      ]), team, playerName: p?.name || pName };
    }

    // === MISC EVENTS ===
    // Medical (0.8%)
    cumul += 0.008;
    if (r < cumul) {
      return { minute: min, type: 'medical', description: pick([
        `🏥 Atendimento médico em campo. ${pName} sentiu uma fisgada.`,
        `🏥 Parada para atendimento. ${pName} é atendido pelos médicos.`,
      ]), team, playerName: pName };
    }

    // Light injury (0.5%)
    cumul += 0.005;
    if (r < cumul) {
      return { minute: min, type: 'light_injury', description: `🤕 ${pName} sente dores mas segue em campo após atendimento.`, team, playerName: pName };
    }

    // Serious injury (0.2%)
    cumul += 0.002;
    if (r < cumul) {
      const p = pickPlayer(team); if (p && team === 'home') p.isOnPitch = false;
      return { minute: min, type: 'serious_injury', description: `🚑 LESÃO GRAVE! ${pName} sai de maca! Substituição obrigatória.`, team, playerName: pName };
    }

    // Substitution (1.5%)
    cumul += 0.015;
    if (r < cumul) {
      g.hasSub = true;
      return { minute: min, type: 'substitution', description: pick([
        `🔄 Substituição no ${tName}. ${pName} dá lugar a um jogador fresco.`,
        `🔄 Troca no ${tName}! Técnico mexe na equipe.`,
      ]), team, playerName: pName };
    }

    // Technical stoppage (0.5%)
    cumul += 0.005;
    if (r < cumul) {
      return { minute: min, type: 'stoppage', description: pick([
        `⏸️ Parada técnica. Jogo interrompido brevemente.`,
        `⏸️ Árbitro para o jogo para organizar a barreira.`,
      ]), team: 'neutral' };
    }

    // Argument between players (0.5%)
    cumul += 0.005;
    if (r < cumul) {
      return { minute: min, type: 'argument', description: pick([
        `😤 Discussão entre ${pName} e ${oppName}! Árbitro intervém.`,
        `😤 Jogadores se encaram! ${pName} e ${oppName} trocam empurrões!`,
      ]), team: 'neutral' };
    }

    // Ref complaint (0.8%)
    cumul += 0.008;
    if (r < cumul) {
      return { minute: min, type: 'ref_complaint', description: pick([
        `🗣️ ${pName} reclama com o árbitro! Pedindo cartão para o adversário.`,
        `🗣️ Jogadores do ${tName} cercam o árbitro protestando a marcação.`,
      ]), team, playerName: pName };
    }

    // Offside (2%)
    cumul += 0.02;
    if (r < cumul) {
      updateStat('offsides', teamIdx);
      return { minute: min, type: 'through_ball', description: pick([
        `🏳️ Impedimento! ${pName} estava adiantado.`,
        `🏳️ Bandeirinha marca impedimento de ${pName}.`,
      ]), team, playerName: pName };
    }

    // Counterattack (2%)
    cumul += 0.02;
    if (r < cumul) {
      moveBall(team === 'home' ? 70 : 30, 30 + rng() * 40);
      return { minute: min, type: 'through_ball', description: pick([
        `🏃 Contra-ataque veloz do ${tName}! ${pName} puxa em velocidade!`,
        `🏃 Transição rápida! ${tName} sai correndo com ${pName} e ${pName2}!`,
      ]), team };
    }

    // Default: possession
    moveBall(35 + rng() * 30, 25 + rng() * 50);
    updateStat('passes', teamIdx);
    return { minute: min, type: 'possession', description: `⚽ ${tName} trabalha a bola com paciência.`, team };
  }, [homeTeam, awayTeam, playerName, pickPlayer, pickByAttr, teamAvgAttr, moveBall, updateStat, getTacticalMods, isHome]);

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

    phaseStartRef.current = Date.now();
    const isSecondHalf = phase === 'second_half';
    const baseMinute = isSecondHalf ? 45 : 0;

    // Kickoff event
    if (!isSecondHalf) {
      const kickoff: SimEvent = { minute: 0, type: 'kickoff', description: `⚽ Saída de bola! ${homeTeam} inicia a partida no ${stadiumName}!`, team: 'home' };
      eventsRef.current.push(kickoff);
      setEvents(prev => [...prev, kickoff]);
    }

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - phaseStartRef.current;
      const progress = Math.min(1, elapsed / HALF_DURATION_MS);
      const currentMinute = Math.floor(baseMinute + progress * MINUTES_PER_HALF);
      const timeLeft = Math.max(0, HALF_DURATION_MS - elapsed);

      setMatchMinute(currentMinute);
      setRealTimeLeft(timeLeft);

      const event = generateEvent(currentMinute);
      if (event) {
        eventsRef.current.push(event);
        setEvents(prev => [...prev, event]);
        setCommentary(event.description);
        setLastEventType(event.type);
      } else {
        moveBall(ballRef.current.x + (rng() - 0.5) * 6, ballRef.current.y + (rng() - 0.5) * 6);
      }

      // Update possession dynamically
      const mods = getTacticalMods();
      const effectiveHome = homeStrength * mods.homeAdv * mods.moraleMod;
      const possRatio = effectiveHome / (effectiveHome + awayStrength);
      const homePos = Math.round(possRatio * 100 + (rng() - 0.5) * 6);
      setStats(prev => ({ ...prev, possession: [clamp(homePos, 25, 75), clamp(100 - homePos, 25, 75)] }));

      if (elapsed >= HALF_DURATION_MS) {
        clearInterval(interval);
        // Added time event
        const addedTime = Math.floor(1 + rng() * 4);
        const atEvent: SimEvent = { minute: baseMinute + 45, type: 'added_time', description: `⏱️ Acréscimos: +${addedTime} minutos!`, team: 'neutral' };
        eventsRef.current.push(atEvent);
        setEvents(prev => [...prev, atEvent]);

        if (isSecondHalf) {
          const finalEvent: SimEvent = { minute: 90 + addedTime, type: 'final_whistle', description: '🏁 APITO FINAL! Fim de jogo!', team: 'neutral' };
          eventsRef.current.push(finalEvent);
          setEvents(prev => [...prev, finalEvent]);
          setPhase('finished');
          setMatchMinute(90 + addedTime);
          setCommentary('🏁 Fim de jogo! O árbitro apita!');
        } else {
          const htEvent: SimEvent = { minute: 45 + addedTime, type: 'halftime', description: '⏱️ Intervalo! Hora de ajustar a equipe.', team: 'neutral' };
          eventsRef.current.push(htEvent);
          setEvents(prev => [...prev, htEvent]);
          setPhase('halftime');
          setMatchMinute(45);
          setCommentary('⏱️ Intervalo! Hora de ajustar a equipe.');
        }
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [phase, generateEvent, moveBall, homeTeam, stadiumName, getTacticalMods, homeStrength, awayStrength]);

  // Player ratings for display
  const homePlayerRatings = useMemo(() => {
    return playersRef.current.filter(p => p.team === 'home').sort((a, b) => b.rating - a.rating);
  }, [events, phase]);

  const formatTimeDisplay = (ms: number) => {
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
    const outPlayer = playersRef.current.find(p => p.id === outId);
    const inPlayerData = allHomePlayers.find(p => p.id === inId);
    if (outPlayer && inPlayerData) {
      outPlayer.isOnPitch = false;
      const attrs = extractAttrs(inPlayerData);
      const newSim: SimPlayer = {
        id: inId, name: inPlayerData.name.split(' ').pop() || inPlayerData.name, fullName: inPlayerData.name,
        position: inPlayerData.position, x: outPlayer.x, y: outPlayer.y, homeX: outPlayer.homeX, homeY: outPlayer.homeY,
        team: 'home', ovr: inPlayerData.overall, rating: 6.0, goals: 0, assists: 0, yellowCards: 0,
        isOnPitch: true, stamina: inPlayerData.stamina || 90, morale: inPlayerData.morale || 75,
        ...attrs,
      };
      playersRef.current.push(newSim);
    }
    setSubOut(null);
    guaranteesRef.current.hasSub = true;
    const subEvent: SimEvent = {
      minute: matchMinute,
      type: 'substitution',
      description: `🔄 Substituição! ${outPlayer?.fullName || 'Jogador'} sai e ${inPlayerData?.name || 'reserva'} entra!`,
      team: 'home',
    };
    eventsRef.current.push(subEvent);
    setEvents(prev => [...prev, subEvent]);
    setCommentary(subEvent.description);
  }, [allHomePlayers, matchMinute]);

  const ratingColor = (r: number) => r >= 8 ? 'text-emerald-400' : r >= 7 ? 'text-primary' : r >= 6 ? 'text-yellow-400' : 'text-destructive';

  const eventColor = (type: string) => {
    if (type.includes('goal') || type === 'own_goal') return 'text-emerald-400 font-bold';
    if (['strong_shot', 'great_save', 'woodwork', 'corner_danger', 'rebound'].includes(type)) return 'text-yellow-400';
    if (type === 'yellow_card' || type === 'second_yellow') return 'text-yellow-300';
    if (type === 'red_card') return 'text-red-400';
    if (['midfield_foul', 'dangerous_foul', 'hard_foul', 'side_foul'].includes(type)) return 'text-orange-400';
    if (type === 'dribble_ok' || type === 'one_two') return 'text-blue-400';
    if (type === 'serious_injury') return 'text-red-500';
    if (type === 'final_whistle' || type === 'halftime') return 'text-primary font-bold';
    return 'text-muted-foreground';
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
              {phase === 'halftime' ? `Intervalo: ${formatTimeDisplay(halftimeCountdown)}` : formatTimeDisplay(realTimeLeft)}
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

      {/* Bottom tabs */}
      <Tabs defaultValue="events" className="space-y-1">
        <TabsList className="w-full h-8">
          <TabsTrigger value="events" className="flex-1 text-[10px] gap-1">⚡ Lances</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-[10px] gap-1"><BarChart3 className="h-3 w-3" /> Stats</TabsTrigger>
          <TabsTrigger value="tactics" className="flex-1 text-[10px] gap-1"><Settings2 className="h-3 w-3" /> Tática</TabsTrigger>
          <TabsTrigger value="subs" className="flex-1 text-[10px] gap-1"><RefreshCw className="h-3 w-3" /> Sub ({subsUsed}/{MAX_SUBS})</TabsTrigger>
          <TabsTrigger value="ratings" className="flex-1 text-[10px] gap-1"><Star className="h-3 w-3" /> Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card className="p-1.5 max-h-[180px] overflow-y-auto">
            <div className="space-y-0.5">
              {events.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">Aguardando lances...</p>}
              {[...events].reverse().slice(0, 15).map((ev, i) => (
                <div key={i} className={`flex items-center gap-1.5 text-[9px] sm:text-[10px] px-1 py-0.5 rounded ${ev.isGoal ? 'bg-emerald-500/10 border border-emerald-500/20' : ev.team === 'home' ? 'bg-primary/5' : ev.team === 'away' ? 'bg-destructive/5' : 'bg-muted/10'}`}>
                  <Badge variant="outline" className="text-[6px] w-6 justify-center shrink-0 font-mono">{ev.minute}'</Badge>
                  <span className={eventColor(ev.type)}>{ev.description}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="p-3">
            <div className="space-y-1.5">
              {([
                ['Posse de Bola', stats.possession, '%'],
                ['Finalizações', stats.shots, ''],
                ['Chutes no Gol', stats.shotsOnTarget, ''],
                ['Escanteios', stats.corners, ''],
                ['Faltas', stats.fouls, ''],
                ['Cartões Amarelos', stats.yellowCards, ''],
                ['Cartões Vermelhos', stats.redCards, ''],
                ['Passes', stats.passes, ''],
                ['Desarmes', stats.tackles, ''],
                ['Defesas', stats.saves, ''],
                ['Impedimentos', stats.offsides, ''],
              ] as [string, [number, number], string][]).map(([label, vals, suffix]) => (
                <div key={label} className="flex items-center gap-2 text-[10px]">
                  <span className="w-8 text-right font-bold">{vals[0]}{suffix}</span>
                  <div className="flex-1 flex h-1.5 rounded overflow-hidden bg-muted/20">
                    <div className="bg-blue-500 transition-all" style={{ width: `${vals[0] + vals[1] > 0 ? (vals[0] / (vals[0] + vals[1])) * 100 : 50}%` }} />
                    <div className="bg-red-500 transition-all" style={{ width: `${vals[0] + vals[1] > 0 ? (vals[1] / (vals[0] + vals[1])) * 100 : 50}%` }} />
                  </div>
                  <span className="w-8 text-left font-bold">{vals[1]}{suffix}</span>
                </div>
              ))}
              <div className="flex justify-between text-[8px] text-muted-foreground pt-1">
                <span className="text-blue-400">{homeTeam}</span>
                <span className="text-red-400">{awayTeam}</span>
              </div>
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
            <p className="text-[9px] text-muted-foreground text-center">⚡ Táticas influenciam em tempo real: pressão → desarmes/faltas, estilo → finalizações, tempo → ritmo do jogo</p>
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
                    {p.yellowCards > 0 && <span className="text-yellow-400 shrink-0">🟨{p.yellowCards}</span>}
                    {!p.isOnPitch && <span className="text-destructive shrink-0">⬇</span>}
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
        const goalEvents = events.filter(e => e.isGoal);
        const currentGoal = goalEvents[replayIndex];
        return (
          <div className="space-y-2 pt-2">
            {/* Final Stats Summary */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Estatísticas Finais
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-3 gap-1 text-[9px]">
                  <span className="text-right font-bold text-blue-400">{homeTeam}</span>
                  <span className="text-center text-muted-foreground">Estatística</span>
                  <span className="text-left font-bold text-red-400">{awayTeam}</span>
                  {([
                    [stats.possession[0] + '%', 'Posse', stats.possession[1] + '%'],
                    [stats.shots[0], 'Finalizações', stats.shots[1]],
                    [stats.shotsOnTarget[0], 'No Gol', stats.shotsOnTarget[1]],
                    [stats.corners[0], 'Escanteios', stats.corners[1]],
                    [stats.fouls[0], 'Faltas', stats.fouls[1]],
                    [stats.yellowCards[0], 'Amarelos', stats.yellowCards[1]],
                  ] as [number | string, string, number | string][]).map(([h, label, a]) => (
                    <div key={label} className="contents">
                      <span className="text-right">{h}</span>
                      <span className="text-center text-muted-foreground">{label}</span>
                      <span className="text-left">{a}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[8px] text-muted-foreground text-center mt-2">
                  Total de lances: {events.length} | ⚽ Gols: {homeGoals + awayGoals}
                </p>
              </CardContent>
            </Card>

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
                        {currentGoal.goalType && <Badge variant="secondary" className="text-[10px]">{currentGoal.goalType}</Badge>}
                        {currentGoal.assistName && (
                          <p className="text-xs text-muted-foreground">🅰️ Assistência: <span className="font-medium text-blue-400">{currentGoal.assistName}</span></p>
                        )}
                        <p className="text-xs text-muted-foreground italic">{currentGoal.description}</p>
                        <Badge className="text-sm font-mono px-3">
                          {currentGoal.team === 'home' ? homeTeam : awayTeam}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={replayIndex <= 0} onClick={() => setReplayIndex(i => i - 1)}>← Anterior</Button>
                        <Badge variant="secondary" className="flex items-center text-[10px] px-2">{replayIndex + 1}/{goalEvents.length}</Badge>
                        <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={replayIndex >= goalEvents.length - 1} onClick={() => setReplayIndex(i => i + 1)}>Próximo →</Button>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowReplay(false)}>Fechar Replay</Button>
                    </div>
                  ) : null}
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
