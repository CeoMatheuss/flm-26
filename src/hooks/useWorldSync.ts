import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * World Sync Engine
 * 
 * Este sistema é a "Source of Truth" para o estado global do jogo.
 * Ele gerencia:
 * 1. Fila de eventos (idempotência)
 * 2. Checksums de integridade (anti-dessincronização)
 * 3. Locks atômicos para operações críticas
 */

export interface SyncState {
  current_round: number;
  squad_checksum: string;
  standings_checksum: string;
  sync_version: number;
  is_locked: boolean;
}

export class WorldSyncEngine {
  private static instance: WorldSyncEngine;
  private userId: string | null = null;
  private syncInterval: any = null;

  private constructor() {}

  static getInstance(): WorldSyncEngine {
    if (!WorldSyncEngine.instance) {
      WorldSyncEngine.instance = new WorldSyncEngine();
    }
    return WorldSyncEngine.instance;
  }

  setUserId(userId: string) {
    this.userId = userId;
    this.startWatchdog();
  }

  /**
   * Envia um evento para a fila global com validação de hash (idempotência)
   */
  async pushEvent(type: string, payload: any, matchId?: string, round?: number) {
    if (!this.userId) return false;

    // Gerar hash determinístico do evento para evitar duplicação
    const eventHash = btoa(JSON.stringify({ type, payload, userId: this.userId, timestamp: Math.floor(Date.now() / 10000) }));

    try {
      const { data, error } = await supabase.rpc('push_world_sync_event', {
        _event_type: type,
        _payload: payload,
        _event_hash: eventHash,
        _match_id: matchId,
        _round: round
      });

      if (error) throw error;
      return data as boolean;
    } catch (err) {
      console.error('[WorldSyncEngine] Erro ao empurrar evento:', err);
      return false;
    }
  }

  /**
   * Valida a integridade local contra o servidor
   */
  async validateIntegrity() {
    if (!this.userId) return true;

    try {
      // 1. Obter checksums do servidor (Source of Truth)
      const { data: serverChecksums, error } = await supabase.rpc('get_world_integrity_checksums', {
        _user_id: this.userId
      });

      if (error) throw error;

      // 2. Comparar com estado local (SyncState)
      const { data: syncState } = await supabase
        .from('world_sync_state')
        .select('squad_checksum, standings_checksum, current_round')
        .eq('user_id', this.userId)
        .single();

      if (!syncState) return true;

      const isDivergent = 
        serverChecksums.squad_checksum !== syncState.squad_checksum ||
        serverChecksums.standings_checksum !== syncState.standings_checksum;

      if (isDivergent) {
        console.warn('[WorldSyncEngine] Dessincronização detectada! Forçando resync...');
        window.dispatchEvent(new CustomEvent('flm:force-resync'));
        return false;
      }

      return true;
    } catch (err) {
      console.error('[WorldSyncEngine] Falha na validação de integridade:', err);
      return true;
    }
  }

  /**
   * Watchdog global que monitora travamentos e inconsistências
   */
  private startWatchdog() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    
    this.syncInterval = setInterval(() => {
      this.validateIntegrity();
    }, 60000); // Check a cada minuto
  }

  /**
   * Adquire lock para operação crítica (ex: avançar rodada)
   */
  async acquireLock(): Promise<boolean> {
    if (!this.userId) return false;
    
    const { data, error } = await supabase
      .from('world_sync_state')
      .update({ is_locked: true, locked_at: new Date().toISOString() })
      .eq('user_id', this.userId)
      .eq('is_locked', false)
      .select();

    return !error && data && data.length > 0;
  }

  async releaseLock() {
    if (!this.userId) return;
    await supabase
      .from('world_sync_state')
      .update({ is_locked: false })
      .eq('user_id', this.userId);
  }
}

export const syncEngine = WorldSyncEngine.getInstance();
