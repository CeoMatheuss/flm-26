/**
 * Registry de migrations do FLM 26.
 *
 * Cada migration tem:
 *  - from / to: versões (semver simples X.Y.Z)
 *  - description: explicação curta para logs/painel
 *  - apply(state): recebe o GameState atual e devolve o novo + lista de mudanças aplicadas
 *
 * As migrations rodam em sequência: se um usuário está em 1.0.0 e o jogo
 * está em 1.5.0, o sistema executa 1.0.0→1.1.0, 1.1.0→1.2.0, etc.
 *
 * IMPORTANTE: nunca alterar uma migration já lançada — apenas adicionar novas.
 */

import { GameState } from '@/hooks/useGame';

export interface MigrationChange {
  field: string;
  before: any;
  after: any;
  reason: string;
}

export interface MigrationResult {
  state: GameState;
  changes: MigrationChange[];
}

export interface Migration {
  from: string;
  to: string;
  description: string;
  apply: (state: GameState) => MigrationResult;
}

/** Migration de exemplo: 1.0.0 → 1.5.0 (consolidada) */
const m_1_0_to_1_5: Migration = {
  from: '1.0.0',
  to: '1.5.0',
  description: 'Atualização inicial: piso de torcida 1000, normalização de orçamento e estádio.',
  apply: (state) => {
    const changes: MigrationChange[] = [];
    const next: any = JSON.parse(JSON.stringify(state || {}));

    // 1. Piso de torcida em 1000
    if (next.club && (next.club.fans ?? 0) < 1000) {
      changes.push({
        field: 'club.fans',
        before: next.club.fans,
        after: 1000,
        reason: 'Aplicado piso mínimo de torcida (1000).',
      });
      next.club.fans = 1000;
    }

    // 2. Normaliza orçamento negativo extremo (corrige exploit antigo)
    if (typeof next.club?.budget === 'number' && next.club.budget < -100_000_000) {
      changes.push({
        field: 'club.budget',
        before: next.club.budget,
        after: -100_000_000,
        reason: 'Saldo negativo extremo limitado a -R$100M.',
      });
      next.club.budget = -100_000_000;
    }

    // 3. Garante estrutura mínima do estádio
    if (next.infrastructure?.stadium && next.infrastructure.stadium.maxLevel < 15) {
      changes.push({
        field: 'infrastructure.stadium.maxLevel',
        before: next.infrastructure.stadium.maxLevel,
        after: 15,
        reason: 'Atualizado limite máximo do estádio para nível 15.',
      });
      next.infrastructure.stadium.maxLevel = 15;
    }

    return { state: next as GameState, changes };
  },
};

/** Lista ordenada de migrations disponíveis. Adicionar novas no fim. */
export const MIGRATIONS: Migration[] = [
  m_1_0_to_1_5,
];

/** Compara duas versões semver simples. -1 se a < b, 0 se igual, 1 se a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

/** Devolve apenas migrations necessárias para ir de `from` até `to`. */
export function pendingMigrations(from: string, to: string): Migration[] {
  if (compareVersions(from, to) >= 0) return [];
  return MIGRATIONS.filter(
    (m) => compareVersions(m.from, from) >= 0 && compareVersions(m.to, to) <= 0,
  );
}
