/**
 * Training2DRenderer — Visualizador 2D leve do campo de treino (Canvas)
 * 
 * REGRAS:
 * - NÃO altera placar, eventos de partida, estado ou jogadores
 * - Apenas renderiza visualmente: jogadores em posição, bola, movimentos
 * - Otimizado para mobile (~30 FPS, lerp suave)
 * - Compatível com React via useRef + useEffect
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Player } from '@/types/game';
import type { TrainingIntensity } from './TrainingTypes';

interface Sprite {
  x: number;
  y: number;
  tx: number; // target x
  ty: number; // target y
  color: string;
  label: string;
  speed: number;
}

interface BallState {
  x: number;
  y: number;
  tx: number;
  ty: number;
}

const POSITION_COLORS: Record<string, string> = {
  GOL: '#f59e0b',
  ZAG: '#3b82f6',
  LAT: '#06b6d4',
  VOL: '#10b981',
  MEI: '#8b5cf6',
  ATA: '#ef4444',
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function useTraining2DRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  players: Player[],
  intensity: TrainingIntensity
) {
  const spritesRef = useRef<Sprite[]>([]);
  const ballRef = useRef<BallState>({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const animFrameRef = useRef<number | null>(null);
  const lastMoveRef = useRef<number>(0);

  // Speed multiplier based on intensity
  const speedMult = intensity === 'pesado' ? 0.05 : intensity === 'moderado' ? 0.035 : 0.02;
  const moveIntervalMs = intensity === 'pesado' ? 1800 : intensity === 'moderado' ? 2500 : 3500;

  const initSprites = useCallback(() => {
    const maxPlayers = Math.min(players.length, 11);
    spritesRef.current = players.slice(0, maxPlayers).map((p, i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      return {
        x: 0.1 + col * 0.25 + Math.random() * 0.05,
        y: 0.15 + row * 0.25 + Math.random() * 0.05,
        tx: 0.1 + col * 0.25,
        ty: 0.15 + row * 0.25,
        color: POSITION_COLORS[p.position] ?? '#64748b',
        label: p.name.split(' ').pop()?.slice(0, 6) ?? p.name.slice(0, 6),
        speed: speedMult + Math.random() * 0.01,
      };
    });
  }, [players, speedMult]);

  const draw = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background — pitch
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 0, w, h);

    // Grass stripes
    for (let row = 0; row < 5; row++) {
      if (row % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(0, (row / 5) * h, w, h / 5);
      }
    }

    // Field lines
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;

    // Outer border
    ctx.strokeRect(8, 8, w - 16, h - 16);

    // Center line
    ctx.beginPath();
    ctx.moveTo(8, h / 2);
    ctx.lineTo(w - 8, h / 2);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, h * 0.12, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Penalty areas
    const paW = w * 0.4, paH = h * 0.15;
    ctx.strokeRect((w - paW) / 2, 8, paW, paH);
    ctx.strokeRect((w - paW) / 2, h - 8 - paH, paW, paH);

    // Ball
    const ball = ballRef.current;
    const bx = ball.x * w;
    const by = ball.y * h;
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Players
    spritesRef.current.forEach(sp => {
      const px = sp.x * w;
      const py = sp.y * h;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(px, py + 8, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Circle
      ctx.shadowColor = sp.color;
      ctx.shadowBlur = 4;
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // White border
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = `bold 7px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(sp.label, px, py + 14);
    });
  }, []);

  const animate = useCallback((canvas: HTMLCanvasElement, now: number) => {
    // Move sprites toward targets (lerp)
    spritesRef.current = spritesRef.current.map(sp => ({
      ...sp,
      x: lerp(sp.x, sp.tx, sp.speed),
      y: lerp(sp.y, sp.ty, sp.speed),
    }));

    // Move ball
    const b = ballRef.current;
    ballRef.current = {
      ...b,
      x: lerp(b.x, b.tx, 0.04),
      y: lerp(b.y, b.ty, 0.04),
    };

    // Periodically reassign targets
    if (now - lastMoveRef.current > moveIntervalMs) {
      lastMoveRef.current = now;
      spritesRef.current = spritesRef.current.map(sp => ({
        ...sp,
        tx: randomInRange(0.05, 0.95),
        ty: randomInRange(0.05, 0.90),
      }));
      ballRef.current = {
        ...ballRef.current,
        tx: randomInRange(0.1, 0.9),
        ty: randomInRange(0.1, 0.9),
      };
    }

    draw(canvas);
  }, [draw, moveIntervalMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initSprites();

    let lastFrame = 0;
    const FPS = 30;
    const frameInterval = 1000 / FPS;

    const loop = (now: number) => {
      if (now - lastFrame >= frameInterval) {
        lastFrame = now;
        animate(canvas, now);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [canvasRef, initSprites, animate]);
}
