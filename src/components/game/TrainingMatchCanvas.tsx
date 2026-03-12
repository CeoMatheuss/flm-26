/**
 * TrainingMatchCanvas — 2D training scrimmage visualization.
 * Runs entirely client-side. Shows 22 players doing training drills.
 */

import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RotateCcw, Dumbbell } from 'lucide-react';

interface TrainingMatchCanvasProps {
  clubName: string;
  primaryColor?: string;
  secondaryColor?: string;
  onFinish?: (report: TrainingReport) => void;
}

export interface TrainingReport {
  duration: number;
  drillsCompleted: number;
  goalsScored: number;
  bestMoment: string;
}

const DRILL_TYPES = [
  { name: 'Posse de Bola', icon: '⚽', desc: 'Troca de passes em espaço reduzido' },
  { name: 'Finalização', icon: '🎯', desc: 'Treino de chutes a gol' },
  { name: 'Cruzamento', icon: '↗️', desc: 'Cruzamentos e cabeceios' },
  { name: 'Contra-Ataque', icon: '⚡', desc: 'Transição rápida defesa-ataque' },
  { name: 'Marcação Pressão', icon: '🔥', desc: 'Pressing alto e recuperação' },
  { name: 'Bola Parada', icon: '🏳️', desc: 'Cobranças de falta e escanteio' },
];

const PITCH_COLORS = {
  pitch: '#1a6e38',
  pitchLight: '#1f8244',
  lines: 'rgba(255,255,255,0.45)',
  ball: '#ffffff',
  teamA: '#2563eb',
  teamALight: '#60a5fa',
  teamB: '#f59e0b',
  teamBLight: '#fbbf24',
};

// 4-4-2 positions
const TEAM_A_POS = [
  { x: 0.06, y: 0.5 }, { x: 0.18, y: 0.15 }, { x: 0.18, y: 0.38 },
  { x: 0.18, y: 0.62 }, { x: 0.18, y: 0.85 }, { x: 0.35, y: 0.15 },
  { x: 0.35, y: 0.38 }, { x: 0.35, y: 0.62 }, { x: 0.35, y: 0.85 },
  { x: 0.45, y: 0.35 }, { x: 0.45, y: 0.65 },
];

const TEAM_B_POS = [
  { x: 0.94, y: 0.5 }, { x: 0.82, y: 0.15 }, { x: 0.82, y: 0.38 },
  { x: 0.82, y: 0.62 }, { x: 0.82, y: 0.85 }, { x: 0.65, y: 0.15 },
  { x: 0.65, y: 0.38 }, { x: 0.65, y: 0.62 }, { x: 0.65, y: 0.85 },
  { x: 0.55, y: 0.35 }, { x: 0.55, y: 0.65 },
];

type TrainingPhase = 'idle' | 'running' | 'drill-event' | 'finished';

interface DrillEvent {
  type: string;
  icon: string;
  message: string;
  isGoal?: boolean;
}

