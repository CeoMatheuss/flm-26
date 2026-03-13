/**
 * HighlightMiniCanvas — Canvas 2D with 22 players on a full pitch.
 * 
 * Shows all 22 players in formation at all times.
 * Multi-phase highlight animations with realistic positioning.
 * Shooter finishes INSIDE the box, not from midfield.
 */

import { useRef, useEffect, memo } from 'react';

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
  grass1: '#1b7a3d',
  grass2: '#228b46',
};

// 4-4-2 formation positions (normalized 0-1)
const HOME_POSITIONS = [
  { x: 0.06, y: 0.5, label: '1' },
  { x: 0.18, y: 0.15, label: '2' },
  { x: 0.18, y: 0.38, label: '3' },
  { x: 0.18, y: 0.62, label: '4' },
  { x: 0.18, y: 0.85, label: '5' },
  { x: 0.35, y: 0.15, label: '6' },
  { x: 0.35, y: 0.38, label: '7' },
  { x: 0.35, y: 0.62, label: '8' },
  { x: 0.35, y: 0.85, label: '9' },
  { x: 0.45, y: 0.35, label: '10' },
  { x: 0.45, y: 0.65, label: '11' },
];

const AWAY_POSITIONS = [
  { x: 0.94, y: 0.5, label: '1' },
  { x: 0.82, y: 0.15, label: '2' },
  { x: 0.82, y: 0.38, label: '3' },
  { x: 0.82, y: 0.62, label: '4' },
  { x: 0.82, y: 0.85, label: '5' },
  { x: 0.65, y: 0.15, label: '6' },
  { x: 0.65, y: 0.38, label: '7' },
  { x: 0.65, y: 0.62, label: '8' },
  { x: 0.65, y: 0.85, label: '9' },
  { x: 0.55, y: 0.35, label: '10' },
  { x: 0.55, y: 0.65, label: '11' },
];

