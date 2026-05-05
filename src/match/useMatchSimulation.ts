import { useState, useEffect, useCallback, useRef } from 'react';
import { MatchEvent } from '@/types/events';
import { Player } from '@/types/game';

interface MatchSimulationState {
  minute: number;
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  isFinished: boolean;
  currentEventIndex: number;
}

export function useMatchSimulation(
  homePlayers: Player[],
  awayPlayers: Player[],
  matchEvents: MatchEvent[],
  onMatchEnd: (result: { homeGoals: number; awayGoals: number }) => void
) {
  const [state, setState] = useState<MatchSimulationState>({
    minute: 0,
    homeGoals: 0,
    awayGoals: 0,
    events: [],
    isFinished: false,
    currentEventIndex: 0,
  });

  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const isAnimatingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const processNextEvent = useCallback(() => {
    if (state.currentEventIndex >= matchEvents.length) {
      setState(prev => ({ ...prev, isFinished: true }));
      onMatchEnd({ homeGoals: state.homeGoals, awayGoals: state.awayGoals });
      return;
    }

    if (isAnimatingRef.current) return;

    const event = matchEvents[state.currentEventIndex];
    isAnimatingRef.current = true;

    setState(prev => {
      const newHomeGoals = event.isGoal && event.team === 'home' ? prev.homeGoals + 1 : prev.homeGoals;
      const newAwayGoals = event.isGoal && event.team === 'away' ? prev.awayGoals + 1 : prev.awayGoals;
      
      return {
        ...prev,
        minute: event.minute,
        homeGoals: newHomeGoals,
        awayGoals: newAwayGoals,
        events: [...prev.events, event],
        currentEventIndex: prev.currentEventIndex + 1,
      };
    });
  }, [state.currentEventIndex, state.homeGoals, state.awayGoals, matchEvents, onMatchEnd]);

  useEffect(() => {
    if (state.isFinished) return;

    const speedMs = simulationSpeed === 1 ? 2000 : 800;
    timerRef.current = setTimeout(processNextEvent, speedMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.currentEventIndex, state.isFinished, simulationSpeed, processNextEvent]);

  const setSpeed = useCallback((speed: number) => {
    setSimulationSpeed(speed);
  }, []);

  const onAnimationComplete = useCallback(() => {
    isAnimatingRef.current = false;
  }, []);

  return {
    ...state,
    setSpeed,
    onAnimationComplete,
    simulationSpeed
  };
}
