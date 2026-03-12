/**
 * TrainingMatchCanvas — 2D training scrimmage visualization.
 * Now with drill type selection (penalties, free kicks, etc.)
 * and slower, more organic player/ball movement.
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

const DRILL_OPTIONS = [
  { id: 'tactical', name: 'Coletivo Tático', icon: '⚽', desc: 'Jogo completo com 22 jogadores', duration: 120 },
  { id: 'penalties', name: 'Pênaltis', icon: '🥅', desc: 'Treino de cobranças de pênalti', duration: 90 },
  { id: 'freekicks', name: 'Faltas', icon: '🎯', desc: 'Cobranças de falta e posicionamento', duration: 90 },
  { id: 'crossing', name: 'Cruzamentos', icon: '↗️', desc: 'Cruzamentos e cabeceios na área', duration: 90 },
  { id: 'counterattack', name: 'Contra-Ataque', icon: '⚡', desc: 'Transição rápida defesa-ataque', duration: 100 },
  { id: 'pressing', name: 'Marcação Pressão', icon: '🔥', desc: 'Pressing alto e recuperação', duration: 100 },
] as const;

type DrillId = typeof DRILL_OPTIONS[number]['id'];

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

type TrainingPhase = 'select' | 'running' | 'drill-event' | 'finished';

interface DrillEvent {
  type: string;
  icon: string;
  message: string;
  isGoal?: boolean;
}

interface PlayerSprite {
  x: number; y: number;
  tx: number; ty: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
        { type: 'Golaço de Falta!', icon: '⚽', message: 'Bola no ângulo, sem chance pro goleiro!', isGoal: true },
        { type: 'Na Barreira!', icon: '🧱', message: 'A barreira bloqueou o chute!' },
        { type: 'Defesa Espetacular!', icon: '🧤', message: 'Goleiro voou e espalmou!' },
        { type: 'Bola na Trave!', icon: '📐', message: 'Quase! Bateu no ferro e voltou!' },
        { type: 'Falta Cobrada!', icon: '⚽', message: 'Cruzou na área e o zagueiro afastou!' },
      ];
    case 'crossing':
      return [
        { type: 'Gol de Cabeça!', icon: '⚽', message: 'Cabeceio certeiro no segundo pau!', isGoal: true },
        { type: 'Cruzamento Perfeito', icon: '↗️', message: 'Bola na medida mas ninguém alcançou!' },
        { type: 'Defesa no Alto!', icon: '🧤', message: 'Goleiro saiu bem e segurou firme!' },
        { type: 'Gol de Voleio!', icon: '⚽', message: 'Finalizou de primeira no ar!', isGoal: true },
        { type: 'Afastou!', icon: '🦶', message: 'Zagueiro cortou de cabeça!' },
      ];
    case 'counterattack':
      return [
        { type: 'Gol no Contra-Ataque!', icon: '⚽', message: 'Arrancada e finalização certeira!', isGoal: true },
        { type: 'Passe Genial', icon: '🎯', message: 'Lançamento perfeito em profundidade!' },
        { type: 'Desarme Salvador!', icon: '🦶', message: 'Zagueiro travou na hora H!' },
        { type: 'Grande Defesa!', icon: '🧤', message: 'Goleiro fechou o ângulo!' },
        { type: 'Impedimento!', icon: '🏳️', message: 'Atacante saiu antes da hora!' },
      ];
    case 'pressing':
      return [
        { type: 'Recuperou e Finalizou!', icon: '⚽', message: 'Pressing resultou em gol!', isGoal: true },
        { type: 'Desarme Alto!', icon: '🔥', message: 'Roubou a bola no campo ofensivo!' },
        { type: 'Interceptação!', icon: '🦶', message: 'Cortou o passe na frente!' },
        { type: 'Falta Tática', icon: '⚠️', message: 'Parou o contra-ataque com falta!' },
        { type: 'Gol após Pressão!', icon: '⚽', message: 'Forçou o erro e marcou!', isGoal: true },
      ];
    default: // tactical
      return [
        { type: 'Golaço no Treino!', icon: '⚽', message: 'Finalização perfeita no ângulo!', isGoal: true },
        { type: 'Grande Defesa', icon: '🧤', message: 'Goleiro espalmou no canto!' },
        { type: 'Drible Incrível', icon: '💨', message: 'Passou por 2 marcadores!' },
        { type: 'Passe Genial', icon: '🎯', message: 'Assistência de calcanhar!' },
        { type: 'Desarme Firme', icon: '🦶', message: 'Recuperou a bola com estilo!' },
        { type: 'Bola na Trave', icon: '📐', message: 'Quase! Bola explodiu no ferro!' },
        { type: 'Golaço de Falta!', icon: '⚽', message: 'Cobrança certeira no ângulo!', isGoal: true },
      ];
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

  // Sprite-based movement for smoother animation
  const spritesARef = useRef<PlayerSprite[]>([]);
  const spritesBRef = useRef<PlayerSprite[]>([]);
  const ballSpriteRef = useRef<PlayerSprite>({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const lastTargetUpdateRef = useRef(0);

  const drillConfig = DRILL_OPTIONS.find(d => d.id === selectedDrill)!;

  const initSprites = useCallback(() => {
    spritesARef.current = TEAM_A_POS.map(p => ({ x: p.x, y: p.y, tx: p.x, ty: p.y }));
    spritesBRef.current = TEAM_B_POS.map(p => ({ x: p.x, y: p.y, tx: p.x, ty: p.y }));
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
    lastTargetUpdateRef.current = 0;
    initSprites();
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

    if (spritesARef.current.length === 0) initSprites();

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
      drift += 0.015; // slower base drift
      ctx.clearRect(0, 0, W, H);
      drawPitch();

      const isRunning = phaseRef.current === 'running' || phaseRef.current === 'drill-event';
      const now = Date.now();

      // Update targets every 2.5s for organic movement
      if (isRunning && now - lastTargetUpdateRef.current > 2500) {
        lastTargetUpdateRef.current = now;
        spritesARef.current = spritesARef.current.map((sp, i) => ({
          ...sp,
          tx: TEAM_A_POS[i].x + (Math.random() - 0.5) * 0.08,
          ty: TEAM_A_POS[i].y + (Math.random() - 0.5) * 0.08,
        }));
        spritesBRef.current = spritesBRef.current.map((sp, i) => ({
          ...sp,
          tx: TEAM_B_POS[i].x + (Math.random() - 0.5) * 0.08,
          ty: TEAM_B_POS[i].y + (Math.random() - 0.5) * 0.08,
        }));
        // Ball moves toward a random player
        const allSprites = [...spritesARef.current, ...spritesBRef.current];
        const target = allSprites[Math.floor(Math.random() * allSprites.length)];
        ballSpriteRef.current.tx = target.x + (Math.random() - 0.5) * 0.05;
        ballSpriteRef.current.ty = target.y + (Math.random() - 0.5) * 0.05;
      }

      // Lerp all sprites (slow, smooth)
      const lerpSpeed = 0.025;
      spritesARef.current = spritesARef.current.map(sp => ({
        ...sp,
        x: lerp(sp.x, sp.tx, lerpSpeed),
        y: lerp(sp.y, sp.ty, lerpSpeed),
      }));
      spritesBRef.current = spritesBRef.current.map(sp => ({
        ...sp,
        x: lerp(sp.x, sp.tx, lerpSpeed),
        y: lerp(sp.y, sp.ty, lerpSpeed),
      }));
      const b = ballSpriteRef.current;
      ballSpriteRef.current = { ...b, x: lerp(b.x, b.tx, 0.03), y: lerp(b.y, b.ty, 0.03) };

      // Idle drift for select/finished
      if (!isRunning) {
        const idleDrift = 1.5;
        TEAM_A_POS.forEach((p, i) => {
          const dx = Math.sin(drift + i * 1.3) * idleDrift;
          const dy = Math.cos(drift + i * 0.9) * idleDrift;
          drawPlayer(p.x * W + dx, p.y * H + dy, PITCH_COLORS.teamA, PITCH_COLORS.teamALight, `${i + 1}`);
        });
        TEAM_B_POS.forEach((p, i) => {
          const dx = Math.sin(drift + i * 1.1 + 3) * idleDrift;
          const dy = Math.cos(drift + i * 0.7 + 2) * idleDrift;
          drawPlayer(p.x * W + dx, p.y * H + dy, PITCH_COLORS.teamB, PITCH_COLORS.teamBLight, `${i + 1}`);
        });
      } else {
        // Draw from sprites
        spritesARef.current.forEach((sp, i) => {
          drawPlayer(sp.x * W, sp.y * H, PITCH_COLORS.teamA, PITCH_COLORS.teamALight, `${i + 1}`);
        });
        spritesBRef.current.forEach((sp, i) => {
          drawPlayer(sp.x * W, sp.y * H, PITCH_COLORS.teamB, PITCH_COLORS.teamBLight, `${i + 1}`);
        });
        // Ball
        drawBall(ballSpriteRef.current.x * W, ballSpriteRef.current.y * H);
      }

      // Drill event overlay
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
        ctx.fillText('Escolha o exercício e inicie', W / 2, H / 2 + 12);
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

      // Timer & HUD
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

        // Random events every ~7-10s
        if (now - lastEventRef.current > 7000 + Math.random() * 3000) {
          lastEventRef.current = now;
          const pool = getEventsForDrill(selectedDrillRef.current);
          const evt = pool[Math.floor(Math.random() * pool.length)];
          activeEventRef.current = evt;
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
            phaseRef.current = 'running';
            setPhase('running');
          }, 2500);
        }

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
        ctx.fillText(clubName, W - 8, 11);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, clubName, initSprites]);

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
        {/* Drill selection */}
        {phase === 'select' && (
          <div className="grid grid-cols-2 gap-1.5">
            {DRILL_OPTIONS.map(drill => (
              <button
                key={drill.id}
                onClick={() => setSelectedDrill(drill.id)}
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

        {/* Current drill badge */}
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

        {/* Progress bar */}
        {(phase === 'running' || phase === 'drill-event') && (
          <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (elapsed / drillConfig.duration) * 100)}%` }}
            />
          </div>
        )}

        {/* Events log */}
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
            <Button onClick={() => { setPhase('select'); setEvents([]); }} className="flex-1 gap-2">
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

        <p className="text-[9px] text-muted-foreground text-center">
          22 jogadores • Movimentação orgânica • Exercícios táticos
        </p>
      </CardContent>
    </Card>
  );
}

export const TrainingMatchCanvas = memo(TrainingMatchCanvasInner);
