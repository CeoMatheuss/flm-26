/**
 * MatchStateController — Controla estados da partida (PRE, RUNNING, FINISHED)
 * 
 * REGRA: Uma vez FINISHED, nenhuma transição é permitida.
 * Fonte única de verdade sobre o estado da partida.
 */

export type MatchState = 'PRE_MATCH' | 'RUNNING' | 'FINISHED';

type StateListener = (state: MatchState, prev: MatchState) => void;

export class MatchStateController {
  private _state: MatchState = 'PRE_MATCH';
  private _locked = false;
  private _listeners: StateListener[] = [];

  get state(): MatchState { return this._state; }
  get isFinished(): boolean { return this._state === 'FINISHED'; }
  get isRunning(): boolean { return this._state === 'RUNNING'; }
  get isPre(): boolean { return this._state === 'PRE_MATCH'; }

  /** Subscribe to state changes */
  onStateChange(fn: StateListener): () => void {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  /** Transition to RUNNING — only from PRE_MATCH */
  start(): boolean {
    if (this._state !== 'PRE_MATCH') {
      console.warn(`[MatchState] Cannot start: current state is ${this._state}`);
      return false;
    }
    this._transition('RUNNING');
    return true;
  }

  /** Transition to FINISHED — only from RUNNING, only once */
  finish(): boolean {
    if (this._locked) {
      console.warn('[MatchState] Already locked — finish ignored');
      return false;
    }
    if (this._state !== 'RUNNING') {
      console.warn(`[MatchState] Cannot finish: current state is ${this._state}`);
      return false;
    }
    this._locked = true;
    this._transition('FINISHED');
    return true;
  }

  /** Reset for a new match — only callable from FINISHED or PRE_MATCH */
  reset(): void {
    this._state = 'PRE_MATCH';
    this._locked = false;
    console.log('[MatchState] Reset to PRE_MATCH');
  }

  private _transition(next: MatchState): void {
    const prev = this._state;
    this._state = next;
    console.log(`[MatchState] ${prev} → ${next}`);
    this._listeners.forEach(fn => fn(next, prev));
  }
}
