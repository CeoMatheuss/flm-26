/**
 * HighlightMiniCanvas — Canvas 2D with 22 players on a full pitch.
 * 
 * Shows all 22 players in formation at all times.
 * When a highlight plays, the action animates.
 * When idle (no highlight), the pitch darkens with "Aguardando lance..." text.
 */

import { useRef, useEffect, memo, useState } from 'react';

export type HighlightType = 'goal' | 'penalty' | 'woodwork' | 'corner' | 'chance' | 'save' | 'penalty_shootout' | 'idle';

interface HighlightMiniCanvasProps {
  type: HighlightType;
  team: 'home' | 'away';
  playerName?: string;
  onComplete?: () => void;
  currentMinute?: number;
}

const COLORS = {
  pitch: '#1a6e38',
  pitchLight: '#1f8244',
  lines: 'rgba(255,255,255,0.45)',
  ball: '#ffffff',
  home: '#2563eb',
  homeLight: '#60a5fa',
  away: '#dc2626',
  awayLight: '#f87171',
  net: 'rgba(255,255,255,0.15)',
  goalFlash: '#fbbf24',
};

// 4-4-2 formation positions (normalized 0-1)
const HOME_POSITIONS = [
  { x: 0.06, y: 0.5, label: '1' },   // GK
  { x: 0.18, y: 0.15, label: '2' },  // RB
  { x: 0.18, y: 0.38, label: '3' },  // CB
  { x: 0.18, y: 0.62, label: '4' },  // CB
  { x: 0.18, y: 0.85, label: '5' },  // LB
  { x: 0.35, y: 0.15, label: '6' },  // RM
  { x: 0.35, y: 0.38, label: '7' },  // CM
  { x: 0.35, y: 0.62, label: '8' },  // CM
  { x: 0.35, y: 0.85, label: '9' },  // LM
  { x: 0.45, y: 0.35, label: '10' }, // ST
  { x: 0.45, y: 0.65, label: '11' }, // ST
];

const AWAY_POSITIONS = [
  { x: 0.94, y: 0.5, label: '1' },   // GK
  { x: 0.82, y: 0.15, label: '2' },  // RB
  { x: 0.82, y: 0.38, label: '3' },  // CB
  { x: 0.82, y: 0.62, label: '4' },  // CB
  { x: 0.82, y: 0.85, label: '5' },  // LB
  { x: 0.65, y: 0.15, label: '6' },  // RM
  { x: 0.65, y: 0.38, label: '7' },  // CM
  { x: 0.65, y: 0.62, label: '8' },  // CM
  { x: 0.65, y: 0.85, label: '9' },  // LM
  { x: 0.55, y: 0.35, label: '10' }, // ST
  { x: 0.55, y: 0.65, label: '11' }, // ST
];

