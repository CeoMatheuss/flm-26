/**
 * useMatchManager — React hook for MatchManager
 * 
 * Provides reactive state from the MatchManager singleton.
 * All match logic flows through MatchManager — this hook only observes.
 * 
 * CORREÇÃO Bug #3 e #6:
 * - Ao montar, chama hardReset() no singleton para evitar estado residual
 *   de partidas anteriores.
 * - Registra o navigate do React Router no MatchManager para que
 *   MatchResultLocker possa navegar para '/' com o resultado via state.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchManager, MatchManagerState, resetAndGetMatchManager } from './MatchManager';
import { EMPTY_STATS } from './SimulationEngine';

const INITIAL_STATE: MatchManagerState = {
  phase: 'loading',
  snapshot: { currentMinute: 0, visibleEvents: [], homeGoals: 0, awayGoals: 0, isComplete: false, latestEvent: null },
  config: { homeTeam: '', awayTeam: '', stadiumName: '', stadiumCapacity: 0, isHome: true, competition: '' },
  stats: { ...EMPTY_STATS },
  matchDbId: null,
  lockedResult: null,
};

export function useMatchManager() {
  const navigate = useNavigate();
  // Use resetAndGetMatchManager to guarantee clean state on every /match mount
  const managerRef = useRef<MatchManager>(resetAndGetMatchManager());
  const [state, setState] = useState<MatchManagerState>(INITIAL_STATE);

  useEffect(() => {
    const manager = managerRef.current;
    manager.setUpdateCallback(setState);
    // Register navigate so MatchResultLocker can pass result via location.state
    manager.setNavigateFn(navigate);
    return () => {
      manager.setUpdateCallback(() => {});
    };
  }, [navigate]);

  const startNewMatch = useCallback(async (params: Parameters<MatchManager['startNewMatch']>[0]) => {
    return managerRef.current.startNewMatch(params);
  }, []);

  const loadFromDb = useCallback(async (matchDbId: string) => {
    return managerRef.current.loadFromDb(matchDbId);
  }, []);

  const findActiveMatch = useCallback(async () => {
    return managerRef.current.findActiveMatch();
  }, []);

  const destroy = useCallback(() => {
    managerRef.current.destroy();
  }, []);

  return {
    state,
    manager: managerRef.current,
    startNewMatch,
    loadFromDb,
    findActiveMatch,
    destroy,
  };
}
