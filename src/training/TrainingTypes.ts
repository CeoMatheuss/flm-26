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

// ─── Foco de Treino ────────────────────────────────────────────────────────
export type TrainingFocusKey =
  | 'none' | 'speed' | 'shooting' | 'passing' | 'defending' | 'physical'
  | 'dribbling' | 'positioning' | 'heading' | 'vision' | 'composure'
  | 'marking' | 'crossing' | 'longShots' | 'workRate' | 'aggression' | 'setPieces';

export const focusLabels: Record<TrainingFocusKey, string> = {
  none: 'Sem foco',
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

export const focusToAttr: Record<TrainingFocusKey, keyof PlayerAttributes | null> = {
  none: null,
  speed: 'speed', shooting: 'shooting', passing: 'passing', defending: 'defending',
  physical: 'physical', dribbling: 'dribbling', positioning: 'positioning',
  heading: 'heading', vision: 'vision', composure: 'composure', marking: 'marking',
  crossing: 'crossing', longShots: 'longShots', workRate: 'workRate',
  aggression: 'aggression', setPieces: 'setPieces',
};

// ─── Recomendações táticas por posição ────────────────────────────────────
export const positionRecommendations: Record<string, TrainingFocusKey[]> = {
  GOL: ['defending', 'positioning', 'composure', 'physical'],
  ZAG: ['defending', 'marking', 'heading', 'physical', 'aggression'],
  LAT: ['speed', 'crossing', 'passing', 'workRate'],
  VOL: ['defending', 'marking', 'passing', 'workRate', 'aggression'],
  MEI: ['passing', 'vision', 'dribbling', 'composure', 'longShots'],
  ATA: ['shooting', 'speed', 'dribbling', 'positioning', 'heading'],
};

// Mapeamento tático → foco sugerido
export const tacticsToFocus: Partial<Record<string, TrainingFocusKey>> = {
  ofensivo: 'shooting',
  defensivo: 'defending',
  'contra-ataque': 'speed',
  posse: 'passing',
  equilibrado: 'physical',
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