function HighlightMiniCanvasInner({ type, team, playerName, onComplete, currentMinute }: HighlightMiniCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const driftRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 480, H = 280;
    canvas.width = W;
    canvas.height = H;

    let frame = 0;
    const isIdle = type === 'idle';
    const totalFrames = isIdle ? Infinity : 120; // 2s at 60fps for highlights
    const isHome = team === 'home';

    // Highlight-specific positions
    const goalX = isHome ? W * 0.9 : W * 0.1;
    const goalY = H * 0.5;
    const goalW = 8, goalH = 60;
    const shooterStartX = isHome ? W * 0.52 : W * 0.48;
    const shooterStartY = H * 0.5 + (Math.random() - 0.5) * 50;
    const ballStartX = shooterStartX + (isHome ? 15 : -15);
    const ballStartY = shooterStartY;
    let ballEndX = goalX;
    let ballEndY = goalY + (Math.random() - 0.5) * 36;

    if (type === 'woodwork') ballEndY = goalY - goalH / 2 + 4;
    else if (type === 'save') ballEndX = goalX + (isHome ? -12 : 12);

    // ── Draw full pitch ──
    const drawPitch = () => {
      // Stripes
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? COLORS.pitch : COLORS.pitchLight;
        ctx.fillRect(i * (W / 10), 0, W / 10 + 1, H);
      }

      ctx.strokeStyle = COLORS.lines;
      ctx.lineWidth = 1.2;

      // Outer border
      ctx.strokeRect(2, 2, W - 4, H - 4);
      // Center line
      ctx.beginPath();
      ctx.moveTo(W / 2, 2);
      ctx.lineTo(W / 2, H - 2);
      ctx.stroke();
      // Center circle
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 35, 0, Math.PI * 2);
      ctx.stroke();
      // Center spot
      ctx.fillStyle = COLORS.lines;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Left penalty area
      ctx.strokeRect(2, H / 2 - 55, 52, 110);
      ctx.strokeRect(2, H / 2 - 30, 22, 60);
      // Right penalty area
      ctx.strokeRect(W - 54, H / 2 - 55, 52, 110);
      ctx.strokeRect(W - 24, H / 2 - 30, 22, 60);

      // Goals
      ctx.fillStyle = COLORS.net;
      ctx.fillRect(0, H / 2 - goalH / 2, goalW, goalH);
      ctx.fillRect(W - goalW, H / 2 - goalH / 2, goalW, goalH);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(0, H / 2 - goalH / 2, goalW, goalH);
      ctx.strokeRect(W - goalW, H / 2 - goalH / 2, goalW, goalH);

      // Corner arcs
      const corners = [[2, 2], [W - 2, 2], [2, H - 2], [W - 2, H - 2]];
      corners.forEach(([cx, cy]) => {
        ctx.beginPath();
        const sa = cx < W / 2 ? (cy < H / 2 ? 0 : -Math.PI / 2) : (cy < H / 2 ? Math.PI / 2 : Math.PI);
        ctx.arc(cx, cy, 8, sa, sa + Math.PI / 2);
        ctx.stroke();
      });
    };

    // ── Draw player circle ──
    const drawPlayer = (x: number, y: number, color: string, light: string, label: string, size = 7) => {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + size * 0.7, size, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = light;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Number
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `bold ${Math.max(6, size - 1)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5);
    };

    // ── Draw all 22 players ──
    const drawAllPlayers = (drift: number) => {
      const driftAmt = 2;
      HOME_POSITIONS.forEach((p, i) => {
        const dx = Math.sin(drift + i * 1.3) * driftAmt;
        const dy = Math.cos(drift + i * 0.9) * driftAmt;
        drawPlayer(p.x * W + dx, p.y * H + dy, COLORS.home, COLORS.homeLight, p.label);
      });
      AWAY_POSITIONS.forEach((p, i) => {
        const dx = Math.sin(drift + i * 1.1 + 3) * driftAmt;
        const dy = Math.cos(drift + i * 0.7 + 2) * driftAmt;
        drawPlayer(p.x * W + dx, p.y * H + dy, COLORS.away, COLORS.awayLight, p.label);
      });
    };

    // ── Draw ball ──
    const drawBall = (x: number, y: number, scale = 1) => {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + 3, 4.5 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.ball;
      ctx.beginPath();
      ctx.arc(x, y, 4.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    };

    // ── Idle overlay ──
    const drawIdleOverlay = (drift: number) => {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);

      // Pulsing dots
      const dots = '...';
      const dotAlpha = 0.4 + Math.sin(drift * 2) * 0.3;

      ctx.fillStyle = `rgba(255,255,255,0.85)`;
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏳ Aguardando lance importante', W / 2, H / 2 - 8);

      ctx.fillStyle = `rgba(255,255,255,${dotAlpha})`;
      ctx.font = '11px Arial';
      ctx.fillText(currentMinute !== undefined ? `${currentMinute}' em jogo` : 'Partida em andamento', W / 2, H / 2 + 14);

      // Ball in center with slow pulse
      const ballScale = 0.8 + Math.sin(drift * 1.5) * 0.15;
      drawBall(W / 2, H / 2 + 38, ballScale);
    };

    const animate = () => {
      frame++;
      driftRef.current += 0.02;
      const drift = driftRef.current;

      ctx.clearRect(0, 0, W, H);
      drawPitch();

      if (isIdle) {
        // Idle mode: show all players with gentle drift, then overlay
        drawAllPlayers(drift);
        drawIdleOverlay(drift);
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      // ── HIGHLIGHT ANIMATION ──
      const t = Math.min(frame / totalFrames, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Draw all 22 players (static during highlight)
      drawAllPlayers(drift * 0.3);

      // Highlight-specific: shooter moving forward
      const shootPhase = Math.min(t * 2, 1);
      const sX = shooterStartX + (isHome ? 22 : -22) * shootPhase;
      const sY = shooterStartY;
      const teamColor = isHome ? COLORS.home : COLORS.away;
      const teamLight = isHome ? COLORS.homeLight : COLORS.awayLight;
      // Draw shooter on top (bigger)
      drawPlayer(sX, sY, teamColor, teamLight, '10', 9);

      // Goalkeeper reaction
      const gkX = goalX + (isHome ? 6 : -6);
      const gkMoveY = type === 'save'
        ? (ballEndY - goalY) * ease * 0.8
        : (ballEndY - goalY) * ease * 0.3;
      const gkColor = isHome ? COLORS.away : COLORS.home;
      const gkLight = isHome ? COLORS.awayLight : COLORS.homeLight;
      drawPlayer(gkX, goalY + gkMoveY, gkColor, gkLight, 'GK', 9);

      // Ball trajectory
      const ballPhase = Math.max(0, (t - 0.25) / 0.75);
      const bEase = ballPhase < 0.5 ? 2 * ballPhase * ballPhase : 1 - Math.pow(-2 * ballPhase + 2, 2) / 2;
      const bx = ballStartX + (ballEndX - ballStartX) * bEase;
      const by = ballStartY + (ballEndY - ballStartY) * bEase;
      const arc = Math.sin(bEase * Math.PI) * -22;
      if (ballPhase > 0) drawBall(bx, by + arc, 1.1);

      // Goal flash effect
      if ((type === 'goal' || type === 'penalty') && t > 0.75) {
        const flash = Math.sin((t - 0.75) * 40) * 0.12;
        if (flash > 0) {
          ctx.fillStyle = `rgba(251, 191, 36, ${flash})`;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // Woodwork shake
      if (type === 'woodwork' && t > 0.65) {
        const shake = Math.sin((t - 0.65) * 80) * 2.5 * Math.max(0, 1 - (t - 0.65) * 3);
        ctx.save();
        ctx.translate(shake, 0);
        const netX = isHome ? W - goalW : 0;
        ctx.strokeStyle = 'rgba(255,100,100,0.5)';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(netX, goalY - goalH / 2, goalW, goalH);
        ctx.restore();
      }

      // Save celebration
      if (type === 'save' && t > 0.7) {
        const alpha = Math.min(1, (t - 0.7) * 5);
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha * 0.1})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Player name + event label
      if (t > 0.4) {
        const alpha = Math.min(1, (t - 0.4) * 3);
        // Background bar
        ctx.fillStyle = `rgba(0,0,0,${alpha * 0.6})`;
        ctx.fillRect(0, H - 28, W, 28);
        // Name
        if (playerName) {
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(playerName, W / 2, H - 14);
        }
      }

      if (frame < totalFrames + 40) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        onCompleteRef.current?.();
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [type, team, playerName, currentMinute]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border border-border/20"
      style={{ aspectRatio: '480 / 280', imageRendering: 'auto' }}
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
