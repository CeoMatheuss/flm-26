/**
 * TrainingMatchCanvas — 2D tactical training with drill-specific visuals.
 * 
 * PENALTIES: kick-by-kick (10), ball goes to correct goal area, GK dives.
 * FREE KICKS: kick-by-kick (8), ball curves over wall toward goal.
 * CROSSING: timed, crosser sends ball into box, attackers head it.
 * COUNTER: timed, fast transitions.
 * PRESSING: timed, high press.
 * TACTICAL: timed, full 11v11.
 * 
 * Goal chances are influenced by player attributes (shooting, setPieces, etc.)
 */

import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RotateCcw, Dumbbell } from 'lucide-react';
import type { Player } from '@/types/game';

interface TrainingMatchCanvasProps {
  clubName: string;
  players?: Player[];
  onFinish?: (report: TrainingReport) => void;
}

export interface TrainingReport {
  duration: number;
  drillsCompleted: number;
  goalsScored: number;
  bestMoment: string;
  drill?: string;
}

const DRILL_OPTIONS = [
  { id: 'tactical', name: 'Coletivo Tático', icon: '⚽', desc: 'Jogo completo 11x11', duration: 120, kickBased: false, totalKicks: 0 },
  { id: 'penalties', name: 'Pênaltis', icon: '🥅', desc: '10 cobranças alternadas', duration: 0, kickBased: true, totalKicks: 10 },
  { id: 'freekicks', name: 'Faltas', icon: '🎯', desc: '8 cobranças de falta', duration: 0, kickBased: true, totalKicks: 8 },
  { id: 'crossing', name: 'Cruzamentos', icon: '↗️', desc: 'Cruzamentos e cabeceios', duration: 90, kickBased: false, totalKicks: 0 },
  { id: 'counterattack', name: 'Contra-Ataque', icon: '⚡', desc: 'Transição rápida', duration: 100, kickBased: false, totalKicks: 0 },
  { id: 'pressing', name: 'Marcação Pressão', icon: '🔥', desc: 'Pressing alto', duration: 100, kickBased: false, totalKicks: 0 },
] as const;

type DrillId = typeof DRILL_OPTIONS[number]['id'];
type Phase = 'select' | 'running' | 'kicking' | 'showing-result' | 'finished';

interface KickResult {
  type: 'goal' | 'save' | 'post' | 'miss';
  label: string;
  icon: string;
  message: string;
  ballTargetX: number;
  ballTargetY: number;
  gkDiveY: number;
}

interface DrillEvent {
  icon: string;
  message: string;
  isGoal: boolean;
}

