/**
 * useMatchManager — React hook for MatchManager
 * 
 * Provides reactive state from the MatchManager singleton.
 * All match logic flows through MatchManager — this hook only observes.
 * 
 * FIX: Use lazy ref initialization to prevent resetAndGetMatchManager()
 * from being called on every render, which was killing the tick loop.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchManager, MatchManagerState, resetAndGetMatchManager } from './MatchManager';
import { EMPTY_STATS } from './SimulationEngine';

const INITIAL_STATE: MatchManagerState = {
  phase: 'loading',
  snapshot: { currentMinute: 0, visibleEvents: [], homeGoals: 0, awayGoals: 0, isComplete: false, latestEvent: null, progress: 0, elapsedMs: 0, totalMs: 0 },
  config: { homeTeam: '', awayTeam: '', stadiumName: '', stadiumCapacity: 0, isHome: true, competition: '' },
  stats: { ...EMPTY_STATS },
  matchDbId: null,
  lockedResult: null,
};

export function useMatchManager() {
  const navigate = useNavigate();
  // Lazy ref: only call resetAndGetMatchManager ONCE on first mount
  const managerRef = useRef<MatchManager | null>(null);
  if (managerRef.current === null) {
    managerRef.current = resetAndGetMatchManager();
  }
  const [state, setState] = useState<MatchManagerState>(INITIAL_STATE);

  useEffect(() => {
    const manager = managerRef.current!;
    manager.setUpdateCallback(setState);
    manager.setNavigateFn(navigate);
    return () => {
      manager.setUpdateCallback(() => {});
    };
  }, [navigate]);

  const startNewMatch = useCallback(async (params: Parameters<MatchManager['startNewMatch']>[0]) => {
    return managerRef.current!.startNewMatch(params);
  }, []);

  const loadFromDb = useCallback(async (matchDbId: string) => {
    return managerRef.current!.loadFromDb(matchDbId);
  }, []);

  const findActiveMatch = useCallback(async () => {
    return managerRef.current!.findActiveMatch();
  }, []);

  const destroy = useCallback(() => {
    managerRef.current!.destroy();
  }, []);

  return {
    state,
    manager: managerRef.current!,
    startNewMatch,
    loadFromDb,
    findActiveMatch,
    destroy,
  };
}
