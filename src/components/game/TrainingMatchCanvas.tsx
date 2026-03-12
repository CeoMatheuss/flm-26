/**
 * TrainingMatchCanvas — 2D tactical training with drill-specific visuals.
 * 
 * PENALTIES: kick-by-kick (10 cobranças), ball animates toward goal corners,
 *   GK dives, result matches visual.
 * FREE KICKS: kick-by-kick (8 cobranças), ball curves over wall.
 * OTHERS: timed with organic movement.
 */

import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RotateCcw, Dumbbell } from 'lucide-react';

interface TrainingMatchCanvasProps {
  clubName: string;
  onFinish?: (report: TrainingReport) => void;
}

export interface TrainingReport {
  duration: number;
  drillsCompleted: number;
  goalsScored: number;
  bestMoment: string;
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
  // Ball target (normalized)
  ballTargetX: number;
  ballTargetY: number;
  // GK dive target (normalized)
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
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ── Penalty kick outcomes ────────────────────────────────────────────────
function generatePenaltyKick(): KickResult {
  const r = Math.random();
  const side = Math.random() < 0.5 ? -1 : 1; // top or bottom
  const cornerY = 0.5 + side * (0.15 + Math.random() * 0.08);
  const gkGuess = 0.5 + (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.06);

  if (r < 0.45) {
    return {
      type: 'goal', label: 'GOL!', icon: '⚽',
      message: side > 0 ? 'No canto direito baixo!' : 'No canto esquerdo alto!',
      ballTargetX: 0.96, ballTargetY: cornerY, gkDiveY: gkGuess,
    };
  } else if (r < 0.65) {
    // GK saves — GK dives to correct side
    return {
      type: 'save', label: 'DEFENDEU!', icon: '🧤',
      message: 'Goleiro adivinhou o lado!',
      ballTargetX: 0.95, ballTargetY: cornerY, gkDiveY: cornerY + (Math.random() - 0.5) * 0.03,
    };
  } else if (r < 0.80) {
    return {
      type: 'post', label: 'NA TRAVE!', icon: '📐',
      message: side > 0 ? 'Bateu na trave direita!' : 'Explodiu no travessão!',
      ballTargetX: 0.955, ballTargetY: side > 0 ? 0.63 : 0.37, gkDiveY: gkGuess,
    };
  } else if (r < 0.90) {
    // Cavadinha
    return {
      type: 'goal', label: 'CAVADINHA!', icon: '⚽',
      message: 'Chip suave no meio do gol!',
      ballTargetX: 0.96, ballTargetY: 0.5, gkDiveY: gkGuess,
    };
  } else {
    return {
      type: 'miss', label: 'PRA FORA!', icon: '❌',
      message: 'Isolou por cima do gol!',
      ballTargetX: 0.97, ballTargetY: 0.5 + side * 0.28, gkDiveY: gkGuess,
    };
  }
}

function generateFreeKick(): KickResult {
  const r = Math.random();
  const side = Math.random() < 0.5 ? -1 : 1;
  const cornerY = 0.5 + side * (0.12 + Math.random() * 0.06);
  const gkGuess = 0.5 + (Math.random() < 0.5 ? -1 : 1) * (0.10 + Math.random() * 0.05);

  if (r < 0.30) {
    return {
      type: 'goal', label: 'GOLAÇO!', icon: '⚽',
      message: side > 0 ? 'Bola no ângulo direito!' : 'No ângulo esquerdo, sem chance!',
      ballTargetX: 0.96, ballTargetY: cornerY, gkDiveY: gkGuess,
    };
  } else if (r < 0.50) {
    return {
      type: 'save', label: 'DEFESA!', icon: '🧤',
      message: 'Goleiro voou e espalmou!',
      ballTargetX: 0.94, ballTargetY: cornerY, gkDiveY: cornerY + (Math.random() - 0.5) * 0.04,
    };
  } else if (r < 0.65) {
    return {
      type: 'post', label: 'NA TRAVE!', icon: '📐',
      message: 'Bola bateu no ferro e voltou!',
      ballTargetX: 0.955, ballTargetY: side > 0 ? 0.62 : 0.38, gkDiveY: gkGuess,
    };
  } else if (r < 0.80) {
    // Hit the wall
    return {
      type: 'miss', label: 'NA BARREIRA!', icon: '🧱',
      message: 'A barreira bloqueou a cobrança!',
      ballTargetX: 0.72, ballTargetY: 0.5, gkDiveY: 0.5,
    };
  } else {
    return {
      type: 'miss', label: 'PRA FORA!', icon: '❌',
      message: 'Passou por cima do gol!',
      ballTargetX: 0.97, ballTargetY: 0.5 + side * 0.30, gkDiveY: gkGuess,
    };
  }
}

// ── Timed drill events ───────────────────────────────────────────────────
function getTimedEvents(drillId: DrillId): DrillEvent[] {
  const base: DrillEvent[] = [
    { icon: '⚽', message: 'Golaço! Finalização no ângulo!', isGoal: true },
    { icon: '🧤', message: 'Goleiro espalmou no canto!', isGoal: false },
    { icon: '💨', message: 'Drible incrível, passou por dois!', isGoal: false },
    { icon: '🎯', message: 'Passe genial em profundidade!', isGoal: false },
    { icon: '📐', message: 'Bola explodiu no travessão!', isGoal: false },
  ];
  if (drillId === 'crossing') return [
    { icon: '⚽', message: 'Gol de cabeça no segundo pau!', isGoal: true },
    { icon: '↗️', message: 'Cruzamento perfeito, ninguém alcançou!', isGoal: false },
    { icon: '🧤', message: 'Goleiro saiu bem e segurou firme!', isGoal: false },
    { icon: '⚽', message: 'Voleio certeiro, golaço!', isGoal: true },
    { icon: '🦶', message: 'Zagueiro cortou de cabeça!', isGoal: false },
  ];
  if (drillId === 'counterattack') return [
    { icon: '⚽', message: 'Arrancada fulminante e gol!', isGoal: true },
    { icon: '🎯', message: 'Lançamento perfeito em profundidade!', isGoal: false },
    { icon: '🦶', message: 'Zagueiro travou na hora H!', isGoal: false },
    { icon: '🧤', message: 'Goleiro fechou o ângulo!', isGoal: false },
    { icon: '⚽', message: 'Tocou na saída do goleiro, gol!', isGoal: true },
  ];
  if (drillId === 'pressing') return [
    { icon: '⚽', message: 'Pressing resultou em gol!', isGoal: true },
    { icon: '🔥', message: 'Roubou a bola no campo ofensivo!', isGoal: false },
    { icon: '🦶', message: 'Interceptou o passe na frente!', isGoal: false },
    { icon: '⚠️', message: 'Falta tática para parar o contra-ataque!', isGoal: false },
    { icon: '⚽', message: 'Forçou o erro e marcou!', isGoal: true },
  ];
  return base;
}

// ── Formations ───────────────────────────────────────────────────────────
const FORMATIONS: Record<DrillId, { teamA: { x: number; y: number }[]; teamB: { x: number; y: number }[] }> = {
  penalties: {
    teamA: [
      { x: 0.78, y: 0.5 },  // Cobrador
      ...Array.from({ length: 10 }, (_, i) => ({ x: 0.42 + (i % 2) * 0.06, y: 0.12 + i * 0.08 })),
    ],
    teamB: [
      { x: 0.955, y: 0.5 },  // GK
      ...Array.from({ length: 10 }, (_, i) => ({ x: 0.50 + (i % 2) * 0.06, y: 0.12 + i * 0.08 })),
    ],
  },
  freekicks: {
    teamA: [
      { x: 0.58, y: 0.50 },  // Cobrador
      { x: 0.75, y: 0.30 }, { x: 0.78, y: 0.45 }, { x: 0.80, y: 0.65 }, { x: 0.75, y: 0.75 },
      { x: 0.60, y: 0.25 }, { x: 0.60, y: 0.75 },
      { x: 0.30, y: 0.30 }, { x: 0.30, y: 0.50 }, { x: 0.30, y: 0.70 }, { x: 0.12, y: 0.50 },
    ],
    teamB: [
      { x: 0.955, y: 0.50 },  // GK
      { x: 0.70, y: 0.42 }, { x: 0.70, y: 0.47 }, { x: 0.70, y: 0.52 }, { x: 0.70, y: 0.57 },
      { x: 0.82, y: 0.25 }, { x: 0.82, y: 0.75 },
      { x: 0.85, y: 0.38 }, { x: 0.85, y: 0.62 },
      { x: 0.78, y: 0.30 }, { x: 0.78, y: 0.70 },
    ],
  },
  crossing: {
    teamA: [
      { x: 0.68, y: 0.08 }, { x: 0.80, y: 0.38 }, { x: 0.80, y: 0.58 }, { x: 0.76, y: 0.72 },
      { x: 0.55, y: 0.30 }, { x: 0.55, y: 0.50 }, { x: 0.55, y: 0.70 },
      { x: 0.35, y: 0.25 }, { x: 0.35, y: 0.50 }, { x: 0.35, y: 0.75 }, { x: 0.10, y: 0.50 },
    ],
    teamB: [
      { x: 0.955, y: 0.50 }, { x: 0.82, y: 0.32 }, { x: 0.82, y: 0.52 }, { x: 0.82, y: 0.72 },
      { x: 0.74, y: 0.25 }, { x: 0.74, y: 0.48 }, { x: 0.74, y: 0.68 },
      { x: 0.60, y: 0.22 }, { x: 0.60, y: 0.42 }, { x: 0.60, y: 0.62 }, { x: 0.60, y: 0.82 },
    ],
  },
  counterattack: {
    teamA: [
      { x: 0.06, y: 0.50 }, { x: 0.22, y: 0.20 }, { x: 0.22, y: 0.42 }, { x: 0.22, y: 0.62 }, { x: 0.22, y: 0.82 },
      { x: 0.42, y: 0.25 }, { x: 0.42, y: 0.50 }, { x: 0.42, y: 0.75 },
      { x: 0.58, y: 0.30 }, { x: 0.62, y: 0.50 }, { x: 0.58, y: 0.70 },
    ],
    teamB: [
      { x: 0.955, y: 0.50 }, { x: 0.80, y: 0.20 }, { x: 0.80, y: 0.42 }, { x: 0.80, y: 0.62 }, { x: 0.80, y: 0.82 },
      { x: 0.68, y: 0.30 }, { x: 0.68, y: 0.50 }, { x: 0.68, y: 0.70 },
      { x: 0.55, y: 0.38 }, { x: 0.55, y: 0.62 }, { x: 0.50, y: 0.50 },
    ],
  },
  pressing: {
    teamA: [
      { x: 0.06, y: 0.50 }, { x: 0.28, y: 0.15 }, { x: 0.28, y: 0.38 }, { x: 0.28, y: 0.62 }, { x: 0.28, y: 0.85 },
      { x: 0.48, y: 0.20 }, { x: 0.48, y: 0.42 }, { x: 0.48, y: 0.62 }, { x: 0.48, y: 0.82 },
      { x: 0.58, y: 0.35 }, { x: 0.58, y: 0.65 },
    ],
    teamB: [
      { x: 0.955, y: 0.50 }, { x: 0.82, y: 0.20 }, { x: 0.82, y: 0.42 }, { x: 0.82, y: 0.62 }, { x: 0.82, y: 0.82 },
      { x: 0.68, y: 0.25 }, { x: 0.68, y: 0.45 }, { x: 0.68, y: 0.65 }, { x: 0.68, y: 0.85 },
      { x: 0.58, y: 0.40 }, { x: 0.58, y: 0.60 },
    ],
  },
  tactical: {
    teamA: [
      { x: 0.06, y: 0.5 }, { x: 0.18, y: 0.15 }, { x: 0.18, y: 0.38 }, { x: 0.18, y: 0.62 }, { x: 0.18, y: 0.85 },
      { x: 0.35, y: 0.15 }, { x: 0.35, y: 0.38 }, { x: 0.35, y: 0.62 }, { x: 0.35, y: 0.85 },
      { x: 0.45, y: 0.35 }, { x: 0.45, y: 0.65 },
    ],
    teamB: [
      { x: 0.955, y: 0.5 }, { x: 0.82, y: 0.15 }, { x: 0.82, y: 0.38 }, { x: 0.82, y: 0.62 }, { x: 0.82, y: 0.85 },
      { x: 0.65, y: 0.15 }, { x: 0.65, y: 0.38 }, { x: 0.65, y: 0.62 }, { x: 0.65, y: 0.85 },
      { x: 0.55, y: 0.35 }, { x: 0.55, y: 0.65 },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function TrainingMatchCanvasInner({ clubName, onFinish }: TrainingMatchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedDrill, setSelectedDrill] = useState<DrillId>('tactical');
  const [elapsed, setElapsed] = useState(0);
  const [events, setEvents] = useState<DrillEvent[]>([]);
  const [score, setScore] = useState([0, 0]); // [scored, saved/missed]
  const [kickNum, setKickNum] = useState(0);

  // Refs for animation loop (no re-render dependency)
  const phaseRef = useRef<Phase>('select');
  const drillRef = useRef<DrillId>('tactical');
  const scoreRef = useRef([0, 0]);
  const kickNumRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastTimedEventRef = useRef(0);

  // Kick animation state
  const kickAnimRef = useRef({
    active: false,
    t: 0, // 0→1 progress
    result: null as KickResult | null,
    showingLabel: false,
    labelTimer: 0,
    ballStartX: 0, ballStartY: 0,
    gkStartY: 0,
  });

  // Player sprites for timed drills
  const spritesRef = useRef<{ ax: number[]; ay: number[]; bx: number[]; by: number[];
    atx: number[]; aty: number[]; btx: number[]; bty: number[];
    ballX: number; ballY: number; ballTX: number; ballTY: number }>({
    ax: [], ay: [], bx: [], by: [], atx: [], aty: [], btx: [], bty: [],
    ballX: 0.5, ballY: 0.5, ballTX: 0.5, ballTY: 0.5,
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
    s.ballX = 0.5; s.ballY = 0.5; s.ballTX = 0.5; s.ballTY = 0.5;
  }, []);

  const startKick = useCallback(() => {
    const drill = drillRef.current;
    const result = drill === 'penalties' ? generatePenaltyKick() : generateFreeKick();
    const ka = kickAnimRef.current;
    ka.active = true;
    ka.t = 0;
    ka.result = result;
    ka.showingLabel = false;
    ka.labelTimer = 0;
    ka.ballStartX = drill === 'penalties' ? 0.78 : 0.58;
    ka.ballStartY = 0.5;
    ka.gkStartY = 0.5;
    phaseRef.current = 'kicking';
    setPhase('kicking');
  }, []);

  const startTraining = useCallback(() => {
    drillRef.current = selectedDrill;
    scoreRef.current = [0, 0];
    kickNumRef.current = 0;
    startTimeRef.current = Date.now();
    lastTimedEventRef.current = Date.now();
    timedEventActiveRef.current = null;
    setScore([0, 0]);
    setKickNum(0);
    setElapsed(0);
    setEvents([]);
    initSprites(selectedDrill);

    const config = DRILL_OPTIONS.find(d => d.id === selectedDrill)!;
    if (config.kickBased) {
      phaseRef.current = 'running';
      setPhase('running');
      // Small delay then first kick
      setTimeout(() => startKick(), 800);
    } else {
      phaseRef.current = 'running';
      setPhase('running');
    }
  }, [selectedDrill, initSprites, startKick]);

  const finishTraining = useCallback(() => {
    phaseRef.current = 'finished';
    setPhase('finished');
    onFinish?.({
      duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
      drillsCompleted: kickNumRef.current,
      goalsScored: scoreRef.current[0],
      bestMoment: events.length > 0 ? events[events.length - 1].message : 'Treino completo!',
    });
  }, [events, onFinish]);

  // ── Canvas render loop ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 480, H = 280;
    canvas.width = W;
    canvas.height = H;

    let drift = 0;

    // ── Drawing helpers ──────────────────────────────────────────────
    const drawPitch = () => {
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? COLORS.pitch : COLORS.pitchLight;
        ctx.fillRect(i * (W / 10), 0, W / 10 + 1, H);
      }
      ctx.strokeStyle = COLORS.lines; ctx.lineWidth = 1.2;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.beginPath(); ctx.moveTo(W / 2, 2); ctx.lineTo(W / 2, H - 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 35, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = COLORS.lines;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeRect(2, H / 2 - 55, 52, 110);
      ctx.strokeRect(2, H / 2 - 30, 22, 60);
      ctx.strokeRect(W - 54, H / 2 - 55, 52, 110);
      ctx.strokeRect(W - 24, H / 2 - 30, 22, 60);
      // Goals
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(0, H / 2 - 30, 8, 60);
      ctx.fillRect(W - 8, H / 2 - 30, 8, 60);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, H / 2 - 30, 8, 60);
      ctx.strokeRect(W - 8, H / 2 - 30, 8, 60);
      // Penalty spots
      ctx.fillStyle = COLORS.lines;
      ctx.beginPath(); ctx.arc(W * 0.08, H / 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W * 0.78, H / 2, 2, 0, Math.PI * 2); ctx.fill();
    };

    const drawPlayer = (x: number, y: number, color: string, light: string, label: string, size = 7) => {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(x + 1, y + size * 0.7, size, size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = light; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(6, size - 1)}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5);
    };

    const drawBall = (x: number, y: number, scale = 1) => {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x + 1, y + 3 * scale, 4.5 * scale, 1.8 * scale, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.ball;
      ctx.beginPath(); ctx.arc(x, y, 4.5 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 0.8; ctx.stroke();
    };

    const drawLabel = (text: string, color: string, y: number) => {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      const tw = ctx.measureText(text).width;
      ctx.fillRect(W / 2 - tw / 2 - 20, y - 16, tw + 40, 32);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - tw / 2 - 20, y - 16, tw + 40, 32);
      ctx.fillStyle = color;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, W / 2, y);
    };

