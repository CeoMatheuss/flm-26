import { useEffect, useRef } from 'react';
import { Player, PlayerAttributes } from '@/types/game';

const STORAGE_KEY = 'flm:attr-evolution:v1';

export type AttrDelta = Partial<Record<keyof PlayerAttributes | 'overall', number>>;

interface SnapshotEntry {
  overall: number;
  attrs: Partial<PlayerAttributes>;
  ts: number;
}

type SnapshotMap = Record<string, SnapshotEntry>;

function readSnapshot(): SnapshotMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSnapshot(map: SnapshotMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Returns a record { [playerId]: { attrName: delta } } comparing current vs the
 * last persisted snapshot. After computing deltas, snapshot is updated only for
 * players whose values actually changed (so deltas don't disappear on re-render).
 */
export function useAttributeEvolution(players: Player[]): Record<string, AttrDelta> {
  const deltasRef = useRef<Record<string, AttrDelta>>({});
  const snapRef = useRef<SnapshotMap>(readSnapshot());

  // Compute synchronously so the first render already has data.
  const deltas: Record<string, AttrDelta> = {};
  const snap = snapRef.current;

  for (const p of players) {
    const prev = snap[p.id];
    const delta: AttrDelta = {};
    if (prev) {
      if (prev.overall !== p.overall) delta.overall = p.overall - prev.overall;
      for (const k of Object.keys(p.attributes) as (keyof PlayerAttributes)[]) {
        const cur = (p.attributes as any)[k];
        const old = (prev.attrs as any)[k];
        if (typeof cur === 'number' && typeof old === 'number' && cur !== old) {
          delta[k] = cur - old;
        }
      }
    }
    // Merge with existing transient deltas so visible arrows persist between renders
    const existing = deltasRef.current[p.id] || {};
    deltas[p.id] = { ...existing, ...delta };
  }

  deltasRef.current = deltas;

  // Persist snapshot once per change
  useEffect(() => {
    const updated: SnapshotMap = { ...snap };
    let changed = false;
    for (const p of players) {
      const prev = updated[p.id];
      if (!prev || prev.overall !== p.overall || JSON.stringify(prev.attrs) !== JSON.stringify(p.attributes)) {
        updated[p.id] = { overall: p.overall, attrs: { ...p.attributes }, ts: Date.now() };
        changed = true;
      }
    }
    if (changed) {
      snapRef.current = updated;
      writeSnapshot(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  return deltas;
}

/** Reason text shown in tooltips when an attribute changed. */
export function evolutionReason(player: Player, attr: string, delta: number): string {
  if (delta > 0) {
    if (player.injury) return 'Recuperando-se de lesão; ainda assim evoluiu no treino.';
    if ((player.morale ?? 0) >= 70) return 'Moral alta + treinos consistentes impulsionaram este atributo.';
    if (player.age <= 23) return 'Jovem em fase de crescimento — desenvolvimento natural.';
    return 'Treinos focados deram resultado neste atributo.';
  }
  if (delta < 0) {
    if (player.injury) return 'Lesão recente afetou a performance neste atributo.';
    if (player.age >= 32) return 'Idade avançada começa a impactar este atributo.';
    if ((player.stamina ?? 100) < 40) return 'Fadiga acumulada reduziu o desempenho.';
    return 'Falta de minutos em campo causou regressão.';
  }
  return 'Estável — sem mudanças no último ciclo.';
}
