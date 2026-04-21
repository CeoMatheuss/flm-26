/**
 * TrainingTypes — Tipos centrais do sistema de treinos FLM 26
 * Isolado de partidas, sem conflito com MatchManager.
 */

import type { Player, PlayerAttributes } from '@/types/game';
import type { TacticsConfig } from '@/types/tactics';

// ─── Intensidade ───────────────────────────────────────────────────────────
export type TrainingIntensity = 'leve' | 'moderado' | 'pesado';

export const intensityConfig: Record<TrainingIntensity, {
  label: string;
  emoji: string;
  progressMultiplier: number; // velocidade de preenchimento da barra
  injuryRiskMultiplier: number; // multiplica risco base de lesão
  fatiguePerSession: number;   // stamina perdida por sessão
  moraleDelta: number;         // impacto no moral
}> = {
  leve:     { label: 'Leve',     emoji: '🟢', progressMultiplier: 0.6, injuryRiskMultiplier: 0.3, fatiguePerSession: 3,  moraleDelta: 1  },
  moderado: { label: 'Moderado', emoji: '🟡', progressMultiplier: 1.0, injuryRiskMultiplier: 1.0, fatiguePerSession: 7,  moraleDelta: 0  },
  pesado:   { label: 'Pesado',   emoji: '🔴', progressMultiplier: 1.5, injuryRiskMultiplier: 2.5, fatiguePerSession: 14, moraleDelta: -2 },
};

// ─── Foco de Treino V3 (Grupos + Específicos) ─────────────────────────────
export type TrainingGroupKey =
  | 'finalizacao_grupo' | 'tecnico_grupo' | 'defensivo_grupo' | 'fisico_grupo' | 'mental_grupo';

export type TrainingSpecificKey =
  | 'speed' | 'shooting' | 'passing' | 'defending' | 'physical'
  | 'dribbling' | 'positioning' | 'heading' | 'vision' | 'composure'
  | 'marking' | 'crossing' | 'longShots' | 'workRate' | 'aggression' | 'setPieces';

export type TrainingFocusKey = 'none' | TrainingGroupKey | TrainingSpecificKey;

export const focusLabels: Record<TrainingFocusKey, string> = {
  none: 'Sem foco',
  // Grupos
  finalizacao_grupo: '🎯 Finalização (Grupo)',
  tecnico_grupo: '🎨 Técnico (Grupo)',
  defensivo_grupo: '🛡️ Defensivo (Grupo)',
  fisico_grupo: '💪 Físico (Grupo)',
  mental_grupo: '🧠 Mental (Grupo)',
  // Específicos
  speed: '⚡ Velocidade',
  shooting: '🎯 Finalização',
  passing: '📐 Passe',
  defending: '🛡️ Defesa',
  physical: '💪 Físico',
  dribbling: '🏃 Drible',
  positioning: '📍 Posicionamento',
  heading: '🤕 Cabeceio',
  vision: '👁️ Visão de Jogo',
  composure: '🧠 Compostura',
  marking: '🔒 Marcação',
  crossing: '↗️ Cruzamento',
  longShots: '🚀 Chute de Longe',
  workRate: '🔥 Intensidade',
  aggression: '⚔️ Agressividade',
  setPieces: '🎯 Bola Parada',
};

/** Mapeia foco específico → atributo */
export const focusToAttr: Record<TrainingFocusKey, keyof PlayerAttributes | null> = {
  none: null,
  finalizacao_grupo: null, tecnico_grupo: null, defensivo_grupo: null,
  fisico_grupo: null, mental_grupo: null,
  speed: 'speed', shooting: 'shooting', passing: 'passing', defending: 'defending',
  physical: 'physical', dribbling: 'dribbling', positioning: 'positioning',
  heading: 'heading', vision: 'vision', composure: 'composure', marking: 'marking',
  crossing: 'crossing', longShots: 'longShots', workRate: 'workRate',
  aggression: 'aggression', setPieces: 'setPieces',
};