    const drawHUD = (left: string, center: string, right: string) => {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, W, 24);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(left, 10, 12);
      ctx.textAlign = 'center';
      ctx.fillText(center, W / 2, 12);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '10px Arial';
      ctx.fillText(right, W - 10, 12);
    };

    // ── Main loop ────────────────────────────────────────────────────
    const animate = () => {
      drift += 0.012;
      ctx.clearRect(0, 0, W, H);
      drawPitch();

      const drill = drillRef.current;
      const config = DRILL_OPTIONS.find(d => d.id === drill)!;
      const isKickBased = config.kickBased;
      const now = Date.now();

      // ── KICK-BASED DRILLS (penalties, free kicks) ──────────────────
      if (isKickBased) {
        const formation = FORMATIONS[drill];
        const ka = kickAnimRef.current;

        // Draw waiting players (small drift)
        for (let i = 1; i < 11; i++) {
          const p = formation.teamA[i];
          const dx = Math.sin(drift + i * 1.2) * 1.2;
          const dy = Math.cos(drift + i * 0.8) * 1.2;
          drawPlayer(p.x * W + dx, p.y * H + dy, COLORS.teamA, COLORS.teamALight, `${i + 1}`);
        }
        for (let i = 1; i < 11; i++) {
          const p = formation.teamB[i];
          const dx = Math.sin(drift + i * 0.9 + 2) * 1.2;
          const dy = Math.cos(drift + i * 1.1 + 1) * 1.2;
          drawPlayer(p.x * W + dx, p.y * H + dy, COLORS.teamB, COLORS.teamBLight, `${i + 1}`);
        }

        if (ka.active && ka.result) {
          ka.t += 0.018; // ~1.1s for full kick
          const t = Math.min(ka.t, 1);
          const et = easeOut(t);

          // Kicker: runs up slightly
          const kickerRunT = Math.min(t * 3, 1);
          const kickerX = lerp(ka.ballStartX, ka.ballStartX + 0.04, easeInOut(kickerRunT));
          drawPlayer(kickerX * W, 0.5 * H, COLORS.teamA, COLORS.teamALight, '⚡', 10);

          // GK: dives toward guess after ball is kicked
          const gkDiveT = Math.max(0, (t - 0.2) / 0.6);
          const gkET = easeOut(Math.min(gkDiveT, 1));
          const gkY = lerp(ka.gkStartY, ka.result.gkDiveY, gkET);
          const gkX = drill === 'penalties' ? 0.945 : 0.945;
          // GK stretches horizontally when diving
          const gkSize = 9 + (gkET > 0.3 ? 2 : 0);
          drawPlayer(gkX * W, gkY * H, COLORS.teamBGK, COLORS.teamBGKLight, 'GK', gkSize);

          // Ball: flies from start to target
          const ballFlyT = Math.max(0, (t - 0.15) / 0.55);
          const bET = easeOut(Math.min(ballFlyT, 1));
          if (ballFlyT > 0) {
            const bx = lerp(ka.ballStartX, ka.result.ballTargetX, bET);
            const by = lerp(ka.ballStartY, ka.result.ballTargetY, bET);
            // Arc for free kicks
            const arc = drill === 'freekicks' ? Math.sin(bET * Math.PI) * -0.08 : Math.sin(bET * Math.PI) * -0.02;
            drawBall(bx * W, (by + arc) * H, 1 + (1 - bET) * 0.3);
          } else {
            // Ball at kicker's feet
            drawBall(ka.ballStartX * W, 0.5 * H);
          }

          // Show result label after ball arrives
          if (t > 0.75 && !ka.showingLabel) {
            ka.showingLabel = true;
            ka.labelTimer = now;
            // Record result
            kickNumRef.current++;
            setKickNum(kickNumRef.current);
            const isGoal = ka.result.type === 'goal';
            if (isGoal) scoreRef.current[0]++;
            else scoreRef.current[1]++;
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
            drawLabel(`${r.icon} ${r.label}`, col, H / 2 + 50);
            // Sub-label
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(r.message, W / 2, H / 2 + 72);

            // Goal flash
            if (r.type === 'goal') {
              const flash = Math.sin((now - ka.labelTimer) * 0.015) * 0.08;
              if (flash > 0) {
                ctx.fillStyle = `rgba(16, 185, 129, ${flash})`;
                ctx.fillRect(0, 0, W, H);
              }
            }

            // After 2s showing label, proceed to next kick or finish
            if (now - ka.labelTimer > 2000) {
              ka.active = false;
              ka.result = null;
              ka.showingLabel = false;
              const totalKicks = config.totalKicks;
              if (kickNumRef.current >= totalKicks) {
                phaseRef.current = 'finished';
                setPhase('finished');
              } else {
                phaseRef.current = 'running';
                setPhase('running');
                setTimeout(() => startKick(), 600);
              }
            }
          }
        } else {
          // Not kicking — show kicker and GK in position, ball at spot
          const kp = formation.teamA[0];
          drawPlayer(kp.x * W, kp.y * H, COLORS.teamA, COLORS.teamALight, '⚡', 10);
          const gp = formation.teamB[0];
          const gkBob = Math.sin(drift * 3) * 2;
          drawPlayer(gp.x * W, gp.y * H + gkBob, COLORS.teamBGK, COLORS.teamBGKLight, 'GK', 9);
          // Ball at penalty/fk spot
          const spotX = drill === 'penalties' ? 0.78 : 0.60;
          drawBall(spotX * W, 0.5 * H);
        }

        // HUD
        if (phaseRef.current !== 'select') {
          const totalK = config.totalKicks;
          drawHUD(
            `Cobrança ${Math.min(kickNumRef.current + 1, totalK)}/${totalK}`,
            `⚽ ${scoreRef.current[0]}  ×  ${scoreRef.current[1]} 🛡️`,
            `${config.icon} ${config.name}`
          );
        }

      // ── TIMED DRILLS (tactical, crossing, etc) ─────────────────────
      } else {
        const s = spritesRef.current;
        const isRunning = phaseRef.current === 'running' || phaseRef.current === 'showing-result';
        const moveRange = 0.06;

        // Update targets
        if (isRunning && now - lastTargetRef.current > 2800) {
          lastTargetRef.current = now;
          const f = FORMATIONS[drill];
          for (let i = 0; i < 11; i++) {
            s.atx[i] = f.teamA[i].x + (Math.random() - 0.5) * moveRange;
            s.aty[i] = f.teamA[i].y + (Math.random() - 0.5) * moveRange;
            s.btx[i] = f.teamB[i].x + (Math.random() - 0.5) * moveRange;
            s.bty[i] = f.teamB[i].y + (Math.random() - 0.5) * moveRange;
          }
          const all = [...s.ax.map((x, i) => ({ x, y: s.ay[i] })), ...s.bx.map((x, i) => ({ x, y: s.by[i] }))];
          const tgt = all[Math.floor(Math.random() * all.length)];
          s.ballTX = tgt.x + (Math.random() - 0.5) * 0.04;
          s.ballTY = tgt.y + (Math.random() - 0.5) * 0.04;
        }

        // Lerp
        for (let i = 0; i < 11; i++) {
          s.ax[i] = lerp(s.ax[i], s.atx[i], 0.02);
          s.ay[i] = lerp(s.ay[i], s.aty[i], 0.02);
          s.bx[i] = lerp(s.bx[i], s.btx[i], 0.02);
          s.by[i] = lerp(s.by[i], s.bty[i], 0.02);
        }
        s.ballX = lerp(s.ballX, s.ballTX, 0.025);
        s.ballY = lerp(s.ballY, s.ballTY, 0.025);

        // Draw
        if (isRunning) {
          for (let i = 0; i < 11; i++) {
            drawPlayer(s.ax[i] * W, s.ay[i] * H, COLORS.teamA, COLORS.teamALight, i === 0 ? 'GK' : `${i + 1}`);
          }
          for (let i = 0; i < 11; i++) {
            drawPlayer(s.bx[i] * W, s.by[i] * H, COLORS.teamB, COLORS.teamBLight, i === 0 ? 'GK' : `${i + 1}`);
          }
          drawBall(s.ballX * W, s.ballY * H);
        } else {
          // idle/finished: formation with gentle drift
          const f = FORMATIONS[drill];
          f.teamA.forEach((p, i) => {
            drawPlayer(p.x * W + Math.sin(drift + i) * 1.5, p.y * H + Math.cos(drift + i * 0.7) * 1.5,
              COLORS.teamA, COLORS.teamALight, i === 0 ? 'GK' : `${i + 1}`);
          });
          f.teamB.forEach((p, i) => {
            drawPlayer(p.x * W + Math.sin(drift + i + 3) * 1.5, p.y * H + Math.cos(drift + i * 0.9 + 2) * 1.5,
              COLORS.teamB, COLORS.teamBLight, i === 0 ? 'GK' : `${i + 1}`);
          });
        }

        // Timed events
        if (isRunning && now - lastTimedEventRef.current > 7000 + Math.random() * 4000 && !timedEventActiveRef.current) {
          lastTimedEventRef.current = now;
          const pool = getTimedEvents(drill);
          const evt = pool[Math.floor(Math.random() * pool.length)];
          timedEventActiveRef.current = evt;
          timedEventTimerRef.current = now;
          kickNumRef.current++;
          setKickNum(kickNumRef.current);
          if (evt.isGoal) { scoreRef.current[0]++; setScore([...scoreRef.current]); }
          setEvents(prev => [...prev.slice(-9), evt]);
          phaseRef.current = 'showing-result';
          setPhase('showing-result');
        }

        // Show timed event overlay
        if (timedEventActiveRef.current) {
          const evt = timedEventActiveRef.current;
          ctx.fillStyle = evt.isGoal ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.2)';
          ctx.fillRect(0, 0, W, H);
          const col = evt.isGoal ? '#10b981' : 'rgba(255,255,255,0.9)';
          drawLabel(`${evt.icon} ${evt.message}`, col, H / 2);
          if (now - timedEventTimerRef.current > 2500) {
            timedEventActiveRef.current = null;
            phaseRef.current = 'running';
            setPhase('running');
          }
        }

        // Timer
        if (isRunning) {
          const sec = Math.floor((now - startTimeRef.current) / 1000);
          setElapsed(sec);
          if (sec >= config.duration) {
            phaseRef.current = 'finished';
            setPhase('finished');
            animRef.current = requestAnimationFrame(animate);
            return;
          }
          const mins = Math.floor(sec / 60);
          const secs = sec % 60;
          drawHUD(
            `⏱ ${mins}:${secs.toString().padStart(2, '0')}`,
            `⚽ ${scoreRef.current[0]} gols`,
            `${config.icon} ${clubName}`
          );
        }
      }

      // ── Overlays ───────────────────────────────────────────────────
      if (phaseRef.current === 'select') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🏋️ Treino Tático 2D', W / 2, H / 2 - 10);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Arial';
        ctx.fillText('Escolha o exercício abaixo', W / 2, H / 2 + 12);
      }

      if (phaseRef.current === 'finished') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✅ Treino Finalizado!', W / 2, H / 2 - 16);
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
        {/* Drill selection grid */}
        {phase === 'select' && (
          <div className="grid grid-cols-2 gap-1.5">
            {DRILL_OPTIONS.map(drill => (
              <button
                key={drill.id}
                onClick={() => {
                  setSelectedDrill(drill.id);
                  drillRef.current = drill.id;
                  initSprites(drill.id);
                }}
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
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg border border-border/20"
          style={{ aspectRatio: '480 / 280', imageRendering: 'auto' }}
        />

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
            <Badge variant="outline" className="text-[10px]">
              ⚽ {score[0]} gols
            </Badge>
          </div>
        )}

        {/* Progress */}
        {(phase === 'running' || phase === 'kicking' || phase === 'showing-result') && (
          <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 transition-all duration-300 rounded-full"
              style={{
                width: `${drillConfig.kickBased
                  ? Math.min(100, (kickNum / drillConfig.totalKicks) * 100)
                  : Math.min(100, (elapsed / drillConfig.duration) * 100)}%`
              }}
            />
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
            <Button onClick={() => { setPhase('select'); phaseRef.current = 'select'; setEvents([]); }} className="flex-1 gap-2" size="lg">
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