// Longer durations for more polished animations
const HIGHLIGHT_DURATIONS: Record<HighlightType, number> = {
  goal: 420,           // 7s
  penalty: 390,        // 6.5s
  woodwork: 360,       // 6s
  corner: 330,         // 5.5s
  chance: 300,         // 5s
  save: 360,           // 6s
  penalty_shootout: 390,
  idle: Infinity,
};

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
    const totalFrames = HIGHLIGHT_DURATIONS[type] || 300;
    const isHome = team === 'home';

    // Helper for Y variance
    const randY = () => H * 0.3 + Math.random() * H * 0.4;

    // Goal area constants
    const goalX = isHome ? W - 8 : 8;
    const goalY = H * 0.5;
    const goalW = 8, goalH = 60;

    // ── REALISTIC POSITIONING ──
    // Shooter is INSIDE the penalty box (x ~0.78 for home, ~0.22 for away)
    const shooterPos = type === 'penalty' || type === 'penalty_shootout'
      ? { x: isHome ? W * 0.80 : W * 0.20, y: H * 0.5 }
      : { x: isHome ? W * 0.76 + Math.random() * W * 0.06 : W * 0.18 + Math.random() * W * 0.06, 
          y: H * 0.35 + Math.random() * H * 0.3 };

    // Build-up: 4 passes progressing from own half to attack
    const passPoints = type === 'penalty' || type === 'penalty_shootout' ? [] : [
      { x: isHome ? W * 0.30 : W * 0.70, y: randY() },
      { x: isHome ? W * 0.42 : W * 0.58, y: randY() },
      { x: isHome ? W * 0.56 : W * 0.44, y: randY() },
      { x: isHome ? W * 0.68 : W * 0.32, y: randY() },
    ];

    // Ball end position (inside the goal for goals, near post for others)
    let ballEndX = goalX;
    let ballEndY = goalY + (Math.random() - 0.5) * 36;

    if (type === 'woodwork') {
      ballEndY = goalY - goalH / 2 + 3 + Math.random() * 6;
    } else if (type === 'save') {
      ballEndX = goalX + (isHome ? -10 : 10);
      ballEndY = goalY + (Math.random() - 0.5) * 30;
    } else if (type === 'corner') {
      passPoints[0] = { x: isHome ? W * 0.88 : W * 0.12, y: H * 0.05 };
      passPoints[1] = { x: isHome ? W * 0.82 : W * 0.18, y: H * 0.28 };
      passPoints[2] = { x: isHome ? W * 0.85 : W * 0.15, y: H * 0.42 };
      passPoints[3] = { x: isHome ? W * 0.80 : W * 0.20, y: H * 0.50 };
    } else if (type === 'chance') {
      // Miss goes wide
      ballEndX = goalX + (isHome ? 8 : -8);
      ballEndY = goalY + (Math.random() > 0.5 ? -40 : 40);
    }

    // ── Pitch drawing with gradient stripes ──
    const drawPitch = () => {
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 === 0 ? COLORS.grass1 : COLORS.grass2;
        ctx.fillRect(i * (W / 12), 0, W / 12 + 1, H);
      }
      // Pitch outline
      ctx.strokeStyle = COLORS.lines;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      // Halfway line
      ctx.beginPath(); ctx.moveTo(W / 2, 2); ctx.lineTo(W / 2, H - 2); ctx.stroke();
      // Center circle
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 35, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = COLORS.lines;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2); ctx.fill();
      // Penalty areas
      ctx.strokeRect(2, H / 2 - 55, 56, 110);
      ctx.strokeRect(2, H / 2 - 30, 24, 60);
      ctx.strokeRect(W - 58, H / 2 - 55, 56, 110);
      ctx.strokeRect(W - 26, H / 2 - 30, 24, 60);
      // Penalty spots
      ctx.fillStyle = COLORS.lines;
      ctx.beginPath(); ctx.arc(38, H / 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W - 38, H / 2, 2, 0, Math.PI * 2); ctx.fill();
      // Penalty arcs
      ctx.beginPath(); ctx.arc(38, H / 2, 28, -0.65, 0.65); ctx.stroke();
      ctx.beginPath(); ctx.arc(W - 38, H / 2, 28, Math.PI - 0.65, Math.PI + 0.65); ctx.stroke();
      // Goals
      ctx.fillStyle = COLORS.net;
      ctx.fillRect(0, H / 2 - goalH / 2, goalW, goalH);
      ctx.fillRect(W - goalW, H / 2 - goalH / 2, goalW, goalH);
      // Goal net lines
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
      // Corner arcs
      const corners: [number, number][] = [[2, 2], [W - 2, 2], [2, H - 2], [W - 2, H - 2]];
      corners.forEach(([cx, cy]) => {
        ctx.beginPath();
        const sa = cx < W / 2 ? (cy < H / 2 ? 0 : -Math.PI / 2) : (cy < H / 2 ? Math.PI / 2 : Math.PI);
        ctx.arc(cx, cy, 8, sa, sa + Math.PI / 2);
        ctx.stroke();
      });
    };

    // ── Draw player with jersey and name ──
    const drawPlayer = (x: number, y: number, color: string, light: string, label: string, size = 7, glowing = false, showName?: string) => {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + size * 0.8, size * 0.9, size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      if (glowing) {
        const grad = ctx.createRadialGradient(x, y, size, x, y, size + 8);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, size + 8, 0, Math.PI * 2);
        ctx.fill();
      }
      // Body
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
      // Number
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = `bold ${Math.max(6, size - 1)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5);
      // Name below
      if (showName) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 7px Arial';
        ctx.fillText(showName.length > 10 ? showName.slice(0, 9) + '…' : showName, x, y + size + 8);
      }
    };

    // ── Draw all 22 players with drift ──
    const drawAllPlayers = (drift: number, reactToAction = false, actionX = 0, actionY = 0, shiftAmount = 0) => {
      const driftAmt = reactToAction ? 4 : 2;
      HOME_POSITIONS.forEach((p, i) => {
        let px = p.x * W;
        let py = p.y * H;
        // Shift attacking team forward during action
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

    // ── Draw ball with enhanced spin ──
    const drawBall = (x: number, y: number, scale = 1, spin = 0, trail = false) => {
      // Motion trail
      if (trail) {
        for (let t = 3; t > 0; t--) {
          const alpha = 0.06 * t;
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(x - (isHome ? t * 5 : -t * 5), y, 3 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + 3, 4.5 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      // Ball body
      ctx.fillStyle = COLORS.ball;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // Pentagon pattern
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

    // ── Pass trail (dashed line) ──
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

    // ── Curved pass (for through balls / crosses) ──
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

    // ── Idle overlay ──
    const drawIdleOverlay = (drift: number) => {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
      // Vignette
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
      ctx.fillText(currentMinute !== undefined ? `${currentMinute}' em jogo` : 'Partida em andamento', W / 2, H / 2 + 14);
      const ballScale = 0.8 + Math.sin(drift * 1.5) * 0.15;
      drawBall(W / 2, H / 2 + 38, ballScale);
    };

    // ── Event label bar with gradient ──
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

    // ── Spotlight effect on action area ──
    const drawSpotlight = (cx: number, cy: number, radius: number, alpha: number) => {
      // Darken everything except spotlight
      ctx.fillStyle = `rgba(0,0,0,${alpha * 0.25})`;
      ctx.fillRect(0, 0, W, H);
      // Clear spotlight area
      const spot = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      spot.addColorStop(0, `rgba(255,255,200,${alpha * 0.08})`);
      spot.addColorStop(0.7, 'rgba(0,0,0,0)');
      spot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, H);
    };

    // Easing helpers
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

      // ── PENALTY: Special flow (no build-up) ──
      if (type === 'penalty' || type === 'penalty_shootout') {
        /*
         * Phase 0: Walk-up (0 → 0.30)
         * Phase 1: Run-up + kick (0.30 → 0.55)
         * Phase 2: Ball flight (0.55 → 0.75)
         * Phase 3: Aftermath (0.75 → 1.0)
         */
        const penSpotX = isHome ? W - 38 : 38;
        const penSpotY = H / 2;

        if (t < 0.30) {
          const walkT = t / 0.30;
          drawAllPlayers(drift * 0.3, false, 0, 0, 15 * easeOut(walkT));
          // Shooter walking to spot
          const startX = isHome ? W * 0.55 : W * 0.45;
          const sx = startX + (penSpotX - startX - (isHome ? 35 : -35)) * easeOut(walkT);
          drawPlayer(sx, penSpotY, teamColor, teamLight, '10', 9, true, playerName);
          // GK on line
          const gkX = goalX + (isHome ? -8 : 8);
          drawPlayer(gkX, goalY, gkColor, gkLight, 'GK', 9);
          drawBall(penSpotX, penSpotY - 2, 1);
          drawEventLabel(walkT, type === 'penalty_shootout' ? '🎯 DISPUTA DE PÊNALTIS' : '🎯 PÊNALTI!', playerName);

        } else if (t < 0.55) {
          const runT = (t - 0.30) / 0.25;
          drawAllPlayers(drift * 0.2, false, 0, 0, 20);
          // Run-up
          const runStartX = penSpotX + (isHome ? -35 : 35);
          const sx = runStartX + (penSpotX - runStartX) * easeIn(Math.min(runT * 1.3, 1));
          drawPlayer(sx, penSpotY, teamColor, teamLight, '10', 9, runT < 0.7, playerName);
          // GK bouncing
          const gkX = goalX + (isHome ? -8 : 8);
          const gkBounce = Math.sin(runT * 15) * 3;
          drawPlayer(gkX, goalY + gkBounce, gkColor, gkLight, 'GK', 9);
          drawBall(penSpotX, penSpotY - 2, 1);
          drawEventLabel(1, '🏃 Corrida para a bola...', playerName);

        } else if (t < 0.75) {
          const shotT = (t - 0.55) / 0.20;
          drawAllPlayers(drift * 0.2, true, goalX, goalY, 20);
          // Shooter post-kick
          drawPlayer(penSpotX + (isHome ? 5 : -5), penSpotY, teamColor, teamLight, '10', 9, false, playerName);
          // GK diving
          const gkX = goalX + (isHome ? -6 : 6);
          const diveDir = ballEndY > goalY ? 1 : -1;
          const gkDiveY = goalY + diveDir * 25 * easeOut(shotT);
          const gkDiveX = gkX + (isHome ? -12 : 12) * easeOut(shotT);
          drawPlayer(gkDiveX, gkDiveY, gkColor, gkLight, 'GK', 9);
          // Ball flight
          const bx = penSpotX + (ballEndX - penSpotX) * easeOut(shotT);
          const by = penSpotY + (ballEndY - penSpotY) * easeOut(shotT);
          const arc = Math.sin(easeOut(shotT) * Math.PI) * -20;
          drawBall(bx, by + arc, 1.1, drift * 10 + shotT * 20, true);
          drawEventLabel(shotT, '⚡ CHUTOU!');

        } else {
          const afterT = (t - 0.75) / 0.25;
          drawAllPlayers(drift * 0.15);
          drawPlayer(penSpotX + (isHome ? 8 : -8), penSpotY, teamColor, teamLight, '10', 9, false, playerName);
          const gkX = goalX + (isHome ? -6 : 6);
          const diveDir = ballEndY > goalY ? 1 : -1;
          drawPlayer(gkX + (isHome ? -12 : 12), goalY + diveDir * 25, gkColor, gkLight, 'GK', 9);
          drawBall(ballEndX, ballEndY, 0.9);

          if (type === 'penalty' || type === 'penalty_shootout') {
            // Goal flash
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
          }
          drawEventLabel(1, '⚽ GOL DE PÊNALTI!', playerName);
        }

      } else {
        /*
         * Phase 0: Build-up passes (0 → 0.30)
         * Phase 1: Key pass / through ball (0.30 → 0.45)
         * Phase 2: Dribble into box (0.45 → 0.58)
         * Phase 3: Shot (0.58 → 0.72)
         * Phase 4: Aftermath (0.72 → 1.0)
         */

        // ── Phase 0: Build-up passes ──
        if (t < 0.30) {
          const passT = t / 0.30;
          const numPasses = passPoints.length;
          const passIdx = Math.min(Math.floor(passT * numPasses), numPasses - 1);
          const localT = (passT * numPasses) - passIdx;

          const from = passIdx === 0 
            ? { x: isHome ? W * 0.20 : W * 0.80, y: H * 0.45 } 
            : passPoints[passIdx - 1];
          const to = passPoints[passIdx];
          ballX = from.x + (to.x - from.x) * easeOut(localT);
          ballY = from.y + (to.y - from.y) * easeOut(localT);

          const shiftAmt = passT * 20;
          drawAllPlayers(drift * 0.5, true, ballX, ballY, shiftAmt);

          // Draw completed pass trails
          for (let i = 0; i < passIdx; i++) {
            const pf = i === 0 ? { x: isHome ? W * 0.20 : W * 0.80, y: H * 0.45 } : passPoints[i - 1];
            drawPassTrail(pf.x, pf.y, passPoints[i].x, passPoints[i].y, 1, 0.12);
          }
          drawPassTrail(from.x, from.y, to.x, to.y, easeOut(localT), 0.3);

          // Passer
          drawPlayer(from.x, from.y, teamColor, teamLight, String(4 + passIdx), 8);
          // Receiver running
          if (localT > 0.5) {
            const recvX = to.x - (to.x - from.x) * (1 - localT) * 0.3;
            drawPlayer(recvX, to.y, teamColor, teamLight, String(5 + passIdx), 8, true);
          }

          drawBall(ballX, ballY, 1, drift * 3);
          drawEventLabel(passT, type === 'corner' ? '📐 Escanteio' : '⚡ Construção de jogada', playerName);

        // ── Phase 1: Key pass / through ball to attacker ──
        } else if (t < 0.45) {
          const keyT = (t - 0.30) / 0.15;
          const lastPass = passPoints[passPoints.length - 1];
          // Key pass goes to edge of box
          const keyTarget = { 
            x: isHome ? W * 0.72 : W * 0.28, 
            y: shooterPos.y 
          };
          ballX = lastPass.x + (keyTarget.x - lastPass.x) * easeOut(keyT);
          ballY = lastPass.y + (keyTarget.y - lastPass.y) * easeOut(keyT);

          drawAllPlayers(drift * 0.4, true, ballX, ballY, 25);

          // Midfielder making key pass
          drawPlayer(lastPass.x, lastPass.y, teamColor, teamLight, '8', 8, keyT < 0.3);
          // Attacker making the run
          const runnerX = (isHome ? W * 0.60 : W * 0.40) + (keyTarget.x - (isHome ? W * 0.60 : W * 0.40)) * easeOut(keyT);
          drawPlayer(runnerX, keyTarget.y, teamColor, teamLight, '10', 9, true, playerName);

          // Curved pass trail
          drawCurvedPass(lastPass.x, lastPass.y, keyTarget.x, keyTarget.y, keyT, -30);

          // Defender chasing
          const defStartX = isHome ? W * 0.75 : W * 0.25;
          const defX = defStartX + (keyTarget.x - defStartX) * easeOut(keyT) * 0.6;
          drawPlayer(defX, keyTarget.y + 15, gkColor, gkLight, '4', 7);

          drawBall(ballX, ballY, 1, drift * 4, true);
          drawSpotlight(ballX, ballY, 80, keyT * 0.5);
          drawEventLabel(keyT, '🎯 Passe decisivo!', playerName);

        // ── Phase 2: Dribble into the box ──
        } else if (t < 0.58) {
          const drT = (t - 0.45) / 0.13;
          const entryX = isHome ? W * 0.72 : W * 0.28;
          const runX = entryX + (shooterPos.x - entryX) * easeOut(drT);
          const runY = shooterPos.y;
          ballX = runX + (isHome ? 8 : -8);
          ballY = runY;

          drawAllPlayers(drift * 0.35, true, ballX, ballY, 30);

          // Two defenders converging
          const def1X = shooterPos.x + (isHome ? 18 : -18);
          const def1Y = shooterPos.y - 20 + drT * 10;
          drawPlayer(def1X, def1Y, gkColor, gkLight, '3', 7);
          const def2X = shooterPos.x + (isHome ? 22 : -22);
          const def2Y = shooterPos.y + 18 - drT * 8;
          drawPlayer(def2X, def2Y, gkColor, gkLight, '5', 7);

          // Support runner
          const supportX = runX + (isHome ? -20 : 20);
          const supportY = runY + 25;
          drawPlayer(supportX, supportY, teamColor, teamLight, '11', 7);

          // Dribbling player
          drawPlayer(runX, runY, teamColor, teamLight, '10', 10, true, playerName);

          // Wobbling ball at feet
          const wobbleX = Math.sin(drT * 16) * 3;
          const wobbleY = Math.cos(drT * 12) * 1.5;
          drawBall(ballX + wobbleX, ballY + wobbleY - 2, 1, drift * 6);

          drawSpotlight(runX, runY, 70, 0.4);
          drawEventLabel(drT, '💨 Entrando na área!', playerName);

        // ── Phase 3: Shot ──
        } else if (t < 0.72) {
          const shotT = (t - 0.58) / 0.14;

          drawAllPlayers(drift * 0.25, true, goalX, goalY, 30);

          // Shooter kicks — body leans forward
          const sX = shooterPos.x + (isHome ? 6 : -6) * easeOut(Math.min(shotT * 2, 1));
          drawPlayer(sX, shooterPos.y, teamColor, teamLight, '10', 10, shotT < 0.25, playerName);

          // GK reacts and dives
          const gkBaseX = goalX + (isHome ? -8 : 8);
          const gkDiveDir = ballEndY > goalY ? 1 : -1;
          const gkDiveY = type === 'save'
            ? goalY + gkDiveDir * 28 * easeOut(shotT)
            : goalY + (ballEndY - goalY) * 0.35 * easeOut(shotT);
          const gkDiveX = type === 'save' 
            ? gkBaseX + (isHome ? -10 : 10) * easeOut(shotT) 
            : gkBaseX;
          drawPlayer(gkDiveX, gkDiveY, gkColor, gkLight, 'GK', 9);

          // Ball flying — REALISTIC arc from inside box
          const bEase = easeInOut(shotT);
          const bx = shooterPos.x + (isHome ? 12 : -12) + (ballEndX - shooterPos.x) * bEase;
          const by = shooterPos.y + (ballEndY - shooterPos.y) * bEase;
          const arc = Math.sin(bEase * Math.PI) * -22;
          drawBall(bx, by + arc, 1.3, drift * 10 + shotT * 25, true);

          // Speed lines
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

          // Impact flash near goal
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

        // ── Phase 4: Aftermath / celebration ──
        } else {
          const afterT = (t - 0.72) / 0.28;

          drawAllPlayers(drift * 0.15);

          // Shooter final position
          drawPlayer(shooterPos.x + (isHome ? 10 : -10), shooterPos.y, teamColor, teamLight, '10', 9, false, playerName);

          // GK final
          const gkBaseX = goalX + (isHome ? -8 : 8);
          const gkDiveDir = ballEndY > goalY ? 1 : -1;
          const gkFinalY = type === 'save' ? goalY + gkDiveDir * 28 : goalY + (ballEndY - goalY) * 0.35;
          const gkFinalX = type === 'save' ? gkBaseX + (isHome ? -10 : 10) : gkBaseX;
          drawPlayer(gkFinalX, gkFinalY, gkColor, gkLight, 'GK', 9);

          // ── Type-specific aftermath ──
          if (type === 'woodwork') {
            const bounceX = ballEndX + (isHome ? -35 : 35) * easeOut(afterT);
            const bounceY = ballEndY + 25 * easeOut(afterT);
            drawBall(bounceX, bounceY, 1, drift * 2);
            // Post shake
            const shake = Math.sin(afterT * 45) * 3.5 * Math.max(0, 1 - afterT * 2.5);
            ctx.save();
            ctx.translate(shake, 0);
            const netX = isHome ? W - goalW : 0;
            ctx.strokeStyle = 'rgba(255,100,100,0.7)';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(netX, goalY - goalH / 2, goalW, goalH);
            ctx.restore();
            // Red flash
            if (afterT < 0.3) {
              ctx.fillStyle = `rgba(255,50,50,${0.1 * (1 - afterT / 0.3)})`;
              ctx.fillRect(0, 0, W, H);
            }
            drawEventLabel(1, '😤 NA TRAVE!', playerName);

          } else if (type === 'save') {
            const deflX = ballEndX + (isHome ? -30 : 30) * easeOut(afterT);
            drawBall(deflX, ballEndY + 12 * afterT, 1);
            // Green glow for save
            if (afterT < 0.4) {
              ctx.fillStyle = `rgba(34, 197, 94, ${0.12 * (1 - afterT / 0.4)})`;
              ctx.fillRect(0, 0, W, H);
            }
            drawEventLabel(1, '🧤 GRANDE DEFESA!', playerName);

          } else if (type === 'goal') {
            // Ball in net
            drawBall(ballEndX + (isHome ? 3 : -3), ballEndY, 0.9);
            // Net bulge
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            const netX = isHome ? W - goalW : goalW;
            ctx.beginPath();
            ctx.moveTo(netX, ballEndY - 10);
            ctx.quadraticCurveTo(netX + (isHome ? 7 : -7) * (1 - afterT * 0.5), ballEndY, netX, ballEndY + 10);
            ctx.stroke();

            // Golden goal flash
            const flash = Math.sin(afterT * 22) * 0.14 * Math.max(0, 1 - afterT * 1.2);
            if (flash > 0) {
              ctx.fillStyle = `rgba(251, 191, 36, ${flash})`;
              ctx.fillRect(0, 0, W, H);
            }

            // Celebration: teammates run to scorer
            if (afterT > 0.25) {
              const celebT = (afterT - 0.25) / 0.75;
              const positions = isHome ? HOME_POSITIONS : AWAY_POSITIONS;
              for (let i = 7; i < 11; i++) {
                const cx = positions[i].x * W + (shooterPos.x - positions[i].x * W) * easeOut(celebT) * 0.5;
                const cy = positions[i].y * H + (shooterPos.y - positions[i].y * H) * easeOut(celebT) * 0.35;
                drawPlayer(cx, cy, teamColor, teamLight, positions[i].label, 7);
              }
            }

            // Big GOOOL text
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
            // Ball going wide
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