function TrainingMatchCanvasInner({ clubName, primaryColor, secondaryColor, onFinish }: TrainingMatchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [phase, setPhase] = useState<TrainingPhase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [currentDrill, setCurrentDrill] = useState(DRILL_TYPES[0]);
  const [events, setEvents] = useState<DrillEvent[]>([]);
  const [goals, setGoals] = useState([0, 0]);
  const [drillCount, setDrillCount] = useState(0);
  const startTimeRef = useRef(0);
  const lastDrillRef = useRef(0);
  const lastEventRef = useRef(0);
  const activeEventRef = useRef<DrillEvent | null>(null);
  const goalsRef = useRef([0, 0]);
  const drillCountRef = useRef(0);

  const TRAINING_DURATION = 120; // 2 minutes

  const startTraining = useCallback(() => {
    setPhase('running');
    setElapsed(0);
    setEvents([]);
    setGoals([0, 0]);
    setDrillCount(0);
    goalsRef.current = [0, 0];
    drillCountRef.current = 0;
    startTimeRef.current = Date.now();
    lastDrillRef.current = Date.now();
    lastEventRef.current = Date.now();
    activeEventRef.current = null;
    setCurrentDrill(DRILL_TYPES[Math.floor(Math.random() * DRILL_TYPES.length)]);
  }, []);

  const stopTraining = useCallback(() => {
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

    let drift = 0;

    const drawPitch = () => {
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? PITCH_COLORS.pitch : PITCH_COLORS.pitchLight;
        ctx.fillRect(i * (W / 10), 0, W / 10 + 1, H);
      }
      ctx.strokeStyle = PITCH_COLORS.lines;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.beginPath(); ctx.moveTo(W / 2, 2); ctx.lineTo(W / 2, H - 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 35, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = PITCH_COLORS.lines;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeRect(2, H / 2 - 55, 52, 110);
      ctx.strokeRect(2, H / 2 - 30, 22, 60);
      ctx.strokeRect(W - 54, H / 2 - 55, 52, 110);
      ctx.strokeRect(W - 24, H / 2 - 30, 22, 60);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(0, H / 2 - 30, 8, 60);
      ctx.fillRect(W - 8, H / 2 - 30, 8, 60);
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
      ctx.fillStyle = PITCH_COLORS.ball;
      ctx.beginPath(); ctx.arc(x, y, 4.5 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 0.8; ctx.stroke();
    };

    const animate = () => {
      drift += 0.025;
      ctx.clearRect(0, 0, W, H);
      drawPitch();

      const isRunning = phase === 'running' || phase === 'drill-event';
      const driftAmt = isRunning ? 4 : 2;
      const speedMul = isRunning ? 1.5 : 0.5;

      // Draw all 22 players
      TEAM_A_POS.forEach((p, i) => {
        const dx = Math.sin(drift * speedMul + i * 1.3) * driftAmt;
        const dy = Math.cos(drift * speedMul + i * 0.9) * driftAmt;
        drawPlayer(p.x * W + dx, p.y * H + dy, PITCH_COLORS.teamA, PITCH_COLORS.teamALight, `${i + 1}`);
      });
      TEAM_B_POS.forEach((p, i) => {
        const dx = Math.sin(drift * speedMul + i * 1.1 + 3) * driftAmt;
        const dy = Math.cos(drift * speedMul + i * 0.7 + 2) * driftAmt;
        drawPlayer(p.x * W + dx, p.y * H + dy, PITCH_COLORS.teamB, PITCH_COLORS.teamBLight, `${i + 1}`);
      });

      // Ball movement
      if (isRunning) {
        const bx = W * 0.5 + Math.sin(drift * 2.5) * W * 0.25;
        const by = H * 0.5 + Math.cos(drift * 1.8) * H * 0.25;
        drawBall(bx, by);
      }

      // Drill event overlay
      const ev = activeEventRef.current;
      if (ev && phase === 'drill-event') {
        ctx.fillStyle = ev.isGoal ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, H / 2 - 24, W, 48);
        ctx.fillStyle = ev.isGoal ? '#10b981' : 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${ev.icon} ${ev.type}`, W / 2, H / 2 - 6);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '10px Arial';
        ctx.fillText(ev.message, W / 2, H / 2 + 12);
      }

      // Idle overlay
      if (phase === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🏋️ Treino Tático 2D', W / 2, H / 2 - 10);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Arial';
        ctx.fillText('Pressione Iniciar para começar', W / 2, H / 2 + 12);
      }

      // Finished overlay
      if (phase === 'finished') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✅ Treino Finalizado!', W / 2, H / 2 - 12);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px Arial';
        ctx.fillText(`${goalsRef.current[0] + goalsRef.current[1]} gols · ${drillCountRef.current} exercícios`, W / 2, H / 2 + 10);
      }

      // Timer and score during training
      if (isRunning) {
        const now = Date.now();
        const sec = Math.floor((now - startTimeRef.current) / 1000);
        setElapsed(sec);

        // Auto-finish
        if (sec >= TRAINING_DURATION) {
          setPhase('finished');
          return;
        }

        // Switch drill every ~15 seconds
        if (now - lastDrillRef.current > 15000) {
          lastDrillRef.current = now;
          const newDrill = DRILL_TYPES[Math.floor(Math.random() * DRILL_TYPES.length)];
          setCurrentDrill(newDrill);
          drillCountRef.current++;
          setDrillCount(drillCountRef.current);
        }

        // Random events every ~8 seconds
        if (now - lastEventRef.current > 8000 + Math.random() * 4000) {
          lastEventRef.current = now;
          const evtPool: DrillEvent[] = [
            { type: 'Golaço no Treino!', icon: '⚽', message: 'Finalização perfeita no ângulo!', isGoal: true },
            { type: 'Grande Defesa', icon: '🧤', message: 'Goleiro espalmou no canto!' },
            { type: 'Drible Incrível', icon: '💨', message: 'Passou por 2 marcadores!' },
            { type: 'Passe Genial', icon: '🎯', message: 'Assistência de calcanhar!' },
            { type: 'Desarme Firme', icon: '🦶', message: 'Recuperou a bola com estilo!' },
            { type: 'Bola na Trave', icon: '📐', message: 'Quase! Bola explodiu no ferro!' },
            { type: 'Golaço de Falta!', icon: '⚽', message: 'Cobrança certeira no ângulo!', isGoal: true },
            { type: 'Cruzamento Perfeito', icon: '↗️', message: 'Bola na medida para o cabeceio!' },
          ];
          const evt = evtPool[Math.floor(Math.random() * evtPool.length)];
          activeEventRef.current = evt;
          setPhase('drill-event');
          setEvents(prev => [...prev.slice(-9), evt]);
          if (evt.isGoal) {
            const team = Math.random() < 0.6 ? 0 : 1;
            goalsRef.current[team]++;
            setGoals([...goalsRef.current]);
          }
          setTimeout(() => {
            activeEventRef.current = null;
            setPhase('running');
          }, 2500);
        }

        // HUD: timer + score
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, 22);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        ctx.fillText(`⏱ ${mins}:${secs.toString().padStart(2, '0')}`, 8, 11);
        ctx.textAlign = 'center';
        ctx.fillText(`${goalsRef.current[0]} ⚽ ${goalsRef.current[1]}`, W / 2, 11);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '9px Arial';
        ctx.fillText(`${clubName}`, W - 8, 11);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, clubName]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" /> Treino Tático 2D
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg border border-border/20"
          style={{ aspectRatio: '480 / 280', imageRendering: 'auto' }}
        />

        {/* Current drill badge */}
        {(phase === 'running' || phase === 'drill-event') && (
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] gap-1">
              {currentDrill.icon} {currentDrill.name}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono">
              ⏱ {formatTime(elapsed)} / {formatTime(TRAINING_DURATION)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {drillCount} exercícios
            </Badge>
          </div>
        )}

        {/* Progress bar */}
        {(phase === 'running' || phase === 'drill-event') && (
          <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (elapsed / TRAINING_DURATION) * 100)}%` }}
            />
          </div>
        )}

        {/* Events log */}
        {events.length > 0 && (
          <div className="max-h-[120px] overflow-y-auto space-y-0.5">
            {[...events].reverse().map((ev, i) => (
              <div key={i} className={`text-[10px] px-2 py-1 rounded ${ev.isGoal ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/10 text-muted-foreground'}`}>
                {ev.icon} {ev.message}
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {phase === 'idle' && (
            <Button onClick={startTraining} className="flex-1 gap-2">
              <Play className="h-4 w-4" /> Iniciar Treino
            </Button>
          )}
          {(phase === 'running' || phase === 'drill-event') && (
            <Button onClick={stopTraining} variant="destructive" className="flex-1 gap-2">
              <Square className="h-4 w-4" /> Parar
            </Button>
          )}
          {phase === 'finished' && (
            <>
              <Button onClick={startTraining} className="flex-1 gap-2">
                <RotateCcw className="h-4 w-4" /> Treinar Novamente
              </Button>
            </>
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
              <p className="text-[9px] text-muted-foreground">🏋️ Exercícios</p>
              <p className="text-sm font-bold">{drillCount}</p>
            </div>
            <div className="bg-muted/10 rounded p-1.5">
              <p className="text-[9px] text-muted-foreground">⏱ Duração</p>
              <p className="text-sm font-bold">{formatTime(elapsed)}</p>
            </div>
          </div>
        )}

        <p className="text-[9px] text-muted-foreground text-center">
          Treino coletivo com 22 jogadores • Exercícios táticos automáticos • 2 minutos
        </p>
      </CardContent>
    </Card>
  );
}

export const TrainingMatchCanvas = memo(TrainingMatchCanvasInner);
