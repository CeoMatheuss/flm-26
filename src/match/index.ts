/**
 * Match System v3 — Simple, flat architecture.
 * 
 * No classes, no singletons. Just a React hook that:
 * 1. Calls the server to generate the match
 * 2. Uses setInterval + Date.now() to reveal events over time
 * 3. Persists result when done
 */

export { useMatchSimulation } from './useMatchSimulation';
export type { MatchState, SimEvent, MatchStats } from './useMatchSimulation';
