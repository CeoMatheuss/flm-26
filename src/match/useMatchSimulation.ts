/**
 * useMatchSimulation — Single hook for the entire match lifecycle.
 * 
 * No classes. No singletons. Just useState + setInterval.
 * Events are revealed based on elapsed real time since match start.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const intervalRef = useRef<number | null>(null);
  const persistedRef = useRef(false);

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

      // Goal events = shot + on target (includes new types)
      if (ev.isGoal) {
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
          s.passes[idx]++;
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
    if (!data) return;

    const now = Date.now();
    const elapsed = now - data.startTime;
    const progress = Math.min(1, Math.max(0, elapsed / data.durationMs));
    const currentMinute = Math.min(
      data.maxMinute,
      Math.floor(progress * data.maxMinute)
    );
    const isComplete = elapsed >= data.durationMs;

    const visibleEvents = data.allEvents.filter(e => e.minute <= currentMinute);

    let homeGoals = 0;
    let awayGoals = 0;
    for (const ev of visibleEvents) {
      if (ev.isGoal) {
        if (ev.team === 'home') homeGoals++;
        else if (ev.team === 'away') awayGoals++;
      }
    }

    const latestEvent = visibleEvents.length > 0 ? visibleEvents[visibleEvents.length - 1] : null;

    // Compute stats progressively from revealed events
    const liveStats = isComplete ? data.stats : computeStatsFromEvents(visibleEvents);

    // Determine phase
    let phase: MatchState['phase'] = 'live';
    if (isComplete) {
      phase = 'finished';
      homeGoals = data.finalHomeGoals;
      awayGoals = data.finalAwayGoals;
    } else if (currentMinute >= 45 && currentMinute <= 46) {
      phase = 'halftime';
    }

    // Extract moment and stamina from latest visible events
    const momentEvents = visibleEvents.filter(e => e.momentPhase);
    const currentMoment = momentEvents.length > 0 ? momentEvents[momentEvents.length - 1].momentPhase || 'equilíbrio' : 'equilíbrio';
    
    // Get latest stamina data
    const staminaEvents = visibleEvents.filter(e => e.staminaData);
    const playerStamina = staminaEvents.length > 0 ? staminaEvents[staminaEvents.length - 1].staminaData || {} : {};
    
    // Extract assistant tips
    const assistantTips = visibleEvents.filter(e => e.type === 'assistant_tip');

    setState({
      phase,
      currentMinute,
      progress,
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      homeGoals,
      awayGoals,
      visibleEvents,
      latestEvent,
      stats: liveStats,
      stadiumName: data.stadiumName,
      matchDbId: data.matchDbId,
      errorMsg: null,
      competition: data.competition,
      isHome: data.isHome,
      currentMoment,
      playerStamina,
      assistantTips,
    });

    // Persist when finished
    if (isComplete && !persistedRef.current) {
      persistedRef.current = true;
      stopTick();
      supabase
        .from('live_matches')
        .update({ status: 'finished', current_minute: data.maxMinute })
        .eq('id', data.matchDbId)
        .then(({ error }) => {
          if (error) console.error('[Match] Persist error:', error.message);
          else console.log('[Match] Result persisted');
        });
    }
  }, []);

  const startTick = useCallback(() => {
    if (intervalRef.current) return;
    console.log('[Match] Starting tick loop');
    // Immediate first tick
    tick();
    intervalRef.current = window.setInterval(tick, TICK_MS);
  }, [tick]);

  const stopTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
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

    const events = (data.events as any as SimEvent[]) || [];
    const maxMinute = events.length > 0 ? Math.max(...events.map(e => e.minute)) : 90;
    const startTime = new Date(data.started_at).getTime();
    
    // Fix clock skew
    const now = Date.now();
    const adjustedStart = startTime > now + 5000 ? now : startTime;

    dataRef.current = {
      allEvents: events,
      startTime: adjustedStart,
      durationMs: data.duration_seconds * 1000,
      maxMinute,
      finalHomeGoals: data.home_goals,
      finalAwayGoals: data.away_goals,
      stats: (data.stats as any as MatchStats) || { ...EMPTY_STATS },
      homeTeam: data.home_team,
      awayTeam: data.away_team,
      stadiumName: data.stadium_name,
      matchDbId: data.id,
      competition: data.competition || 'Amistoso',
      isHome: data.is_home,
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
        isHome: data.is_home,
        currentMoment: 'equilíbrio',
        playerStamina: {},
        assistantTips: [],
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
  }): Promise<{ success: boolean; error?: string }> => {
    setState(s => ({ ...s, phase: 'loading' }));

    try {
      const resp = await supabase.functions.invoke('start-match', { body: params });

      if (resp.error) {
        // Try to extract matchDbId from error context (FunctionsHttpError)
        let matchDbId: string | null = null;
        try {
          // supabase-js v2: error.context is the raw Response
          const ctx = (resp.error as any).context;
          if (ctx instanceof Response) {
            const body = await ctx.json();
            matchDbId = body?.matchDbId || null;
          }
        } catch { /* ignore parse errors */ }

        // Fallback: check resp.data
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
            // Match is past its duration + 1min grace — it's stale, delete it
            console.log('[Match] Cleaning stale match:', stale.id);
            await supabase.from('live_matches').delete().eq('id', stale.id);
            // Retry the start
            const retry = await supabase.functions.invoke('start-match', { body: params });
            if (!retry.error && retry.data?.success) {
              await loadMatch(retry.data.matchDbId);
              return { success: true };
            }
          } else {
            // Match is still within time — load it
            console.log('[Match] Loading active match:', stale.id);
            await loadMatch(stale.id);
            return { success: true };
          }
        }

        setState(s => ({ ...s, phase: 'error', errorMsg: 'Erro ao iniciar partida. Tente novamente.' }));
        return { success: false, error: 'Erro ao iniciar partida.' };
      }

      const result = resp.data;
      if (!result?.success) {
        if (result?.matchDbId) {
          await loadMatch(result.matchDbId);
          return { success: true };
        }
        setState(s => ({ ...s, phase: 'error', errorMsg: result?.error || 'Erro.' }));
        return { success: false, error: result?.error || 'Erro.' };
      }

      await loadMatch(result.matchDbId);
      return { success: true };
    } catch (err) {
      console.error('[Match] Unexpected error:', err);
      setState(s => ({ ...s, phase: 'error', errorMsg: 'Erro inesperado. Tente novamente.' }));
      return { success: false, error: 'Erro inesperado.' };
    }
  }, [loadMatch]);

  // Find active match
  const findActiveMatch = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase
      .from('live_matches')
      .select('id')
      .eq('status', 'live')
      .maybeSingle();

    if (data) return loadMatch(data.id);
    return false;
  }, [loadMatch]);

  // Cleanup
  const destroy = useCallback(() => {
    stopTick();
    dataRef.current = null;
  }, [stopTick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTick();
    };
  }, [stopTick]);

  return { state, startMatch, loadMatch, findActiveMatch, destroy };
}
