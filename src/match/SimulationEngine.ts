/**
 * SimulationEngine — Read-only client-side event revealer
 * 
 * The ACTUAL simulation runs server-side in the start-match Edge Function.
 * This engine reveals pre-computed events based on elapsed real time.
 * 
 * RULES:
 * - No event generation on client side
 * - Goals counted only from server-generated events
 * - State is read-only after server delivers events
 */

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

export const EMPTY_STATS: MatchStats = {
  possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0],
  corners: [0, 0], fouls: [0, 0], yellowCards: [0, 0],
  redCards: [0, 0], passes: [0, 0], tackles: [0, 0],
  saves: [0, 0], offsides: [0, 0],
};

export interface SimulationSnapshot {
  currentMinute: number;
  visibleEvents: SimEvent[];
  homeGoals: number;
  awayGoals: number;
  isComplete: boolean;
  latestEvent: SimEvent | null;
  progress: number; // 0-1 progress through match
  elapsedMs: number;
  totalMs: number;
}

export class SimulationEngine {
  private _allEvents: SimEvent[] = [];
  private _maxGameMinute = 90;
  private _startTime = 0;
  private _durationMs = 0;
  private _finalHomeGoals = 0;
  private _finalAwayGoals = 0;
  private _lastLoggedMinute = -1;

  get allEvents(): SimEvent[] { return this._allEvents; }
  get maxGameMinute(): number { return this._maxGameMinute; }
  get finalHomeGoals(): number { return this._finalHomeGoals; }
  get finalAwayGoals(): number { return this._finalAwayGoals; }
  get isLoaded(): boolean { return this._durationMs > 0 && this._allEvents.length > 0; }

  /**
   * Load server-generated match data.
   * This is the ONLY way to set events — no client-side generation.
   */
  load(events: SimEvent[], homeGoals: number, awayGoals: number, startedAt: string, durationSeconds: number): void {
    this._allEvents = events;
    this._finalHomeGoals = homeGoals;
    this._finalAwayGoals = awayGoals;
    this._startTime = new Date(startedAt).getTime();
    this._durationMs = durationSeconds * 1000;
    this._maxGameMinute = events.length > 0
      ? Math.max(...events.map(e => e.minute))
      : 90;
    this._lastLoggedMinute = -1;

    const now = Date.now();
    const elapsed = now - this._startTime;
    console.log(`[SimEngine] Loaded ${events.length} events, max minute: ${this._maxGameMinute}, duration: ${durationSeconds}s`);
    console.log(`[SimEngine] startTime: ${new Date(this._startTime).toISOString()}, now: ${new Date(now).toISOString()}, elapsed: ${Math.round(elapsed / 1000)}s`);
    
    // Safety: if startTime is in the future (clock skew), adjust
    if (this._startTime > now + 5000) {
      console.warn(`[SimEngine] startTime is in the future! Adjusting to now.`);
      this._startTime = now;
    }
  }

  /**
   * Get current snapshot based on real elapsed time.
   * Pure function — no side effects, no state mutation (except debug logging).
   */
  getSnapshot(): SimulationSnapshot {
    if (!this.isLoaded) {
      return {
        currentMinute: 0, visibleEvents: [], homeGoals: 0, awayGoals: 0,
        isComplete: false, latestEvent: null, progress: 0, elapsedMs: 0, totalMs: 0,
      };
    }

    const now = Date.now();
    const elapsed = now - this._startTime;
    const progress = Math.min(1, Math.max(0, elapsed / this._durationMs));
    const currentMinute = Math.floor(progress * this._maxGameMinute);
    const isComplete = elapsed >= this._durationMs;

    // Debug: log every 5 minutes
    if (currentMinute !== this._lastLoggedMinute && currentMinute % 5 === 0) {
      console.log(`[SimEngine] Minute ${currentMinute}, progress: ${(progress * 100).toFixed(1)}%, elapsed: ${Math.round(elapsed / 1000)}s/${Math.round(this._durationMs / 1000)}s`);
      this._lastLoggedMinute = currentMinute;
    }

    const visibleEvents = this._allEvents.filter(e => e.minute <= currentMinute);

    let homeGoals = 0, awayGoals = 0;
    for (const ev of visibleEvents) {
      if (ev.isGoal) {
        if (ev.team === 'home') homeGoals++;
        else if (ev.team === 'away') awayGoals++;
      }
    }

    const latestEvent = visibleEvents.length > 0 ? visibleEvents[visibleEvents.length - 1] : null;

    return { currentMinute, visibleEvents, homeGoals, awayGoals, isComplete, latestEvent, progress, elapsedMs: elapsed, totalMs: this._durationMs };
  }

  /**
   * Get final snapshot (all events revealed).
   */
  getFinalSnapshot(): SimulationSnapshot {
    return {
      currentMinute: this._maxGameMinute,
      visibleEvents: this._allEvents,
      homeGoals: this._finalHomeGoals,
      awayGoals: this._finalAwayGoals,
      isComplete: true,
      latestEvent: this._allEvents.length > 0 ? this._allEvents[this._allEvents.length - 1] : null,
      progress: 1,
      elapsedMs: this._durationMs,
      totalMs: this._durationMs,
    };
  }

  reset(): void {
    this._allEvents = [];
    this._maxGameMinute = 90;
    this._startTime = 0;
    this._durationMs = 0;
    this._finalHomeGoals = 0;
    this._finalAwayGoals = 0;
    this._lastLoggedMinute = -1;
  }
}
