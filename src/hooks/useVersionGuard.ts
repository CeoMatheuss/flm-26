import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GAME_VERSION } from '@/components/game/UpdateAnnouncementModal';
import { GameState } from '@/hooks/useGame';
import { MIGRATIONS, MigrationChange, compareVersions, pendingMigrations } from '@/migrations/registry';

export type VersionStatus = 'checking' | 'ready' | 'migrating' | 'failed' | 'observation';

export interface VersionState {
  status: VersionStatus;
  userVersion: string;
  gameVersion: string;
  progressLabel: string;
  error?: string;
}

/**
 * Garante que a versão dos dados do usuário esteja em sincronia com GAME_VERSION.
 *
 * Fluxo:
 *  1. Lê / cria registro em user_versions.
 *  2. Se data_version < GAME_VERSION:
 *       - Faz backup do save em user_versions.last_backup
 *       - Roda migrations em sequência aplicando ao GameState
 *       - Persiste no game_saves
 *       - Em caso de erro: marca migration_status='failed' e oferece rollback
 *  3. Após sucesso → status 'observation' por 1h, depois 'ready'.
 */
export function useVersionGuard(userId: string | null, currentSave: GameState | null) {
  const [state, setState] = useState<VersionState>({
    status: 'checking',
    userVersion: '0.0.0',
    gameVersion: GAME_VERSION,
    progressLabel: 'Verificando versão...',
  });

  const runMigrations = useCallback(async (uid: string, fromVersion: string, save: GameState) => {
    const pending = pendingMigrations(fromVersion, GAME_VERSION);
    if (pending.length === 0) return { ok: true, applied: 0 };

    const start = Date.now();
    setState((s) => ({ ...s, status: 'migrating', progressLabel: `Atualizando dados (${pending.length} etapa${pending.length > 1 ? 's' : ''})...` }));

    // Backup
    await supabase.from('user_versions').update({
      last_backup: save as any,
      last_backup_at: new Date().toISOString(),
      migration_status: 'migrating',
    }).eq('user_id', uid);

    let workingState: GameState = save;
    let allChanges: MigrationChange[] = [];

    for (const mig of pending) {
      try {
        setState((s) => ({ ...s, progressLabel: `Aplicando ${mig.from} → ${mig.to}: ${mig.description}` }));
        const result = mig.apply(workingState);
        workingState = result.state;
        allChanges = allChanges.concat(result.changes);

        await supabase.from('migration_logs').insert({
          user_id: uid,
          from_version: mig.from,
          to_version: mig.to,
          status: 'success',
          changes: result.changes as any,
          duration_ms: Date.now() - start,
        });
      } catch (err: any) {
        // Rollback automático
        await supabase.from('migration_logs').insert({
          user_id: uid,
          from_version: mig.from,
          to_version: mig.to,
          status: 'failed',
          changes: allChanges as any,
          error_message: err?.message || 'unknown',
          duration_ms: Date.now() - start,
        });
        await supabase.from('user_versions').update({
          migration_status: 'failed',
          failed_attempts: 1,
        }).eq('user_id', uid);

        // Restaura backup no save
        await supabase.from('game_saves').update({ club_data: save as any }).eq('user_id', uid);
        setState((s) => ({ ...s, status: 'failed', error: err?.message || 'Falha na atualização' }));
        return { ok: false, applied: 0 };
      }
    }

    // Persiste estado migrado (a página será recarregada para aplicar no GameState)
    await supabase.from('game_saves').update({ club_data: workingState as any }).eq('user_id', uid);

    const observationUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from('user_versions').update({
      data_version: GAME_VERSION,
      game_version: GAME_VERSION,
      migration_status: 'observation',
      observation_until: observationUntil,
      last_migration_at: new Date().toISOString(),
    }).eq('user_id', uid);

    setState((s) => ({ ...s, status: 'observation', userVersion: GAME_VERSION, progressLabel: 'Atualização concluída!' }));
    return { ok: true, applied: pending.length };
  }, []);

  useEffect(() => {
    if (!userId || !currentSave) return;
    let cancelled = false;

    (async () => {
      // Garante registro
      await supabase.rpc('ensure_user_version', { _user_id: userId, _current_version: GAME_VERSION } as any);
      const { data } = await supabase.from('user_versions').select('*').eq('user_id', userId).maybeSingle();
      if (cancelled || !data) return;

      const dataVersion = (data as any).data_version || '1.0.0';
      const cmp = compareVersions(dataVersion, GAME_VERSION);

      if (cmp < 0) {
        await runMigrations(userId, dataVersion, currentSave);
      } else {
        // Verifica se está em observação
        const obsUntil = (data as any).observation_until;
        if (obsUntil && new Date(obsUntil).getTime() > Date.now()) {
          setState({ status: 'observation', userVersion: dataVersion, gameVersion: GAME_VERSION, progressLabel: 'Em modo observação' });
          // Limpa observação após o tempo
          setTimeout(async () => {
            await supabase.from('user_versions').update({ migration_status: 'idle', observation_until: null }).eq('user_id', userId);
            setState((s) => ({ ...s, status: 'ready' }));
          }, Math.max(1000, new Date(obsUntil).getTime() - Date.now()));
        } else {
          setState({ status: 'ready', userVersion: dataVersion, gameVersion: GAME_VERSION, progressLabel: 'Tudo certo' });
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, !!currentSave]);

  // Função pública para retry / rollback manual via painel
  const rollback = useCallback(async () => {
    if (!userId) return false;
    const { data } = await supabase.from('user_versions').select('last_backup').eq('user_id', userId).maybeSingle();
    if (!data?.last_backup) return false;
    await supabase.from('game_saves').update({ club_data: data.last_backup as any }).eq('user_id', userId);
    await supabase.from('user_versions').update({ migration_status: 'idle' }).eq('user_id', userId);
    setState((s) => ({ ...s, status: 'ready', error: undefined }));
    return true;
  }, [userId]);

  return { ...state, isBlocked: state.status === 'migrating' || state.status === 'failed', rollback };
}
