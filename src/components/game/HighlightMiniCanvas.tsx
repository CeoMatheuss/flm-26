/**
 * HighlightMiniCanvas — Canvas 2D with 22 players on a full pitch.
 * 
 * Shows all 22 players in formation at all times.
 * When a highlight plays, the action animates with multi-phase sequences.
 * When idle (no highlight), the pitch darkens with "Aguardando lance..." text.
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

// Duration configs per highlight type (in frames at 60fps)
const HIGHLIGHT_DURATIONS: Record<HighlightType, number> = {
  goal: 300,         // 5s
  penalty: 330,      // 5.5s
  woodwork: 270,     // 4.5s
  corner: 240,       // 4s
  chance: 210,       // 3.5s
  save: 270,         // 4.5s
  penalty_shootout: 330,
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
    const totalFrames = HIGHLIGHT_DURATIONS[type] || 240;
    const isHome = team === 'home';

    // Randomized starting positions for variety
    const randY = () => H * 0.5 + (Math.random() - 0.5) * 60;
    const randMidX = () => W * (0.4 + Math.random() * 0.2);

    // Phase positions
    const goalX = isHome ? W * 0.92 : W * 0.08;
    const goalY = H * 0.5;
    const goalW = 8, goalH = 60;

    // Build-up: start from deeper (multi-pass sequence)
    const passPoints = [
      { x: isHome ? W * 0.28 : W * 0.72, y: randY() },
      { x: isHome ? W * 0.40 : W * 0.60, y: randY() },
      { x: isHome ? W * 0.55 : W * 0.45, y: randY() },
    ];
    const shooterPos = { x: isHome ? W * 0.62 : W * 0.38, y: H * 0.5 + (Math.random() - 0.5) * 40 };
    
    let ballEndX = goalX;
    let ballEndY = goalY + (Math.random() - 0.5) * 36;

    if (type === 'woodwork') ballEndY = goalY - goalH / 2 + 4;
    else if (type === 'save') ballEndX = goalX + (isHome ? -12 : 12);
    else if (type === 'corner') {
      passPoints[0] = { x: isHome ? W * 0.85 : W * 0.15, y: H * 0.05 };
      passPoints[1] = { x: isHome ? W * 0.78 : W * 0.22, y: H * 0.35 };
      passPoints[2] = { x: isHome ? W * 0.82 : W * 0.18, y: H * 0.5 };
    }

    // ── Draw full pitch ──
    const drawPitch = () => {
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? COLORS.pitch : COLORS.pitchLight;
        ctx.fillRect(i * (W / 10), 0, W / 10 + 1, H);
      }
      ctx.strokeStyle = COLORS.lines;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.beginPath(); ctx.moveTo(W / 2, 2); ctx.lineTo(W / 2, H - 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 35, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = COLORS.lines;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeRect(2, H / 2 - 55, 52, 110);
      ctx.strokeRect(2, H / 2 - 30, 22, 60);
      ctx.strokeRect(W - 54, H / 2 - 55, 52, 110);
      ctx.strokeRect(W - 24, H / 2 - 30, 22, 60);
      ctx.fillStyle = COLORS.net;
      ctx.fillRect(0, H / 2 - goalH / 2, goalW, goalH);
      ctx.fillRect(W - goalW, H / 2 - goalH / 2, goalW, goalH);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(0, H / 2 - goalH / 2, goalW, goalH);
      ctx.strokeRect(W - goalW, H / 2 - goalH / 2, goalW, goalH);
      const corners = [[2, 2], [W - 2, 2], [2, H - 2], [W - 2, H - 2]];
      corners.forEach(([cx, cy]) => {
        ctx.beginPath();
        const sa = cx < W / 2 ? (cy < H / 2 ? 0 : -Math.PI / 2) : (cy < H / 2 ? Math.PI / 2 : Math.PI);
        ctx.arc(cx, cy, 8, sa, sa + Math.PI / 2);
        ctx.stroke();
      });
    };

    // ── Draw player circle ──
    const drawPlayer = (x: number, y: number, color: string, light: string, label: string, size = 7, glowing = false) => {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(x + 1, y + size * 0.7, size, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      if (glowing) {
        ctx.fillStyle = `rgba(251, 191, 36, 0.25)`;
        ctx.beginPath();
        ctx.arc(x, y, size + 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = light;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `bold ${Math.max(6, size - 1)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5);
    };

    // ── Draw all 22 players with organic drift ──
    const drawAllPlayers = (drift: number, reactToAction = false, actionX = 0, actionY = 0) => {
      const driftAmt = reactToAction ? 3.5 : 2;
      HOME_POSITIONS.forEach((p, i) => {
        let dx = Math.sin(drift + i * 1.3) * driftAmt;
        let dy = Math.cos(drift + i * 0.9) * driftAmt;
        if (reactToAction) {
          const dist = Math.hypot(p.x * W - actionX, p.y * H - actionY);
          if (dist < 120) {
            dx += (actionX - p.x * W) * 0.02;
            dy += (actionY - p.y * H) * 0.02;
          }
        }
        drawPlayer(p.x * W + dx, p.y * H + dy, COLORS.home, COLORS.homeLight, p.label);
      });
      AWAY_POSITIONS.forEach((p, i) => {
        let dx = Math.sin(drift + i * 1.1 + 3) * driftAmt;
        let dy = Math.cos(drift + i * 0.7 + 2) * driftAmt;
        if (reactToAction) {
          const dist = Math.hypot(p.x * W - actionX, p.y * H - actionY);
          if (dist < 120) {
            dx += (actionX - p.x * W) * 0.02;
            dy += (actionY - p.y * H) * 0.02;
          }
        }
        drawPlayer(p.x * W + dx, p.y * H + dy, COLORS.away, COLORS.awayLight, p.label);
      });
    };

    // ── Draw ball with spin ──
    const drawBall = (x: number, y: number, scale = 1, spin = 0) => {
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
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // Pentagon pattern on ball
      if (scale > 0.8) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * 2.2 * scale, Math.sin(angle) * 2.2 * scale, 1 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    // ── Draw pass trail ──
    const drawPassTrail = (fromX: number, fromY: number, toX: number, toY: number, progress: number, alpha = 0.3) => {
      const len = progress;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(fromX + (toX - fromX) * len, fromY + (toY - fromY) * len);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // ── Idle overlay ──
    const drawIdleOverlay = (drift: number) => {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(255,255,255,0.85)`;
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

    // ── Event label bar ──
    const drawEventLabel = (t: number, label: string, subLabel?: string) => {
      if (t < 0.2) return;
      const alpha = Math.min(1, (t - 0.2) * 4);
      const barH = subLabel ? 36 : 28;
      ctx.fillStyle = `rgba(0,0,0,${alpha * 0.7})`;
      ctx.fillRect(0, H - barH, W, barH);
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, W / 2, H - (subLabel ? 22 : 14));
      if (subLabel) {
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
        ctx.font = '10px Arial';
        ctx.fillText(subLabel, W / 2, H - 8);
      }
    };

    // Easing helpers
    const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = () => {
      frame++;
      driftRef.current += 0.02;
      const drift = driftRef.current;

      ctx.clearRect(0, 0, W, H);
      drawPitch();

      if (isIdle) {
        drawAllPlayers(drift);
        drawIdleOverlay(drift);
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      // ── HIGHLIGHT ANIMATION (Multi-phase) ──
      const t = Math.min(frame / totalFrames, 1);
      const teamColor = isHome ? COLORS.home : COLORS.away;
      const teamLight = isHome ? COLORS.homeLight : COLORS.awayLight;
      const gkColor = isHome ? COLORS.away : COLORS.home;
      const gkLight = isHome ? COLORS.awayLight : COLORS.homeLight;

      /*
       * Phase 0: Build-up passes (0 → 0.35)
       * Phase 1: Dribble/approach (0.35 → 0.55)
       * Phase 2: Shot/action (0.55 → 0.75)
       * Phase 3: Aftermath/celebration (0.75 → 1.0)
       */

      // Current ball position for player reactions
      let ballX = W / 2, ballY = H / 2;

      // ── Phase 0: Build-up passes ──
      if (t < 0.35) {
        const passT = t / 0.35;
        const numPasses = passPoints.length;
        const passIdx = Math.min(Math.floor(passT * numPasses), numPasses - 1);
        const localT = (passT * numPasses) - passIdx;

        // Draw players reacting to ball
        const from = passIdx === 0 ? { x: isHome ? W * 0.15 : W * 0.85, y: H * 0.4 } : passPoints[passIdx - 1];
        const to = passPoints[passIdx];
        ballX = from.x + (to.x - from.x) * easeOut(localT);
        ballY = from.y + (to.y - from.y) * easeOut(localT);

        drawAllPlayers(drift * 0.5, true, ballX, ballY);

        // Draw pass trails for completed passes
        for (let i = 0; i < passIdx; i++) {
          const prevFrom = i === 0 ? { x: isHome ? W * 0.15 : W * 0.85, y: H * 0.4 } : passPoints[i - 1];
          drawPassTrail(prevFrom.x, prevFrom.y, passPoints[i].x, passPoints[i].y, 1, 0.15);
        }
        // Current pass trail
        drawPassTrail(from.x, from.y, to.x, to.y, easeOut(localT), 0.35);

        // Passing player
        const passerX = from.x + (ballX - from.x) * 0.3;
        const passerY = from.y;
        drawPlayer(passerX, passerY, teamColor, teamLight, String(6 + passIdx), 8);

        // Receiving player running forward
        if (localT > 0.6) {
          drawPlayer(to.x, to.y, teamColor, teamLight, String(7 + passIdx), 8, true);
        }

        // Ball
        drawBall(ballX, ballY, 1, drift * 3);

        drawEventLabel(passT, type === 'corner' ? '📐 Escanteio' : '⚡ Construção de jogada', playerName);

      // ── Phase 1: Dribble/approach ──
      } else if (t < 0.55) {
        const drT = (t - 0.35) / 0.2;
        const lastPass = passPoints[passPoints.length - 1];
        const runX = lastPass.x + (shooterPos.x - lastPass.x) * easeOut(drT);
        const runY = lastPass.y + (shooterPos.y - lastPass.y) * easeOut(drT);
        ballX = runX + (isHome ? 10 : -10);
        ballY = runY;

        drawAllPlayers(drift * 0.4, true, ballX, ballY);

        // Defender trying to close
        const defX = shooterPos.x + (isHome ? 25 : -25);
        const defY = shooterPos.y + (drT * -15);
        drawPlayer(defX, defY, gkColor, gkLight, '4', 7);

        // Dribbling player with ball
        drawPlayer(runX, runY, teamColor, teamLight, '10', 9, true);

        // Wobbling ball at feet
        const wobbleX = Math.sin(drT * 12) * 3;
        drawBall(ballX + wobbleX, ballY - 2, 1, drift * 5);

        drawEventLabel(drT, '💨 Avanço para a área!', playerName);

      // ── Phase 2: Shot/action ──
      } else if (t < 0.75) {
        const shotT = (t - 0.55) / 0.2;

        drawAllPlayers(drift * 0.3, true, goalX, goalY);

        // Shooter kicks
        const kickAngle = easeOut(shotT) * 0.4;
        const sX = shooterPos.x + (isHome ? 8 : -8) * easeOut(Math.min(shotT * 2, 1));
        drawPlayer(sX, shooterPos.y, teamColor, teamLight, '10', 9, shotT < 0.3);

        // Goalkeeper diving
        const gkX = goalX + (isHome ? 6 : -6);
        const gkDiveY = type === 'save' 
          ? (ballEndY - goalY) * easeOut(shotT) 
          : (ballEndY - goalY) * easeOut(shotT) * 0.4;
        const gkDiveX = type === 'save' ? gkX + (isHome ? -8 : 8) * easeOut(shotT) : gkX;
        drawPlayer(gkDiveX, goalY + gkDiveY, gkColor, gkLight, 'GK', 9);

        // Ball flying
        const bEase = easeInOut(shotT);
        const bx = shooterPos.x + (isHome ? 15 : -15) + (ballEndX - shooterPos.x) * bEase;
        const by = shooterPos.y + (ballEndY - shooterPos.y) * bEase;
        const arc = Math.sin(bEase * Math.PI) * -28;
        const ballSpin = drift * 8 + shotT * 15;
        drawBall(bx, by + arc, 1.2, ballSpin);

        // Speed lines
        if (shotT > 0.1 && shotT < 0.8) {
          const lineAlpha = 0.3 * (1 - shotT);
          ctx.strokeStyle = `rgba(255,255,255,${lineAlpha})`;
          ctx.lineWidth = 1;
          for (let i = 0; i < 3; i++) {
            const lx = bx + (isHome ? -20 - i * 8 : 20 + i * 8);
            const ly = by + arc - 4 + i * 4;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx + (isHome ? -12 : 12), ly);
            ctx.stroke();
          }
        }

        const shotLabels: Record<string, string> = {
          goal: '🔥 CHUTE!', penalty: '🎯 PENALIDADE!', woodwork: '💥 FINALIZAÇÃO!',
          save: '🧤 CHUTE FORTE!', corner: '⬆️ CABECEIO!', chance: '⚡ FINALIZAÇÃO!',
        };
        drawEventLabel(shotT, shotLabels[type] || '⚡ CHUTE!', playerName);

      // ── Phase 3: Aftermath ──
      } else {
        const afterT = (t - 0.75) / 0.25;

        drawAllPlayers(drift * 0.2);

        // Shooter
        drawPlayer(shooterPos.x + (isHome ? 12 : -12), shooterPos.y, teamColor, teamLight, '10', 9);

        // GK final position
        const gkX = goalX + (isHome ? 6 : -6);
        const gkFinalY = type === 'save' ? ballEndY : goalY + (ballEndY - goalY) * 0.4;
        drawPlayer(gkX + (type === 'save' ? (isHome ? -8 : 8) : 0), gkFinalY, gkColor, gkLight, 'GK', 9);

        // Ball at rest (or bouncing off post)
        if (type === 'woodwork') {
          const bounceX = ballEndX + (isHome ? -30 : 30) * easeOut(afterT);
          const bounceY = ballEndY + 20 * easeOut(afterT);
          drawBall(bounceX, bounceY, 1, drift * 2);
          // Post shake
          const shake = Math.sin(afterT * 40) * 3 * Math.max(0, 1 - afterT * 2);
          ctx.save();
          ctx.translate(shake, 0);
          const netX = isHome ? W - goalW : 0;
          ctx.strokeStyle = 'rgba(255,100,100,0.6)';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(netX, goalY - goalH / 2, goalW, goalH);
          ctx.restore();
        } else if (type === 'save') {
          const deflX = ballEndX + (isHome ? -25 : 25) * easeOut(afterT);
          drawBall(deflX, ballEndY + 10 * afterT, 1);
          // GK glow
          ctx.fillStyle = `rgba(34, 197, 94, ${0.15 * (1 - afterT)})`;
          ctx.fillRect(0, 0, W, H);
        } else if (type === 'goal' || type === 'penalty' || type === 'penalty_shootout') {
          // Ball in net
          drawBall(ballEndX + (isHome ? 4 : -4), ballEndY, 0.9);
          // Net bulge
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1;
          const netX = isHome ? W - goalW : goalW;
          ctx.beginPath();
          ctx.moveTo(netX, ballEndY - 8);
          ctx.quadraticCurveTo(netX + (isHome ? 6 : -6) * (1 - afterT * 0.5), ballEndY, netX, ballEndY + 8);
          ctx.stroke();

          // Goal flash
          const flash = Math.sin(afterT * 25) * 0.15 * Math.max(0, 1 - afterT);
          if (flash > 0) {
            ctx.fillStyle = `rgba(251, 191, 36, ${flash})`;
            ctx.fillRect(0, 0, W, H);
          }

          // Celebration: players running toward scorer
          if (afterT > 0.3) {
            const celebT = (afterT - 0.3) / 0.7;
            const positions = isHome ? HOME_POSITIONS : AWAY_POSITIONS;
            for (let i = 8; i < 11; i++) {
              const cx = positions[i].x * W + (shooterPos.x - positions[i].x * W) * easeOut(celebT) * 0.5;
              const cy = positions[i].y * H + (shooterPos.y - positions[i].y * H) * easeOut(celebT) * 0.3;
              drawPlayer(cx, cy, teamColor, teamLight, positions[i].label, 7);
            }
          }
        } else {
          drawBall(ballEndX, ballEndY, 0.9);
        }

        // Event result labels
        const resultLabels: Record<string, string> = {
          goal: '⚽ GOOOOOL!!!', penalty: '⚽ GOL DE PÊNALTI!', penalty_shootout: '⚽ GOL NOS PÊNALTIS!',
          woodwork: '😤 NA TRAVE!', save: '🧤 GRANDE DEFESA!',
          corner: '📐 Escanteio perigoso!', chance: '😰 Quase!',
        };
        drawEventLabel(1, resultLabels[type] || '⚽ Lance!', playerName);

        // Big centered text for goals
        if ((type === 'goal' || type === 'penalty') && afterT > 0.15) {
          const bigAlpha = Math.min(1, (afterT - 0.15) * 3) * (afterT < 0.8 ? 1 : Math.max(0, 1 - (afterT - 0.8) * 5));
          const scale = 1 + easeOut(Math.min(afterT * 2, 1)) * 0.3;
          ctx.save();
          ctx.globalAlpha = bigAlpha;
          ctx.font = `bold ${Math.round(28 * scale)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = 3;
          ctx.strokeText('GOOOL!', W / 2, H / 2 - 10);
          ctx.fillText('GOOOL!', W / 2, H / 2 - 10);
          ctx.restore();
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
