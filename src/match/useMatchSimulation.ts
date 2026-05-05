/**
 * useMatchSimulation — Single hook for the entire match lifecycle.
 * 
 * No classes. No singletons. Just useState + setInterval.
 * Events are revealed based on elapsed real time since match start.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isHighlightEvent } from '@/components/game/HighlightMiniCanvas';

export interface SimEvent {
  minute: number;
  type: string;
  description: string;
  team: 'home' | 'away' | 'neutral';
  playerName?: string;
  assistName?: string;
  goalType?: string;
  isGoal?: boolean;
  staminaData?: Record<string, number>;
  momentPhase?: string;
  priority?: string;
}

export interface MatchStats {
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

const EMPTY_STATS: MatchStats = {
  possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0],
  corners: [0, 0], fouls: [0, 0], yellowCards: [0, 0],
  redCards: [0, 0], passes: [0, 0], tackles: [0, 0],
  saves: [0, 0], offsides: [0, 0],
};

export interface MatchState {
  phase: 'idle' | 'loading' | 'live' | 'halftime' | 'finished' | 'error';
  currentMinute: number;
  progress: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  visibleEvents: SimEvent[];
  latestEvent: SimEvent | null;
  stats: MatchStats;
  stadiumName: string;
  matchDbId: string | null;
  errorMsg: string | null;
  competition: string;
  isHome: boolean;
  currentMoment: string;
  playerStamina: Record<string, number>;
  assistantTips: SimEvent[];
  simulationSpeed: number; // 1 = normal, 2 = fast
}

const INITIAL: MatchState = {
  phase: 'idle',
  currentMinute: 0,
  progress: 0,
  homeTeam: '',
  awayTeam: '',
  homeGoals: 0,
  awayGoals: 0,
  visibleEvents: [],
  latestEvent: null,
  stats: { ...EMPTY_STATS },
  stadiumName: '',
  matchDbId: null,
  errorMsg: null,
  competition: '',
  isHome: true,
  currentMoment: 'equilíbrio',
  playerStamina: {},
  assistantTips: [],
  simulationSpeed: 1,
};

interface MatchData {
  allEvents: SimEvent[];
  startTime: number;
  durationMs: number;
  maxMinute: number;
  finalHomeGoals: number;
  finalAwayGoals: number;
  stats: MatchStats;
  homeTeam: string;
  awayTeam: string;
  stadiumName: string;
  matchDbId: string;
  competition: string;
  isHome: boolean;
}

const TICK_MS = 300;

// ── Module-scoped simulation runner (survives component unmounts) ──────────
// Mantém um único loop ativo por aba, independente da MatchPage estar montada.
// Inscritos recebem callbacks de tick. Garantimos múltiplos mecanismos:
//  - setInterval principal
//  - setTimeout recursivo de backup (caso o navegador trote/cancele intervals)
//  - watchdog que reinicia se nenhum tick foi disparado por > 2s
type Subscriber = () => void;
const subscribers = new Set<Subscriber>();
let intervalHandle: number | null = null;
let backupTimeoutHandle: number | null = null;
let watchdogHandle: number | null = null;
let lastTickAt = 0;

function runAllSubscribers() {
  lastTickAt = Date.now();
  for (const fn of Array.from(subscribers)) {
    try { fn(); } catch (e) { console.error('[MatchLoop] subscriber threw:', e); }
  }
}

function ensureGlobalLoopRunning() {
  if (intervalHandle == null) {
    intervalHandle = window.setInterval(runAllSubscribers, TICK_MS);
  }
  if (backupTimeoutHandle == null) {
    const recursiveBackup = () => {
      // Backup independente: dispara a cada ~500ms; se o setInterval estiver throttled
      // (aba inativa), este timeout recursivo continua chamando os subscribers.
      backupTimeoutHandle = window.setTimeout(() => {
        if (subscribers.size === 0) {
          backupTimeoutHandle = null;
          return;
        }
        // só dispara se o último tick foi há mais de 400ms (evita dobrar)
        if (Date.now() - lastTickAt > 400) runAllSubscribers();
        recursiveBackup();
      }, 500);
    };
    recursiveBackup();
  }
  if (watchdogHandle == null) {
    watchdogHandle = window.setInterval(() => {
      if (subscribers.size === 0) return;
      // Se ficou >2s sem tick, considera o loop morto e reinicia tudo
      if (Date.now() - lastTickAt > 2000) {
        console.warn('[MatchLoop] Watchdog: no tick in >2s, restarting loop');
        if (intervalHandle != null) { clearInterval(intervalHandle); intervalHandle = null; }
        if (backupTimeoutHandle != null) { clearTimeout(backupTimeoutHandle); backupTimeoutHandle = null; }
        ensureGlobalLoopRunning();
      }
    }, 1500);
  }
}

function stopGlobalLoopIfIdle() {
  if (subscribers.size > 0) return;
  if (intervalHandle != null) { clearInterval(intervalHandle); intervalHandle = null; }
  if (backupTimeoutHandle != null) { clearTimeout(backupTimeoutHandle); backupTimeoutHandle = null; }
  if (watchdogHandle != null) { clearInterval(watchdogHandle); watchdogHandle = null; }
}

function subscribeToLoop(fn: Subscriber): () => void {
  subscribers.add(fn);
  lastTickAt = Date.now();
  ensureGlobalLoopRunning();
  return () => {
    subscribers.delete(fn);
    stopGlobalLoopIfIdle();
  };
}

// Garante reativação imediata quando a aba volta ao foco
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && subscribers.size > 0) runAllSubscribers();
  });
}

// ── Deterministic seed-based RNG (mulberry32) for offline simulation ────────
function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a complete deterministic match locally — used when server is unreachable. */
function buildOfflineMatch(params: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeStrength: number;
  awayStrength: number;
  stadiumName: string;
  isHome: boolean;
  competition: string;
}): { events: SimEvent[]; homeGoals: number; awayGoals: number; stats: MatchStats } {
  const rand = mulberry32(hashString(params.matchId));
  const totalStr = params.homeStrength + params.awayStrength;
  const homeProb = totalStr > 0 ? params.homeStrength / totalStr : 0.5;
  // Expected goals via Poisson-ish approximation
  const homeXG = 0.6 + homeProb * 2.0;
  const awayXG = 0.6 + (1 - homeProb) * 2.0;
  const drawGoals = (xg: number) => {
    let g = 0;
    for (let i = 0; i < 6; i++) if (rand() < xg / 6) g++;
    return g;
  };
  const homeGoals = drawGoals(homeXG);
  const awayGoals = drawGoals(awayXG);

  const events: SimEvent[] = [
    { minute: 0, type: 'kickoff', team: 'neutral', description: '⚽ Início da partida!' },
  ];
  const totalGoals = homeGoals + awayGoals;
  const goalMinutes: { min: number; team: 'home' | 'away' }[] = [];
  for (let i = 0; i < homeGoals; i++) goalMinutes.push({ min: Math.floor(rand() * 88) + 1, team: 'home' });
  for (let i = 0; i < awayGoals; i++) goalMinutes.push({ min: Math.floor(rand() * 88) + 1, team: 'away' });
  goalMinutes.sort((a, b) => a.min - b.min);
  for (const g of goalMinutes) {
    events.push({
      minute: g.min,
      type: 'goal_open_play',
      team: g.team,
      isGoal: true,
      description: `⚽ GOL! ${g.team === 'home' ? params.homeTeam : params.awayTeam}`,
    });
  }
  // Filler events for stats
  const fillerCount = 18 + Math.floor(rand() * 10);
  for (let i = 0; i < fillerCount; i++) {
    const minute = Math.floor(rand() * 90);
    const team: 'home' | 'away' = rand() < homeProb ? 'home' : 'away';
    const types = ['possession', 'long_pass', 'tackle', 'foul', 'corner_danger', 'long_shot_miss'];
    const type = types[Math.floor(rand() * types.length)];
    events.push({ minute, type, team, description: type });
  }
  events.push({ minute: 45, type: 'halftime', team: 'neutral', description: '🟡 Fim do 1º tempo' });
  events.push({ minute: 90, type: 'final_whistle', team: 'neutral', description: '🏁 Fim de jogo!' });
  events.sort((a, b) => a.minute - b.minute);

  const stats: MatchStats = {
    possession: [Math.round(homeProb * 100), Math.round((1 - homeProb) * 100)],
    shots: [homeGoals + Math.floor(rand() * 8) + 3, awayGoals + Math.floor(rand() * 8) + 3],
    shotsOnTarget: [homeGoals + Math.floor(rand() * 3), awayGoals + Math.floor(rand() * 3)],
    corners: [Math.floor(rand() * 8) + 2, Math.floor(rand() * 8) + 2],
    fouls: [Math.floor(rand() * 12) + 5, Math.floor(rand() * 12) + 5],
    yellowCards: [Math.floor(rand() * 4), Math.floor(rand() * 4)],
    redCards: [rand() < 0.05 ? 1 : 0, rand() < 0.05 ? 1 : 0],
    passes: [Math.floor(rand() * 200) + 250, Math.floor(rand() * 200) + 250],
    tackles: [Math.floor(rand() * 15) + 5, Math.floor(rand() * 15) + 5],
    saves: [Math.floor(rand() * 5) + 1, Math.floor(rand() * 5) + 1],
    offsides: [Math.floor(rand() * 4), Math.floor(rand() * 4)],
  };

  return { events, homeGoals, awayGoals, stats };
}