/** Distribuição de pesos por grupo (alto/medio/baixo). Soma = 1.0 */
export const groupWeights: Record<TrainingGroupKey, Array<{ attr: keyof PlayerAttributes; weight: number }>> = {
  finalizacao_grupo: [
    { attr: 'shooting', weight: 0.6 },
    { attr: 'longShots', weight: 0.3 },
    { attr: 'heading', weight: 0.1 },
  ],
  tecnico_grupo: [
    { attr: 'passing', weight: 0.4 },
    { attr: 'dribbling', weight: 0.3 },
    { attr: 'crossing', weight: 0.2 },
    { attr: 'setPieces', weight: 0.1 },
  ],
  defensivo_grupo: [
    { attr: 'marking', weight: 0.4 },
    { attr: 'defending', weight: 0.4 },
    { attr: 'positioning', weight: 0.2 },
  ],
  fisico_grupo: [
    { attr: 'speed', weight: 0.4 },
    { attr: 'physical', weight: 0.4 },
    { attr: 'workRate', weight: 0.2 },
  ],
  mental_grupo: [
    { attr: 'vision', weight: 0.35 },
    { attr: 'composure', weight: 0.35 },
    { attr: 'positioning', weight: 0.2 },
    { attr: 'aggression', weight: 0.1 },
  ],
};

export function isGroupFocus(focus: TrainingFocusKey): focus is TrainingGroupKey {
  return focus in groupWeights;
}

// ─── Recomendações táticas por posição ────────────────────────────────────
export const positionRecommendations: Record<string, TrainingFocusKey[]> = {
  GOL: ['defending', 'positioning', 'composure', 'physical'],
  ZAG: ['defensivo_grupo', 'heading', 'physical'],
  LAT: ['fisico_grupo', 'crossing', 'passing'],
  VOL: ['defensivo_grupo', 'fisico_grupo', 'passing'],
  MEI: ['tecnico_grupo', 'mental_grupo', 'longShots'],
  ATA: ['finalizacao_grupo', 'fisico_grupo', 'dribbling'],
};

// Mapeamento tático → foco sugerido
export const tacticsToFocus: Partial<Record<string, TrainingFocusKey>> = {
  ofensivo: 'finalizacao_grupo',
  defensivo: 'defensivo_grupo',
  'contra-ataque': 'fisico_grupo',
  posse: 'tecnico_grupo',
  equilibrado: 'mental_grupo',
};

// ─── Sessão de treino ──────────────────────────────────────────────────────
export interface TrainingSession {
  playerId: string;
  focus: TrainingFocusKey;
  intensity: TrainingIntensity;
  week: number; // semana da temporada
}

// ─── Log de evolução ──────────────────────────────────────────────────────
export interface DevelopmentLog {
  playerId: string;
  playerName: string;
  attribute: keyof PlayerAttributes;
  oldValue: number;
  newValue: number;
  week: number;
  source: 'training' | 'match' | 'event';
}

// ─── Evento dinâmico de treino ─────────────────────────────────────────────
export interface TrainingEvent {
  id: string;
  type: 'breakthrough' | 'injury_scare' | 'dedication' | 'fatigue' | 'team_chemistry' | 'staff_bonus';
  title: string;
  description: string;
  icon: string;
  playerId?: string;
  impact: string; // ex: "attribute:speed:+1" | "stamina:-5" | "morale_all:+3"
}

// ─── Estado semanal de treino ──────────────────────────────────────────────
export interface WeeklyTrainingResult {
  week: number;
  sessions: TrainingSession[];
  developmentLogs: DevelopmentLog[];
  events: TrainingEvent[];
  fatigueApplied: Record<string, number>; // playerId → stamina perdida
  injuryRisks: Record<string, number>;    // playerId → risco (0-100)
}

// ─── Config de treino por jogador ──────────────────────────────────────────
export interface PlayerTrainingConfig {
  focus: TrainingFocusKey;
  intensity: TrainingIntensity;
}
