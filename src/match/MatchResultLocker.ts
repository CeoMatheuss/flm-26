/**
 * MatchResultLocker — Trava definitiva do resultado
 * 
 * REGRA: O resultado só pode ser travado UMA VEZ.
 * Após travado, nenhuma modificação é permitida.
 */

import { supabase } from '@/integrations/supabase/client';

export interface LockedResult {
  homeGoals: number;
  awayGoals: number;
  matchDbId: string;
  lockedAt: number; // timestamp
}

export class MatchResultLocker {
  private _locked = false;
  private _result: LockedResult | null = null;
  private _persisted = false;

  get isLocked(): boolean { return this._locked; }
  get result(): LockedResult | null { return this._result; }
  get isPersisted(): boolean { return this._persisted; }

  /**
   * Lock the final result — can only be called ONCE.
   * Returns true if locked successfully, false if already locked.
   */
  lock(homeGoals: number, awayGoals: number, matchDbId: string): boolean {
    if (this._locked) {
      console.warn('[ResultLocker] Result already locked — ignoring duplicate lock attempt');
      return false;
    }
    this._locked = true;
    this._result = { homeGoals, awayGoals, matchDbId, lockedAt: Date.now() };
    console.log(`[ResultLocker] Result LOCKED: ${homeGoals} x ${awayGoals} (match: ${matchDbId})`);
    return true;
  }

  /**
   * Persist the locked result to DB — can only be called ONCE after lock.
   * After persisting, communicates result back to Index via navigation state.
   * This avoids Index polling for finished matches and calling simulateMatch().
   */
  async persist(maxGameMinute: number, navigateFn?: (path: string, opts: any) => void): Promise<boolean> {
    if (!this._locked || !this._result) {
      console.warn('[ResultLocker] Cannot persist — not locked');
      return false;
    }
    if (this._persisted) {
      console.warn('[ResultLocker] Already persisted — ignoring');
      return false;
    }
    this._persisted = true;

    const result = this._result;

    try {
      const { error } = await supabase
        .from('live_matches')
        .update({ status: 'finished', current_minute: maxGameMinute })
        .eq('id', result.matchDbId);

      if (error) {
        console.error('[ResultLocker] DB persist failed:', error.message);
        this._persisted = false;
        return false;
      }

      console.log(`[ResultLocker] Result persisted to DB for match ${result.matchDbId}`);

      // Pass result via navigation state so Index.tsx processes it
      // without polling and without calling simulateMatch()
      if (navigateFn) {
        navigateFn('/', {
          replace: true,
          state: {
            serverMatchResult: {
              matchDbId: result.matchDbId,
              homeGoals: result.homeGoals,
              awayGoals: result.awayGoals,
            },
          },
        });
      }

      return true;
    } catch (err) {
      console.error('[ResultLocker] Persist exception:', err);
      this._persisted = false;
      return false;
    }
  }

  /** Reset for new match */
  reset(): void {
    this._locked = false;
    this._result = null;
    this._persisted = false;
  }
}
