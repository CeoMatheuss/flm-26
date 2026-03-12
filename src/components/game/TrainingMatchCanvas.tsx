/**
 * TrainingMatchCanvas — 2D training drills with specific formations.
 * Each drill type has its own player arrangement and animations.
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
  { id: 'tactical', name: 'Coletivo Tático', icon: '⚽', desc: 'Jogo completo 11x11', duration: 120 },
  { id: 'penalties', name: 'Pênaltis', icon: '🥅', desc: 'Cobranças de pênalti', duration: 90 },
  { id: 'freekicks', name: 'Faltas', icon: '🎯', desc: 'Cobranças de falta', duration: 90 },
  { id: 'crossing', name: 'Cruzamentos', icon: '↗️', desc: 'Cruzamentos e cabeceios', duration: 90 },
  { id: 'counterattack', name: 'Contra-Ataque', icon: '⚡', desc: 'Transição rápida', duration: 100 },
  { id: 'pressing', name: 'Marcação Pressão', icon: '🔥', desc: 'Pressing alto', duration: 100 },
] as const;

type DrillId = typeof DRILL_OPTIONS[number]['id'];
type TrainingPhase = 'select' | 'running' | 'drill-event' | 'finished';

interface DrillEvent {
  type: string;
  icon: string;
  message: string;
  isGoal?: boolean;
}

interface Sprite { x: number; y: number; tx: number; ty: number; }

const COLORS = {
  pitch: '#1a6e38', pitchLight: '#1f8244', lines: 'rgba(255,255,255,0.45)',
  ball: '#ffffff', teamA: '#2563eb', teamALight: '#60a5fa',
  teamB: '#f59e0b', teamBLight: '#fbbf24',
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ── Formation layouts per drill ──────────────────────────────────────────
function getFormation(drillId: DrillId): { teamA: { x: number; y: number }[]; teamB: { x: number; y: number }[] } {
  switch (drillId) {
    case 'penalties':
      return {
        // GK in goal, kicker at penalty spot, rest lined up at halfway
        teamA: [
          { x: 0.78, y: 0.5 },  // Cobrador na marca do pênalti
          { x: 0.5, y: 0.15 }, { x: 0.5, y: 0.28 }, { x: 0.5, y: 0.41 },
          { x: 0.5, y: 0.54 }, { x: 0.5, y: 0.67 }, { x: 0.5, y: 0.80 },
          { x: 0.42, y: 0.20 }, { x: 0.42, y: 0.40 }, { x: 0.42, y: 0.60 }, { x: 0.42, y: 0.80 },
        ],
        teamB: [
          { x: 0.94, y: 0.5 },  // Goleiro no gol
          { x: 0.5, y: 0.10 }, { x: 0.5, y: 0.23 }, { x: 0.5, y: 0.36 },
          { x: 0.5, y: 0.49 }, { x: 0.5, y: 0.62 }, { x: 0.5, y: 0.75 },
          { x: 0.58, y: 0.25 }, { x: 0.58, y: 0.45 }, { x: 0.58, y: 0.65 }, { x: 0.58, y: 0.85 },
        ],
      };
    case 'freekicks':
      return {
        // Kicker behind ball, wall of 4-5 players, GK, attackers near box
        teamA: [
          { x: 0.60, y: 0.50 },  // Cobrador atrás da bola
          { x: 0.75, y: 0.30 }, { x: 0.75, y: 0.45 }, { x: 0.80, y: 0.60 }, { x: 0.80, y: 0.75 },
          { x: 0.65, y: 0.20 }, { x: 0.65, y: 0.80 },
          { x: 0.30, y: 0.30 }, { x: 0.30, y: 0.50 }, { x: 0.30, y: 0.70 }, { x: 0.15, y: 0.50 },
        ],
        teamB: [
          { x: 0.94, y: 0.50 },  // Goleiro
          // Barreira
          { x: 0.72, y: 0.40 }, { x: 0.72, y: 0.46 }, { x: 0.72, y: 0.52 }, { x: 0.72, y: 0.58 },
          { x: 0.82, y: 0.25 }, { x: 0.82, y: 0.75 },
          { x: 0.85, y: 0.35 }, { x: 0.85, y: 0.65 },
          { x: 0.78, y: 0.30 }, { x: 0.78, y: 0.70 },
        ],
      };
    case 'crossing':
      return {
        // Crosser on the wing, attackers in the box, defenders marking
        teamA: [
          { x: 0.70, y: 0.08 },  // Cruzador na ponta
          { x: 0.80, y: 0.35 }, { x: 0.80, y: 0.55 }, { x: 0.78, y: 0.70 },
          { x: 0.55, y: 0.30 }, { x: 0.55, y: 0.50 }, { x: 0.55, y: 0.70 },
          { x: 0.35, y: 0.25 }, { x: 0.35, y: 0.50 }, { x: 0.35, y: 0.75 }, { x: 0.10, y: 0.50 },
        ],
        teamB: [
          { x: 0.94, y: 0.50 },  // Goleiro
          { x: 0.82, y: 0.30 }, { x: 0.82, y: 0.50 }, { x: 0.82, y: 0.70 },
          { x: 0.75, y: 0.25 }, { x: 0.75, y: 0.45 }, { x: 0.75, y: 0.65 },
          { x: 0.60, y: 0.20 }, { x: 0.60, y: 0.40 }, { x: 0.60, y: 0.60 }, { x: 0.60, y: 0.80 },
        ],
      };
    case 'counterattack':
      return {
        // Attackers sprinting forward, defenders retreating
        teamA: [
          { x: 0.06, y: 0.50 },
          { x: 0.25, y: 0.20 }, { x: 0.25, y: 0.40 }, { x: 0.25, y: 0.60 }, { x: 0.25, y: 0.80 },
          { x: 0.45, y: 0.25 }, { x: 0.45, y: 0.50 }, { x: 0.45, y: 0.75 },
          { x: 0.60, y: 0.30 }, { x: 0.65, y: 0.50 }, { x: 0.60, y: 0.70 },
        ],
        teamB: [
          { x: 0.94, y: 0.50 },
          { x: 0.80, y: 0.20 }, { x: 0.80, y: 0.40 }, { x: 0.80, y: 0.60 }, { x: 0.80, y: 0.80 },
          { x: 0.70, y: 0.30 }, { x: 0.70, y: 0.50 }, { x: 0.70, y: 0.70 },
          { x: 0.55, y: 0.35 }, { x: 0.55, y: 0.65 }, { x: 0.50, y: 0.50 },
        ],
      };
    case 'pressing':
      return {
        // High press: attackers pushed up, compact shape
        teamA: [
          { x: 0.06, y: 0.50 },
          { x: 0.30, y: 0.15 }, { x: 0.30, y: 0.38 }, { x: 0.30, y: 0.62 }, { x: 0.30, y: 0.85 },
          { x: 0.50, y: 0.20 }, { x: 0.50, y: 0.40 }, { x: 0.50, y: 0.60 }, { x: 0.50, y: 0.80 },
          { x: 0.60, y: 0.35 }, { x: 0.60, y: 0.65 },
        ],
        teamB: [
          { x: 0.94, y: 0.50 },
          { x: 0.82, y: 0.20 }, { x: 0.82, y: 0.40 }, { x: 0.82, y: 0.60 }, { x: 0.82, y: 0.80 },
          { x: 0.70, y: 0.25 }, { x: 0.70, y: 0.45 }, { x: 0.70, y: 0.65 }, { x: 0.70, y: 0.85 },
          { x: 0.60, y: 0.40 }, { x: 0.60, y: 0.60 },
        ],
      };
    default: // tactical 4-4-2
      return {
        teamA: [
          { x: 0.06, y: 0.5 }, { x: 0.18, y: 0.15 }, { x: 0.18, y: 0.38 },
          { x: 0.18, y: 0.62 }, { x: 0.18, y: 0.85 }, { x: 0.35, y: 0.15 },
          { x: 0.35, y: 0.38 }, { x: 0.35, y: 0.62 }, { x: 0.35, y: 0.85 },
          { x: 0.45, y: 0.35 }, { x: 0.45, y: 0.65 },
        ],
        teamB: [
          { x: 0.94, y: 0.5 }, { x: 0.82, y: 0.15 }, { x: 0.82, y: 0.38 },
          { x: 0.82, y: 0.62 }, { x: 0.82, y: 0.85 }, { x: 0.65, y: 0.15 },
          { x: 0.65, y: 0.38 }, { x: 0.65, y: 0.62 }, { x: 0.65, y: 0.85 },
          { x: 0.55, y: 0.35 }, { x: 0.55, y: 0.65 },
        ],
      };
  }
}

function getEventsForDrill(drillId: DrillId): DrillEvent[] {
  switch (drillId) {
    case 'penalties':
      return [
        { type: 'Gol de Pênalti!', icon: '⚽', message: 'Bateu firme no canto direito!', isGoal: true },
        { type: 'Pênalti Defendido!', icon: '🧤', message: 'Goleiro adivinhou o lado!' },
        { type: 'Pênalti na Trave!', icon: '📐', message: 'Bola explodiu no travessão!' },
        { type: 'Cavadinha!', icon: '⚽', message: 'Chip suave no meio do gol!', isGoal: true },
        { type: 'Pênalti pra Fora!', icon: '❌', message: 'Isolou a bola por cima!' },
      ];
    case 'freekicks':
      return [
        { type: 'Golaço de Falta!', icon: '⚽', message: 'Bola no ângulo!', isGoal: true },
        { type: 'Na Barreira!', icon: '🧱', message: 'A barreira bloqueou o chute!' },
        { type: 'Defesa Espetacular!', icon: '🧤', message: 'Goleiro voou e espalmou!' },
        { type: 'Bola na Trave!', icon: '📐', message: 'Bateu no ferro e voltou!' },
        { type: 'Cruzou na Área!', icon: '↗️', message: 'Zagueiro afastou de cabeça!' },
      ];
    case 'crossing':
      return [
        { type: 'Gol de Cabeça!', icon: '⚽', message: 'Cabeceio no segundo pau!', isGoal: true },
        { type: 'Cruzamento Perfeito', icon: '↗️', message: 'Ninguém alcançou!' },
        { type: 'Defesa no Alto!', icon: '🧤', message: 'Goleiro saiu e segurou!' },
        { type: 'Gol de Voleio!', icon: '⚽', message: 'Finalizou de primeira!', isGoal: true },
        { type: 'Afastou!', icon: '🦶', message: 'Zagueiro cortou de cabeça!' },
      ];
    case 'counterattack':
      return [
        { type: 'Gol no Contra-Ataque!', icon: '⚽', message: 'Arrancada e gol!', isGoal: true },
        { type: 'Passe Genial', icon: '🎯', message: 'Lançamento perfeito!' },
        { type: 'Desarme Salvador!', icon: '🦶', message: 'Zagueiro travou na hora H!' },
        { type: 'Grande Defesa!', icon: '🧤', message: 'Goleiro fechou o ângulo!' },
        { type: 'Impedimento!', icon: '🏳️', message: 'Atacante adiantado!' },
      ];
    case 'pressing':
      return [
        { type: 'Recuperou e Gol!', icon: '⚽', message: 'Pressing resultou em gol!', isGoal: true },
        { type: 'Desarme Alto!', icon: '🔥', message: 'Roubou no campo ofensivo!' },
        { type: 'Interceptação!', icon: '🦶', message: 'Cortou o passe na frente!' },
        { type: 'Falta Tática', icon: '⚠️', message: 'Parou o contra-ataque!' },
        { type: 'Gol após Pressão!', icon: '⚽', message: 'Forçou o erro e marcou!', isGoal: true },
      ];
    default:
      return [
        { type: 'Golaço!', icon: '⚽', message: 'Finalização no ângulo!', isGoal: true },
        { type: 'Grande Defesa', icon: '🧤', message: 'Espalmou no canto!' },
        { type: 'Drible Incrível', icon: '💨', message: 'Passou por 2!' },
        { type: 'Passe Genial', icon: '🎯', message: 'Assistência de calcanhar!' },
        { type: 'Bola na Trave', icon: '📐', message: 'Explodiu no ferro!' },
      ];
  }
}

// ── Ball animation config per drill ──────────────────────────────────────
function getBallBehavior(drillId: DrillId, phase: 'kick' | 'idle', t: number, W: number, H: number) {
  switch (drillId) {
    case 'penalties': {
      if (phase === 'kick') {
        // Ball goes from penalty spot toward goal
        const bx = lerp(0.78 * W, 0.94 * W, t);
        const by = lerp(0.5 * H, (0.35 + Math.random() * 0.01) * H, Math.min(t, 1));
        return { x: bx, y: by };
      }
      return { x: 0.76 * W, y: 0.5 * H }; // resting at spot
    }
    case 'freekicks': {
      if (phase === 'kick') {
        const bx = lerp(0.62 * W, 0.94 * W, t);
        const arc = Math.sin(t * Math.PI) * -30;
        return { x: bx, y: 0.5 * H + arc };
      }
      return { x: 0.62 * W, y: 0.5 * H };
    }
    case 'crossing': {
      if (phase === 'kick') {
        const bx = lerp(0.70 * W, 0.82 * W, t);
        const by = lerp(0.08 * H, 0.45 * H, t);
        const arc = Math.sin(t * Math.PI) * -25;
        return { x: bx, y: by + arc };
      }
      return { x: 0.68 * W, y: 0.10 * H };
    }
    default:
      return null; // use sprite-based ball
  }
}

function TrainingMatchCanvasInner({ clubName, onFinish }: TrainingMatchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [phase, setPhase] = useState<TrainingPhase>('select');
  const [selectedDrill, setSelectedDrill] = useState<DrillId>('tactical');
  const [elapsed, setElapsed] = useState(0);
  const [events, setEvents] = useState<DrillEvent[]>([]);
  const [goals, setGoals] = useState([0, 0]);
  const [drillCount, setDrillCount] = useState(0);
  const startTimeRef = useRef(0);
  const lastEventRef = useRef(0);
  const activeEventRef = useRef<DrillEvent | null>(null);
  const goalsRef = useRef([0, 0]);
  const drillCountRef = useRef(0);
  const phaseRef = useRef<TrainingPhase>('select');
  const selectedDrillRef = useRef<DrillId>('tactical');
  const spritesARef = useRef<Sprite[]>([]);
  const spritesBRef = useRef<Sprite[]>([]);
  const ballSpriteRef = useRef<Sprite>({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const lastTargetRef = useRef(0);
  const kickPhaseRef = useRef(0); // 0-1 for ball kick animation

  const drillConfig = DRILL_OPTIONS.find(d => d.id === selectedDrill)!;

  const initSprites = useCallback((drill: DrillId) => {
    const formation = getFormation(drill);
    spritesARef.current = formation.teamA.map(p => ({ x: p.x, y: p.y, tx: p.x, ty: p.y }));
    spritesBRef.current = formation.teamB.map(p => ({ x: p.x, y: p.y, tx: p.x, ty: p.y }));
    ballSpriteRef.current = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  }, []);

  const startTraining = useCallback(() => {
    phaseRef.current = 'running';
    selectedDrillRef.current = selectedDrill;
    setPhase('running');
    setElapsed(0);
    setEvents([]);
    setGoals([0, 0]);
    setDrillCount(0);
    goalsRef.current = [0, 0];
    drillCountRef.current = 0;
    startTimeRef.current = Date.now();
    lastEventRef.current = Date.now();
    activeEventRef.current = null;
    lastTargetRef.current = 0;
    kickPhaseRef.current = 0;
    initSprites(selectedDrill);
  }, [selectedDrill, initSprites]);

  const stopTraining = useCallback(() => {
    phaseRef.current = 'finished';
    setPhase('finished');
    onFinish?.({
      duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
      drillsCompleted: drillCountRef.current,
      goalsScored: goalsRef.current[0] + goalsRef.current[1],
      bestMoment: events.length > 0 ? events[events.length - 1].message : 'Treino completo!',
    });
  }, [events, onFinish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 480, H = 280;
    canvas.width = W;
    canvas.height = H;

    if (spritesARef.current.length === 0) {
      initSprites(selectedDrillRef.current);
    }

    let drift = 0;

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
      // Penalty areas
      ctx.strokeRect(2, H / 2 - 55, 52, 110);
      ctx.strokeRect(2, H / 2 - 30, 22, 60);
      ctx.strokeRect(W - 54, H / 2 - 55, 52, 110);
      ctx.strokeRect(W - 24, H / 2 - 30, 22, 60);
      // Goals
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(0, H / 2 - 30, 8, 60);
      ctx.fillRect(W - 8, H / 2 - 30, 8, 60);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(0, H / 2 - 30, 8, 60);
      ctx.strokeRect(W - 8, H / 2 - 30, 8, 60);
      // Penalty spots
      ctx.fillStyle = COLORS.lines;
      ctx.beginPath(); ctx.arc(W * 0.08, H / 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W * 0.92, H / 2, 2, 0, Math.PI * 2); ctx.fill();
    };

    const drawPlayer = (x: number, y: number, color: string, light: string, label: string, size = 7) => {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(x + 1, y + size * 0.7, size, size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = light; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `bold ${Math.max(6, size - 1)}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5);
    };

    const drawBall = (x: number, y: number, scale = 1) => {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(x + 1, y + 3, 4.5 * scale, 1.8 * scale, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.ball;
      ctx.beginPath(); ctx.arc(x, y, 4.5 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 0.8; ctx.stroke();
    };

    const animate = () => {
      drift += 0.012;
      ctx.clearRect(0, 0, W, H);
      drawPitch();

      const isRunning = phaseRef.current === 'running' || phaseRef.current === 'drill-event';
      const now = Date.now();
      const drill = selectedDrillRef.current;

      // Determine movement range based on drill type
      const moveRange = (drill === 'penalties' || drill === 'freekicks') ? 0.015 : 0.06;
      const lerpSpeed = 0.02;

      // Update targets periodically
      if (isRunning && now - lastTargetRef.current > 3000) {
        lastTargetRef.current = now;
        const formation = getFormation(drill);
        spritesARef.current = spritesARef.current.map((sp, i) => ({
          ...sp,
          tx: formation.teamA[i].x + (Math.random() - 0.5) * moveRange,
          ty: formation.teamA[i].y + (Math.random() - 0.5) * moveRange,
        }));
        spritesBRef.current = spritesBRef.current.map((sp, i) => ({
          ...sp,
          tx: formation.teamB[i].x + (Math.random() - 0.5) * moveRange,
          ty: formation.teamB[i].y + (Math.random() - 0.5) * moveRange,
        }));
        // Ball follows a random player for tactical/counterattack/pressing
        if (drill === 'tactical' || drill === 'counterattack' || drill === 'pressing') {
          const all = [...spritesARef.current, ...spritesBRef.current];
          const target = all[Math.floor(Math.random() * all.length)];
          ballSpriteRef.current.tx = target.x + (Math.random() - 0.5) * 0.04;
          ballSpriteRef.current.ty = target.y + (Math.random() - 0.5) * 0.04;
        }
      }

      // Lerp sprites
      spritesARef.current = spritesARef.current.map(sp => ({
        ...sp, x: lerp(sp.x, sp.tx, lerpSpeed), y: lerp(sp.y, sp.ty, lerpSpeed),
      }));
      spritesBRef.current = spritesBRef.current.map(sp => ({
        ...sp, x: lerp(sp.x, sp.tx, lerpSpeed), y: lerp(sp.y, sp.ty, lerpSpeed),
      }));
      const bl = ballSpriteRef.current;
      ballSpriteRef.current = { ...bl, x: lerp(bl.x, bl.tx, 0.025), y: lerp(bl.y, bl.ty, 0.025) };

      // Draw sprites
      if (!isRunning) {
        // Idle/select: gentle drift using formation positions
        const formation = getFormation(drill);
        formation.teamA.forEach((p, i) => {
          const dx = Math.sin(drift + i * 1.3) * 1.5;
          const dy = Math.cos(drift + i * 0.9) * 1.5;
          drawPlayer(p.x * W + dx, p.y * H + dy, COLORS.teamA, COLORS.teamALight, i === 0 ? 'GK' : `${i + 1}`);
        });
        formation.teamB.forEach((p, i) => {
          const dx = Math.sin(drift + i * 1.1 + 3) * 1.5;
          const dy = Math.cos(drift + i * 0.7 + 2) * 1.5;
          drawPlayer(p.x * W + dx, p.y * H + dy, COLORS.teamB, COLORS.teamBLight, i === 0 ? 'GK' : `${i + 1}`);
        });
      } else {
        // Running: draw from sprites
        spritesARef.current.forEach((sp, i) => {
          const label = (drill === 'penalties' && i === 0) ? '⚡' : (i === 0 && drill !== 'tactical' ? 'GK' : `${i + 1}`);
          const size = (drill === 'penalties' && i === 0) ? 9 : 7;
          drawPlayer(sp.x * W, sp.y * H, COLORS.teamA, COLORS.teamALight, label, size);
        });
        spritesBRef.current.forEach((sp, i) => {
          const label = i === 0 ? 'GK' : `${i + 1}`;
          const size = i === 0 ? 9 : 7;
          drawPlayer(sp.x * W, sp.y * H, COLORS.teamB, COLORS.teamBLight, label, size);
        });

        // Ball
        const specialBall = getBallBehavior(drill, phaseRef.current === 'drill-event' ? 'kick' : 'idle', kickPhaseRef.current, W, H);
        if (specialBall) {
          drawBall(specialBall.x, specialBall.y);
        } else {
          drawBall(ballSpriteRef.current.x * W, ballSpriteRef.current.y * H);
        }

        // Advance kick phase during events
        if (phaseRef.current === 'drill-event') {
          kickPhaseRef.current = Math.min(1, kickPhaseRef.current + 0.02);
        } else {
          kickPhaseRef.current = 0;
        }
      }

      // Event overlay
      const ev = activeEventRef.current;
      if (ev && phaseRef.current === 'drill-event') {
        ctx.fillStyle = ev.isGoal ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, H / 2 - 24, W, 48);
        ctx.fillStyle = ev.isGoal ? '#10b981' : 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${ev.icon} ${ev.type}`, W / 2, H / 2 - 6);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Arial';
        ctx.fillText(ev.message, W / 2, H / 2 + 12);

        // Goal flash
        if (ev.isGoal && kickPhaseRef.current > 0.7) {
          const flash = Math.sin(kickPhaseRef.current * 20) * 0.1;
          if (flash > 0) {
            ctx.fillStyle = `rgba(251, 191, 36, ${flash})`;
            ctx.fillRect(0, 0, W, H);
          }
        }
      }

      // Select overlay
      if (phaseRef.current === 'select') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🏋️ Treino Tático 2D', W / 2, H / 2 - 10);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Arial';
        ctx.fillText('Escolha o exercício abaixo', W / 2, H / 2 + 12);
      }

      // Finished overlay
      if (phaseRef.current === 'finished') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✅ Treino Finalizado!', W / 2, H / 2 - 12);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px Arial';
        ctx.fillText(`${goalsRef.current[0] + goalsRef.current[1]} gols · ${drillCountRef.current} lances`, W / 2, H / 2 + 10);
      }

      // HUD
      if (isRunning) {
        const sec = Math.floor((now - startTimeRef.current) / 1000);
        setElapsed(sec);
        const duration = DRILL_OPTIONS.find(d => d.id === selectedDrillRef.current)?.duration ?? 120;
        if (sec >= duration) {
          phaseRef.current = 'finished';
          setPhase('finished');
          animRef.current = requestAnimationFrame(animate);
          return;
        }

        // Events every ~7-10s
        if (now - lastEventRef.current > 7000 + Math.random() * 3000) {
          lastEventRef.current = now;
          const pool = getEventsForDrill(selectedDrillRef.current);
          const evt = pool[Math.floor(Math.random() * pool.length)];
          activeEventRef.current = evt;
          kickPhaseRef.current = 0;
          phaseRef.current = 'drill-event';
          setPhase('drill-event');
          setEvents(prev => [...prev.slice(-9), evt]);
          drillCountRef.current++;
          setDrillCount(drillCountRef.current);
          if (evt.isGoal) {
            const team = Math.random() < 0.6 ? 0 : 1;
            goalsRef.current[team]++;
            setGoals([...goalsRef.current]);
          }
          setTimeout(() => {
            activeEventRef.current = null;
            kickPhaseRef.current = 0;
            phaseRef.current = 'running';
            setPhase('running');
          }, 2500);
        }

        // HUD bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, 22);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        ctx.fillText(`⏱ ${mins}:${secs.toString().padStart(2, '0')}`, 8, 11);
        ctx.textAlign = 'center';
        ctx.fillText(`${goalsRef.current[0]} ⚽ ${goalsRef.current[1]}`, W / 2, 11);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '9px Arial';
        const drillLabel = DRILL_OPTIONS.find(d => d.id === selectedDrillRef.current)?.icon ?? '';
        ctx.fillText(`${drillLabel} ${clubName}`, W - 8, 11);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, clubName, initSprites]);

  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

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
                onClick={() => {
                  setSelectedDrill(drill.id);
                  selectedDrillRef.current = drill.id;
                  initSprites(drill.id);
                }}
                className={`text-left p-2 rounded-lg border transition-all ${
                  selectedDrill === drill.id
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border/30 bg-card/50 hover:border-border/60'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{drill.icon}</span>
                  <span className="text-[10px] font-bold">{drill.name}</span>
                </div>
                <p className="text-[8px] text-muted-foreground mt-0.5">{drill.desc}</p>
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

        {/* Running badges */}
        {(phase === 'running' || phase === 'drill-event') && (
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] gap-1">
              {drillConfig.icon} {drillConfig.name}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono">
              ⏱ {formatTime(elapsed)} / {formatTime(drillConfig.duration)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {drillCount} lances
            </Badge>
          </div>
        )}

        {/* Progress */}
        {(phase === 'running' || phase === 'drill-event') && (
          <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (elapsed / drillConfig.duration) * 100)}%` }}
            />
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div className="max-h-[100px] overflow-y-auto space-y-0.5">
            {[...events].reverse().map((ev, i) => (
              <div key={i} className={`text-[10px] px-2 py-1 rounded ${ev.isGoal ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/10 text-muted-foreground'}`}>
                {ev.icon} {ev.message}
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {phase === 'select' && (
            <Button onClick={startTraining} className="flex-1 gap-2">
              <Play className="h-4 w-4" /> Iniciar {drillConfig.name}
            </Button>
          )}
          {(phase === 'running' || phase === 'drill-event') && (
            <Button onClick={stopTraining} variant="destructive" className="flex-1 gap-2">
              <Square className="h-4 w-4" /> Parar
            </Button>
          )}
          {phase === 'finished' && (
            <Button onClick={() => { setPhase('select'); setEvents([]); initSprites(selectedDrill); }} className="flex-1 gap-2">
              <RotateCcw className="h-4 w-4" /> Escolher Outro Treino
            </Button>
          )}
        </div>

        {/* Finished stats */}
        {phase === 'finished' && (
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-muted/10 rounded p-1.5">
              <p className="text-[9px] text-muted-foreground">⚽ Gols</p>
              <p className="text-sm font-bold">{goals[0] + goals[1]}</p>
            </div>
            <div className="bg-muted/10 rounded p-1.5">
              <p className="text-[9px] text-muted-foreground">🎯 Lances</p>
              <p className="text-sm font-bold">{drillCount}</p>
            </div>
            <div className="bg-muted/10 rounded p-1.5">
              <p className="text-[9px] text-muted-foreground">⏱ Duração</p>
              <p className="text-sm font-bold">{formatTime(elapsed)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const TrainingMatchCanvas = memo(TrainingMatchCanvasInner);
