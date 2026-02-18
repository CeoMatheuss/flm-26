/**
 * Match System — Public API
 * 
 * Central exports for the match system architecture.
 * 
 * Architecture:
 * - MatchManager: Coordinates the match lifecycle
 * - MatchStateController: Controls states (PRE_MATCH, RUNNING, FINISHED)
 * - SimulationEngine: Read-only event revealer (server generates events)
 * - MatchResultLocker: One-time result lock & persist
 * - useMatchManager: React hook for reactive state
 * 
 * The 2D renderer (Pitch2DView in MatchPage) is purely visual — 
 * it receives data from useMatchManager and NEVER modifies state.
 */

export { MatchManager, getMatchManager } from './MatchManager';
export type { MatchConfig, MatchManagerState, MatchPhase } from './MatchManager';

export { MatchStateController } from './MatchStateController';
export type { MatchState } from './MatchStateController';

export { SimulationEngine, EMPTY_STATS } from './SimulationEngine';
export type { SimEvent, MatchStats, SimulationSnapshot } from './SimulationEngine';

export { MatchResultLocker } from './MatchResultLocker';
export type { LockedResult } from './MatchResultLocker';

export { useMatchManager } from './useMatchManager';