// ── Push Notifications ──────────────────────────────────────
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendPushNotification(title: string, body: string, icon = '⚽') {
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    try {
      new Notification(title, { body, icon: '/placeholder.svg', tag: 'match-event' });
      if ('vibrate' in navigator) navigator.vibrate(200);
    } catch { /* ignore */ }
  }
}

export function useMatchSimulation() {
  const [state, setState] = useState<MatchState>(INITIAL);
  const dataRef = useRef<MatchData | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const nextVisibleEventIdxRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const persistedRef = useRef(false);
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  // Compute stats dynamically from visible events
  const computeStatsFromEvents = useCallback((events: SimEvent[]): MatchStats => {
    const s: MatchStats = {
      possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0],
      corners: [0, 0], fouls: [0, 0], yellowCards: [0, 0],
      redCards: [0, 0], passes: [0, 0], tackles: [0, 0],
      saves: [0, 0], offsides: [0, 0],
    };
    let homeActions = 0, awayActions = 0;

    for (const ev of events) {
      const idx = ev.team === 'home' ? 0 : ev.team === 'away' ? 1 : -1;
      if (idx === -1) continue;
      const opp = idx === 0 ? 1 : 0;

      // Possession tracking
      if (ev.team === 'home') homeActions++;
      else if (ev.team === 'away') awayActions++;

      // Goal events = shot + on target. Shootout pens (disputa) NÃO contam
      // como chute regulamentar — placar e stats são separados.
      if (ev.isGoal && ev.type !== 'penalty_shootout') {
        s.shots[idx]++;
        s.shotsOnTarget[idx]++;
      }

      // Chance events
      switch (ev.type) {
        case 'woodwork':
          s.shots[idx]++;
          s.shotsOnTarget[idx]++;
          break;
        case 'great_save':
          s.shots[idx]++;
          s.shotsOnTarget[idx]++;
          s.saves[opp]++;
          break;
        case 'corner_danger':
          s.corners[idx]++;
          break;
        case 'offside_trap':
          s.offsides[idx]++;
          break;
        case 'long_shot_miss':
        case 'header_miss':
          s.shots[idx]++;
          break;
        case 'yellow_card':
          s.fouls[idx]++;
          s.yellowCards[idx]++;
          break;
        case 'red_card':
          s.fouls[idx]++;
          s.redCards[idx]++;
          break;
        case 'dangerous_foul':
          s.fouls[opp]++;
          break;
        case 'midfield_foul':
        case 'foul':
          s.fouls[idx]++;
          break;
        case 'tackle':
          s.tackles[opp]++;
          break;
        case 'penalty_miss':
          s.shots[idx]++;
          s.shotsOnTarget[idx]++;
          s.saves[opp]++;
          break;
        // Possession/pass events
        case 'possession':
        case 'dribble_ok':
        case 'through_ball':
        case 'crossing':
        case 'long_pass':
        case 'pressing':
        case 'gk_distribution':
        case 'throw_in':
        case 'free_kick':
        case 'pressing_recovery':
        case 'buildup_play':
        case 'long_pass':
          s.passes[idx]++;
          break;
        case 'counter_attack':
        case 'free_kick_near':
          s.shots[idx]++;
          s.shotsOnTarget[idx]++;
          s.saves[opp]++;
          break;
      }
    }

    // Compute possession from action counts
    const total = homeActions + awayActions;
    if (total > 0) {
      s.possession = [
        Math.round((homeActions / total) * 100),
        Math.round((awayActions / total) * 100),
      ];
    }

    return s;
  }, []);

  // Core tick function — reads time, computes visible events
  const tick = useCallback(() => {
    const data = dataRef.current;
    if (!data || isAnimatingRef.current) return;

    const now = Date.now();
    const elapsed = now - data.startTime;
    
    // Adjusted progress based on simulationSpeed
    const speedFactor = simulationSpeed;
    const virtualElapsed = elapsed * speedFactor;
    const progress = Math.min(1, Math.max(0, virtualElapsed / data.durationMs));
    const currentMinute = Math.min(
      data.maxMinute,
      Math.floor(progress * data.maxMinute)
    );
    const isComplete = virtualElapsed >= data.durationMs;

    // FIND THE NEXT EVENT TO REVEAL (IN ORDER)
    const nextEvent = data.allEvents[nextVisibleEventIdxRef.current];
    
    if (nextEvent && nextEvent.minute <= currentMinute) {
      // We have a new event to reveal!
      const visibleEvents = data.allEvents.slice(0, nextVisibleEventIdxRef.current + 1);
      nextVisibleEventIdxRef.current++;

      // Check if it's a 2D animation event
      const isHighlight = isHighlightEvent(nextEvent.type);
      if (isHighlight) {
        isAnimatingRef.current = true; // PAUSE THE CLOCK UNTIL ANIMATION FINISHES
      }

      // Update state with the new event
      let homeGoals = 0;
      let awayGoals = 0;
      for (const ev of visibleEvents) {
        if (ev.isGoal && ev.type !== 'penalty_shootout') {
          if (ev.team === 'home') homeGoals++;
          else if (ev.team === 'away') awayGoals++;
        }
      }

      const liveStats = computeStatsFromEvents(visibleEvents);
      const momentEvents = visibleEvents.filter(e => e.momentPhase);
      const currentMoment = momentEvents.length > 0 ? momentEvents[momentEvents.length - 1].momentPhase || 'equilíbrio' : 'equilíbrio';
      const staminaEvents = visibleEvents.filter(e => e.staminaData);
      const playerStamina = staminaEvents.length > 0 ? staminaEvents[staminaEvents.length - 1].staminaData || {} : {};
      const assistantTips = visibleEvents.filter(e => e.type === 'assistant_tip');

      setState(prev => ({
        ...prev,
        currentMinute: nextEvent.minute,
        progress,
        homeGoals,
        awayGoals,
        visibleEvents,
        latestEvent: nextEvent,
        stats: liveStats,
        currentMoment,
        playerStamina,
        assistantTips,
      }));

      // Notifications
      const evKey = `${nextEvent.minute}-${nextEvent.type}-${nextEvent.team}`;
      if (!notifiedEventsRef.current.has(evKey)) {
        notifiedEventsRef.current.add(evKey);
        if (nextEvent.isGoal) {
          sendPushNotification(
            `⚽ GOL! ${nextEvent.team === 'home' ? data.homeTeam : data.awayTeam}`,
            `${nextEvent.minute}' - ${nextEvent.playerName || 'Gol'}`
          );
        }
      }
      return; // Stop here for this tick to ensure order
    }

    // No new event to reveal, just update clock/progress
    const visibleEvents = data.allEvents.slice(0, nextVisibleEventIdxRef.current);
    let homeGoals = 0;
    let awayGoals = 0;
    for (const ev of visibleEvents) {
      if (ev.isGoal && ev.type !== 'penalty_shootout') {
        if (ev.team === 'home') homeGoals++;
        else if (ev.team === 'away') awayGoals++;
      }
    }

    // Determine phase
    let phase: MatchState['phase'] = 'live';
    if (isComplete) {
      phase = 'finished';
      homeGoals = Math.max(homeGoals, data.finalHomeGoals);
      awayGoals = Math.max(awayGoals, data.finalAwayGoals);
    } else if (currentMinute >= 45 && currentMinute <= 46) {
      phase = 'halftime';
    }

    setState(prev => ({
      ...prev,
      phase,
      currentMinute,
      progress,
      homeGoals,
      awayGoals,
      simulationSpeed,
    }));
  }, [simulationSpeed, computeStatsFromEvents]);

  // Handle speed change
  const setSpeed = useCallback((speed: number) => {
    setSimulationSpeed(speed);
  }, []);

  // Handle animation completion
  const onAnimationComplete = useCallback(() => {
    isAnimatingRef.current = false;
  }, []);

  // Use the animation completion in the tick function indirectly by returning it



    // Watchdog: force finished if elapsed exceeds duration + 30s buffer (avoids match hanging)
    const shouldForceFinish = elapsed >= data.durationMs + 30_000 && phase !== 'finished';

    // Persist when finished + notify (idempotent: retry on error)
    if ((isComplete || shouldForceFinish) && !persistedRef.current) {
      persistedRef.current = true;
      sendPushNotification(
        '🏁 Fim de Jogo!',
        `${data.homeTeam} ${data.finalHomeGoals} x ${data.finalAwayGoals} ${data.awayTeam}`
      );
      stopTick();

      const persist = (attempt: number) => {
        supabase
          .from('live_matches')
          .update({ status: 'finished', current_minute: data.maxMinute })
          .eq('id', data.matchDbId)
          .then(({ error }) => {
            if (error) {
              console.error('[Match] Persist error (attempt ' + attempt + '):', error.message);
              if (attempt < 3) setTimeout(() => persist(attempt + 1), 5000);
            } else {
              console.log('[Match] Result persisted');
            }
          });
      };
      persist(1);

      // If forced, also reflect finished phase locally with final score
      if (shouldForceFinish) {
        console.warn('[Match] Watchdog forced finish at elapsed=' + elapsed + 'ms');
        setState(s => ({
          ...s,
          phase: 'finished',
          homeGoals: data.finalHomeGoals,
          awayGoals: data.finalAwayGoals,
          currentMinute: data.maxMinute,
          progress: 1,
          simulationSpeed,
        }));
      }
    }
  }, [simulationSpeed]);

  // Re-tick immediately when tab becomes visible (catches up missed events from throttling)
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden && dataRef.current && !persistedRef.current) {
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [tick]);

  const startTick = useCallback(() => {
    if (unsubscribeRef.current) return;
    console.log('[Match] Subscribing to global match loop');
    // Safe wrapper: errors no tick NÃO podem quebrar a inscrição — o watchdog continua.
    const safeTick = () => {
      try { tick(); } catch (err) {
        console.error('[Match] tick() threw, ignoring to keep loop alive:', err);
      }
    };
    // Inscreve no loop global (singleton — sobrevive a re-mounts)
    unsubscribeRef.current = subscribeToLoop(safeTick);
    // Tick imediato para sincronizar UI
    safeTick();
  }, [tick]);

  const stopTick = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Load match from DB
  const loadMatch = useCallback(async (matchDbId: string): Promise<boolean> => {
    console.log('[Match] Loading match:', matchDbId);
    setState(s => ({ ...s, phase: 'loading' }));
    persistedRef.current = false;

    const { data, error } = await supabase
      .from('live_matches')
      .select('*')
      .eq('id', matchDbId)
      .maybeSingle();

    if (error || !data) {
      console.error('[Match] Load failed:', error?.message);
      setState(s => ({ ...s, phase: 'error', errorMsg: 'Partida não encontrada.' }));
      return false;
    }

    let events = (data.events as any as SimEvent[]) || [];
    // Fallback: if events array is empty, build minimum events so UI never hangs
    if (events.length === 0) {
      console.warn('[Match] Empty events from server, generating fallback');
      events = [
        { minute: 0, type: 'kickoff', team: 'neutral', description: '⚽ Início da partida!' },
        { minute: 45, type: 'halftime', team: 'neutral', description: '🟡 Fim do 1º tempo' },
        { minute: 90, type: 'final_whistle', team: 'neutral', description: '🏁 Fim de jogo!' },
      ];
    }
    const maxMinute = events.length > 0 ? Math.max(...events.map(e => e.minute)) : 90;
    const startTime = new Date(data.started_at).getTime();
    
    // Fix clock skew
    const now = Date.now();
    const adjustedStart = startTime > now + 5000 ? now : startTime;

    // CRITICAL: data.is_home reflete a perspectiva de quem INSERIU a linha.
    // Em PvP, mandante e visitante leem a MESMA linha (shared_match_id), então
    // o oponente precisa derivar isHome localmente: se ele for o user_id da
    // linha, usa data.is_home; caso contrário, é o lado oposto.
    let derivedIsHome = data.is_home;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data.user_id && user.id !== data.user_id) {
        derivedIsHome = !data.is_home;
      }
    } catch { /* ignore */ }

    // Defensive: ensure durationMs is always > 0 to avoid NaN progress and stuck matches.
    const safeDurationMs = Math.max(60_000, (data.duration_seconds || 720) * 1000);
    dataRef.current = {
      allEvents: events,
      startTime: adjustedStart,
      durationMs: safeDurationMs,
      maxMinute,
      finalHomeGoals: data.home_goals,
      finalAwayGoals: data.away_goals,
      stats: (data.stats as any as MatchStats) || { ...EMPTY_STATS },
      homeTeam: data.home_team,
      awayTeam: data.away_team,
      stadiumName: data.stadium_name,
      matchDbId: data.id,
      competition: data.competition || 'Amistoso',
      isHome: derivedIsHome,
    };

    if (data.status === 'finished') {
      persistedRef.current = true;
      setState({
        phase: 'finished',
        currentMinute: maxMinute,
        progress: 1,
        homeTeam: data.home_team,
        awayTeam: data.away_team,
        homeGoals: data.home_goals,
        awayGoals: data.away_goals,
        visibleEvents: events,
        latestEvent: events.length > 0 ? events[events.length - 1] : null,
        stats: (data.stats as any as MatchStats) || { ...EMPTY_STATS },
        stadiumName: data.stadium_name,
        matchDbId: data.id,
        errorMsg: null,
        competition: data.competition || 'Amistoso',
        isHome: derivedIsHome,
        currentMoment: 'equilíbrio',
        playerStamina: {},
        assistantTips: [],
        simulationSpeed,
      });
      return true;
    }

    // Match is live — start ticking
    startTick();
    return true;
  }, [startTick]);

  // Start a new match via edge function
  const startMatch = useCallback(async (params: {
    homeTeam: string; awayTeam: string; homePlayers: any[];
    homeStrength: number; awayStrength: number; matchId: string;
    tactics: any; stadiumName: string; stadiumCapacity: number;
    isHome: boolean; competition?: string; tournamentMatchId?: string;
    fans?: number;
    awayFans?: number;
    tieBreaker?: 'none' | 'extra_time' | 'penalties' | 'both';
    awayPlayers?: any[];
    awayTactics?: any;
  }): Promise<{ success: boolean; error?: string }> => {
    setState(s => ({ ...s, phase: 'loading' }));
    requestNotificationPermission();
    notifiedEventsRef.current.clear();

    // Reusable offline runner — used ONLY for amistosos vs BOT.
    // CRITICAL: NEVER fall back to client-side simulation for PvP. Two humans must
    // always converge on the centralized server simulation, otherwise each client
    // would invent its own events ("gols fantasmas") and the players would see
    // different matches.
    const runOfflineMatch = (reason: string): { success: boolean; error?: string } => {
      console.warn('[Match] Running OFFLINE simulation. Reason:', reason);
      const isFriendly = (params.competition || 'Amistoso').toLowerCase().includes('amistoso');
      const isPvP = typeof params.matchId === 'string' && params.matchId.startsWith('friendly-');
      // Only auto-fallback for BOT friendlies; PvP and competitive matches must remain server-driven
      if (!isFriendly || isPvP) {
        setState(s => ({ ...s, phase: 'error', errorMsg: 'Erro ao iniciar partida. Tente novamente.' }));
        return { success: false, error: 'server-required' };
      }
      const offline = buildOfflineMatch({
        matchId: params.matchId,
        homeTeam: params.homeTeam,
        awayTeam: params.awayTeam,
        homeStrength: params.homeStrength,
        awayStrength: params.awayStrength,
        stadiumName: params.stadiumName,
        isHome: params.isHome,
        competition: params.competition || 'Amistoso',
      });
      const durationMs = 12 * 60 * 1000; // 12 minutes default
      const startTime = Date.now();
      const matchDbId = `offline-${params.matchId}`;
      dataRef.current = {
        allEvents: offline.events,
        startTime,
        durationMs,
        maxMinute: 90,
        finalHomeGoals: offline.homeGoals,
        finalAwayGoals: offline.awayGoals,
        stats: offline.stats,
        homeTeam: params.homeTeam,
        awayTeam: params.awayTeam,
        stadiumName: params.stadiumName,
        matchDbId,
        competition: params.competition || 'Amistoso',
        isHome: params.isHome,
      };
      // Persistir resultado pendente em localStorage para flush posterior
      try {
        localStorage.setItem(
          `pending_match_result_${params.matchId}`,
          JSON.stringify({
            matchId: params.matchId,
            homeTeam: params.homeTeam,
            awayTeam: params.awayTeam,
            homeGoals: offline.homeGoals,
            awayGoals: offline.awayGoals,
            stats: offline.stats,
            competition: params.competition || 'Amistoso',
            createdAt: new Date().toISOString(),
          }),
        );
      } catch { /* ignore quota */ }
      persistedRef.current = true; // não tente persistir um id offline
      startTick();
      return { success: true };
    };

    // Server timeout guard — 8s
    const callWithTimeout = async () => {
      return await Promise.race([
        supabase.functions.invoke('start-match', { body: params }),
        new Promise<{ error: any; data: any }>(resolve =>
          setTimeout(() => resolve({ error: { message: 'timeout' }, data: null }), 8000),
        ),
      ]);
    };

    try {
      const resp = await callWithTimeout();

      if (resp.error) {
        // Try to extract matchDbId from error context (FunctionsHttpError)
        let matchDbId: string | null = null;
        try {
          const ctx = (resp.error as any).context;
          if (ctx instanceof Response) {
            const body = await ctx.json();
            matchDbId = body?.matchDbId || null;
          }
        } catch { /* ignore parse errors */ }

        if (!matchDbId && resp.data?.matchDbId) {
          matchDbId = resp.data.matchDbId;
        }

        if (matchDbId) {
          console.log('[Match] Existing match found, loading:', matchDbId);
          await loadMatch(matchDbId);
          return { success: true };
        }

        // No recoverable match — try to clean up stale matches and retry once
        console.warn('[Match] Start failed, attempting stale cleanup...');
        const { data: staleMatches } = await supabase
          .from('live_matches')
          .select('id, status, started_at, duration_seconds')
          .eq('status', 'live')
          .order('created_at', { ascending: false })
          .limit(1);

        if (staleMatches && staleMatches.length > 0) {
          const stale = staleMatches[0];
          const startTime = new Date(stale.started_at).getTime();
          const elapsed = Date.now() - startTime;
          const durationMs = (stale.duration_seconds || 720) * 1000;

          if (elapsed > durationMs + 60000) {
            console.log('[Match] Cleaning stale match:', stale.id);
            await supabase.from('live_matches').delete().eq('id', stale.id);
            const retry = await supabase.functions.invoke('start-match', { body: params });
            if (!retry.error && retry.data?.success) {
              await loadMatch(retry.data.matchDbId);
              return { success: true };
            }
          } else {
            console.log('[Match] Loading active match:', stale.id);
            await loadMatch(stale.id);
            return { success: true };
          }
        }

        // Last-resort: offline fallback (only for friendlies)
        return runOfflineMatch('server error: ' + (resp.error.message || 'unknown'));
      }

      const result = resp.data;
      if (!result?.success) {
        if (result?.matchDbId) {
          await loadMatch(result.matchDbId);
          return { success: true };
        }
        return runOfflineMatch('result.success false');
      }

      await loadMatch(result.matchDbId);
      return { success: true };
    } catch (err) {
      console.error('[Match] Unexpected error:', err);
      return runOfflineMatch('exception: ' + ((err as any)?.message || 'unknown'));
    }
  }, [loadMatch, startTick]);

  // Find active match — looks first for a match the user owns, then for any
  // match they participate in (visitante de partida online com a linha do
  // mandante). Como a simulação é centralizada (`shared_match_id`), o
  // visitante consegue ver a MESMA timeline mesmo sem ter inserido a linha.
  // É isso que garante "single-player mode": basta UM dos lados ter
  // disparado o start-match para o outro também conseguir assistir.
  const findActiveMatch = useCallback(async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 1) Partida própria
    const { data: own } = await supabase
      .from('live_matches')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'live')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (own) return loadMatch(own.id);

    // 2) Qualquer partida ativa em que o usuário é participante (RLS de
    //    SELECT já permite via `is_match_participant`). Limita a partidas
    //    recentes (últimas 2h) para não puxar histórico antigo.
    const recentIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: shared } = await supabase
      .from('live_matches')
      .select('id, started_at')
      .eq('status', 'live')
      .gte('started_at', recentIso)
      .order('started_at', { ascending: false })
      .limit(5);
    if (shared && shared.length > 0) {
      // Já passamos pelo RLS — qualquer linha aqui é uma partida em que
      // o usuário participa. Carrega a mais recente.
      return loadMatch(shared[0].id);
    }
    return false;
  }, [loadMatch]);

  // Cleanup explícito (chamado pelo MatchPage ao sair voluntariamente)
  const destroy = useCallback(() => {
    stopTick();
    dataRef.current = null;
  }, [stopTick]);

  // Cleanup no unmount: NÃO desinscrevemos se a partida ainda está rodando.
  // Em vez disso, deixamos um "background runner" no loop global que cuida
  // apenas da persistência final (sem tocar no setState desmontado).
  useEffect(() => {
    return () => {
      const data = dataRef.current;
      if (!data || persistedRef.current) {
        // partida já terminou ou nunca começou — pode parar
        stopTick();
        return;
      }
      // Substitui a inscrição atual por uma versão "headless" que só finaliza
      stopTick();
      const headless = () => {
        const d = dataRef.current;
        if (!d || persistedRef.current) {
          unsub();
          return;
        }
        const elapsed = Date.now() - d.startTime;
        if (elapsed >= d.durationMs) {
          persistedRef.current = true;
          sendPushNotification(
            '🏁 Fim de Jogo!',
            `${d.homeTeam} ${d.finalHomeGoals} x ${d.finalAwayGoals} ${d.awayTeam}`,
          );
          // Persiste resultado final (mesmo sem UI montada)
          if (d.matchDbId && !d.matchDbId.startsWith('offline-')) {
            const persist = (attempt: number) => {
              supabase
                .from('live_matches')
                .update({ status: 'finished', current_minute: d.maxMinute })
                .eq('id', d.matchDbId)
                .then(({ error }) => {
                  if (error && attempt < 3) setTimeout(() => persist(attempt + 1), 5000);
                  else if (!error) console.log('[Match] Headless persist OK');
                });
            };
            persist(1);
          }
          unsub();
        }
      };
      const unsub = subscribeToLoop(headless);
    };
  }, [stopTick]);

  return { state, startMatch, loadMatch, findActiveMatch, destroy };
}