const COLORS = {
  pitch: '#1a6e38', pitchLight: '#1f8244', lines: 'rgba(255,255,255,0.45)',
  ball: '#ffffff', teamA: '#2563eb', teamALight: '#60a5fa',
  teamB: '#dc2626', teamBLight: '#f87171', teamBGK: '#f59e0b', teamBGKLight: '#fbbf24',
  goalNet: 'rgba(255,255,255,0.18)', goalPost: 'rgba(255,255,255,0.7)',
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// ── Goal geometry (normalized coords) ────────────────────────────────────
// Right goal drawn at: x = W-10 to W, y = H/2 - 36 to H/2 + 36
// In normalized: x ≈ 0.979, y top ≈ 0.371, y bottom ≈ 0.629
const GOAL = {
  x: 0.979,         // goal line x
  topPost: 0.371,   // top post y
  bottomPost: 0.629, // bottom post y
  centerY: 0.5,
  depth: 0.021,     // net depth behind line
};
const GOAL_INNER_TOP = GOAL.topPost + 0.025;    // just inside top post
const GOAL_INNER_BOT = GOAL.bottomPost - 0.025; // just inside bottom post

// ── Attribute-based goal chance ──────────────────────────────────────────
function getKickChance(players: Player[] | undefined, drillId: DrillId): number {
  if (!players || players.length === 0) return 0.42;
  // Pick best suited player for the drill
  let attr = 0;
  if (drillId === 'penalties') {
    // Use best shooter's shooting + composure
    const shooter = [...players]
      .filter(p => p.position !== 'GOL')
      .sort((a, b) => (b.attributes.shooting + (b.attributes.composure ?? 50)) - (a.attributes.shooting + (a.attributes.composure ?? 50)))[0];
    if (shooter) {
      attr = (shooter.attributes.shooting * 0.6 + (shooter.attributes.composure ?? 50) * 0.4);
    }
  } else if (drillId === 'freekicks') {
    // Use best set piece taker
    const taker = [...players]
      .filter(p => p.position !== 'GOL')
      .sort((a, b) => (b.attributes.setPieces + b.attributes.shooting) - (a.attributes.setPieces + a.attributes.shooting))[0];
    if (taker) {
      attr = (taker.attributes.setPieces * 0.7 + taker.attributes.shooting * 0.3);
    }
  }
  if (attr === 0) return 0.42;
  // attr 1-99 → goal chance 20%-65%
  return clamp(0.20 + (attr / 99) * 0.45, 0.20, 0.65);
}

function getKickerName(players: Player[] | undefined, drillId: DrillId): string {
  if (!players || players.length === 0) return 'Cobrador';
  if (drillId === 'penalties') {
    const shooter = [...players].filter(p => p.position !== 'GOL')
      .sort((a, b) => (b.attributes.shooting + (b.attributes.composure ?? 50)) - (a.attributes.shooting + (a.attributes.composure ?? 50)))[0];
    return shooter?.name?.split(' ').pop() ?? 'Cobrador';
  }
  const taker = [...players].filter(p => p.position !== 'GOL')
    .sort((a, b) => (b.attributes.setPieces + b.attributes.shooting) - (a.attributes.setPieces + a.attributes.shooting))[0];
  return taker?.name?.split(' ').pop() ?? 'Cobrador';
}

// ── Penalty kick outcomes ────────────────────────────────────────────────
function generatePenaltyKick(goalChance: number): KickResult {
  const r = Math.random();
  // Pick a side: -1 = top half, +1 = bottom half
  const side = Math.random() < 0.5 ? -1 : 1;
  // Target inside the goal posts
  const cornerY = side > 0
    ? GOAL.centerY + 0.03 + Math.random() * (GOAL_INNER_BOT - GOAL.centerY - 0.03)
    : GOAL.centerY - 0.03 - Math.random() * (GOAL.centerY - GOAL_INNER_TOP - 0.03);
  // GK guess - sometimes right, sometimes wrong
  const gkGuess = GOAL.centerY + (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.06);

  if (r < goalChance * 0.75) {
    // Standard goal in the corner
    return {
      type: 'goal', label: 'GOL!', icon: '⚽',
      message: side > 0 ? 'No canto direito baixo!' : 'No canto esquerdo alto!',
      ballTargetX: GOAL.x, ballTargetY: cornerY, gkDiveY: gkGuess,
    };
  } else if (r < goalChance) {
    // Cavadinha (chip down the middle)
    return {
      type: 'goal', label: 'CAVADINHA!', icon: '⚽',
      message: 'Chip suave no meio do gol!',
      ballTargetX: GOAL.x, ballTargetY: GOAL.centerY, gkDiveY: gkGuess,
    };
  } else if (r < goalChance + 0.20) {
    // GK save - dives to correct side
    return {
      type: 'save', label: 'DEFENDEU!', icon: '🧤',
      message: 'Goleiro adivinhou o lado!',
      ballTargetX: GOAL.x - 0.01, ballTargetY: cornerY,
      gkDiveY: cornerY + (Math.random() - 0.5) * 0.02,
    };
  } else if (r < goalChance + 0.35) {
    // Hit post
    const postY = side > 0 ? GOAL.bottomPost : GOAL.topPost;
    return {
      type: 'post', label: 'NA TRAVE!', icon: '📐',
      message: side > 0 ? 'Bateu na trave direita!' : 'Explodiu no travessão!',
      ballTargetX: GOAL.x - 0.005, ballTargetY: postY, gkDiveY: gkGuess,
    };
  } else {
    // Miss - ball goes ABOVE or BELOW the goal
    const missY = side > 0 ? GOAL.bottomPost + 0.06 : GOAL.topPost - 0.06;
    return {
      type: 'miss', label: 'PRA FORA!', icon: '❌',
      message: 'Isolou por cima do gol!',
      ballTargetX: GOAL.x + 0.01, ballTargetY: missY, gkDiveY: gkGuess,
    };
  }
}

function generateFreeKick(goalChance: number): KickResult {
  const r = Math.random();
  const side = Math.random() < 0.5 ? -1 : 1;
  const cornerY = side > 0
    ? GOAL.centerY + 0.02 + Math.random() * (GOAL_INNER_BOT - GOAL.centerY - 0.02)
    : GOAL.centerY - 0.02 - Math.random() * (GOAL.centerY - GOAL_INNER_TOP - 0.02);
  const gkGuess = GOAL.centerY + (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.07);

  // Free kicks have lower base chance
  const fkChance = goalChance * 0.65;

  if (r < fkChance) {
    return {
      type: 'goal', label: 'GOLAÇO!', icon: '⚽',
      message: side > 0 ? 'Bola no ângulo direito!' : 'No ângulo esquerdo, sem chance!',
      ballTargetX: GOAL.x, ballTargetY: cornerY, gkDiveY: gkGuess,
    };
  } else if (r < fkChance + 0.20) {
    return {
      type: 'save', label: 'DEFESA!', icon: '🧤',
      message: 'Goleiro voou e espalmou!',
      ballTargetX: GOAL.x - 0.015, ballTargetY: cornerY,
      gkDiveY: cornerY + (Math.random() - 0.5) * 0.03,
    };
  } else if (r < fkChance + 0.32) {
    const postY = side > 0 ? GOAL.bottomPost : GOAL.topPost;
    return {
      type: 'post', label: 'NA TRAVE!', icon: '📐',
      message: 'Bola bateu no ferro e voltou!',
      ballTargetX: GOAL.x - 0.005, ballTargetY: postY, gkDiveY: gkGuess,
    };
  } else if (r < fkChance + 0.50) {
    // Hit the wall
    return {
      type: 'miss', label: 'NA BARREIRA!', icon: '🧱',
      message: 'A barreira bloqueou a cobrança!',
      ballTargetX: 0.72, ballTargetY: GOAL.centerY, gkDiveY: GOAL.centerY,
    };
  } else {
    const missY = side > 0 ? GOAL.bottomPost + 0.07 : GOAL.topPost - 0.07;
    return {
      type: 'miss', label: 'PRA FORA!', icon: '❌',
      message: 'Passou por cima do gol!',
      ballTargetX: GOAL.x + 0.01, ballTargetY: missY, gkDiveY: gkGuess,
    };
  }
}

// ── Timed drill events ───────────────────────────────────────────────────
function getTimedEvents(drillId: DrillId): DrillEvent[] {
  if (drillId === 'crossing') return [
    { icon: '⚽', message: 'Cruzamento perfeito! Gol de cabeça!', isGoal: true },
    { icon: '↗️', message: 'Cruzou rasteiro, zagueiro cortou!', isGoal: false },
    { icon: '🧤', message: 'Goleiro saiu e segurou o cruzamento!', isGoal: false },
    { icon: '⚽', message: 'Voleio no segundo pau, golaço!', isGoal: true },
    { icon: '🦶', message: 'Cabeceio passou raspando a trave!', isGoal: false },
    { icon: '↗️', message: 'Cruzamento forte na primeira trave!', isGoal: false },
    { icon: '⚽', message: 'Atacante subiu mais que todos! Gol!', isGoal: true },
    { icon: '🧤', message: 'Goleiro deu soco na bola!', isGoal: false },
  ];
  if (drillId === 'counterattack') return [
    { icon: '⚽', message: 'Arrancada fulminante, tocou na saída do goleiro!', isGoal: true },
    { icon: '🎯', message: 'Lançamento perfeito em profundidade!', isGoal: false },
    { icon: '🦶', message: 'Zagueiro travou com carrinho na hora H!', isGoal: false },
    { icon: '🧤', message: 'Goleiro saiu rápido e fechou o ângulo!', isGoal: false },
    { icon: '⚽', message: 'Contra-ataque 3x2, toque e gol!', isGoal: true },
    { icon: '⚡', message: 'Transição rápida, cruzou rasteiro!', isGoal: false },
    { icon: '⚽', message: 'Driblou o goleiro e empurrou pro gol!', isGoal: true },
    { icon: '🦶', message: 'Último homem cortou o lançamento!', isGoal: false },
    { icon: '⚡', message: 'Puxou contra-ataque do campo de defesa!', isGoal: false },
    { icon: '⚽', message: 'Cavadinha na saída do goleiro, gol!', isGoal: true },
    { icon: '🧤', message: 'Goleiro fez milagre no 1 contra 1!', isGoal: false },
    { icon: '🎯', message: 'Passe de primeira na corrida!', isGoal: false },
  ];
  if (drillId === 'pressing') return [
    { icon: '⚽', message: 'Pressing alto! Roubou e finalizou, gol!', isGoal: true },
    { icon: '🔥', message: 'Cercou o zagueiro e roubou no campo dele!', isGoal: false },
    { icon: '🦶', message: 'Interceptou o passe curto na saída!', isGoal: false },
    { icon: '⚠️', message: 'Falta tática na intermediária!', isGoal: false },
    { icon: '⚽', message: 'Desarme no meio, tabela e gol!', isGoal: true },
    { icon: '🔥', message: 'Bloco alto fechou os espaços!', isGoal: false },
    { icon: '🧤', message: 'Goleiro saiu rápido e cortou perigo!', isGoal: false },
    { icon: '⚽', message: 'Pressão coletiva! Erro forçado, gol!', isGoal: true },
    { icon: '💨', message: 'Linha alta encurralou adversário na lateral!', isGoal: false },
    { icon: '🦶', message: 'Carrinho certeiro recuperou a posse!', isGoal: false },
    { icon: '⚡', message: 'Transição imediata após roubar a bola!', isGoal: false },
    { icon: '⚽', message: 'Roubou na entrada da área e chutou, gol!', isGoal: true },
  ];
  return [
    { icon: '⚽', message: 'Jogada ensaiada, gol de primeira!', isGoal: true },
    { icon: '🧤', message: 'Goleiro espalmou no canto!', isGoal: false },
    { icon: '💨', message: 'Drible desconcertante, passou por dois!', isGoal: false },
    { icon: '🎯', message: 'Passe genial em profundidade!', isGoal: false },
    { icon: '📐', message: 'Bola explodiu no travessão!', isGoal: false },
    { icon: '⚽', message: 'Toque de letra na pequena área, gol!', isGoal: true },
    { icon: '🦶', message: 'Desarme perfeito no meio-campo!', isGoal: false },
    { icon: '⚽', message: 'Tabela na entrada da área, golaço!', isGoal: true },
    { icon: '🧤', message: 'Defesa espetacular, mão trocada!', isGoal: false },
    { icon: '💨', message: 'Jogada individual pela ponta esquerda!', isGoal: false },
    { icon: '⚽', message: 'Chute de fora da área no ângulo!', isGoal: true },
    { icon: '🦶', message: 'Zagueiro cortou de cabeça na pequena área!', isGoal: false },
    { icon: '🎯', message: 'Cruzamento na medida, cabeceio raspou!', isGoal: false },
    { icon: '⚽', message: 'Pivô segurou, girou e finalizou, gol!', isGoal: true },
    { icon: '⚠️', message: 'Falta dura no meio-campo!', isGoal: false },
    { icon: '💨', message: 'Triangulação rápida na intermediária!', isGoal: false },
  ];
}

// ── Formations ───────────────────────────────────────────────────────────
const FORMATIONS: Record<DrillId, { teamA: { x: number; y: number }[]; teamB: { x: number; y: number }[] }> = {
  penalties: {
    teamA: [
      { x: 0.75, y: 0.5 },  // Cobrador behind the spot
      ...Array.from({ length: 10 }, (_, i) => ({ x: 0.35 + (i % 2) * 0.05, y: 0.10 + i * 0.08 })),
    ],
    teamB: [
      { x: 0.96, y: 0.5 },  // GK on the line
      ...Array.from({ length: 10 }, (_, i) => ({ x: 0.45 + (i % 2) * 0.05, y: 0.10 + i * 0.08 })),
    ],
  },
  freekicks: {
    teamA: [
      { x: 0.68, y: 0.50 },  // Cobrador — closer to goal
      // Attackers in/near the box
      { x: 0.82, y: 0.30 }, { x: 0.84, y: 0.45 }, { x: 0.84, y: 0.58 }, { x: 0.82, y: 0.72 },
      { x: 0.72, y: 0.25 }, { x: 0.72, y: 0.75 },
      // Defenders stay back
      { x: 0.30, y: 0.30 }, { x: 0.30, y: 0.50 }, { x: 0.30, y: 0.70 }, { x: 0.08, y: 0.50 },
    ],
    teamB: [
      { x: 0.96, y: 0.50 },  // GK
      // Wall (4 players) — further back, closer to the goal
      { x: 0.82, y: 0.42 }, { x: 0.82, y: 0.47 }, { x: 0.82, y: 0.53 }, { x: 0.82, y: 0.58 },
      // Defenders marking attackers
      { x: 0.86, y: 0.28 }, { x: 0.86, y: 0.72 },
      { x: 0.90, y: 0.38 }, { x: 0.90, y: 0.62 },
      { x: 0.84, y: 0.32 }, { x: 0.84, y: 0.68 },
    ],
  },
  crossing: {
    teamA: [
      // Crosser on the right wing
      { x: 0.72, y: 0.08 },
      // Attackers in the box area
      { x: 0.82, y: 0.38 }, { x: 0.82, y: 0.55 }, { x: 0.78, y: 0.48 },
      // Midfield support
      { x: 0.60, y: 0.30 }, { x: 0.60, y: 0.50 }, { x: 0.60, y: 0.70 },
      // Defenders stay back
      { x: 0.30, y: 0.25 }, { x: 0.30, y: 0.50 }, { x: 0.30, y: 0.75 }, { x: 0.08, y: 0.50 },
    ],
    teamB: [
      { x: 0.96, y: 0.50 },  // GK
      // Defenders in the box
      { x: 0.84, y: 0.35 }, { x: 0.84, y: 0.50 }, { x: 0.84, y: 0.65 },
      { x: 0.76, y: 0.28 }, { x: 0.76, y: 0.48 }, { x: 0.76, y: 0.68 },
      { x: 0.62, y: 0.22 }, { x: 0.62, y: 0.42 }, { x: 0.62, y: 0.62 }, { x: 0.62, y: 0.82 },
    ],
  },
  counterattack: {
    teamA: [
      { x: 0.06, y: 0.50 },
      { x: 0.22, y: 0.20 }, { x: 0.22, y: 0.42 }, { x: 0.22, y: 0.62 }, { x: 0.22, y: 0.82 },
      { x: 0.42, y: 0.25 }, { x: 0.42, y: 0.50 }, { x: 0.42, y: 0.75 },
      { x: 0.58, y: 0.30 }, { x: 0.62, y: 0.50 }, { x: 0.58, y: 0.70 },
    ],
    teamB: [
      { x: 0.96, y: 0.50 },
      { x: 0.80, y: 0.20 }, { x: 0.80, y: 0.42 }, { x: 0.80, y: 0.62 }, { x: 0.80, y: 0.82 },
      { x: 0.68, y: 0.30 }, { x: 0.68, y: 0.50 }, { x: 0.68, y: 0.70 },
      { x: 0.55, y: 0.38 }, { x: 0.55, y: 0.62 }, { x: 0.50, y: 0.50 },
    ],
  },
  pressing: {
    teamA: [
      { x: 0.06, y: 0.50 },  // GK
      // High defensive line
      { x: 0.32, y: 0.12 }, { x: 0.32, y: 0.38 }, { x: 0.32, y: 0.62 }, { x: 0.32, y: 0.88 },
      // Aggressive midfield pressing zone
      { x: 0.55, y: 0.18 }, { x: 0.55, y: 0.40 }, { x: 0.55, y: 0.60 }, { x: 0.55, y: 0.82 },
      // Forwards pressing high
      { x: 0.68, y: 0.35 }, { x: 0.68, y: 0.65 },
    ],
    teamB: [
      { x: 0.96, y: 0.50 },  // GK
      // Defenders under pressure
      { x: 0.82, y: 0.22 }, { x: 0.82, y: 0.42 }, { x: 0.82, y: 0.58 }, { x: 0.82, y: 0.78 },
      // Midfield trying to escape
      { x: 0.72, y: 0.30 }, { x: 0.72, y: 0.50 }, { x: 0.72, y: 0.70 },
      // Forward outlets
      { x: 0.45, y: 0.35 }, { x: 0.45, y: 0.65 }, { x: 0.40, y: 0.50 },
    ],
  },
  tactical: {
    teamA: [
      { x: 0.06, y: 0.5 },
      { x: 0.18, y: 0.15 }, { x: 0.18, y: 0.38 }, { x: 0.18, y: 0.62 }, { x: 0.18, y: 0.85 },
      { x: 0.35, y: 0.15 }, { x: 0.35, y: 0.38 }, { x: 0.35, y: 0.62 }, { x: 0.35, y: 0.85 },
      { x: 0.45, y: 0.35 }, { x: 0.45, y: 0.65 },
    ],
    teamB: [
      { x: 0.96, y: 0.5 },
      { x: 0.82, y: 0.15 }, { x: 0.82, y: 0.38 }, { x: 0.82, y: 0.62 }, { x: 0.82, y: 0.85 },
      { x: 0.65, y: 0.15 }, { x: 0.65, y: 0.38 }, { x: 0.65, y: 0.62 }, { x: 0.65, y: 0.85 },
      { x: 0.55, y: 0.35 }, { x: 0.55, y: 0.65 },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function TrainingMatchCanvasInner({ clubName, players, onFinish }: TrainingMatchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedDrill, setSelectedDrill] = useState<DrillId>('tactical');
  const [elapsed, setElapsed] = useState(0);
  const [events, setEvents] = useState<DrillEvent[]>([]);
  const [score, setScore] = useState([0, 0]);
  const [kickNum, setKickNum] = useState(0);
  const [kickerInfo, setKickerInfo] = useState('');

  const phaseRef = useRef<Phase>('select');
  const drillRef = useRef<DrillId>('tactical');
  const scoreRef = useRef([0, 0]);
  const kickNumRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastTimedEventRef = useRef(0);
  const playersRef = useRef(players);
  playersRef.current = players;

  const kickAnimRef = useRef({
    active: false, t: 0, result: null as KickResult | null,
    showingLabel: false, labelTimer: 0,
    ballStartX: 0, ballStartY: 0, gkStartY: 0,
  });

  const spritesRef = useRef<{
    ax: number[]; ay: number[]; bx: number[]; by: number[];
    atx: number[]; aty: number[]; btx: number[]; bty: number[];
    ballX: number; ballY: number; ballTX: number; ballTY: number;
    crossPhase: 'idle' | 'crossing' | 'heading' | 'result';
    crossTimer: number;
  }>({
    ax: [], ay: [], bx: [], by: [], atx: [], aty: [], btx: [], bty: [],
    ballX: 0.5, ballY: 0.5, ballTX: 0.5, ballTY: 0.5,
    crossPhase: 'idle', crossTimer: 0,
  });
  const lastTargetRef = useRef(0);
  const timedEventActiveRef = useRef<DrillEvent | null>(null);
  const timedEventTimerRef = useRef(0);

  const drillConfig = DRILL_OPTIONS.find(d => d.id === selectedDrill)!;

  const initSprites = useCallback((drill: DrillId) => {
    const f = FORMATIONS[drill];
    const s = spritesRef.current;
    s.ax = f.teamA.map(p => p.x); s.ay = f.teamA.map(p => p.y);
    s.bx = f.teamB.map(p => p.x); s.by = f.teamB.map(p => p.y);
    s.atx = [...s.ax]; s.aty = [...s.ay];
    s.btx = [...s.bx]; s.bty = [...s.by];
    if (drill === 'crossing') {
      s.ballX = 0.72; s.ballY = 0.08; // Ball starts with the crosser
      s.ballTX = 0.72; s.ballTY = 0.08;
      s.crossPhase = 'idle'; s.crossTimer = 0;
    } else {
      s.ballX = 0.5; s.ballY = 0.5; s.ballTX = 0.5; s.ballTY = 0.5;
    }
  }, []);

  const startKick = useCallback(() => {
    const drill = drillRef.current;
    const goalChance = getKickChance(playersRef.current, drill);
    const result = drill === 'penalties' ? generatePenaltyKick(goalChance) : generateFreeKick(goalChance);
    const ka = kickAnimRef.current;
    ka.active = true; ka.t = 0; ka.result = result;
    ka.showingLabel = false; ka.labelTimer = 0;
    ka.ballStartX = drill === 'penalties' ? 0.78 : 0.70;
    ka.ballStartY = 0.5; ka.gkStartY = 0.5;
    phaseRef.current = 'kicking';
    setPhase('kicking');
  }, []);

  const startTraining = useCallback(() => {
    drillRef.current = selectedDrill;
    scoreRef.current = [0, 0]; kickNumRef.current = 0;
    startTimeRef.current = Date.now(); lastTimedEventRef.current = Date.now();
    timedEventActiveRef.current = null;
    setScore([0, 0]); setKickNum(0); setElapsed(0); setEvents([]);
    initSprites(selectedDrill);

    // Show kicker info
    const name = getKickerName(players, selectedDrill);
    const chance = Math.round(getKickChance(players, selectedDrill) * 100);
    if (DRILL_OPTIONS.find(d => d.id === selectedDrill)?.kickBased) {
      setKickerInfo(`${name} (${chance}% chance)`);
    } else {
      setKickerInfo('');
    }

    const config = DRILL_OPTIONS.find(d => d.id === selectedDrill)!;
    if (config.kickBased) {
      phaseRef.current = 'running'; setPhase('running');
      setTimeout(() => startKick(), 800);
    } else {
      phaseRef.current = 'running'; setPhase('running');
    }
  }, [selectedDrill, initSprites, startKick, players]);

  const finishTraining = useCallback(() => {
    phaseRef.current = 'finished'; setPhase('finished');
    onFinish?.({
      duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
      drillsCompleted: kickNumRef.current,
      goalsScored: scoreRef.current[0],
      bestMoment: events.length > 0 ? events[events.length - 1].message : 'Treino completo!',
      drill: selectedDrill,
    });
  }, [events, onFinish, selectedDrill]);

  // ── Canvas render loop ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 520, H = 300;
    canvas.width = W; canvas.height = H;

    // Goal dimensions in pixels
    const GOAL_H = 72;  // goal height in px
    const GOAL_W = 10;  // goal depth in px
    const goalTop = H / 2 - GOAL_H / 2;
    const goalBot = H / 2 + GOAL_H / 2;
    const goalLineX = W - GOAL_W;

    let drift = 0;

    const drawPitch = () => {
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 === 0 ? COLORS.pitch : COLORS.pitchLight;
        ctx.fillRect(i * (W / 12), 0, W / 12 + 1, H);
      }
      ctx.strokeStyle = COLORS.lines; ctx.lineWidth = 1.2;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.beginPath(); ctx.moveTo(W / 2, 2); ctx.lineTo(W / 2, H - 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = COLORS.lines;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2); ctx.fill();
      // Penalty areas
      ctx.strokeRect(2, H / 2 - 60, 55, 120);
      ctx.strokeRect(2, H / 2 - 32, 24, 64);
      ctx.strokeRect(W - 57, H / 2 - 60, 55, 120);
      ctx.strokeRect(W - 26, H / 2 - 32, 24, 64);
      // Right goal (main target)
      ctx.fillStyle = COLORS.goalNet;
      ctx.fillRect(goalLineX, goalTop, GOAL_W, GOAL_H);
      // Goal posts - thicker, more visible
      ctx.strokeStyle = COLORS.goalPost; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(goalLineX, goalTop); ctx.lineTo(W, goalTop); ctx.lineTo(W, goalBot); ctx.lineTo(goalLineX, goalBot);
      ctx.stroke();
      // Left goal (small)
      ctx.fillStyle = COLORS.goalNet;
      ctx.fillRect(0, goalTop, GOAL_W, GOAL_H);
      ctx.strokeStyle = COLORS.goalPost; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(GOAL_W, goalTop); ctx.lineTo(0, goalTop); ctx.lineTo(0, goalBot); ctx.lineTo(GOAL_W, goalBot);
      ctx.stroke();
      // Penalty spots
      ctx.fillStyle = COLORS.lines;
      ctx.beginPath(); ctx.arc(W * 0.78, H / 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W * 0.22, H / 2, 2.5, 0, Math.PI * 2); ctx.fill();
    };

    const drawPlayer = (x: number, y: number, color: string, light: string, label: string, size = 5) => {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(x + 0.5, y + size * 0.7, size * 0.9, size * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = light; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(5, size - 0.5)}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.3);
    };

    const drawBall = (x: number, y: number, scale = 1) => {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(x + 0.5, y + 2 * scale, 3.5 * scale, 1.5 * scale, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.ball;
      ctx.beginPath(); ctx.arc(x, y, 3.5 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#666'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(x - 0.5, y - 0.5, 1 * scale, 0, Math.PI * 2); ctx.fill();
    };

    const drawLabel = (text: string, color: string, y: number) => {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      const tw = ctx.measureText(text).width;
      const bw = Math.max(tw + 40, 120);
      ctx.fillRect(W / 2 - bw / 2, y - 18, bw, 36);
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - bw / 2, y - 18, bw, 36);
      ctx.fillStyle = color;
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, W / 2, y);
    };

    const drawHUD = (left: string, center: string, right: string) => {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, 26);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(left, 10, 13);
      ctx.textAlign = 'center';
      ctx.fillText(center, W / 2, 13);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '10px Arial';
      ctx.fillText(right, W - 10, 13);
    };

    // ── Main loop ────────────────────────────────────────────────────
    const animate = () => {
      drift += 0.01;
      ctx.clearRect(0, 0, W, H);
      drawPitch();

      const drill = drillRef.current;
      const config = DRILL_OPTIONS.find(d => d.id === drill)!;
      const isKickBased = config.kickBased;
      const now = Date.now();

      // ── KICK-BASED DRILLS ──────────────────────────────────────────
      if (isKickBased) {
        const formation = FORMATIONS[drill];
        const ka = kickAnimRef.current;

        // Draw waiting players (gentle drift)
        for (let i = 1; i < 11; i++) {
          const p = formation.teamA[i];
          const dx = Math.sin(drift + i * 1.2) * 1.5;
          const dy = Math.cos(drift + i * 0.8) * 1.5;
          drawPlayer(p.x * W + dx, p.y * H + dy, COLORS.teamA, COLORS.teamALight, `${i + 1}`);
        }
        for (let i = 1; i < 11; i++) {
          const p = formation.teamB[i];
          const dx = Math.sin(drift + i * 0.9 + 2) * 1.5;
          const dy = Math.cos(drift + i * 1.1 + 1) * 1.5;
          drawPlayer(p.x * W + dx, p.y * H + dy, COLORS.teamB, COLORS.teamBLight, `${i + 1}`);
        }

        if (ka.active && ka.result) {
          ka.t += 0.014; // slower, more dramatic
          const t = Math.min(ka.t, 1);
          const et = easeOut(t);

          // Kicker runs up
          const kickerRunT = Math.min(t * 2.5, 1);
          const kickerX = lerp(ka.ballStartX - 0.04, ka.ballStartX + 0.02, easeInOut(kickerRunT));
          drawPlayer(kickerX * W, 0.5 * H, COLORS.teamA, COLORS.teamALight, '⚡', 7);

          // GK dives after delay
          const gkDiveT = Math.max(0, (t - 0.25) / 0.5);
          const gkET = easeOut(Math.min(gkDiveT, 1));
          const gkY = lerp(ka.gkStartY, ka.result.gkDiveY, gkET);
          const gkX = GOAL.x - 0.015;
          const gkSize = 6 + (gkET > 0.3 ? 2 : 0);
          drawPlayer(gkX * W, gkY * H, COLORS.teamBGK, COLORS.teamBGKLight, 'GK', gkSize);

          // Ball flight
          const ballFlyT = Math.max(0, (t - 0.20) / 0.50);
          const bET = easeOut(Math.min(ballFlyT, 1));
          if (ballFlyT > 0) {
            const bx = lerp(ka.ballStartX, ka.result.ballTargetX, bET);
            const by = lerp(ka.ballStartY, ka.result.ballTargetY, bET);
            // Arc: free kicks have bigger arc to go over wall
            const arcHeight = drill === 'freekicks' ? -0.10 : -0.03;
            const arc = Math.sin(bET * Math.PI) * arcHeight;
            drawBall(bx * W, (by + arc) * H, 1.1 + (1 - bET) * 0.3);
          } else {
            drawBall(ka.ballStartX * W, 0.5 * H);
          }

          // Show result after ball arrives
          if (t > 0.78 && !ka.showingLabel) {
            ka.showingLabel = true;
            ka.labelTimer = now;
            kickNumRef.current++;
            setKickNum(kickNumRef.current);
            const isGoal = ka.result.type === 'goal';
            if (isGoal) scoreRef.current[0]++; else scoreRef.current[1]++;
            setScore([...scoreRef.current]);
            setEvents(prev => [...prev.slice(-14), {
              icon: ka.result!.icon,
              message: `#${kickNumRef.current}: ${ka.result!.message}`,
              isGoal,
            }]);
          }

          if (ka.showingLabel) {
            const r = ka.result;
            const col = r.type === 'goal' ? '#10b981' : r.type === 'save' ? '#f59e0b' : '#ef4444';
            drawLabel(`${r.icon} ${r.label}`, col, H / 2 + 55);
            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.font = '10px Arial'; ctx.textAlign = 'center';
            ctx.fillText(r.message, W / 2, H / 2 + 78);

            if (r.type === 'goal') {
              const flash = Math.sin((now - ka.labelTimer) * 0.012) * 0.1;
              if (flash > 0) {
                ctx.fillStyle = `rgba(16, 185, 129, ${flash})`;
                ctx.fillRect(0, 0, W, H);
              }
            }

            if (now - ka.labelTimer > 2200) {
              ka.active = false; ka.result = null; ka.showingLabel = false;
              if (kickNumRef.current >= config.totalKicks) {
                phaseRef.current = 'finished'; setPhase('finished');
              } else {
                phaseRef.current = 'running'; setPhase('running');
                setTimeout(() => startKick(), 700);
              }
            }
          }
        } else {
          // Idle: show kicker and GK in position
          const kp = formation.teamA[0];
          drawPlayer(kp.x * W, kp.y * H, COLORS.teamA, COLORS.teamALight, '⚡', 7);
          const gp = formation.teamB[0];
          const gkBob = Math.sin(drift * 3) * 3;
          drawPlayer(gp.x * W, gp.y * H + gkBob, COLORS.teamBGK, COLORS.teamBGKLight, 'GK', 6);
          const spotX = drill === 'penalties' ? 0.78 : 0.70;
          drawBall(spotX * W, 0.5 * H);
        }

        if (phaseRef.current !== 'select') {
          drawHUD(
            `Cobrança ${Math.min(kickNumRef.current + 1, config.totalKicks)}/${config.totalKicks}`,
            `⚽ ${scoreRef.current[0]}  ×  ${scoreRef.current[1]} 🛡️`,
            `${config.icon} ${config.name}`
          );
        }

      // ── CROSSING DRILL (special timed) ─────────────────────────────
      } else if (drill === 'crossing') {
        const s = spritesRef.current;
        const isRunning = phaseRef.current === 'running' || phaseRef.current === 'showing-result';
        const crossMoveRange = 0.04;

        // Crossing cycle: idle(3s) → crossing(1.5s) → heading(1s) → result(2s)
        if (isRunning) {
          const elapsed = now - s.crossTimer;
          if (s.crossPhase === 'idle' && elapsed > 3000) {
            s.crossPhase = 'crossing'; s.crossTimer = now;
            // Crosser moves to wing edge, ball goes to box
            s.atx[0] = 0.78; s.aty[0] = 0.06;
            s.ballTX = 0.83; s.ballTY = 0.42 + Math.random() * 0.16;
            // Attackers rush into box
            s.atx[1] = 0.86 + Math.random() * 0.04; s.aty[1] = 0.38;
            s.atx[2] = 0.87 + Math.random() * 0.04; s.aty[2] = 0.55;
            s.atx[3] = 0.84; s.aty[3] = 0.48;
          } else if (s.crossPhase === 'crossing' && elapsed > 1500) {
            s.crossPhase = 'heading'; s.crossTimer = now;
            // Ball arrives at an attacker head position
            const targetAttacker = 1 + Math.floor(Math.random() * 3);
            s.ballTX = s.atx[targetAttacker]; s.ballTY = s.aty[targetAttacker];
          } else if (s.crossPhase === 'heading' && elapsed > 1000) {
            s.crossPhase = 'result'; s.crossTimer = now;
            // Decide outcome
            const pool = getTimedEvents('crossing');
            const evt = pool[Math.floor(Math.random() * pool.length)];
            timedEventActiveRef.current = evt;
            timedEventTimerRef.current = now;
            kickNumRef.current++;
            setKickNum(kickNumRef.current);
            if (evt.isGoal) {
              scoreRef.current[0]++;
              setScore([...scoreRef.current]);
              s.ballTX = GOAL.x; s.ballTY = GOAL.centerY + (Math.random() - 0.5) * 0.12;
            } else {
              s.ballTX = 0.96; s.ballTY = 0.3 + Math.random() * 0.4;
            }
            setEvents(prev => [...prev.slice(-9), evt]);
          } else if (s.crossPhase === 'result' && elapsed > 2200) {
            s.crossPhase = 'idle'; s.crossTimer = now;
            timedEventActiveRef.current = null;
            // Reset positions
            const f = FORMATIONS.crossing;
            for (let i = 0; i < 11; i++) {
              s.atx[i] = f.teamA[i].x; s.aty[i] = f.teamA[i].y;
              s.btx[i] = f.teamB[i].x; s.bty[i] = f.teamB[i].y;
            }
            s.ballTX = 0.72; s.ballTY = 0.08;
          }

          // Small drift for defenders
          if (now - lastTargetRef.current > 2000) {
            lastTargetRef.current = now;
            for (let i = 1; i < 11; i++) {
              s.btx[i] = FORMATIONS.crossing.teamB[i].x + (Math.random() - 0.5) * crossMoveRange;
              s.bty[i] = FORMATIONS.crossing.teamB[i].y + (Math.random() - 0.5) * crossMoveRange;
            }
          }
        }

        // Lerp all
        const lSpeed = 0.03;
        for (let i = 0; i < 11; i++) {
          s.ax[i] = lerp(s.ax[i], s.atx[i], lSpeed);
          s.ay[i] = lerp(s.ay[i], s.aty[i], lSpeed);
          s.bx[i] = lerp(s.bx[i], s.btx[i], lSpeed);
          s.by[i] = lerp(s.by[i], s.bty[i], lSpeed);
        }
        s.ballX = lerp(s.ballX, s.ballTX, s.crossPhase === 'crossing' ? 0.04 : 0.035);
        s.ballY = lerp(s.ballY, s.ballTY, s.crossPhase === 'crossing' ? 0.04 : 0.035);

        // Draw
        for (let i = 0; i < 11; i++) {
          drawPlayer(s.ax[i] * W, s.ay[i] * H, COLORS.teamA, COLORS.teamALight, i === 0 ? '↗️' : `${i + 1}`);
        }
        for (let i = 0; i < 11; i++) {
          drawPlayer(s.bx[i] * W, s.by[i] * H, i === 0 ? COLORS.teamBGK : COLORS.teamB,
            i === 0 ? COLORS.teamBGKLight : COLORS.teamBLight, i === 0 ? 'GK' : `${i + 1}`);
        }

        // Ball arc during crossing
        let ballArc = 0;
        if (s.crossPhase === 'crossing') {
          const crossProgress = Math.min((now - s.crossTimer) / 1500, 1);
          ballArc = Math.sin(crossProgress * Math.PI) * -25; // arc up during cross
        }
        drawBall(s.ballX * W, s.ballY * H + ballArc);

        // Event overlay
        if (timedEventActiveRef.current) {
          const evt = timedEventActiveRef.current;
          ctx.fillStyle = evt.isGoal ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.2)';
          ctx.fillRect(0, 0, W, H);
          const col = evt.isGoal ? '#10b981' : 'rgba(255,255,255,0.9)';
          drawLabel(`${evt.icon} ${evt.message}`, col, H / 2);
        }

        // Timer
        if (isRunning) {
          const sec = Math.floor((now - startTimeRef.current) / 1000);
          setElapsed(sec);
          if (sec >= config.duration) {
            phaseRef.current = 'finished'; setPhase('finished');
            animRef.current = requestAnimationFrame(animate);
            return;
          }
          drawHUD(`⏱ ${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`,
            `⚽ ${scoreRef.current[0]} gols · ${kickNumRef.current} cruzamentos`,
            `${config.icon} ${clubName}`);
        }

      // ── PRESSING DRILL (phased: build-up → press → steal → attack) ──
      } else if (drill === 'pressing') {
        const s = spritesRef.current;
        const isRunning = phaseRef.current === 'running' || phaseRef.current === 'showing-result';

        // Pressing phases cycle every ~4s
        if (isRunning && now - lastTargetRef.current > 1800) {
          lastTargetRef.current = now;
          const pressCycle = Math.floor((now - startTimeRef.current) / 4000) % 4;
          const f = FORMATIONS.pressing;

          if (pressCycle === 0) {
            // Phase 1: Opponent tries to build up — ball with their defenders
            const ballCarrier = 1 + Math.floor(Math.random() * 4); // random defender
            s.ballTX = s.bx[ballCarrier] + 0.02;
            s.ballTY = s.by[ballCarrier];
            // TeamA pushes forward aggressively (high line)
            for (let i = 1; i < 5; i++) {
              s.atx[i] = f.teamA[i].x + 0.12 + Math.random() * 0.06;
              s.aty[i] = f.teamA[i].y + (Math.random() - 0.5) * 0.06;
            }
            for (let i = 5; i < 9; i++) {
              s.atx[i] = f.teamA[i].x + 0.14 + Math.random() * 0.05;
              s.aty[i] = f.teamA[i].y + (Math.random() - 0.5) * 0.08;
            }
            // Forwards press their defenders
            s.atx[9] = s.bx[1] - 0.04; s.aty[9] = s.by[1] + (Math.random() - 0.5) * 0.04;
            s.atx[10] = s.bx[4] - 0.04; s.aty[10] = s.by[4] + (Math.random() - 0.5) * 0.04;
            // Opponents try to keep possession
            for (let i = 1; i < 11; i++) {
              s.btx[i] = f.teamB[i].x + (Math.random() - 0.5) * 0.04;
              s.bty[i] = f.teamB[i].y + (Math.random() - 0.5) * 0.04;
            }
          } else if (pressCycle === 1) {
            // Phase 2: Intense pressing — players converge on ball
            const ballX = s.ballX; const ballY = s.ballY;
            // 2-3 nearest attackers rush toward ball
            for (let i = 5; i < 11; i++) {
              const dx = ballX - s.ax[i]; const dy = ballY - s.ay[i];
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 0.35) {
                s.atx[i] = ballX - 0.03 + (Math.random() - 0.5) * 0.04;
                s.aty[i] = ballY + (Math.random() - 0.5) * 0.06;
              } else {
                s.atx[i] = s.ax[i] + 0.06;
                s.aty[i] = f.teamA[i].y + (Math.random() - 0.5) * 0.06;
              }
            }
            // Defenders hold high line
            for (let i = 1; i < 5; i++) {
              s.atx[i] = 0.45 + Math.random() * 0.06;
              s.aty[i] = f.teamA[i].y + (Math.random() - 0.5) * 0.05;
            }
            // Opponents panic, try to pass back
            s.ballTX = 0.85 + Math.random() * 0.06;
            s.ballTY = 0.3 + Math.random() * 0.4;
            for (let i = 1; i < 8; i++) {
              s.btx[i] = f.teamB[i].x + (Math.random() - 0.5) * 0.06;
              s.bty[i] = f.teamB[i].y + (Math.random() - 0.5) * 0.06;
            }
          } else if (pressCycle === 2) {
            // Phase 3: Ball recovery — teamA wins possession
            s.ballTX = 0.65 + Math.random() * 0.1;
            s.ballTY = 0.3 + Math.random() * 0.4;
            // Quick transition forward
            for (let i = 5; i < 11; i++) {
              s.atx[i] = 0.72 + Math.random() * 0.12;
              s.aty[i] = 0.15 + Math.random() * 0.7;
            }
            for (let i = 1; i < 5; i++) {
              s.atx[i] = 0.42 + Math.random() * 0.08;
              s.aty[i] = f.teamA[i].y;
            }
            // Opponents retreat
            for (let i = 1; i < 11; i++) {
              s.btx[i] = f.teamB[i].x + 0.04;
              s.bty[i] = f.teamB[i].y + (Math.random() - 0.5) * 0.05;
            }
          } else {
            // Phase 4: Reset — back to base pressing positions
            for (let i = 0; i < 11; i++) {
              s.atx[i] = f.teamA[i].x + (Math.random() - 0.5) * 0.04;
              s.aty[i] = f.teamA[i].y + (Math.random() - 0.5) * 0.04;
              s.btx[i] = f.teamB[i].x + (Math.random() - 0.5) * 0.04;
              s.bty[i] = f.teamB[i].y + (Math.random() - 0.5) * 0.04;
            }
            s.ballTX = 0.72 + Math.random() * 0.10;
            s.ballTY = 0.3 + Math.random() * 0.4;
          }
        }

        // Faster lerp for pressing (more aggressive movement)
        const pressLerp = 0.035;
        for (let i = 0; i < 11; i++) {
          s.ax[i] = lerp(s.ax[i], s.atx[i], pressLerp);
          s.ay[i] = lerp(s.ay[i], s.aty[i], pressLerp);
          s.bx[i] = lerp(s.bx[i], s.btx[i], 0.025);
          s.by[i] = lerp(s.by[i], s.bty[i], 0.025);
        }
        s.ballX = lerp(s.ballX, s.ballTX, 0.03);
        s.ballY = lerp(s.ballY, s.ballTY, 0.03);

        // Draw pressing zone highlight
        if (isRunning) {
          // Highlight press zone
          const pressCycle = Math.floor((now - startTimeRef.current) / 4000) % 4;
          if (pressCycle === 1 || pressCycle === 0) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
            ctx.fillRect(W * 0.55, 0, W * 0.45, H); // red tint on opponent half
          }
          if (pressCycle === 2) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
            ctx.fillRect(W * 0.55, 0, W * 0.45, H); // green = ball won
          }

          for (let i = 0; i < 11; i++) {
            drawPlayer(s.ax[i] * W, s.ay[i] * H, COLORS.teamA, COLORS.teamALight, i === 0 ? 'GK' : `${i + 1}`);
          }
          for (let i = 0; i < 11; i++) {
            drawPlayer(s.bx[i] * W, s.by[i] * H, i === 0 ? COLORS.teamBGK : COLORS.teamB,
              i === 0 ? COLORS.teamBGKLight : COLORS.teamBLight, i === 0 ? 'GK' : `${i + 1}`);
          }
          drawBall(s.ballX * W, s.ballY * H);
        } else {
          const f = FORMATIONS.pressing;
          f.teamA.forEach((p, i) => {
            drawPlayer(p.x * W + Math.sin(drift + i) * 1.5, p.y * H + Math.cos(drift + i * 0.7) * 1.5,
              COLORS.teamA, COLORS.teamALight, i === 0 ? 'GK' : `${i + 1}`);
          });
          f.teamB.forEach((p, i) => {
            drawPlayer(p.x * W + Math.sin(drift + i + 3) * 1.5, p.y * H + Math.cos(drift + i * 0.9 + 2) * 1.5,
              i === 0 ? COLORS.teamBGK : COLORS.teamB, i === 0 ? COLORS.teamBGKLight : COLORS.teamBLight,
              i === 0 ? 'GK' : `${i + 1}`);
          });
        }

        // Pressing events (faster pace — every 5s)
        if (isRunning && now - lastTimedEventRef.current > 4500 + Math.random() * 3000 && !timedEventActiveRef.current) {
          lastTimedEventRef.current = now;
          const pool = getTimedEvents('pressing');
          const evt = pool[Math.floor(Math.random() * pool.length)];
          timedEventActiveRef.current = evt;
          timedEventTimerRef.current = now;
          kickNumRef.current++;
          setKickNum(kickNumRef.current);
          if (evt.isGoal) { scoreRef.current[0]++; setScore([...scoreRef.current]); }
          setEvents(prev => [...prev.slice(-9), evt]);
          phaseRef.current = 'showing-result'; setPhase('showing-result');
        }

        if (timedEventActiveRef.current) {
          const evt = timedEventActiveRef.current;
          ctx.fillStyle = evt.isGoal ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.2)';
          ctx.fillRect(0, 0, W, H);
          const col = evt.isGoal ? '#10b981' : 'rgba(255,255,255,0.9)';
          drawLabel(`${evt.icon} ${evt.message}`, col, H / 2);
          if (now - timedEventTimerRef.current > 2500) {
            timedEventActiveRef.current = null;
            phaseRef.current = 'running'; setPhase('running');
          }
        }

        if (isRunning) {
          const sec = Math.floor((now - startTimeRef.current) / 1000);
          setElapsed(sec);
          if (sec >= config.duration) {
            phaseRef.current = 'finished'; setPhase('finished');
            animRef.current = requestAnimationFrame(animate);
            return;
          }
          const pressCycle = Math.floor((now - startTimeRef.current) / 4000) % 4;
          const phaseLabel = pressCycle === 0 ? 'Construção' : pressCycle === 1 ? 'Pressing!' : pressCycle === 2 ? 'Recuperação' : 'Reset';
          drawHUD(`⏱ ${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`,
            `⚽ ${scoreRef.current[0]} gols · 🔥 ${phaseLabel}`,
            `${config.icon} ${clubName}`);
        }

      // ── COUNTER-ATTACK (continuous ball-reactive movement) ─────────
      } else if (drill === 'counterattack') {
        const s = spritesRef.current;
        const isRunning = phaseRef.current === 'running' || phaseRef.current === 'showing-result';
        const caCycle = Math.floor((now - startTimeRef.current) / 4000) % 5;
        const cycleT = ((now - startTimeRef.current) % 4000) / 4000; // 0→1 within cycle

        // ── Continuous target updates every frame-ish ──
        if (isRunning && now - lastTargetRef.current > 600) {
          lastTargetRef.current = now;
          const f = FORMATIONS.counterattack;
          const bx = s.ballX; const by = s.ballY;

          if (caCycle === 0) {
            // DEFENDING: compact shape, players between ball and own goal
            s.ballTX = 0.28 + cycleT * 0.12 + Math.sin(now * 0.001) * 0.04;
            s.ballTY = 0.35 + Math.sin(now * 0.0015) * 0.15;
            // Defenders form a line between ball and goal
            for (let i = 1; i < 5; i++) {
              s.atx[i] = Math.min(bx - 0.08, 0.22) + (Math.random() - 0.5) * 0.03;
              s.aty[i] = f.teamA[i].y + (by - 0.5) * 0.15 + (Math.random() - 0.5) * 0.03;
            }
            // Midfield tracks ball laterally
            for (let i = 5; i < 8; i++) {
              s.atx[i] = bx - 0.06 - Math.random() * 0.04;
              s.aty[i] = by + (i - 6) * 0.18 + (Math.random() - 0.5) * 0.04;
            }
            // Forwards wait high
            for (let i = 8; i < 11; i++) {
              s.atx[i] = 0.52 + Math.random() * 0.04;
              s.aty[i] = f.teamA[i].y + (Math.random() - 0.5) * 0.04;
            }
            // Opponents attack — move with ball
            for (let i = 1; i < 4; i++) {
              s.btx[i] = bx + 0.02 + Math.random() * 0.06;
              s.bty[i] = by + (i - 2) * 0.15 + (Math.random() - 0.5) * 0.04;
            }
            for (let i = 4; i < 8; i++) {
              s.btx[i] = bx - 0.10 + Math.random() * 0.08;
              s.bty[i] = f.teamB[i].y + (Math.random() - 0.5) * 0.06;
            }
            for (let i = 8; i < 11; i++) {
              s.btx[i] = bx + 0.08 + Math.random() * 0.06;
              s.bty[i] = 0.25 + Math.random() * 0.5;
            }
          } else if (caCycle === 1) {
            // INTERCEPT: midfielder rushes to ball, others react
            const interceptX = 0.38 + Math.random() * 0.06;
            const interceptY = 0.30 + Math.random() * 0.4;
            s.ballTX = interceptX;
            s.ballTY = interceptY;
            // Closest midfielder charges to ball
            const winner = 5 + Math.floor(Math.random() * 3);
            s.atx[winner] = interceptX - 0.02;
            s.aty[winner] = interceptY;
            // Other mids push forward toward ball
            for (let i = 5; i < 8; i++) {
              if (i !== winner) {
                s.atx[i] = interceptX + 0.02 + (Math.random() - 0.5) * 0.06;
                s.aty[i] = interceptY + (i - 6) * 0.12;
              }
            }
            // Forwards start their runs
            for (let i = 8; i < 11; i++) {
              s.atx[i] = 0.55 + cycleT * 0.08;
              s.aty[i] = f.teamA[i].y + (Math.random() - 0.5) * 0.06;
            }
            // Defenders hold
            for (let i = 1; i < 5; i++) {
              s.atx[i] = 0.25 + Math.random() * 0.04;
              s.aty[i] = f.teamA[i].y;
            }
            // Opponents slow down / transition
            for (let i = 1; i < 11; i++) {
              s.btx[i] = s.bx[i] + 0.02;
              s.bty[i] = s.by[i] + (Math.random() - 0.5) * 0.02;
            }
          } else if (caCycle === 2) {
            // LAUNCH: ball flies forward, forwards sprint, opponents scramble back
            const launchProgress = cycleT;
            s.ballTX = 0.45 + launchProgress * 0.35;
            s.ballTY = 0.30 + Math.sin(now * 0.002) * 0.15;
            // Forwards sprint ahead of ball
            for (let i = 8; i < 11; i++) {
              s.atx[i] = s.ballTX + 0.02 + Math.random() * 0.06;
              s.aty[i] = s.ballTY + (i - 9) * 0.15 + (Math.random() - 0.5) * 0.04;
            }
            // Midfield pushes up following
            for (let i = 5; i < 8; i++) {
              s.atx[i] = s.ballTX - 0.10 + Math.random() * 0.06;
              s.aty[i] = f.teamA[i].y + (Math.random() - 0.5) * 0.06;
            }
            // Defenders push up to halfway
            for (let i = 1; i < 5; i++) {
              s.atx[i] = 0.35 + launchProgress * 0.10;
              s.aty[i] = f.teamA[i].y;
            }
            // Opponents sprint back toward their goal
            for (let i = 1; i < 11; i++) {
              s.btx[i] = Math.max(s.bx[i] + 0.03, 0.70 + Math.random() * 0.10);
              s.bty[i] = f.teamB[i].y + (Math.random() - 0.5) * 0.05;
            }
          } else if (caCycle === 3) {
            // FINISH: 3v2 near goal, ball toward goal area
            s.ballTX = 0.82 + cycleT * 0.08;
            s.ballTY = 0.38 + Math.sin(now * 0.003) * 0.12;
            // Forwards converge near goal
            s.atx[8] = s.ballTX - 0.02; s.aty[8] = s.ballTY - 0.08;
            s.atx[9] = s.ballTX + 0.03; s.aty[9] = s.ballTY;
            s.atx[10] = s.ballTX - 0.02; s.aty[10] = s.ballTY + 0.10;
            // Midfield arrives as support
            for (let i = 5; i < 8; i++) {
              s.atx[i] = 0.70 + Math.random() * 0.06;
              s.aty[i] = 0.25 + (i - 5) * 0.25;
            }
            // Only 2 defenders + GK
            s.btx[1] = 0.87; s.bty[1] = s.ballTY - 0.06;
            s.btx[2] = 0.87; s.bty[2] = s.ballTY + 0.08;
            // GK reacts to ball
            s.btx[0] = 0.96; s.bty[0] = s.ballTY;
            // Rest retreat
            for (let i = 3; i < 11; i++) {
              s.btx[i] = 0.80 + Math.random() * 0.08;
              s.bty[i] = f.teamB[i].y + (Math.random() - 0.5) * 0.04;
            }
          } else {
            // RESET
            for (let i = 0; i < 11; i++) {
              s.atx[i] = f.teamA[i].x + (Math.random() - 0.5) * 0.03;
              s.aty[i] = f.teamA[i].y + (Math.random() - 0.5) * 0.03;
              s.btx[i] = f.teamB[i].x + (Math.random() - 0.5) * 0.03;
              s.bty[i] = f.teamB[i].y + (Math.random() - 0.5) * 0.03;
            }
            s.ballTX = 0.45; s.ballTY = 0.50;
          }
        }

        // Smooth lerp — faster for attack phases
        const aLerp = (caCycle === 2 || caCycle === 3) ? 0.055 : 0.035;
        const ballLerp = (caCycle === 2) ? 0.06 : 0.04;
        for (let i = 0; i < 11; i++) {
          s.ax[i] = lerp(s.ax[i], s.atx[i], aLerp);
          s.ay[i] = lerp(s.ay[i], s.aty[i], aLerp);
          s.bx[i] = lerp(s.bx[i], s.btx[i], 0.03);
          s.by[i] = lerp(s.by[i], s.bty[i], 0.03);
        }
        s.ballX = lerp(s.ballX, s.ballTX, ballLerp);
        s.ballY = lerp(s.ballY, s.ballTY, ballLerp);

        if (isRunning) {
          // Visual overlays per phase
          if (caCycle === 0) {
            // Red defensive tint
            ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
            ctx.fillRect(0, 0, W * 0.45, H);
          } else if (caCycle === 1) {
            // Yellow intercept flash
            ctx.fillStyle = 'rgba(245, 158, 11, 0.04)';
            ctx.fillRect(W * 0.2, 0, W * 0.3, H);
          } else if (caCycle === 2 || caCycle === 3) {
            // Green attack tint
            ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
            ctx.fillRect(W * 0.45, 0, W * 0.55, H);
            // Speed lines / arrow
            const arrowAlpha = 0.08 + Math.sin(drift * 4) * 0.04;
            ctx.strokeStyle = `rgba(255,255,255,${arrowAlpha})`;
            ctx.lineWidth = 2;
            for (let a = 0; a < 3; a++) {
              const ay = H * 0.3 + a * (H * 0.2);
              const ax = W * 0.40 + Math.sin(drift * 3 + a) * 20;
              ctx.beginPath();
              ctx.moveTo(ax, ay); ctx.lineTo(ax + 60, ay);
              ctx.lineTo(ax + 52, ay - 6);
              ctx.moveTo(ax + 60, ay); ctx.lineTo(ax + 52, ay + 6);
              ctx.stroke();
            }
          }

          // Draw trail effect for ball during sprint phases
          if (caCycle === 2 || caCycle === 3) {
            for (let t = 3; t >= 1; t--) {
              const trailAlpha = 0.06 * (4 - t);
              ctx.fillStyle = `rgba(255,255,255,${trailAlpha})`;
              ctx.beginPath();
              ctx.arc(s.ballX * W - t * 4, s.ballY * H, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Draw players with running indicator during sprint
          for (let i = 0; i < 11; i++) {
            const isRunningForward = (caCycle === 2 || caCycle === 3) && i >= 8;
            const pSize = isRunningForward ? 6 : 5;
            drawPlayer(s.ax[i] * W, s.ay[i] * H, COLORS.teamA, COLORS.teamALight,
              i === 0 ? 'GK' : isRunningForward ? '⚡' : `${i + 1}`, pSize);
          }
          for (let i = 0; i < 11; i++) {
            drawPlayer(s.bx[i] * W, s.by[i] * H, i === 0 ? COLORS.teamBGK : COLORS.teamB,
              i === 0 ? COLORS.teamBGKLight : COLORS.teamBLight, i === 0 ? 'GK' : `${i + 1}`);
          }
          drawBall(s.ballX * W, s.ballY * H, caCycle === 2 ? 1.2 : 1);
        } else {
          const f = FORMATIONS.counterattack;
          f.teamA.forEach((p, i) => {
            drawPlayer(p.x * W + Math.sin(drift + i) * 1.5, p.y * H + Math.cos(drift + i * 0.7) * 1.5,
              COLORS.teamA, COLORS.teamALight, i === 0 ? 'GK' : `${i + 1}`);
          });
          f.teamB.forEach((p, i) => {
            drawPlayer(p.x * W + Math.sin(drift + i + 3) * 1.5, p.y * H + Math.cos(drift + i * 0.9 + 2) * 1.5,
              i === 0 ? COLORS.teamBGK : COLORS.teamB, i === 0 ? COLORS.teamBGKLight : COLORS.teamBLight,
              i === 0 ? 'GK' : `${i + 1}`);
          });
        }

        // Events
        if (isRunning && now - lastTimedEventRef.current > 5000 + Math.random() * 3000 && !timedEventActiveRef.current) {
          lastTimedEventRef.current = now;
          const pool = getTimedEvents('counterattack');
          const evt = pool[Math.floor(Math.random() * pool.length)];
          timedEventActiveRef.current = evt; timedEventTimerRef.current = now;
          kickNumRef.current++; setKickNum(kickNumRef.current);
          if (evt.isGoal) { scoreRef.current[0]++; setScore([...scoreRef.current]); }
          setEvents(prev => [...prev.slice(-9), evt]);
          phaseRef.current = 'showing-result'; setPhase('showing-result');
        }
        if (timedEventActiveRef.current) {
          const evt = timedEventActiveRef.current;
          ctx.fillStyle = evt.isGoal ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.25)';
          ctx.fillRect(0, 0, W, H);
          drawLabel(`${evt.icon} ${evt.message}`, evt.isGoal ? '#10b981' : 'rgba(255,255,255,0.9)', H / 2);
          if (now - timedEventTimerRef.current > 2500) {
            timedEventActiveRef.current = null;
            phaseRef.current = 'running'; setPhase('running');
          }
        }
        if (isRunning) {
          const sec = Math.floor((now - startTimeRef.current) / 1000);
          setElapsed(sec);
          if (sec >= config.duration) {
            phaseRef.current = 'finished'; setPhase('finished');
            animRef.current = requestAnimationFrame(animate); return;
          }
          const phaseLabel = ['🛡️ Defendendo','⚡ Interceptação','🚀 Lançamento!','🎯 Finalização!','🔄 Reset'][caCycle];
          drawHUD(`⏱ ${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`,
            `⚽ ${scoreRef.current[0]} gols · ${phaseLabel}`, `${config.icon} ${clubName}`);
        }

      // ── TACTICAL (generic timed 11v11) ─────────────────────────────
      } else {
        const s = spritesRef.current;
        const isRunning = phaseRef.current === 'running' || phaseRef.current === 'showing-result';

        if (isRunning && now - lastTargetRef.current > 2500) {
          lastTargetRef.current = now;
          const f = FORMATIONS[drill];
          for (let i = 0; i < 11; i++) {
            s.atx[i] = f.teamA[i].x + (Math.random() - 0.5) * 0.06;
            s.aty[i] = f.teamA[i].y + (Math.random() - 0.5) * 0.06;
            s.btx[i] = f.teamB[i].x + (Math.random() - 0.5) * 0.06;
            s.bty[i] = f.teamB[i].y + (Math.random() - 0.5) * 0.06;
          }
          const all = [...s.ax.map((x, i) => ({ x, y: s.ay[i] })), ...s.bx.map((x, i) => ({ x, y: s.by[i] }))];
          const tgt = all[Math.floor(Math.random() * all.length)];
          s.ballTX = tgt.x + (Math.random() - 0.5) * 0.04;
          s.ballTY = tgt.y + (Math.random() - 0.5) * 0.04;
        }

        for (let i = 0; i < 11; i++) {
          s.ax[i] = lerp(s.ax[i], s.atx[i], 0.022);
          s.ay[i] = lerp(s.ay[i], s.aty[i], 0.022);
          s.bx[i] = lerp(s.bx[i], s.btx[i], 0.022);
          s.by[i] = lerp(s.by[i], s.bty[i], 0.022);
        }
        s.ballX = lerp(s.ballX, s.ballTX, 0.028);
        s.ballY = lerp(s.ballY, s.ballTY, 0.028);

        if (isRunning) {
          for (let i = 0; i < 11; i++) {
            drawPlayer(s.ax[i] * W, s.ay[i] * H, COLORS.teamA, COLORS.teamALight, i === 0 ? 'GK' : `${i + 1}`);
          }
          for (let i = 0; i < 11; i++) {
            drawPlayer(s.bx[i] * W, s.by[i] * H, i === 0 ? COLORS.teamBGK : COLORS.teamB,
              i === 0 ? COLORS.teamBGKLight : COLORS.teamBLight, i === 0 ? 'GK' : `${i + 1}`);
          }
          drawBall(s.ballX * W, s.ballY * H);
        } else {
          const f = FORMATIONS[drill];
          f.teamA.forEach((p, i) => {
            drawPlayer(p.x * W + Math.sin(drift + i) * 1.5, p.y * H + Math.cos(drift + i * 0.7) * 1.5,
              COLORS.teamA, COLORS.teamALight, i === 0 ? 'GK' : `${i + 1}`);
          });
          f.teamB.forEach((p, i) => {
            drawPlayer(p.x * W + Math.sin(drift + i + 3) * 1.5, p.y * H + Math.cos(drift + i * 0.9 + 2) * 1.5,
              i === 0 ? COLORS.teamBGK : COLORS.teamB, i === 0 ? COLORS.teamBGKLight : COLORS.teamBLight,
              i === 0 ? 'GK' : `${i + 1}`);
          });
        }

        if (isRunning && now - lastTimedEventRef.current > 5500 + Math.random() * 4000 && !timedEventActiveRef.current) {
          lastTimedEventRef.current = now;
          const pool = getTimedEvents(drill);
          const evt = pool[Math.floor(Math.random() * pool.length)];
          timedEventActiveRef.current = evt; timedEventTimerRef.current = now;
          kickNumRef.current++; setKickNum(kickNumRef.current);
          if (evt.isGoal) { scoreRef.current[0]++; setScore([...scoreRef.current]); }
          setEvents(prev => [...prev.slice(-9), evt]);
          phaseRef.current = 'showing-result'; setPhase('showing-result');
        }
        if (timedEventActiveRef.current) {
          const evt = timedEventActiveRef.current;
          ctx.fillStyle = evt.isGoal ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.2)';
          ctx.fillRect(0, 0, W, H);
          drawLabel(`${evt.icon} ${evt.message}`, evt.isGoal ? '#10b981' : 'rgba(255,255,255,0.9)', H / 2);
          if (now - timedEventTimerRef.current > 2500) {
            timedEventActiveRef.current = null;
            phaseRef.current = 'running'; setPhase('running');
          }
        }
        if (isRunning) {
          const sec = Math.floor((now - startTimeRef.current) / 1000);
          setElapsed(sec);
          if (sec >= config.duration) {
            phaseRef.current = 'finished'; setPhase('finished');
            animRef.current = requestAnimationFrame(animate); return;
          }
          drawHUD(`⏱ ${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`,
            `⚽ ${scoreRef.current[0]} gols`, `${config.icon} ${clubName}`);
        }
      }

      // ── Overlays ───────────────────────────────────────────────────
      if (phaseRef.current === 'select') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🏋️ Treino Tático 2D', W / 2, H / 2 - 10);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Arial';
        ctx.fillText('Escolha o exercício abaixo', W / 2, H / 2 + 14);
      }

      if (phaseRef.current === 'finished') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✅ Treino Finalizado!', W / 2, H / 2 - 18);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '12px Arial';
        ctx.fillText(`⚽ ${scoreRef.current[0]} gols  ·  ${kickNumRef.current} lances`, W / 2, H / 2 + 8);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, clubName, startKick, initSprites]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" /> Treino Tático 2D
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {/* Drill selection */}
        {phase === 'select' && (
          <div className="grid grid-cols-2 gap-1.5">
            {DRILL_OPTIONS.map(drill => (
              <button
                key={drill.id}
                onClick={() => { setSelectedDrill(drill.id); drillRef.current = drill.id; initSprites(drill.id); }}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  selectedDrill === drill.id
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border/30 bg-card/50 hover:border-border/60'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{drill.icon}</span>
                  <span className="text-[11px] font-bold">{drill.name}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{drill.desc}</p>
                {drill.kickBased && (
                  <Badge variant="outline" className="text-[8px] mt-1 px-1 py-0">{drill.totalKicks} cobranças</Badge>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Canvas */}
        <canvas ref={canvasRef} className="w-full rounded-lg border border-border/20"
          style={{ aspectRatio: '520 / 300', imageRendering: 'auto' }} />

        {/* Kicker info badge */}
        {kickerInfo && (phase === 'running' || phase === 'kicking') && (
          <div className="text-center">
            <Badge variant="secondary" className="text-[10px] gap-1">
              ⚡ Cobrador: {kickerInfo}
            </Badge>
          </div>
        )}

        {/* Running info */}
        {(phase === 'running' || phase === 'kicking' || phase === 'showing-result') && (
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] gap-1">
              {drillConfig.icon} {drillConfig.name}
            </Badge>
            {drillConfig.kickBased ? (
              <Badge variant="secondary" className="text-[10px] font-mono">
                {kickNum}/{drillConfig.totalKicks} cobranças
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] font-mono">
                ⏱ {formatTime(elapsed)} / {formatTime(drillConfig.duration)}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">⚽ {score[0]} gols</Badge>
          </div>
        )}

        {/* Progress bar */}
        {(phase === 'running' || phase === 'kicking' || phase === 'showing-result') && (
          <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary/60 transition-all duration-300 rounded-full"
              style={{ width: `${drillConfig.kickBased
                ? Math.min(100, (kickNum / drillConfig.totalKicks) * 100)
                : Math.min(100, (elapsed / drillConfig.duration) * 100)}%` }} />
          </div>
        )}

        {/* Events log */}
        {events.length > 0 && (
          <div className="max-h-[120px] overflow-y-auto space-y-0.5 border border-border/20 rounded-lg p-1.5">
            {[...events].reverse().map((ev, i) => (
              <div key={i} className={`text-[10px] px-2 py-1 rounded ${ev.isGoal ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : 'bg-muted/10 text-muted-foreground'}`}>
                {ev.icon} {ev.message}
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {phase === 'select' && (
            <Button onClick={startTraining} className="flex-1 gap-2" size="lg">
              <Play className="h-4 w-4" /> Iniciar {drillConfig.name}
            </Button>
          )}
          {(phase === 'running' || phase === 'kicking' || phase === 'showing-result') && (
            <Button onClick={finishTraining} variant="destructive" className="flex-1 gap-2">
              <Square className="h-4 w-4" /> Parar
            </Button>
          )}
          {phase === 'finished' && (
            <Button onClick={() => { setPhase('select'); phaseRef.current = 'select'; setEvents([]); setKickerInfo(''); }} className="flex-1 gap-2" size="lg">
              <RotateCcw className="h-4 w-4" /> Escolher Outro Treino
            </Button>
          )}
        </div>

        {/* Finished stats */}
        {phase === 'finished' && (
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-muted/10 rounded-lg p-2">
              <p className="text-[9px] text-muted-foreground">⚽ Gols</p>
              <p className="text-lg font-bold text-primary">{score[0]}</p>
            </div>
            <div className="bg-muted/10 rounded-lg p-2">
              <p className="text-[9px] text-muted-foreground">🎯 Lances</p>
              <p className="text-lg font-bold">{kickNum}</p>
            </div>
            <div className="bg-muted/10 rounded-lg p-2">
              <p className="text-[9px] text-muted-foreground">
                {drillConfig.kickBased ? '🛡️ Não-Gol' : '⏱ Tempo'}
              </p>
              <p className="text-lg font-bold">
                {drillConfig.kickBased ? score[1] : formatTime(elapsed)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const TrainingMatchCanvas = memo(TrainingMatchCanvasInner);
