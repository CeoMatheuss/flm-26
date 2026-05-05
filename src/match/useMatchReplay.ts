/**
 * useMatchReplay — Replays a saved match from match_data (tournament matches).
 * Progressively reveals pre-computed events using the same tick mechanism as live matches.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SimEvent, MatchStats, MatchState } from './useMatchSimulation';

const EMPTY_STATS: MatchStats = {
  possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0],
  corners: [0, 0], fouls: [0, 0], yellowCards: [0, 0],
  redCards: [0, 0], passes: [0, 0], tackles: [0, 0],
  saves: [0, 0], offsides: [0, 0],
};

const INITIAL: MatchState = {
  phase: 'idle', currentMinute: 0, progress: 0,
  homeTeam: '', awayTeam: '', homeGoals: 0, awayGoals: 0,
  visibleEvents: [], latestEvent: null, stats: { ...EMPTY_STATS },
  stadiumName: '', matchDbId: null, errorMsg: null,
  competition: '', isHome: true,
  currentMoment: 'equilíbrio', playerStamina: {}, assistantTips: [],
  simulationSpeed: 1,
};

const TICK_MS = 300;
// Replay duration: 3 minutes (180 seconds) for a full 90-min match
const REPLAY_DURATION_MS = 180_000;

interface ReplayData {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  events: SimEvent[];
  stats: MatchStats;
  matchId?: string;
}

export function useMatchReplay() {
  const [state, setState] = useState<MatchState>(INITIAL);
  const dataRef = useRef<{
    allEvents: SimEvent[];
    startTime: number;
    maxMinute: number;
    finalHomeGoals: number;
    finalAwayGoals: number;
    stats: MatchStats;
    homeTeam: string;
    awayTeam: string;
  } | null>(null);
  const intervalRef = useRef<number | null>(null);

  const computeStatsFromEvents = useCallback((events: SimEvent[]): MatchStats => {
    const s: MatchStats = { ...EMPTY_STATS, possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0], corners: [0, 0], fouls: [0, 0], yellowCards: [0, 0], redCards: [0, 0], passes: [0, 0], tackles: [0, 0], saves: [0, 0], offsides: [0, 0] };
    let homeActions = 0, awayActions = 0;
    for (const ev of events) {
      const idx = ev.team === 'home' ? 0 : ev.team === 'away' ? 1 : -1;
      if (idx === -1) continue;
      const opp = idx === 0 ? 1 : 0;
      if (ev.team === 'home') homeActions++; else if (ev.team === 'away') awayActions++;
      if (ev.isGoal) { s.shots[idx]++; s.shotsOnTarget[idx]++; }
      switch (ev.type) {
        case 'woodwork': s.shots[idx]++; s.shotsOnTarget[idx]++; break;
        case 'great_save': s.shots[idx]++; s.shotsOnTarget[idx]++; s.saves[opp]++; break;
        case 'corner_danger': s.corners[idx]++; break;
        case 'yellow_card': s.fouls[idx]++; s.yellowCards[idx]++; break;
        case 'red_card': s.fouls[idx]++; s.redCards[idx]++; break;
        case 'dangerous_foul': s.fouls[opp]++; break;
        case 'midfield_foul': case 'foul': s.fouls[idx]++; break;
        case 'tackle': s.tackles[opp]++; break;
        case 'long_shot_miss': case 'header_miss': s.shots[idx]++; break;
        case 'penalty_miss': s.shots[idx]++; s.shotsOnTarget[idx]++; s.saves[opp]++; break;
        case 'possession': case 'dribble_ok': case 'through_ball': case 'crossing': case 'long_pass': case 'pressing': s.passes[idx]++; break;
      }
    }
    const total = homeActions + awayActions;
    if (total > 0) { s.possession = [Math.round((homeActions / total) * 100), Math.round((awayActions / total) * 100)]; }
    return s;
  }, []);

  const tick = useCallback(() => {
    const data = dataRef.current;
    if (!data) return;
    const elapsed = Date.now() - data.startTime;
    const progress = Math.min(1, Math.max(0, elapsed / REPLAY_DURATION_MS));
    const currentMinute = Math.min(data.maxMinute, Math.floor(progress * data.maxMinute));
    const isComplete = elapsed >= REPLAY_DURATION_MS;
    const visibleEvents = data.allEvents.filter(e => e.minute <= currentMinute);
    let homeGoals = 0, awayGoals = 0;
    for (const ev of visibleEvents) {
      if (ev.isGoal) { if (ev.team === 'home') homeGoals++; else if (ev.team === 'away') awayGoals++; }
    }
    const latestEvent = visibleEvents.length > 0 ? visibleEvents[visibleEvents.length - 1] : null;
    const liveStats = isComplete ? data.stats : computeStatsFromEvents(visibleEvents);
    let phase: MatchState['phase'] = 'live';
    if (isComplete) { phase = 'finished'; homeGoals = data.finalHomeGoals; awayGoals = data.finalAwayGoals; }
    else if (currentMinute >= 45 && currentMinute <= 46) phase = 'halftime';

    setState({
      phase, currentMinute, progress, homeTeam: data.homeTeam, awayTeam: data.awayTeam,
      homeGoals, awayGoals, visibleEvents, latestEvent, stats: liveStats,
      stadiumName: 'Campeonato', matchDbId: null, errorMsg: null, competition: 'Campeonato', isHome: true,
      currentMoment: 'equilíbrio', playerStamina: {}, assistantTips: [], simulationSpeed: 1,
    });

    if (isComplete) stopTick();
  }, [computeStatsFromEvents]);

  const stopTick = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startReplay = useCallback((replayData: ReplayData) => {
    stopTick();
    const events = (replayData.events || []) as SimEvent[];
    const maxMinute = events.length > 0 ? Math.max(...events.map(e => e.minute)) : 90;
    dataRef.current = {
      allEvents: events, startTime: Date.now(), maxMinute,
      finalHomeGoals: replayData.homeGoals, finalAwayGoals: replayData.awayGoals,
      stats: replayData.stats || { ...EMPTY_STATS },
      homeTeam: replayData.homeTeam, awayTeam: replayData.awayTeam,
    };
    setState(s => ({ ...s, phase: 'loading', homeTeam: replayData.homeTeam, awayTeam: replayData.awayTeam }));
    // Start ticking
    tick();
    intervalRef.current = window.setInterval(tick, TICK_MS);
  }, [tick, stopTick]);

  const skipToEnd = useCallback(() => {
    const data = dataRef.current;
    if (!data) return;
    stopTick();
    setState({
      phase: 'finished', currentMinute: data.maxMinute, progress: 1,
      homeTeam: data.homeTeam, awayTeam: data.awayTeam,
      homeGoals: data.finalHomeGoals, awayGoals: data.finalAwayGoals,
      visibleEvents: data.allEvents, latestEvent: data.allEvents[data.allEvents.length - 1] || null,
      stats: data.stats, stadiumName: 'Campeonato', matchDbId: null, errorMsg: null,
      competition: 'Campeonato', isHome: true,
      currentMoment: 'equilíbrio', playerStamina: {}, assistantTips: [], simulationSpeed: 1,
    });
  }, [stopTick]);

  const destroy = useCallback(() => { stopTick(); dataRef.current = null; }, [stopTick]);

  useEffect(() => () => stopTick(), [stopTick]);

  return { state, startReplay, skipToEnd, destroy };
}
