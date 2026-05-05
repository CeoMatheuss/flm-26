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
  simulationSpeed: number;
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

type Subscriber = () => void;
const subscribers = new Set<Subscriber>();
let intervalHandle: number | null = null;
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
}

function stopGlobalLoopIfIdle() {
  if (subscribers.size > 0) return;
  if (intervalHandle != null) { clearInterval(intervalHandle); intervalHandle = null; }
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

export function useMatchSimulation() {
  const [state, setState] = useState<MatchState>(INITIAL);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const dataRef = useRef<MatchData | null>(null);
  const nextVisibleEventIdxRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const persistedRef = useRef(false);
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  const computeStatsFromEvents = useCallback((events: SimEvent[]): MatchStats => {
    const s: MatchStats = { ...EMPTY_STATS, possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0], corners: [0, 0], fouls: [0, 0], yellowCards: [0, 0], redCards: [0, 0], passes: [0, 0], tackles: [0, 0], saves: [0, 0], offsides: [0, 0] };
    let homeActions = 0, awayActions = 0;
    for (const ev of events) {
      const idx = ev.team === 'home' ? 0 : ev.team === 'away' ? 1 : -1;
      if (idx === -1) continue;
      const opp = idx === 0 ? 1 : 0;
      if (ev.team === 'home') homeActions++; else if (ev.team === 'away') awayActions++;
      if (ev.isGoal && ev.type !== 'penalty_shootout') { s.shots[idx]++; s.shotsOnTarget[idx]++; }
      switch (ev.type) {
        case 'woodwork': s.shots[idx]++; s.shotsOnTarget[idx]++; break;
        case 'great_save': s.shots[idx]++; s.shotsOnTarget[idx]++; s.saves[opp]++; break;
        case 'corner_danger': s.corners[idx]++; break;
        case 'offside_trap': s.offsides[idx]++; break;
        case 'long_shot_miss': case 'header_miss': s.shots[idx]++; break;
        case 'yellow_card': s.fouls[idx]++; s.yellowCards[idx]++; break;
        case 'red_card': s.fouls[idx]++; s.redCards[idx]++; break;
        case 'dangerous_foul': s.fouls[opp]++; break;
        case 'midfield_foul': case 'foul': s.fouls[idx]++; break;
        case 'tackle': s.tackles[opp]++; break;
        case 'penalty_miss': s.shots[idx]++; s.shotsOnTarget[idx]++; s.saves[opp]++; break;
        case 'possession': case 'dribble_ok': case 'through_ball': case 'crossing': case 'long_pass': case 'pressing': s.passes[idx]++; break;
        case 'counter_attack': case 'free_kick_near': s.shots[idx]++; s.shotsOnTarget[idx]++; s.saves[opp]++; break;
      }
    }
    const total = homeActions + awayActions;
    if (total > 0) s.possession = [Math.round((homeActions / total) * 100), Math.round((awayActions / total) * 100)];
    return s;
  }, []);

  const tick = useCallback(() => {
    const data = dataRef.current;
    if (!data || isAnimatingRef.current) return;

    const now = Date.now();
    const virtualElapsed = (now - data.startTime) * simulationSpeed;
    const progress = Math.min(1, Math.max(0, virtualElapsed / data.durationMs));
    const currentMinute = Math.min(data.maxMinute, Math.floor(progress * data.maxMinute));
    const isComplete = virtualElapsed >= data.durationMs;

    const nextEvent = data.allEvents[nextVisibleEventIdxRef.current];
    if (nextEvent && nextEvent.minute <= currentMinute) {
      const visibleEvents = data.allEvents.slice(0, nextVisibleEventIdxRef.current + 1);
      nextVisibleEventIdxRef.current++;
      if (isHighlightEvent(nextEvent.type)) isAnimatingRef.current = true;

      let hG = 0, aG = 0;
      for (const ev of visibleEvents) if (ev.isGoal && ev.type !== 'penalty_shootout') { if (ev.team === 'home') hG++; else if (ev.team === 'away') aG++; }

      const stats = computeStatsFromEvents(visibleEvents);
      const stamina = visibleEvents.filter(e => e.staminaData).pop()?.staminaData || {};
      const moment = visibleEvents.filter(e => e.momentPhase).pop()?.momentPhase || 'equilíbrio';

      setState(prev => ({
        ...prev,
        currentMinute: nextEvent.minute,
        progress,
        homeGoals: hG,
        awayGoals: aG,
        visibleEvents,
        latestEvent: nextEvent,
        stats,
        currentMoment: moment,
        playerStamina: stamina,
        assistantTips: visibleEvents.filter(e => e.type === 'assistant_tip'),
      }));
      return;
    }

    let hG = state.homeGoals, aG = state.awayGoals;
    let phase: MatchState['phase'] = 'live';
    if (isComplete) { phase = 'finished'; hG = Math.max(hG, data.finalHomeGoals); aG = Math.max(aG, data.finalAwayGoals); }
    else if (currentMinute >= 45 && currentMinute <= 46) phase = 'halftime';

    setState(prev => ({ ...prev, phase, currentMinute, progress, homeGoals: hG, awayGoals: aG, simulationSpeed }));

    if ((isComplete || virtualElapsed >= data.durationMs + 30000) && !persistedRef.current) {
      persistedRef.current = true;
      stopTick();
      supabase.from('live_matches').update({ status: 'finished', current_minute: data.maxMinute }).eq('id', data.matchDbId);
    }
  }, [simulationSpeed, computeStatsFromEvents, state.homeGoals, state.awayGoals]);

  const startTick = useCallback(() => {
    if (unsubscribeRef.current) return;
    unsubscribeRef.current = subscribeToLoop(() => tick());
    tick();
  }, [tick]);

  const stopTick = useCallback(() => {
    if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
  }, []);

  const loadMatch = useCallback(async (matchDbId: string): Promise<boolean> => {
    setState(s => ({ ...s, phase: 'loading' }));
    const { data, error } = await supabase.from('live_matches').select('*').eq('id', matchDbId).maybeSingle();
    if (error || !data) return false;
    const events = (data.events as any as SimEvent[]) || [];
    dataRef.current = {
      allEvents: events,
      startTime: new Date(data.started_at).getTime(),
      durationMs: (data.duration_seconds || 720) * 1000,
      maxMinute: events.length > 0 ? Math.max(...events.map(e => e.minute)) : 90,
      finalHomeGoals: data.home_goals,
      finalAwayGoals: data.away_goals,
      stats: (data.stats as any) || EMPTY_STATS,
      homeTeam: data.home_team,
      awayTeam: data.away_team,
      stadiumName: data.stadium_name,
      matchDbId: data.id,
      competition: data.competition || 'Amistoso',
      isHome: data.is_home,
    };
    if (data.status === 'finished') {
      persistedRef.current = true;
      setState(s => ({ ...s, phase: 'finished', currentMinute: 90, progress: 1, visibleEvents: events, latestEvent: events[events.length-1] }));
      return true;
    }
    startTick();
    return true;
  }, [startTick]);

  const startMatch = useCallback(async (params: any) => {
    setState(s => ({ ...s, phase: 'loading' }));
    const { data, error } = await supabase.functions.invoke('start-match', { body: params });
    if (error || !data?.success) return { success: false };
    await loadMatch(data.matchDbId);
    return { success: true };
  }, [loadMatch]);

  const findActiveMatch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('live_matches').select('id').eq('user_id', user.id).eq('status', 'live').order('started_at', { ascending: false }).limit(1).maybeSingle();
    if (data) return loadMatch(data.id);
    return false;
  }, [loadMatch]);

  const destroy = useCallback(() => { stopTick(); dataRef.current = null; }, [stopTick]);

  const onAnimationComplete = useCallback(() => { isAnimatingRef.current = false; }, []);
  const setSpeed = useCallback((s: number) => { setSimulationSpeed(s); }, []);

  return { state, startMatch, loadMatch, findActiveMatch, destroy, onAnimationComplete, setSpeed };
}
