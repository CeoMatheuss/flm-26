/**
 * HighlightMiniCanvas — Lightweight <canvas> animation for key moments.
 * Only renders for: goals, penalties, woodwork, corners, dangerous chances.
 * No Phaser dependency — pure Canvas2D, ~200 lines.
 */

import { useRef, useEffect, memo } from 'react';

type HighlightType = 'goal' | 'penalty' | 'woodwork' | 'corner' | 'chance' | 'save' | 'penalty_shootout';

interface HighlightMiniCanvasProps {
  type: HighlightType;
  team: 'home' | 'away';
  playerName?: string;
  onComplete?: () => void;
}

const COLORS = {
  pitch: '#1b7a3d',
  pitchLight: '#20904a',
  lines: 'rgba(255,255,255,0.5)',
  ball: '#ffffff',
  home: '#2563eb',
  homeLight: '#60a5fa',
  away: '#e11d48',
  awayLight: '#fb7185',
  net: 'rgba(255,255,255,0.15)',
  goalFlash: '#fbbf24',
};

function HighlightMiniCanvasInner({ type, team, playerName, onComplete }: HighlightMiniCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 400, H = 250;
    canvas.width = W;
    canvas.height = H;

    let frame = 0;
    const totalFrames = 90; // ~1.5s at 60fps
    const isHome = team === 'home';

    // Animation positions (normalized then scaled)
    const goalX = isHome ? W * 0.88 : W * 0.12;
    const goalY = H * 0.5;
    const goalW = 8, goalH = 60;
    const shooterStartX = isHome ? W * 0.55 : W * 0.45;
    const shooterStartY = H * 0.5 + (Math.random() - 0.5) * 60;

    // Ball trajectory
    const ballStartX = shooterStartX + (isHome ? 15 : -15);
    const ballStartY = shooterStartY;
    let ballEndX = goalX;
    let ballEndY = goalY + (Math.random() - 0.5) * 40;

    if (type === 'woodwork') {
      ballEndY = goalY - goalH / 2 + 4; // hits the bar
    } else if (type === 'save') {
      ballEndX = goalX + (isHome ? -12 : 12); // keeper saves
    } else if (type === 'corner') {
      // Ball comes from corner
      const cornerX = isHome ? W - 15 : 15;
      const cornerY = Math.random() > 0.5 ? 15 : H - 15;
      // Override start
      Object.assign({}, { ballStartX: cornerX, ballStartY: cornerY });
    }

    const drawPitchSection = () => {
      // Green pitch with stripes
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? COLORS.pitch : COLORS.pitchLight;
        ctx.fillRect(i * (W / 8), 0, W / 8 + 1, H);
      }

      // Goal area
      ctx.strokeStyle = COLORS.lines;
      ctx.lineWidth = 1.5;

      const gaX = isHome ? W - 50 : 0;
      ctx.strokeRect(gaX, H / 2 - 50, 50, 100);
      ctx.strokeRect(gaX + (isHome ? 20 : 0), H / 2 - 30, 30, 60);

      // Goal net
      ctx.fillStyle = COLORS.net;
      const netX = isHome ? W - goalW : 0;
      ctx.fillRect(netX, goalY - goalH / 2, goalW, goalH);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.strokeRect(netX, goalY - goalH / 2, goalW, goalH);

      // Penalty spot
      if (type === 'penalty' || type === 'penalty_shootout') {
        const spotX = isHome ? W - 70 : 70;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(spotX, H / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawPlayer = (x: number, y: number, color: string, light: string, label?: string) => {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + 6, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = light;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      if (label) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 3);
      }
    };

    const drawBall = (x: number, y: number, scale = 1) => {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + 3, 5 * scale, 2 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.ball;
      ctx.beginPath();
      ctx.arc(x, y, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const animate = () => {
      frame++;
      const t = Math.min(frame / totalFrames, 1);
      ctx.clearRect(0, 0, W, H);

      drawPitchSection();

      // Easing
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Shooter
      const shootPhase = Math.min(t * 2, 1);
      const sX = shooterStartX + (isHome ? 20 : -20) * shootPhase;
      const sY = shooterStartY;
      const teamColor = isHome ? COLORS.home : COLORS.away;
      const teamLight = isHome ? COLORS.homeLight : COLORS.awayLight;
      drawPlayer(sX, sY, teamColor, teamLight, '10');

      // Goalkeeper
      const gkX = goalX + (isHome ? 5 : -5);
      const gkMove = type === 'save' ? (ballEndY - goalY) * ease * 0.7 : (ballEndY - goalY) * ease * 0.3;
      const gkColor = isHome ? COLORS.away : COLORS.home;
      const gkLight = isHome ? COLORS.awayLight : COLORS.homeLight;
      drawPlayer(gkX, goalY + gkMove, gkColor, gkLight, 'GK');

      // Ball
      const ballPhase = Math.max(0, (t - 0.3) / 0.7);
      const bEase = ballPhase < 0.5 ? 2 * ballPhase * ballPhase : 1 - Math.pow(-2 * ballPhase + 2, 2) / 2;
      const bx = ballStartX + (ballEndX - ballStartX) * bEase;
      const by = ballStartY + (ballEndY - ballStartY) * bEase;
      // Arc effect
      const arc = Math.sin(bEase * Math.PI) * -25;
      drawBall(bx, by + arc);

      // Goal flash
      if (type === 'goal' || type === 'penalty') {
        if (t > 0.8) {
          const flash = Math.sin((t - 0.8) * 50) * 0.15;
          ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0, flash)})`;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // Woodwork shake
      if (type === 'woodwork' && t > 0.7) {
        const shake = Math.sin((t - 0.7) * 80) * 2 * (1 - (t - 0.7) * 3.3);
        ctx.save();
        ctx.translate(shake, 0);
        const netX2 = isHome ? W - goalW : 0;
        ctx.strokeStyle = 'rgba(255,100,100,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(netX2, goalY - goalH / 2, goalW, goalH);
        ctx.restore();
      }

      // Player name overlay
      if (playerName && t > 0.5) {
        const alpha = Math.min(1, (t - 0.5) * 4);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(playerName, W / 2, H - 15);
      }

      if (frame < totalFrames + 30) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [type, team, playerName, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border border-border/20"
      style={{ aspectRatio: '400 / 250', imageRendering: 'auto' }}
    />
  );
}

export const HighlightMiniCanvas = memo(HighlightMiniCanvasInner);

/** Determine if an event type should trigger 2D highlight */
export function isHighlightEvent(type: string): boolean {
  return [
    'foot_goal', 'header_goal', 'penalty_goal', 'penalty_miss',
    'great_save', 'woodwork', 'corner_danger',
    'long_shot_miss', 'header_miss', 'dangerous_foul',
  ].includes(type);
}

/** Map event type to highlight canvas type */
export function getHighlightType(eventType: string): HighlightType {
  if (['foot_goal', 'header_goal'].includes(eventType)) return 'goal';
  if (['penalty_goal', 'penalty_miss'].includes(eventType)) return 'penalty';
  if (eventType === 'woodwork') return 'woodwork';
  if (eventType === 'corner_danger') return 'corner';
  if (eventType === 'great_save') return 'save';
  return 'chance';
}
