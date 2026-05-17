/**
 * HighlightMiniCanvas — Canvas 2D with 22 players on a full pitch.
 * 
 * Shows all 22 players in formation at all times.
 * Multi-phase highlight animations with realistic positioning.
 * Includes: goals, penalties, saves, woodwork, corners, chances,
 * counter-attacks, crossings, and free kicks.
 */

import { useRef, useEffect, memo } from 'react';

export type HighlightType = 'goal' | 'penalty' | 'woodwork' | 'corner' | 'chance' | 'save' | 'penalty_shootout' | 'counter_attack' | 'crossing' | 'free_kick' | 'yellow_card' | 'red_card' | 'idle';

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
  grass1: '#1b7a3d',
  grass2: '#228b46',
};

// 4-3-3 organizado: GK, 4 ZAG, 3 MEI, 3 ATA — espaçamento vertical balanceado para evitar sobreposição
const HOME_POSITIONS = [
  // Goleiro
  { x: 0.05, y: 0.50, label: 'GK' },
  // Defesa (4)
  { x: 0.18, y: 0.18, label: '2' },
  { x: 0.18, y: 0.40, label: '3' },
  { x: 0.18, y: 0.60, label: '4' },
  { x: 0.18, y: 0.82, label: '5' },
  // Meio (3)
  { x: 0.34, y: 0.28, label: '6' },
  { x: 0.34, y: 0.50, label: '8' },
  { x: 0.34, y: 0.72, label: '7' },
  // Ataque (3)
  { x: 0.46, y: 0.20, label: '11' },
  { x: 0.48, y: 0.50, label: '9' },
  { x: 0.46, y: 0.80, label: '10' },
];

const AWAY_POSITIONS = [
  // Goleiro
  { x: 0.95, y: 0.50, label: 'GK' },
  // Defesa (4)
  { x: 0.82, y: 0.18, label: '2' },
  { x: 0.82, y: 0.40, label: '3' },
  { x: 0.82, y: 0.60, label: '4' },
  { x: 0.82, y: 0.82, label: '5' },
  // Meio (3)
  { x: 0.66, y: 0.28, label: '6' },
  { x: 0.66, y: 0.50, label: '8' },
  { x: 0.66, y: 0.72, label: '7' },
  // Ataque (3)
  { x: 0.54, y: 0.20, label: '11' },
  { x: 0.52, y: 0.50, label: '9' },
  { x: 0.54, y: 0.80, label: '10' },
];

const HIGHLIGHT_DURATIONS: Record<HighlightType, number> = {
  goal: 420,
  penalty: 390,
  woodwork: 360,
  corner: 330,
  chance: 300,
  save: 360,
  penalty_shootout: 390,
  counter_attack: 450,  // 7.5s — longer for full-field run
  crossing: 400,        // 6.7s
  free_kick: 420,       // 7s
  yellow_card: 320,
  red_card: 320,
  idle: Infinity,
};

