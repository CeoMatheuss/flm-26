/**
 * MatchManager — Coordena toda a partida
 * 
 * Orquestra MatchStateController, SimulationEngine e MatchResultLocker.
 * Único ponto de entrada para controle da partida no cliente.
 * 
 * REGRAS:
 * - Simulação vem do servidor (Edge Function start-match)
 * - Cliente apenas revela eventos baseado no tempo real
 * - Finalização só ocorre UMA vez via MatchResultLocker
 * - Nenhum módulo externo pode modificar placar
 */

import { MatchStateController } from './MatchStateController';
import { SimulationEngine, SimEvent, MatchStats, EMPTY_STATS, SimulationSnapshot } from './SimulationEngine';
import { MatchResultLocker, LockedResult } from './MatchResultLocker';
import { supabase } from '@/integrations/supabase/client';

export interface MatchConfig {
  homeTeam: string;
  awayTeam: string;
  stadiumName: string;
  stadiumCapacity: number;
  isHome: boolean;
  competition: string;
}

export interface MatchManagerState {
  phase: MatchPhase;
  snapshot: SimulationSnapshot;
  config: MatchConfig;
  stats: MatchStats;
  matchDbId: string | null;
  lockedResult: LockedResult | null;
}

export type MatchPhase = 'loading' | 'pre_match' | 'first_half' | 'halftime' | 'second_half' | 'finished' | 'error';

export class MatchManager {
  readonly stateController = new MatchStateController();
  readonly engine = new SimulationEngine();
  readonly resultLocker = new MatchResultLocker();

  private _config: MatchConfig = { homeTeam: '', awayTeam: '', stadiumName: '', stadiumCapacity: 0, isHome: true, competition: '' };
  private _stats: MatchStats = { ...EMPTY_STATS };
  private _matchDbId: string | null = null;
  private _tickInterval: number | null = null;
  private _onUpdate: ((state: MatchManagerState) => void) | null = null;

  get config(): MatchConfig { return this._config; }
  get matchDbId(): string | null { return this._matchDbId; }

  /**
   * Set callback for state updates (used by React hook)
   */
  setUpdateCallback(fn: (state: MatchManagerState) => void): void {
    this._onUpdate = fn;
  }

  /**
   * Initialize from an existing live match in DB (reconnect scenario)
   */
  async loadFromDb(matchDbId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('live_matches')
        .select('*')
        .eq('id', matchDbId)
        .maybeSingle();

      if (error || !data) {
        console.error('[MatchManager] Failed to load match:', error?.message);
        return false;
      }

      this._matchDbId = data.id;
      this._config = {
        homeTeam: data.home_team,
        awayTeam: data.away_team,
        stadiumName: data.stadium_name,
        stadiumCapacity: data.stadium_capacity,
        isHome: data.is_home,
        competition: data.competition || 'Amistoso',
      };
      this._stats = (data.stats as any) || { ...EMPTY_STATS };

      this.engine.load(
        (data.events as any) || [],
        data.home_goals,
        data.away_goals,
        data.started_at,
        data.duration_seconds,
      );

      if (data.status === 'finished') {
        // Already finished — go directly to FINISHED state
        this.stateController.start();
        this.stateController.finish();
        this.resultLocker.lock(data.home_goals, data.away_goals, data.id);
        this._emitUpdate();
        return true;
      }

      // Match is live — start ticking
      this.stateController.start();
      this._startTick();
      return true;
    } catch (err) {
      console.error('[MatchManager] Load exception:', err);
      return false;
    }
  }

  /**
   * Start a new match via the server Edge Function
   */
  async startNewMatch(params: {
    homeTeam: string; awayTeam: string; homePlayers: any[];
    homeStrength: number; awayStrength: number; matchId: string;
    tactics: any; stadiumName: string; stadiumCapacity: number;
    isHome: boolean; competition?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const resp = await supabase.functions.invoke('start-match', { body: params });

      if (resp.error) {
        return { success: false, error: 'Erro ao iniciar partida no servidor.' };
      }

      const result = resp.data;
      if (!result.success) {
        if (result.matchDbId) {
          // Match already exists — load it
          await this.loadFromDb(result.matchDbId);
          return { success: true };
        }
        return { success: false, error: result.error || 'Erro ao iniciar partida.' };
      }

      // Load the newly created match
      await this.loadFromDb(result.matchDbId);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Erro inesperado.' };
    }
  }

  /**
   * Check for any active match in DB and load it
   */
  async findActiveMatch(): Promise<boolean> {
    const { data } = await supabase
      .from('live_matches')
      .select('id')
      .eq('status', 'live')
      .maybeSingle();

    if (data) {
      return this.loadFromDb(data.id);
    }
    return false;
  }

  /**
   * Start the tick loop that reveals events based on elapsed time
   */
  private _startTick(): void {
    if (this._tickInterval) return;

    const tick = () => {
      if (this.stateController.isFinished) return;

      const snapshot = this.engine.getSnapshot();

      if (snapshot.isComplete && !this.resultLocker.isLocked) {
        // Time's up — lock and finish
        const finalSnap = this.engine.getFinalSnapshot();
        const locked = this.resultLocker.lock(
          finalSnap.homeGoals, finalSnap.awayGoals, this._matchDbId!
        );
        if (locked) {
          this.stateController.finish();
          this.resultLocker.persist(this.engine.maxGameMinute);
          this._stopTick();
        }
      }

      this._emitUpdate();
    };

    tick();
    this._tickInterval = window.setInterval(tick, 1000);
  }

  private _stopTick(): void {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
  }

  /**
   * Get the current full state
   */
  getState(): MatchManagerState {
    const snapshot = this.stateController.isFinished
      ? this.engine.getFinalSnapshot()
      : this.engine.getSnapshot();

    const phase = this._computePhase(snapshot);

    return {
      phase,
      snapshot,
      config: this._config,
      stats: this._stats,
      matchDbId: this._matchDbId,
      lockedResult: this.resultLocker.result,
    };
  }

  private _computePhase(snapshot: SimulationSnapshot): MatchPhase {
    if (this.stateController.isFinished) return 'finished';
    if (this.stateController.isPre) return 'pre_match';
    if (snapshot.currentMinute <= 45) return 'first_half';
    if (snapshot.currentMinute <= 50) return 'halftime';
    return 'second_half';
  }

  private _emitUpdate(): void {
    if (this._onUpdate) {
      this._onUpdate(this.getState());
    }
  }

  /**
   * Cleanup — call when unmounting
   */
  destroy(): void {
    this._stopTick();
    this._onUpdate = null;
  }

  /**
   * Full reset for new match
   */
  reset(): void {
    this._stopTick();
    this.stateController.reset();
    this.engine.reset();
    this.resultLocker.reset();
    this._config = { homeTeam: '', awayTeam: '', stadiumName: '', stadiumCapacity: 0, isHome: true, competition: '' };
    this._stats = { ...EMPTY_STATS };
    this._matchDbId = null;
  }
}

// Singleton for app-wide access
let _instance: MatchManager | null = null;
export function getMatchManager(): MatchManager {
  if (!_instance) _instance = new MatchManager();
  return _instance;
}
