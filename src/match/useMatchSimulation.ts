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

export function useMatchSimulation() {
  const [state, setState] = useState<MatchState>(INITIAL);
  const dataRef = useRef<MatchData | null>(null);
  const intervalRef = useRef<number | null>(null);
  const persistedRef = useRef(false);

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

    // Determine phase
    let phase: MatchState['phase'] = 'live';
    if (isComplete) {
      phase = 'finished';
      homeGoals = data.finalHomeGoals;
      awayGoals = data.finalAwayGoals;
    } else if (currentMinute >= 45 && currentMinute <= 46) {
      phase = 'halftime';
    }

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
      stats: data.stats,
      stadiumName: data.stadiumName,
      matchDbId: data.matchDbId,
      errorMsg: null,
      competition: data.competition,
      isHome: data.isHome,
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
    isHome: boolean; competition?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    setState(s => ({ ...s, phase: 'loading' }));

    try {
      const resp = await supabase.functions.invoke('start-match', { body: params });

      if (resp.error) {
        // Check if there's an existing match
        let errBody: any = null;
        try {
          if (resp.data) errBody = resp.data;
        } catch { /* */ }
        if (errBody?.matchDbId) {
          await loadMatch(errBody.matchDbId);
          return { success: true };
        }
        setState(s => ({ ...s, phase: 'error', errorMsg: 'Erro ao iniciar partida.' }));
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
    } catch {
      setState(s => ({ ...s, phase: 'error', errorMsg: 'Erro inesperado.' }));
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