function HighlightMiniCanvasInner({ type, team, playerName, onComplete, currentMinute }: HighlightMiniCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const driftRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const currentMinuteRef = useRef(currentMinute);
  currentMinuteRef.current = currentMinute;

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
    const totalFrames = HIGHLIGHT_DURATIONS[type] || 300;
    const isHome = team === 'home';

    const randY = () => H * 0.3 + Math.random() * H * 0.4;

    const goalX = isHome ? W - 8 : 8;
    const goalY = H * 0.5;
    const goalW = 8, goalH = 60;

    // Shooter position — inside penalty box
    const shooterPos = type === 'penalty' || type === 'penalty_shootout'
      ? { x: isHome ? W * 0.80 : W * 0.20, y: H * 0.5 }
      : type === 'counter_attack'
      ? { x: isHome ? W * 0.82 : W * 0.18, y: H * 0.45 + Math.random() * H * 0.1 }
      : type === 'crossing'
      ? { x: isHome ? W * 0.80 : W * 0.20, y: H * 0.45 + Math.random() * H * 0.1 }
      : type === 'free_kick'
      ? { x: isHome ? W * 0.72 : W * 0.28, y: H * 0.5 }
      : { x: isHome ? W * 0.76 + Math.random() * W * 0.06 : W * 0.18 + Math.random() * W * 0.06,
          y: H * 0.35 + Math.random() * H * 0.3 };

    // Build-up pass points — collective plays with 4-6 player participation
    const passPoints = type === 'penalty' || type === 'penalty_shootout' ? [] :
      type === 'counter_attack' ? [
        { x: isHome ? W * 0.15 : W * 0.85, y: randY() },
        { x: isHome ? W * 0.30 : W * 0.70, y: randY() },
        { x: isHome ? W * 0.42 : W * 0.58, y: randY() },
        { x: isHome ? W * 0.55 : W * 0.45, y: H * 0.4 + Math.random() * H * 0.2 },
        { x: isHome ? W * 0.65 : W * 0.35, y: H * 0.4 + Math.random() * H * 0.2 },
        { x: isHome ? W * 0.70 : W * 0.30, y: H * 0.4 + Math.random() * H * 0.2 },
      ] :
      type === 'crossing' ? [
        { x: isHome ? W * 0.30 : W * 0.70, y: H * 0.55 },
        { x: isHome ? W * 0.40 : W * 0.60, y: H * 0.70 },
        { x: isHome ? W * 0.50 : W * 0.50, y: H * 0.60 },
        { x: isHome ? W * 0.55 : W * 0.45, y: H * 0.85 },
        { x: isHome ? W * 0.72 : W * 0.28, y: H * 0.88 },
        { x: isHome ? W * 0.85 : W * 0.15, y: H * 0.80 },
      ] :
      type === 'free_kick' ? [
        { x: isHome ? W * 0.40 : W * 0.60, y: H * 0.35 },
        { x: isHome ? W * 0.48 : W * 0.52, y: H * 0.60 },
        { x: isHome ? W * 0.55 : W * 0.45, y: H * 0.40 },
        { x: isHome ? W * 0.60 : W * 0.40, y: H * 0.55 },
        { x: isHome ? W * 0.65 : W * 0.35, y: H * 0.5 },
        { x: isHome ? W * 0.72 : W * 0.28, y: H * 0.5 },
      ] : [
        // Collective build-up: 6 passes involving 5+ players
        { x: isHome ? W * 0.20 : W * 0.80, y: H * 0.60 },
        { x: isHome ? W * 0.30 : W * 0.70, y: H * 0.30 },
        { x: isHome ? W * 0.38 : W * 0.62, y: H * 0.65 },
        { x: isHome ? W * 0.48 : W * 0.52, y: H * 0.35 },
        { x: isHome ? W * 0.56 : W * 0.44, y: H * 0.55 },
        { x: isHome ? W * 0.68 : W * 0.32, y: randY() },
      ];

    let ballEndX = goalX;
    let ballEndY = goalY + (Math.random() - 0.5) * 36;

    if (type === 'woodwork') {
      ballEndY = goalY - goalH / 2 + 3 + Math.random() * 6;
    } else if (type === 'save') {
      ballEndX = goalX + (isHome ? -10 : 10);
      ballEndY = goalY + (Math.random() - 0.5) * 30;
    } else if (type === 'corner') {
      // Corner: short corner play with 4 touches before cross
      passPoints[0] = { x: isHome ? W * 0.92 : W * 0.08, y: H * 0.05 }; // Corner flag
      passPoints[1] = { x: isHome ? W * 0.85 : W * 0.15, y: H * 0.15 }; // Short pass
      passPoints[2] = { x: isHome ? W * 0.78 : W * 0.22, y: H * 0.25 }; // Back to midfielder
      passPoints[3] = { x: isHome ? W * 0.84 : W * 0.16, y: H * 0.12 }; // Return pass
      passPoints[4] = { x: isHome ? W * 0.88 : W * 0.12, y: H * 0.20 }; // Cross position
      passPoints[5] = { x: isHome ? W * 0.82 : W * 0.18, y: H * 0.45 }; // Header target
    } else if (type === 'chance') {
      ballEndX = goalX + (isHome ? 8 : -8);
      ballEndY = goalY + (Math.random() > 0.5 ? -40 : 40);
    } else if (type === 'crossing') {
      // Header target inside goal
      ballEndY = goalY + (Math.random() - 0.5) * 30;
    } else if (type === 'free_kick') {
      // Curving into top corner
      ballEndY = goalY - goalH / 2 + 8 + Math.random() * 15;
    }

    // ── Pitch drawing ──
    const drawPitch = () => {
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 === 0 ? COLORS.grass1 : COLORS.grass2;
        ctx.fillRect(i * (W / 12), 0, W / 12 + 1, H);
      }
      ctx.strokeStyle = COLORS.lines;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.beginPath(); ctx.moveTo(W / 2, 2); ctx.lineTo(W / 2, H - 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 35, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = COLORS.lines;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeRect(2, H / 2 - 55, 56, 110);
      ctx.strokeRect(2, H / 2 - 30, 24, 60);
      ctx.strokeRect(W - 58, H / 2 - 55, 56, 110);
      ctx.strokeRect(W - 26, H / 2 - 30, 24, 60);
      ctx.fillStyle = COLORS.lines;
      ctx.beginPath(); ctx.arc(38, H / 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W - 38, H / 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(38, H / 2, 28, -0.65, 0.65); ctx.stroke();
      ctx.beginPath(); ctx.arc(W - 38, H / 2, 28, Math.PI - 0.65, Math.PI + 0.65); ctx.stroke();
      ctx.fillStyle = COLORS.net;
      ctx.fillRect(0, H / 2 - goalH / 2, goalW, goalH);
      ctx.fillRect(W - goalW, H / 2 - goalH / 2, goalW, goalH);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 0.5;
      for (let ny = goalY - goalH / 2; ny <= goalY + goalH / 2; ny += 6) {
        ctx.beginPath(); ctx.moveTo(0, ny); ctx.lineTo(goalW, ny); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W - goalW, ny); ctx.lineTo(W, ny); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(0, goalY - goalH / 2, goalW, goalH);
      ctx.strokeRect(W - goalW, goalY - goalH / 2, goalW, goalH);
      const corners: [number, number][] = [[2, 2], [W - 2, 2], [2, H - 2], [W - 2, H - 2]];
      corners.forEach(([cx, cy]) => {
        ctx.beginPath();
        const sa = cx < W / 2 ? (cy < H / 2 ? 0 : -Math.PI / 2) : (cy < H / 2 ? Math.PI / 2 : Math.PI);
        ctx.arc(cx, cy, 8, sa, sa + Math.PI / 2);
        ctx.stroke();
      });
    };

    const drawPlayer = (x: number, y: number, color: string, light: string, label: string, size = 7, glowing = false, showName?: string) => {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + size * 0.8, size * 0.9, size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      if (glowing) {
        const grad = ctx.createRadialGradient(x, y, size, x, y, size + 8);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, size + 8, 0, Math.PI * 2);
        ctx.fill();
      }
      const bodyGrad = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
      bodyGrad.addColorStop(0, light);
      bodyGrad.addColorStop(1, color);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `bold ${Math.max(6, size - 1)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5);
      if (showName) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 7px Arial';
        ctx.fillText(showName.length > 10 ? showName.slice(0, 9) + '…' : showName, x, y + size + 8);
      }
    };

    const drawAllPlayers = (drift: number, reactToAction = false, actionX = 0, actionY = 0, shiftAmount = 0) => {
      const driftAmt = reactToAction ? 4 : 2;
      HOME_POSITIONS.forEach((p, i) => {
        let px = p.x * W;
        let py = p.y * H;
        if (isHome && shiftAmount > 0 && i > 4) px += shiftAmount;
        let dx = Math.sin(drift + i * 1.3) * driftAmt;
        let dy = Math.cos(drift + i * 0.9) * driftAmt;
        if (reactToAction) {
          const dist = Math.hypot(px - actionX, py - actionY);
          if (dist < 140) {
            dx += (actionX - px) * 0.025;
            dy += (actionY - py) * 0.015;
          }
        }
        drawPlayer(px + dx, py + dy, COLORS.home, COLORS.homeLight, p.label);
      });
      AWAY_POSITIONS.forEach((p, i) => {
        let px = p.x * W;
        let py = p.y * H;
        if (!isHome && shiftAmount > 0 && i > 4) px -= shiftAmount;
        let dx = Math.sin(drift + i * 1.1 + 3) * driftAmt;
        let dy = Math.cos(drift + i * 0.7 + 2) * driftAmt;
        if (reactToAction) {
          const dist = Math.hypot(px - actionX, py - actionY);
          if (dist < 140) {
            dx += (actionX - px) * 0.025;
            dy += (actionY - py) * 0.015;
          }
        }
        drawPlayer(px + dx, py + dy, COLORS.away, COLORS.awayLight, p.label);
      });
    };

    const drawBall = (x: number, y: number, scale = 1, spin = 0, trail = false) => {
      if (trail) {
        for (let t = 3; t > 0; t--) {
          const alpha = 0.06 * t;
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(x - (isHome ? t * 5 : -t * 5), y, 3 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + 3, 4.5 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.fillStyle = COLORS.ball;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      if (scale > 0.7) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * 2.2 * scale, Math.sin(angle) * 2.2 * scale, 1.1 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const drawPassTrail = (fromX: number, fromY: number, toX: number, toY: number, progress: number, alpha = 0.3) => {
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(fromX + (toX - fromX) * progress, fromY + (toY - fromY) * progress);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawCurvedPass = (fromX: number, fromY: number, toX: number, toY: number, progress: number, curvature: number) => {
      const cpX = (fromX + toX) / 2;
      const cpY = (fromY + toY) / 2 + curvature;
      ctx.strokeStyle = `rgba(255,255,200,0.3)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      const steps = Math.floor(progress * 20);
      for (let i = 1; i <= steps; i++) {
        const t = i / 20;
        const x = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * cpX + t * t * toX;
        const y = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * cpY + t * t * toY;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawIdleOverlay = (drift: number) => {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.6);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏳ Aguardando lance importante', W / 2, H / 2 - 8);
      const dotAlpha = 0.4 + Math.sin(drift * 2) * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${dotAlpha})`;
      ctx.font = '11px Arial';
      ctx.fillText(currentMinuteRef.current !== undefined ? `${currentMinuteRef.current}' em jogo` : 'Partida em andamento', W / 2, H / 2 + 14);
      const ballScale = 0.8 + Math.sin(drift * 1.5) * 0.15;
      drawBall(W / 2, H / 2 + 38, ballScale);
    };

    const drawEventLabel = (t: number, label: string, subLabel?: string) => {
      if (t < 0.15) return;
      const alpha = Math.min(1, (t - 0.15) * 5);
      const barH = subLabel ? 38 : 28;
      const grad = ctx.createLinearGradient(0, H - barH, 0, H);
      grad.addColorStop(0, `rgba(0,0,0,${alpha * 0.85})`);
      grad.addColorStop(1, `rgba(0,0,0,${alpha * 0.5})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - barH, W, barH);
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, W / 2, H - (subLabel ? 23 : 14));
      if (subLabel) {
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.65})`;
        ctx.font = '10px Arial';
        ctx.fillText(subLabel, W / 2, H - 8);
      }
    };

    const drawSpotlight = (cx: number, cy: number, radius: number, alpha: number) => {
      ctx.fillStyle = `rgba(0,0,0,${alpha * 0.25})`;
      ctx.fillRect(0, 0, W, H);
      const spot = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      spot.addColorStop(0, `rgba(255,255,200,${alpha * 0.08})`);
      spot.addColorStop(0.7, 'rgba(0,0,0,0)');
      spot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, H);
    };

    // Speed lines behind a fast-moving player
    const drawSpeedLines = (x: number, y: number, dir: number, alpha: number) => {
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const lx = x - dir * (8 + i * 6);
        const ly = y - 6 + i * 3;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - dir * 12, ly);
        ctx.stroke();
      }
    };

    // Free kick wall
    const drawWall = (wallX: number, wallY: number, count: number, color: string, light: string) => {
      for (let i = 0; i < count; i++) {
        drawPlayer(wallX, wallY - (count / 2 - i) * 14, color, light, '⬛', 6);
      }
    };

    const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeIn = (t: number) => t * t * t;

    const animate = () => {
      frame++;
      driftRef.current += 0.018;
      const drift = driftRef.current;

      ctx.clearRect(0, 0, W, H);
      drawPitch();

      if (isIdle) {
        drawAllPlayers(drift);
        drawIdleOverlay(drift);
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      const t = Math.min(frame / totalFrames, 1);
      const teamColor = isHome ? COLORS.home : COLORS.away;
      const teamLight = isHome ? COLORS.homeLight : COLORS.awayLight;
      const gkColor = isHome ? COLORS.away : COLORS.home;
      const gkLight = isHome ? COLORS.awayLight : COLORS.homeLight;

      let ballX = W / 2, ballY = H / 2;

      // ══════════════════════════════════════════════
      // PENALTY
      // ══════════════════════════════════════════════
      if (type === 'penalty' || type === 'penalty_shootout') {
        const penSpotX = isHome ? W - 38 : 38;
        const penSpotY = H / 2;
        // Players lined up at edge of penalty area
        const boxEdgeX = isHome ? W - 58 : 58;
        const penLineupPositions = [
          { x: boxEdgeX, y: H * 0.22 },
          { x: boxEdgeX, y: H * 0.34 },
          { x: boxEdgeX + (isHome ? -12 : 12), y: H * 0.46 },
          { x: boxEdgeX + (isHome ? -12 : 12), y: H * 0.58 },
          { x: boxEdgeX, y: H * 0.66 },
          { x: boxEdgeX, y: H * 0.78 },
        ];
        const drawPenaltyLineup = (alpha: number) => {
          penLineupPositions.forEach((pos, i) => {
            const isAttacker = i % 2 === 0;
            const c = isAttacker ? teamColor : gkColor;
            const cl = isAttacker ? teamLight : gkLight;
            const lbl = isAttacker ? String(6 + Math.floor(i / 2)) : String(2 + Math.floor(i / 2));
            const dx = Math.sin(driftRef.current + i * 1.5) * 1.5;
            const dy = Math.cos(driftRef.current + i * 1.1) * 1.5;
            drawPlayer(pos.x + dx, pos.y + dy, c, cl, lbl, 7);
          });
        };

        if (t < 0.30) {
          const walkT = t / 0.30;
          drawAllPlayers(drift * 0.3, false, 0, 0, 15 * easeOut(walkT));
          drawPenaltyLineup(easeOut(walkT));
          const startX = isHome ? W * 0.55 : W * 0.45;
          const sx = startX + (penSpotX - startX - (isHome ? 35 : -35)) * easeOut(walkT);
          drawPlayer(sx, penSpotY, teamColor, teamLight, '10', 9, true, playerName);
          const gkX = goalX + (isHome ? -8 : 8);
          drawPlayer(gkX, goalY, gkColor, gkLight, 'GK', 9);
          drawBall(penSpotX, penSpotY - 2, 1);
          drawEventLabel(walkT, type === 'penalty_shootout' ? '🎯 DISPUTA DE PÊNALTIS' : '🎯 PÊNALTI!', playerName);
        } else if (t < 0.55) {
          const runT = (t - 0.30) / 0.25;
          drawAllPlayers(drift * 0.2, false, 0, 0, 20);
          drawPenaltyLineup(1);
          const runStartX = penSpotX + (isHome ? -35 : 35);
          const sx = runStartX + (penSpotX - runStartX) * easeIn(Math.min(runT * 1.3, 1));
          drawPlayer(sx, penSpotY, teamColor, teamLight, '10', 9, runT < 0.7, playerName);
          const gkX = goalX + (isHome ? -8 : 8);
          const gkBounce = Math.sin(runT * 15) * 3;
          drawPlayer(gkX, goalY + gkBounce, gkColor, gkLight, 'GK', 9);
          drawBall(penSpotX, penSpotY - 2, 1);
          drawEventLabel(1, '🏃 Corrida para a bola...', playerName);
        } else if (t < 0.75) {
          const shotT = (t - 0.55) / 0.20;
          drawAllPlayers(drift * 0.2, true, goalX, goalY, 20);
          drawPenaltyLineup(1);
          drawPlayer(penSpotX + (isHome ? 5 : -5), penSpotY, teamColor, teamLight, '10', 9, false, playerName);
          const gkX = goalX + (isHome ? -6 : 6);
          const isSave = !type.includes('goal') && type !== 'penalty_shootout' && type !== 'penalty'; 
          // Check if current event is actually a goal from the props or parent state would be better, 
          // but HighlightMiniCanvas uses the 'type' prop. 
          // If type is 'penalty', it assumes goal in the original code.
          // Let's refine the logic: we need to know if it's a goal or save.
          
          const diveDir = ballEndY > goalY ? 1 : -1;
          const gkDiveY = goalY + diveDir * 25 * easeOut(shotT);
          const gkDiveX = gkX + (isHome ? -12 : 12) * easeOut(shotT);
          drawPlayer(gkDiveX, gkDiveY, gkColor, gkLight, 'GK', 9);
          const bx = penSpotX + (ballEndX - penSpotX) * easeOut(shotT);
          const by = penSpotY + (ballEndY - penSpotY) * easeOut(shotT);
          const arc = Math.sin(easeOut(shotT) * Math.PI) * -20;
          drawBall(bx, by + arc, 1.1, drift * 10 + shotT * 20, true);
          drawEventLabel(shotT, '⚡ CHUTOU!');
        } else {
          const afterT = (t - 0.75) / 0.25;
          const isGoal = ballEndX === goalX; // Simple heuristic: if ball is at goalX, it's a goal
          drawAllPlayers(drift * 0.15);
          
          penLineupPositions.forEach((pos, i) => {
            const isAttacker = i % 2 === 0;
            if (isGoal && isAttacker) {
              const rushX = pos.x + (shooterPos.x - pos.x) * easeOut(afterT) * 0.4;
              const rushY = pos.y + (shooterPos.y - pos.y) * easeOut(afterT) * 0.3;
              drawPlayer(rushX, rushY, teamColor, teamLight, String(6 + Math.floor(i / 2)), 7);
            } else if (!isGoal && !isAttacker) {
              const rushX = pos.x + (goalX - pos.x) * easeOut(afterT) * 0.4;
              const rushY = pos.y + (goalY - pos.y) * easeOut(afterT) * 0.3;
              drawPlayer(rushX, rushY, gkColor, gkLight, String(2 + Math.floor(i / 2)), 7);
            }
          });
          
          drawPlayer(penSpotX + (isHome ? 8 : -8), penSpotY, teamColor, teamLight, '10', 9, false, playerName);
          const gkX = goalX + (isHome ? -6 : 6);
          const diveDir = ballEndY > goalY ? 1 : -1;
          const gkFinalY = goalY + diveDir * 25;
          const gkFinalX = gkX + (isHome ? -12 : 12);
          drawPlayer(gkFinalX, gkFinalY, gkColor, gkLight, 'GK', 9);
          
          const ballPosX = isGoal ? ballEndX : ballEndX + (isHome ? -20 : 20) * easeOut(afterT);
          const ballPosY = isGoal ? ballEndY : ballEndY + (ballEndY > goalY ? 15 : -15) * easeOut(afterT);
          drawBall(ballPosX, ballPosY, 0.9);
          
          if (isGoal) {
            const flash = Math.sin(afterT * 20) * 0.12 * Math.max(0, 1 - afterT);
            if (flash > 0) {
              ctx.fillStyle = `rgba(251, 191, 36, ${flash})`;
              ctx.fillRect(0, 0, W, H);
            }
            if (afterT > 0.2) {
              const bigAlpha = Math.min(1, (afterT - 0.2) * 3) * (afterT < 0.7 ? 1 : Math.max(0, 1 - (afterT - 0.7) * 3));
              ctx.save();
              ctx.globalAlpha = bigAlpha;
              ctx.font = `bold 26px Arial`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#fbbf24';
              ctx.strokeStyle = 'rgba(0,0,0,0.5)';
              ctx.lineWidth = 3;
              ctx.strokeText('GOL DE PÊNALTI!', W / 2, H / 2 - 10);
              ctx.fillText('GOL DE PÊNALTI!', W / 2, H / 2 - 10);
              ctx.restore();
            }
            drawEventLabel(1, '⚽ GOL DE PÊNALTI!', playerName);
          } else {
            if (afterT > 0.2) {
              const bigAlpha = Math.min(1, (afterT - 0.2) * 3) * (afterT < 0.7 ? 1 : Math.max(0, 1 - (afterT - 0.7) * 3));
              ctx.save();
              ctx.globalAlpha = bigAlpha;
              ctx.font = `bold 26px Arial`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#22c55e';
              ctx.strokeStyle = 'rgba(0,0,0,0.5)';
              ctx.lineWidth = 3;
              ctx.strokeText('DEFENDEU!', W / 2, H / 2 - 10);
              ctx.fillText('DEFENDEU!', W / 2, H / 2 - 10);
              ctx.restore();
            }
            drawEventLabel(1, '🧤 GOLEIRO SALVOU O PÊNALTI!', playerName);
          }
        }

      // ══════════════════════════════════════════════
      // COUNTER-ATTACK — Full-field sprint
      // ══════════════════════════════════════════════
      } else if (type === 'counter_attack') {
        /*
         * Phase 0: Interception / GK distribution (0 → 0.15)
         * Phase 1: Sprint through midfield (0.15 → 0.40)
         * Phase 2: 2v1 or 1v1 into box (0.40 → 0.58)
         * Phase 3: Shot (0.58 → 0.72)
         * Phase 4: Aftermath (0.72 → 1.0)
         */
        const dir = isHome ? 1 : -1;

        if (t < 0.15) {
          // Interception phase
          const intT = t / 0.15;
          drawAllPlayers(drift * 0.6);
          // Defender wins the ball at own half
          const interceptX = isHome ? W * 0.22 : W * 0.78;
          const interceptY = H * 0.4;
          drawPlayer(interceptX, interceptY, teamColor, teamLight, '6', 9, true);
          // Opponent who lost ball
          drawPlayer(interceptX + dir * -15, interceptY + 8, gkColor, gkLight, '9', 7);
          drawBall(interceptX + dir * 8 * easeOut(intT), interceptY, 1, drift * 2);
          drawEventLabel(intT, '🔥 CONTRA-ATAQUE!', 'Roubada de bola!');

        } else if (t < 0.40) {
          // Sprint through midfield
          const sprintT = (t - 0.15) / 0.25;
          const startX = isHome ? W * 0.25 : W * 0.75;
          const endX = isHome ? W * 0.65 : W * 0.35;
          const runnerX = startX + (endX - startX) * easeOut(sprintT);
          const runnerY = H * 0.42;

          // Shift everyone dramatically
          drawAllPlayers(drift * 0.4, true, runnerX, runnerY, 35 * easeOut(sprintT));

          // Runner with ball
          drawPlayer(runnerX, runnerY, teamColor, teamLight, '10', 10, true, playerName);
          drawSpeedLines(runnerX, runnerY, dir, 0.3 * (1 - sprintT));

          // Support runner on the wing
          const supportX = runnerX - dir * 20;
          const supportY = H * 0.75;
          drawPlayer(supportX, supportY, teamColor, teamLight, '11', 8, sprintT > 0.5);

          // Lone defender chasing
          const defChaseX = runnerX - dir * 25 * (1 - sprintT * 0.3);
          drawPlayer(defChaseX, runnerY + 10, gkColor, gkLight, '4', 7);

          drawBall(runnerX + dir * 8, runnerY - 2, 1, drift * 5, true);
          drawEventLabel(sprintT, '💨 VELOCIDADE MÁXIMA!', playerName);

        } else if (t < 0.58) {
          // Entering the box — 1v1 or pass to support
          const boxT = (t - 0.40) / 0.18;
          const entryX = isHome ? W * 0.65 : W * 0.35;
          const runX = entryX + (shooterPos.x - entryX) * easeOut(boxT);
          const runY = shooterPos.y;

          drawAllPlayers(drift * 0.3, true, runX, runY, 40);

          // GK coming out
          const gkBaseX = goalX + (isHome ? -15 : 15);
          const gkOutX = gkBaseX + (isHome ? -8 : 8) * easeOut(boxT * 0.5);
          drawPlayer(gkOutX, goalY, gkColor, gkLight, 'GK', 9);

          // Attacker
          drawPlayer(runX, runY, teamColor, teamLight, '10', 10, true, playerName);
          drawBall(runX + dir * 7, runY - 1, 1, drift * 6, true);

          drawSpotlight(runX, runY, 80, boxT * 0.5);
          drawEventLabel(boxT, '⚡ 1 CONTRA 1!', playerName);

        } else if (t < 0.72) {
          // Shot phase (same as standard)
          const shotT = (t - 0.58) / 0.14;
          drawAllPlayers(drift * 0.25, true, goalX, goalY, 40);
          const sX = shooterPos.x + dir * 6 * easeOut(Math.min(shotT * 2, 1));
          drawPlayer(sX, shooterPos.y, teamColor, teamLight, '10', 10, shotT < 0.25, playerName);
          const gkBaseX = goalX + (isHome ? -8 : 8);
          const gkDiveDir = ballEndY > goalY ? 1 : -1;
          const gkDiveY = goalY + gkDiveDir * 25 * easeOut(shotT);
          drawPlayer(gkBaseX, gkDiveY, gkColor, gkLight, 'GK', 9);
          const bEase = easeInOut(shotT);
          const bx = shooterPos.x + dir * 12 + (ballEndX - shooterPos.x) * bEase;
          const by = shooterPos.y + (ballEndY - shooterPos.y) * bEase;
          const arc = Math.sin(bEase * Math.PI) * -18;
          drawBall(bx, by + arc, 1.3, drift * 10 + shotT * 25, true);
          drawSpotlight(bx, by + arc, 60, 0.5);
          drawEventLabel(shotT, '🔥 CHUTOU NO CONTRA-ATAQUE!', playerName);

        } else {
          // Aftermath — reuse goal celebration
          const afterT = (t - 0.72) / 0.28;
          drawAllPlayers(drift * 0.15);
          drawPlayer(shooterPos.x + dir * 10, shooterPos.y, teamColor, teamLight, '10', 9, false, playerName);
          const gkBaseX = goalX + (isHome ? -8 : 8);
          drawPlayer(gkBaseX, goalY + 15, gkColor, gkLight, 'GK', 9);
          drawBall(ballEndX, ballEndY, 0.9);
          // Goal flash
          const flash = Math.sin(afterT * 22) * 0.14 * Math.max(0, 1 - afterT * 1.2);
          if (flash > 0) {
            ctx.fillStyle = `rgba(251, 191, 36, ${flash})`;
            ctx.fillRect(0, 0, W, H);
          }
          if (afterT > 0.12) {
            const bigAlpha = Math.min(1, (afterT - 0.12) * 4) * (afterT < 0.75 ? 1 : Math.max(0, 1 - (afterT - 0.75) * 4));
            ctx.save();
            ctx.globalAlpha = bigAlpha;
            ctx.font = `bold 26px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fbbf24';
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 4;
            ctx.strokeText('GOL DE CONTRA-ATAQUE!', W / 2, H / 2 - 12);
            ctx.fillText('GOL DE CONTRA-ATAQUE!', W / 2, H / 2 - 12);
            if (playerName) {
              ctx.font = `bold 14px Arial`;
              ctx.fillStyle = 'rgba(255,255,255,0.9)';
              ctx.strokeStyle = 'rgba(0,0,0,0.5)';
              ctx.lineWidth = 2;
              ctx.strokeText(playerName, W / 2, H / 2 + 16);
              ctx.fillText(playerName, W / 2, H / 2 + 16);
            }
            ctx.restore();
          }
          drawEventLabel(1, '⚽ GOL DE CONTRA-ATAQUE!', playerName);
        }

      // ══════════════════════════════════════════════
      // CROSSING — Wing play + header
      // ══════════════════════════════════════════════
      } else if (type === 'crossing') {
        /*
         * Phase 0: Build-up on the wing (0 → 0.25)
         * Phase 1: Winger runs to byline (0.25 → 0.42)
         * Phase 2: Cross delivery (arc) (0.42 → 0.60)
         * Phase 3: Header/volley (0.60 → 0.75)
         * Phase 4: Aftermath (0.75 → 1.0)
         */
        const dir = isHome ? 1 : -1;
        const wingY = H * 0.88; // near bottom touchline
        const crossTarget = { x: shooterPos.x, y: shooterPos.y };

        if (t < 0.25) {
          const passT = t / 0.25;
          const startX = isHome ? W * 0.35 : W * 0.65;
          const wingX = isHome ? W * 0.72 : W * 0.28;
          const runX = startX + (wingX - startX) * easeOut(passT);
          drawAllPlayers(drift * 0.5, true, runX, wingY, 15 * easeOut(passT));
          // Midfielder passes to winger
          drawPlayer(startX, H * 0.6, teamColor, teamLight, '8', 8, passT < 0.3);
          drawPlayer(runX, wingY, teamColor, teamLight, '7', 9, passT > 0.4, 'Ponta');
          drawPassTrail(startX, H * 0.6, wingX, wingY, easeOut(passT));
          drawBall(runX, wingY - 2, 1, drift * 3);
          drawEventLabel(passT, '⚡ Jogada pela ponta!');

        } else if (t < 0.42) {
          const runT = (t - 0.25) / 0.17;
          const wingStartX = isHome ? W * 0.72 : W * 0.28;
          const bylineX = isHome ? W * 0.88 : W * 0.12;
          const runX = wingStartX + (bylineX - wingStartX) * easeOut(runT);
          const runY = wingY - runT * 15; // slight inside cut

          drawAllPlayers(drift * 0.4, true, runX, runY, 25);

          // Winger with ball
          drawPlayer(runX, runY, teamColor, teamLight, '7', 10, true, 'Ponta');
          drawSpeedLines(runX, runY, dir, 0.25);

          // Defender on the wing trying to keep up
          drawPlayer(runX - dir * 12, runY - 8, gkColor, gkLight, '2', 7);

          // Attackers making runs into the box
          const att1X = isHome ? W * 0.76 : W * 0.24;
          drawPlayer(att1X, H * 0.45, teamColor, teamLight, '9', 8, runT > 0.5);
          drawPlayer(att1X - dir * 5, H * 0.55, teamColor, teamLight, '10', 8);

          const wobbleX = Math.sin(runT * 14) * 3;
          drawBall(runX + dir * 7 + wobbleX, runY - 2, 1, drift * 5);
          drawSpotlight(runX, runY, 70, 0.35);
          drawEventLabel(runT, '💨 Ponta avança na linha de fundo!');

        } else if (t < 0.60) {
          // Cross delivery — ball arcs from wing to box
          const crossT = (t - 0.42) / 0.18;
          const crossFromX = isHome ? W * 0.88 : W * 0.12;
          const crossFromY = wingY - 15;

          drawAllPlayers(drift * 0.3, true, crossTarget.x, crossTarget.y, 30);

          // Winger after cross
          drawPlayer(crossFromX, crossFromY, teamColor, teamLight, '7', 9, crossT < 0.2, 'Ponta');

          // Attacker running to meet cross
          const headerRunX = crossTarget.x - dir * 15 * (1 - easeOut(crossT));
          drawPlayer(headerRunX, crossTarget.y, teamColor, teamLight, '9', 10, true, playerName);

          // Defenders trying to clear
          drawPlayer(crossTarget.x + dir * -8, crossTarget.y - 12, gkColor, gkLight, '5', 7);
          drawPlayer(crossTarget.x + dir * -5, crossTarget.y + 15, gkColor, gkLight, '3', 7);

          // GK
          const gkBaseX = goalX + (isHome ? -10 : 10);
          drawPlayer(gkBaseX, goalY, gkColor, gkLight, 'GK', 9);

          // Curved ball flight
          drawCurvedPass(crossFromX, crossFromY, crossTarget.x, crossTarget.y, crossT, -50);
          // Ball along arc
          const cpX = (crossFromX + crossTarget.x) / 2;
          const cpY = (crossFromY + crossTarget.y) / 2 - 50;
          const bct = easeOut(crossT);
          const bx = (1 - bct) * (1 - bct) * crossFromX + 2 * (1 - bct) * bct * cpX + bct * bct * crossTarget.x;
          const by = (1 - bct) * (1 - bct) * crossFromY + 2 * (1 - bct) * bct * cpY + bct * bct * crossTarget.y;
          drawBall(bx, by, 1.1, drift * 8, true);
          drawEventLabel(crossT, '📐 CRUZAMENTO NA ÁREA!');

        } else if (t < 0.75) {
          // Header/volley
          const headT = (t - 0.60) / 0.15;
          drawAllPlayers(drift * 0.25, true, goalX, goalY, 30);

          // Header: player jumps (y offset)
          const jumpY = shooterPos.y - Math.sin(easeOut(headT) * Math.PI) * 18;
          drawPlayer(shooterPos.x, jumpY, teamColor, teamLight, '9', 10, headT < 0.3, playerName);

          // GK dives
          const gkBaseX = goalX + (isHome ? -8 : 8);
          const gkDiveDir = ballEndY > goalY ? 1 : -1;
          const gkDiveY = goalY + gkDiveDir * 22 * easeOut(headT);
          drawPlayer(gkBaseX, gkDiveY, gkColor, gkLight, 'GK', 9);

          // Ball from head to goal
          const bEase = easeInOut(headT);
          const bx = shooterPos.x + (ballEndX - shooterPos.x) * bEase;
          const by = jumpY + (ballEndY - jumpY) * bEase;
          const arc = Math.sin(bEase * Math.PI) * -12;
          drawBall(bx, by + arc, 1.2, drift * 12 + headT * 20, true);

          drawSpotlight(bx, by + arc, 55, 0.5);
          drawEventLabel(headT, '⬆️ CABECEIO!', playerName);

        } else {
          // Aftermath
          const afterT = (t - 0.75) / 0.25;
          drawAllPlayers(drift * 0.15);
          drawPlayer(shooterPos.x, shooterPos.y, teamColor, teamLight, '9', 9, false, playerName);
          const gkBaseX = goalX + (isHome ? -8 : 8);
          drawPlayer(gkBaseX, goalY + 18, gkColor, gkLight, 'GK', 9);
          drawBall(ballEndX + dir * 2, ballEndY, 0.9);
          // Goal celebration
          const flash = Math.sin(afterT * 22) * 0.12 * Math.max(0, 1 - afterT * 1.2);
          if (flash > 0) {
            ctx.fillStyle = `rgba(251, 191, 36, ${flash})`;
            ctx.fillRect(0, 0, W, H);
          }
          if (afterT > 0.15) {
            const bigAlpha = Math.min(1, (afterT - 0.15) * 4) * (afterT < 0.7 ? 1 : Math.max(0, 1 - (afterT - 0.7) * 3));
            ctx.save();
            ctx.globalAlpha = bigAlpha;
            ctx.font = `bold 24px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fbbf24';
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 4;
            ctx.strokeText('GOL DE CABEÇA!', W / 2, H / 2 - 12);
            ctx.fillText('GOL DE CABEÇA!', W / 2, H / 2 - 12);
            if (playerName) {
              ctx.font = `bold 14px Arial`;
              ctx.fillStyle = 'rgba(255,255,255,0.9)';
              ctx.strokeText(playerName, W / 2, H / 2 + 16);
              ctx.fillText(playerName, W / 2, H / 2 + 16);
            }
            ctx.restore();
          }
          drawEventLabel(1, '⚽ GOL DE CRUZAMENTO!', playerName);
        }

      // ══════════════════════════════════════════════
      // FREE KICK — Set piece with wall
      // ══════════════════════════════════════════════
      } else if (type === 'free_kick') {
        /*
         * Phase 0: Players positioning / wall forming (0 → 0.25)
         * Phase 1: Run-up and kick (0.25 → 0.45)
         * Phase 2: Ball curves over/around wall (0.45 → 0.65)
         * Phase 3: Impact (0.65 → 0.78)
         * Phase 4: Aftermath (0.78 → 1.0)
         */
        const dir = isHome ? 1 : -1;
        const fkX = isHome ? W * 0.68 : W * 0.32;
        const fkY = H * 0.5;
        const wallX = isHome ? W * 0.78 : W * 0.22;
        const wallY = H * 0.5;

        if (t < 0.25) {
          const setupT = t / 0.25;
          drawAllPlayers(drift * 0.3, false, 0, 0, 10);

          // Wall forming
          const wallAlpha = easeOut(setupT);
          for (let i = 0; i < 4; i++) {
            const wy = wallY - 21 + i * 14;
            const slideX = wallX + dir * 30 * (1 - wallAlpha);
            drawPlayer(slideX, wy, gkColor, gkLight, String(2 + i), 7);
          }

          // Kicker approaching
          const approachX = fkX - dir * 25 * (1 - easeOut(setupT));
          drawPlayer(approachX, fkY + 5, teamColor, teamLight, '10', 9, setupT > 0.5, playerName);

          // Second kicker (decoy)
          drawPlayer(fkX - dir * 12, fkY - 18, teamColor, teamLight, '7', 8);

          // GK positioning
          const gkBaseX = goalX + (isHome ? -10 : 10);
          drawPlayer(gkBaseX, goalY - 5, gkColor, gkLight, 'GK', 9);

          drawBall(fkX, fkY, 1.1);
          drawEventLabel(setupT, '🎯 FALTA PERIGOSA!', `${playerName || 'Cobrador'} se prepara`);

        } else if (t < 0.45) {
          const runT = (t - 0.25) / 0.20;
          drawAllPlayers(drift * 0.2, false, 0, 0, 15);

          // Wall standing
          for (let i = 0; i < 4; i++) {
            const wy = wallY - 21 + i * 14;
            // Wall jumps at kick
            const jumpOffset = runT > 0.8 ? -Math.sin((runT - 0.8) * 25) * 5 : 0;
            drawPlayer(wallX, wy + jumpOffset, gkColor, gkLight, String(2 + i), 7);
          }

          // Kicker run-up
          const kickStartX = fkX - dir * 25;
          const kx = kickStartX + (fkX - kickStartX) * easeIn(Math.min(runT * 1.2, 1));
          drawPlayer(kx, fkY + 3, teamColor, teamLight, '10', 10, runT < 0.8, playerName);

          // GK
          const gkBaseX = goalX + (isHome ? -10 : 10);
          const gkBounce = Math.sin(runT * 12) * 2;
          drawPlayer(gkBaseX, goalY + gkBounce, gkColor, gkLight, 'GK', 9);

          drawBall(fkX, fkY, 1);
          drawEventLabel(runT, '🏃 Pega distância...', playerName);

        } else if (t < 0.65) {
          // Ball curving over wall
          const curveT = (t - 0.45) / 0.20;
          drawAllPlayers(drift * 0.2, true, goalX, goalY, 20);

          // Wall (some ducking)
          for (let i = 0; i < 4; i++) {
            const wy = wallY - 21 + i * 14;
            const duckY = curveT > 0.2 ? Math.sin(curveT * 8) * 3 : 0;
            drawPlayer(wallX, wy + duckY, gkColor, gkLight, String(2 + i), 7);
          }

          // Kicker post-kick
          drawPlayer(fkX + dir * 5, fkY + 2, teamColor, teamLight, '10', 9, false, playerName);

          // GK starts diving
          const gkBaseX = goalX + (isHome ? -8 : 8);
          const gkDiveDir = ballEndY > goalY ? 1 : -1;
          const gkDiveY = goalY + gkDiveDir * 20 * easeOut(curveT);
          const gkDiveX = gkBaseX + (isHome ? -8 : 8) * easeOut(curveT * 0.7);
          drawPlayer(gkDiveX, gkDiveY, gkColor, gkLight, 'GK', 9);

          // Ball trajectory — big arc over the wall
          const bEase = easeOut(curveT);
          const midX = (fkX + ballEndX) / 2;
          const midY = fkY - 65; // High arc
          const bx = (1 - bEase) * (1 - bEase) * fkX + 2 * (1 - bEase) * bEase * midX + bEase * bEase * ballEndX;
          const by = (1 - bEase) * (1 - bEase) * fkY + 2 * (1 - bEase) * bEase * midY + bEase * bEase * ballEndY;

          // Curved trail
          drawCurvedPass(fkX, fkY, ballEndX, ballEndY, curveT, -65);
          drawBall(bx, by, 1.2, drift * 15 + curveT * 30, true);

          drawSpotlight(bx, by, 60, 0.5);
          drawEventLabel(curveT, '🌀 BOLA CURVA POR CIMA DA BARREIRA!');

        } else if (t < 0.78) {
          // Impact
          const impT = (t - 0.65) / 0.13;
          drawAllPlayers(drift * 0.2, true, goalX, goalY, 20);

          // Wall scattering
          for (let i = 0; i < 4; i++) {
            const wy = wallY - 21 + i * 14;
            const scatterX = wallX + dir * -15 * easeOut(impT);
            drawPlayer(scatterX, wy + (i - 1.5) * 5 * easeOut(impT), gkColor, gkLight, String(2 + i), 7);
          }

          drawPlayer(fkX + dir * 8, fkY, teamColor, teamLight, '10', 9, false, playerName);

          // GK final dive
          const gkBaseX = goalX + (isHome ? -8 : 8);
          const gkDiveDir = ballEndY > goalY ? 1 : -1;
          drawPlayer(gkBaseX + (isHome ? -12 : 12) * easeOut(impT), goalY + gkDiveDir * 28 * easeOut(impT), gkColor, gkLight, 'GK', 9);

          drawBall(ballEndX, ballEndY, 1.1, drift * 5);

          // Impact flash
          if (impT < 0.4) {
            ctx.fillStyle = `rgba(255,255,200,${0.2 * (1 - impT / 0.4)})`;
            ctx.beginPath();
            ctx.arc(ballEndX, ballEndY, 25, 0, Math.PI * 2);
            ctx.fill();
          }
          drawEventLabel(impT, '💥 BATEU FORTE!', playerName);

        } else {
          // Aftermath
          const afterT = (t - 0.78) / 0.22;
          drawAllPlayers(drift * 0.15);
          drawPlayer(fkX + dir * 10, fkY, teamColor, teamLight, '10', 9, false, playerName);
          const gkBaseX = goalX + (isHome ? -20 : 20);
          drawPlayer(gkBaseX, goalY + 20, gkColor, gkLight, 'GK', 9);
          drawBall(ballEndX + dir * 3, ballEndY, 0.9);

          // Goal flash
          const flash = Math.sin(afterT * 22) * 0.14 * Math.max(0, 1 - afterT * 1.2);
          if (flash > 0) {
            ctx.fillStyle = `rgba(251, 191, 36, ${flash})`;
            ctx.fillRect(0, 0, W, H);
          }
          if (afterT > 0.15) {
            const bigAlpha = Math.min(1, (afterT - 0.15) * 4) * (afterT < 0.7 ? 1 : Math.max(0, 1 - (afterT - 0.7) * 3));
            ctx.save();
            ctx.globalAlpha = bigAlpha;
            ctx.font = `bold 24px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fbbf24';
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 4;
            ctx.strokeText('GOL DE FALTA!', W / 2, H / 2 - 12);
            ctx.fillText('GOL DE FALTA!', W / 2, H / 2 - 12);
            if (playerName) {
              ctx.font = `bold 14px Arial`;
              ctx.fillStyle = 'rgba(255,255,255,0.9)';
              ctx.strokeText(playerName, W / 2, H / 2 + 16);
              ctx.fillText(playerName, W / 2, H / 2 + 16);
            }
            ctx.restore();
          }
          drawEventLabel(1, '⚽ GOL DE FALTA MAGISTRAL!', playerName);
        }

      // ══════════════════════════════════════════════
      // STANDARD FLOW (goal, save, woodwork, corner, chance)
      // ══════════════════════════════════════════════
      } else {
        if (t < 0.30) {
          const passT = t / 0.30;
          const numPasses = passPoints.length;
          const passIdx = Math.min(Math.floor(passT * numPasses), numPasses - 1);
          const localT = (passT * numPasses) - passIdx;
          const from = passIdx === 0
            ? { x: isHome ? W * 0.15 : W * 0.85, y: H * 0.50 }
            : passPoints[passIdx - 1];
          const to = passPoints[passIdx];
          ballX = from.x + (to.x - from.x) * easeOut(localT);
          ballY = from.y + (to.y - from.y) * easeOut(localT);
          const shiftAmt = passT * 20;
          drawAllPlayers(drift * 0.5, true, ballX, ballY, shiftAmt);
          // Draw pass trails for all completed passes
          for (let i = 0; i < passIdx; i++) {
            const pf = i === 0 ? { x: isHome ? W * 0.15 : W * 0.85, y: H * 0.50 } : passPoints[i - 1];
            drawPassTrail(pf.x, pf.y, passPoints[i].x, passPoints[i].y, 1, 0.08 + (i * 0.02));
          }
          drawPassTrail(from.x, from.y, to.x, to.y, easeOut(localT), 0.3);
          // Draw passer (stays at from position after pass)
          const passerLabel = String(2 + passIdx);
          drawPlayer(from.x, from.y, teamColor, teamLight, passerLabel, 8, localT < 0.3);
          // Draw receiver running to receive
          if (localT > 0.4) {
            const recvX = to.x - (to.x - from.x) * (1 - localT) * 0.2;
            const recvY = to.y - (to.y - from.y) * (1 - localT) * 0.2;
            drawPlayer(recvX, recvY, teamColor, teamLight, String(3 + passIdx), 8, true);
          }
          // Show previous passers still visible on the pitch (collective feel)
          for (let i = Math.max(0, passIdx - 2); i < passIdx; i++) {
            const prevPos = i === 0 ? { x: isHome ? W * 0.15 : W * 0.85, y: H * 0.50 } : passPoints[i - 1];
            drawPlayer(prevPos.x, prevPos.y, teamColor, teamLight, String(2 + i), 7);
          }
          drawBall(ballX, ballY, 1, drift * 3);
          const passCountLabel = `Passe ${passIdx + 1}/${numPasses}`;
          drawEventLabel(passT, type === 'corner' ? '📐 Escanteio' : `⚡ Toque de bola coletivo`, passCountLabel);

        } else if (t < 0.45) {
          const keyT = (t - 0.30) / 0.15;
          const lastPass = passPoints[passPoints.length - 1];
          const keyTarget = { x: isHome ? W * 0.72 : W * 0.28, y: shooterPos.y };
          ballX = lastPass.x + (keyTarget.x - lastPass.x) * easeOut(keyT);
          ballY = lastPass.y + (keyTarget.y - lastPass.y) * easeOut(keyT);
          drawAllPlayers(drift * 0.4, true, ballX, ballY, 25);
          drawPlayer(lastPass.x, lastPass.y, teamColor, teamLight, '8', 8, keyT < 0.3);
          const runnerX = (isHome ? W * 0.60 : W * 0.40) + (keyTarget.x - (isHome ? W * 0.60 : W * 0.40)) * easeOut(keyT);
          drawPlayer(runnerX, keyTarget.y, teamColor, teamLight, '10', 9, true, playerName);
          drawCurvedPass(lastPass.x, lastPass.y, keyTarget.x, keyTarget.y, keyT, -30);
          const defStartX = isHome ? W * 0.75 : W * 0.25;
          const defX = defStartX + (keyTarget.x - defStartX) * easeOut(keyT) * 0.6;
          drawPlayer(defX, keyTarget.y + 15, gkColor, gkLight, '4', 7);
          drawBall(ballX, ballY, 1, drift * 4, true);
          drawSpotlight(ballX, ballY, 80, keyT * 0.5);
          drawEventLabel(keyT, '🎯 Passe decisivo!', playerName);

        } else if (t < 0.58) {
          const drT = (t - 0.45) / 0.13;
          const entryX = isHome ? W * 0.72 : W * 0.28;
          const runX = entryX + (shooterPos.x - entryX) * easeOut(drT);
          const runY = shooterPos.y;
          ballX = runX + (isHome ? 8 : -8);
          ballY = runY;
          drawAllPlayers(drift * 0.35, true, ballX, ballY, 30);
          const def1X = shooterPos.x + (isHome ? 18 : -18);
          const def1Y = shooterPos.y - 20 + drT * 10;
          drawPlayer(def1X, def1Y, gkColor, gkLight, '3', 7);
          const def2X = shooterPos.x + (isHome ? 22 : -22);
          const def2Y = shooterPos.y + 18 - drT * 8;
          drawPlayer(def2X, def2Y, gkColor, gkLight, '5', 7);
          const supportX = runX + (isHome ? -20 : 20);
          const supportY = runY + 25;
          drawPlayer(supportX, supportY, teamColor, teamLight, '11', 7);
          drawPlayer(runX, runY, teamColor, teamLight, '10', 10, true, playerName);
          const wobbleX = Math.sin(drT * 16) * 3;
          const wobbleY = Math.cos(drT * 12) * 1.5;
          drawBall(ballX + wobbleX, ballY + wobbleY - 2, 1, drift * 6);
          drawSpotlight(runX, runY, 70, 0.4);
          drawEventLabel(drT, '💨 Entrando na área!', playerName);

        } else if (t < 0.72) {
          const shotT = (t - 0.58) / 0.14;
          drawAllPlayers(drift * 0.25, true, goalX, goalY, 30);
          const sX = shooterPos.x + (isHome ? 6 : -6) * easeOut(Math.min(shotT * 2, 1));
          drawPlayer(sX, shooterPos.y, teamColor, teamLight, '10', 10, shotT < 0.25, playerName);
          const gkBaseX = goalX + (isHome ? -8 : 8);
          const gkDiveDir = ballEndY > goalY ? 1 : -1;
          const gkDiveY = type === 'save'
            ? goalY + gkDiveDir * 28 * easeOut(shotT)
            : goalY + (ballEndY - goalY) * 0.35 * easeOut(shotT);
          const gkDiveX = type === 'save'
            ? gkBaseX + (isHome ? -10 : 10) * easeOut(shotT)
            : gkBaseX;
          drawPlayer(gkDiveX, gkDiveY, gkColor, gkLight, 'GK', 9);
          const bEase = easeInOut(shotT);
          const bx = shooterPos.x + (isHome ? 12 : -12) + (ballEndX - shooterPos.x) * bEase;
          const by = shooterPos.y + (ballEndY - shooterPos.y) * bEase;
          const arc = Math.sin(bEase * Math.PI) * -22;
          drawBall(bx, by + arc, 1.3, drift * 10 + shotT * 25, true);
          if (shotT > 0.1 && shotT < 0.85) {
            const lineAlpha = 0.35 * (1 - shotT);
            ctx.strokeStyle = `rgba(255,255,255,${lineAlpha})`;
            ctx.lineWidth = 1.2;
            for (let i = 0; i < 4; i++) {
              const lx = bx + (isHome ? -18 - i * 7 : 18 + i * 7);
              const ly = by + arc - 5 + i * 3.5;
              ctx.beginPath();
              ctx.moveTo(lx, ly);
              ctx.lineTo(lx + (isHome ? -14 : 14), ly);
              ctx.stroke();
            }
          }
          if (shotT > 0.8) {
            const impactAlpha = (shotT - 0.8) * 3;
            ctx.fillStyle = `rgba(255,255,200,${impactAlpha * 0.15})`;
            ctx.beginPath();
            ctx.arc(ballEndX, ballEndY, 20, 0, Math.PI * 2);
            ctx.fill();
          }
          drawSpotlight(bx, by + arc, 60, 0.5);
          const shotLabels: Record<string, string> = {
            goal: '🔥 CHUTOU!', woodwork: '💥 FINALIZAÇÃO!',
            save: '🧤 CHUTE FORTE!', corner: '⬆️ CABECEIO!', chance: '⚡ FINALIZAÇÃO!',
          };
          drawEventLabel(shotT, shotLabels[type] || '⚡ CHUTE!', playerName);

        } else {
          const afterT = (t - 0.72) / 0.28;
          drawAllPlayers(drift * 0.15);
          drawPlayer(shooterPos.x + (isHome ? 10 : -10), shooterPos.y, teamColor, teamLight, '10', 9, false, playerName);
          const gkBaseX = goalX + (isHome ? -8 : 8);
          const gkDiveDir = ballEndY > goalY ? 1 : -1;
          const gkFinalY = type === 'save' ? goalY + gkDiveDir * 28 : goalY + (ballEndY - goalY) * 0.35;
          const gkFinalX = type === 'save' ? gkBaseX + (isHome ? -10 : 10) : gkBaseX;
          drawPlayer(gkFinalX, gkFinalY, gkColor, gkLight, 'GK', 9);

          if (type === 'woodwork') {
            const bounceX = ballEndX + (isHome ? -35 : 35) * easeOut(afterT);
            const bounceY = ballEndY + 25 * easeOut(afterT);
            drawBall(bounceX, bounceY, 1, drift * 2);
            const shake = Math.sin(afterT * 45) * 3.5 * Math.max(0, 1 - afterT * 2.5);
            ctx.save();
            ctx.translate(shake, 0);
            const netX = isHome ? W - goalW : 0;
            ctx.strokeStyle = 'rgba(255,100,100,0.7)';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(netX, goalY - goalH / 2, goalW, goalH);
            ctx.restore();
            if (afterT < 0.3) {
              ctx.fillStyle = `rgba(255,50,50,${0.1 * (1 - afterT / 0.3)})`;
              ctx.fillRect(0, 0, W, H);
            }
            drawEventLabel(1, '😤 NA TRAVE!', playerName);
          } else if (type === 'save') {
            const deflX = ballEndX + (isHome ? -30 : 30) * easeOut(afterT);
            drawBall(deflX, ballEndY + 12 * afterT, 1);
            if (afterT < 0.4) {
              ctx.fillStyle = `rgba(34, 197, 94, ${0.12 * (1 - afterT / 0.4)})`;
              ctx.fillRect(0, 0, W, H);
            }
            drawEventLabel(1, '🧤 GRANDE DEFESA!', playerName);
          } else if (type === 'goal') {
            drawBall(ballEndX + (isHome ? 3 : -3), ballEndY, 0.9);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            const netX = isHome ? W - goalW : goalW;
            ctx.beginPath();
            ctx.moveTo(netX, ballEndY - 10);
            ctx.quadraticCurveTo(netX + (isHome ? 7 : -7) * (1 - afterT * 0.5), ballEndY, netX, ballEndY + 10);
            ctx.stroke();
            const flash = Math.sin(afterT * 22) * 0.14 * Math.max(0, 1 - afterT * 1.2);
            if (flash > 0) {
              ctx.fillStyle = `rgba(251, 191, 36, ${flash})`;
              ctx.fillRect(0, 0, W, H);
            }
            if (afterT > 0.25) {
              const celebT = (afterT - 0.25) / 0.75;
              const positions = isHome ? HOME_POSITIONS : AWAY_POSITIONS;
              for (let i = 7; i < 11; i++) {
                const cx = positions[i].x * W + (shooterPos.x - positions[i].x * W) * easeOut(celebT) * 0.5;
                const cy = positions[i].y * H + (shooterPos.y - positions[i].y * H) * easeOut(celebT) * 0.35;
                drawPlayer(cx, cy, teamColor, teamLight, positions[i].label, 7);
              }
            }
            if (afterT > 0.12) {
              const bigAlpha = Math.min(1, (afterT - 0.12) * 4) * (afterT < 0.75 ? 1 : Math.max(0, 1 - (afterT - 0.75) * 4));
              const scale = 1 + easeOut(Math.min(afterT * 2, 1)) * 0.25;
              ctx.save();
              ctx.globalAlpha = bigAlpha;
              ctx.font = `bold ${Math.round(30 * scale)}px Arial`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#fbbf24';
              ctx.strokeStyle = 'rgba(0,0,0,0.6)';
              ctx.lineWidth = 4;
              ctx.strokeText('GOOOL!', W / 2, H / 2 - 12);
              ctx.fillText('GOOOL!', W / 2, H / 2 - 12);
              if (playerName) {
                ctx.font = `bold 14px Arial`;
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 2;
                ctx.strokeText(playerName, W / 2, H / 2 + 16);
                ctx.fillText(playerName, W / 2, H / 2 + 16);
              }
              ctx.restore();
            }
            drawEventLabel(1, '⚽ GOOOOOL!!!', playerName);
          } else if (type === 'chance') {
            const wideX = ballEndX + (isHome ? 15 : -15) * easeOut(afterT);
            const wideY = ballEndY + (ballEndY > goalY ? 20 : -20) * easeOut(afterT);
            drawBall(wideX, wideY, 0.9, drift);
            drawEventLabel(1, '😰 Quase! Por pouco!', playerName);
          } else {
            drawBall(ballEndX, ballEndY, 0.9);
            drawEventLabel(1, type === 'corner' ? '📐 Escanteio perigoso!' : '⚽ Lance!', playerName);
          }
        }
      }

      if (frame < totalFrames + 60) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        onCompleteRef.current?.();
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [type, team, playerName]);

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
    'counter_attack_goal', 'crossing_goal', 'free_kick_goal',
    'counter_attack', 'free_kick_near',
    'penalty_shootout', 'goal', 'red_card', 'yellow_card'
  ].includes(type);
}

/** Map event type to highlight canvas type */
export function getHighlightType(eventType: string): HighlightType {
  if (eventType === 'counter_attack_goal') return 'counter_attack';
  if (eventType === 'crossing_goal') return 'crossing';
  if (eventType === 'free_kick_goal') return 'free_kick';
  if (eventType === 'counter_attack') return 'counter_attack';
  if (eventType === 'free_kick_near') return 'free_kick';
  if (['foot_goal', 'header_goal', 'goal'].includes(eventType)) return 'goal';
  if (['penalty_goal', 'penalty_miss', 'penalty_shootout'].includes(eventType)) return 'penalty';
  if (eventType === 'woodwork') return 'woodwork';
  if (eventType === 'corner_danger') return 'corner';
  if (eventType === 'great_save') return 'save';
  if (eventType === 'red_card') return 'red_card';
  if (eventType === 'yellow_card') return 'yellow_card';
  return 'chance';
}
