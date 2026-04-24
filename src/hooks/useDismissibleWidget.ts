/**
 * useDismissibleWidget — sistema centralizado para widgets/notificações persistentes.
 *
 * Cada widget tem um `id` único (ex: "season_awards_3", "season_start_2026").
 * Estado persistido em localStorage por usuário:
 *   { status: 'active' | 'dismissed' | 'expired', createdAt, dismissedAt?, expiresAt? }
 *
 * Garantias:
 *   • Se `status === 'dismissed'` → nunca mais reaparece, mesmo após F5.
 *   • Se `expiresAt` < agora → vira 'expired' automaticamente e some.
 *   • Anti-duplicação: registrar duas vezes o mesmo `id` é no-op.
 *   • Sincroniza entre abas via storage event.
 */
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'flm26_widget_state_v1';

export type WidgetStatus = 'active' | 'dismissed' | 'expired';

export interface WidgetRecord {
  id: string;
  type?: string;
  status: WidgetStatus;
  createdAt: number;
  dismissedAt?: number;
  expiresAt?: number;
}

type Store = Record<string, WidgetRecord>;

// ──────────────────────── storage helpers ────────────────────────
function scopedKey(userId: string | undefined | null): string {
  return `${STORAGE_KEY}::${userId || 'anon'}`;
}

function readStore(userId: string | undefined | null): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(scopedKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(userId: string | undefined | null, store: Store): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(scopedKey(userId), JSON.stringify(store));
  } catch { /* quota / unavailable — ignore */ }
}

function applyExpiration(rec: WidgetRecord): WidgetRecord {
  if (rec.status === 'active' && rec.expiresAt && Date.now() > rec.expiresAt) {
    return { ...rec, status: 'expired' };
  }
  return rec;
}

// ──────────────────────── public API ────────────────────────
export interface RegisterOptions {
  type?: string;
  /** Time-to-live in ms from createdAt. Optional. */
  ttlMs?: number;
  /** Absolute expiration timestamp (ms). Wins over ttlMs if both set. */
  expiresAt?: number;
}

/**
 * Hook para um único widget. Retorna { isVisible, dismiss, reset }.
 * Garante anti-duplicação: chamadas repetidas com o mesmo `id` reusam o registro.
 *
 * @param id   identificador único e estável do widget (ex: `season_awards_${season}`)
 * @param userId  usuário atual — escopa o estado por conta
 * @param opts.ttlMs  expiração relativa (ms desde a criação)
 * @param opts.expiresAt  expiração absoluta (timestamp ms)
 * @param opts.type   rótulo do tipo (ex: 'season_end', 'bola_de_ouro')
 * @param enabled  se false, hook não registra nem mostra (útil para condições)
 */
export function useDismissibleWidget(
  id: string | null | undefined,
  userId: string | undefined | null,
  opts: RegisterOptions = {},
  enabled: boolean = true,
) {
  const [record, setRecord] = useState<WidgetRecord | null>(() => {
    if (!enabled || !id) return null;
    const store = readStore(userId);
    const existing = store[id];
    if (existing) return applyExpiration(existing);
    return null;
  });

  // Register on mount (anti-duplicate: only creates if absent).
  useEffect(() => {
    if (!enabled || !id) return;
    const store = readStore(userId);
    let rec = store[id];
    if (!rec) {
      const expiresAt =
        opts.expiresAt ??
        (opts.ttlMs ? Date.now() + opts.ttlMs : undefined);
      rec = {
        id,
        type: opts.type,
        status: 'active',
        createdAt: Date.now(),
        expiresAt,
      };
      store[id] = rec;
      writeStore(userId, store);
    }
    rec = applyExpiration(rec);
    if (rec.status === 'expired' && store[id].status !== 'expired') {
      store[id] = rec;
      writeStore(userId, store);
    }
    setRecord(rec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId, enabled]);

  // Auto-expire timer.
  useEffect(() => {
    if (!record || record.status !== 'active' || !record.expiresAt) return;
    const remaining = record.expiresAt - Date.now();
    if (remaining <= 0) {
      setRecord(r => (r ? { ...r, status: 'expired' } : r));
      return;
    }
    const t = setTimeout(() => {
      setRecord(r => (r ? { ...r, status: 'expired' } : r));
      const store = readStore(userId);
      if (store[record.id]) {
        store[record.id] = { ...store[record.id], status: 'expired' };
        writeStore(userId, store);
      }
    }, remaining + 50);
    return () => clearTimeout(t);
  }, [record, userId]);

  // Cross-tab sync.
  useEffect(() => {
    if (!id) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== scopedKey(userId)) return;
      const store = readStore(userId);
      const next = store[id];
      if (next) setRecord(applyExpiration(next));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [id, userId]);

  const dismiss = useCallback(() => {
    if (!id) return;
    const store = readStore(userId);
    const prev = store[id] || {
      id,
      type: opts.type,
      status: 'active' as WidgetStatus,
      createdAt: Date.now(),
    };
    const next: WidgetRecord = {
      ...prev,
      status: 'dismissed',
      dismissedAt: Date.now(),
    };
    store[id] = next;
    writeStore(userId, store);
    setRecord(next);
  }, [id, userId, opts.type]);

  /** DEV/admin reset — limpa estado e permite reaparecer. */
  const reset = useCallback(() => {
    if (!id) return;
    const store = readStore(userId);
    delete store[id];
    writeStore(userId, store);
    setRecord(null);
  }, [id, userId]);

  const isVisible =
    enabled && !!id && (!record || record.status === 'active');

  return { isVisible, status: record?.status ?? 'active', dismiss, reset, record };
}

// ──────────────────────── utilitários standalone ────────────────────────
/** Marca um widget como dispensado fora de um componente React. */
export function dismissWidget(id: string, userId?: string | null): void {
  const store = readStore(userId);
  store[id] = {
    ...(store[id] || { id, status: 'active', createdAt: Date.now() }),
    status: 'dismissed',
    dismissedAt: Date.now(),
  };
  writeStore(userId, store);
}

/** Verifica se um widget já foi dispensado (sincrono). */
export function isWidgetDismissed(id: string, userId?: string | null): boolean {
  const store = readStore(userId);
  const rec = store[id];
  if (!rec) return false;
  const applied = applyExpiration(rec);
  return applied.status === 'dismissed' || applied.status === 'expired';
}

/** Limpa registros expirados do storage (housekeeping opcional). */
export function pruneExpiredWidgets(userId?: string | null): void {
  const store = readStore(userId);
  let changed = false;
  for (const k of Object.keys(store)) {
    const rec = applyExpiration(store[k]);
    if (rec.status === 'expired' && rec !== store[k]) {
      store[k] = rec;
      changed = true;
    }
  }
  if (changed) writeStore(userId, store);
}
