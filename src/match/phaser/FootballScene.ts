/**
 * FootballScene — Main Phaser scene for 2D match visualization.
 *
 * Receives pre-computed events from the server via `setMatchData()`.
 * Animates players, ball, and events in real-time at 60fps.
 * Pure visualization layer — no simulation logic.
 */

import Phaser from 'phaser';
import { getFormation, mirrorFormation, FormationPos } from './formations';

interface SimEventData {
  minute: number;
  type: string;
  description: string;
  team: 'home' | 'away' | 'neutral';
  playerName?: string;
  assistName?: string;
  isGoal?: boolean;
  ballX?: number;
  ballY?: number;
}

// Colors
const PITCH_GREEN = 0x1a6b3c;
const PITCH_STRIPE = 0x1d7a43;
const LINE_COLOR = 0xffffff;
const HOME_COLOR = 0x3b82f6;
const HOME_LIGHT = 0x60a5fa;
const AWAY_COLOR = 0xef4444;
const AWAY_LIGHT = 0xf87171;
const BALL_COLOR = 0xffffff;
const BALL_OUTLINE = 0x333333;

interface PlayerSprite {
  container: Phaser.GameObjects.Container;
  circle: Phaser.GameObjects.Arc;
  text: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  baseX: number;
  baseY: number;
  targetX: number;
  targetY: number;
  isHome: boolean;
  index: number;
}

export class FootballScene extends Phaser.Scene {
  private pitchGfx!: Phaser.GameObjects.Graphics;
  private ball!: Phaser.GameObjects.Arc;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private ballTarget = { x: 0.5, y: 0.5 };
  private ballPos = { x: 0.5, y: 0.5 };
  private players: PlayerSprite[] = [];
  private goalFlashRect!: Phaser.GameObjects.Rectangle;

  // Match state (set from React)
  private _events: SimEventData[] = [];
  private _currentMinute = 0;
  private _homeGoals = 0;
  private _awayGoals = 0;
  private _isFinished = false;
  private _homeTeam = '';
  private _awayTeam = '';
  private _formation = '4-4-2';
  private _lastProcessedCount = 0;
  private _goalFlashTimer = 0;
  private _eventAnimTimer = 0;
  private clockText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  // Pitch dimensions in world coords
  private PW = 800;
  private PH = 500;
  private MARGIN = 30;

  constructor() {
    super({ key: 'FootballScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor(PITCH_GREEN);

    // Draw pitch
    this.drawPitch();

    // Goal flash overlay
    this.goalFlashRect = this.add.rectangle(this.PW / 2, this.PH / 2, this.PW, this.PH, 0xffdd00, 0);
    this.goalFlashRect.setDepth(100);

    // Create players
    this.createPlayers();

    // Create ball
    this.ballShadow = this.add.ellipse(0, 0, 12, 5, 0x000000, 0.3);
    this.ballShadow.setDepth(49);
    this.ball = this.add.circle(0, 0, 6, BALL_COLOR);
    this.ball.setStrokeStyle(1.2, BALL_OUTLINE);
    this.ball.setDepth(50);

    this.positionBall(0.5, 0.5);

    // Handle resize
    this.scale.on('resize', this.handleResize, this);
  }

  private drawPitch() {
    if (this.pitchGfx) this.pitchGfx.destroy();
    this.pitchGfx = this.add.graphics();
    const g = this.pitchGfx;
    const W = this.PW;
    const H = this.PH;
    const M = this.MARGIN;

    // Grass stripes
    const stripeW = (W - M * 2) / 12;
    for (let i = 0; i < 12; i++) {
      g.fillStyle(i % 2 === 0 ? PITCH_GREEN : PITCH_STRIPE, 1);
      g.fillRect(M + i * stripeW, M, stripeW, H - M * 2);
    }

    // Field outline
    g.lineStyle(2, LINE_COLOR, 0.6);
    g.strokeRect(M, M, W - M * 2, H - M * 2);

    // Center line
    g.beginPath();
    g.moveTo(W / 2, M);
    g.lineTo(W / 2, H - M);
    g.strokePath();

    // Center circle
    g.strokeCircle(W / 2, H / 2, 55);
    g.fillStyle(LINE_COLOR, 0.3);
    g.fillCircle(W / 2, H / 2, 3);

    // Penalty areas
    const paW = (W - M * 2) * 0.16;
    const paH = (H - M * 2) * 0.55;
    const paY = H / 2 - paH / 2;
    g.strokeRect(M, paY, paW, paH);
    g.strokeRect(W - M - paW, paY, paW, paH);

    // Goal areas
    const gaW = (W - M * 2) * 0.06;
    const gaH = (H - M * 2) * 0.28;
    const gaY = H / 2 - gaH / 2;
    g.strokeRect(M, gaY, gaW, gaH);
    g.strokeRect(W - M - gaW, gaY, gaW, gaH);

    // Penalty spots
    g.fillStyle(LINE_COLOR, 0.5);
    g.fillCircle(M + paW * 0.75, H / 2, 2.5);
    g.fillCircle(W - M - paW * 0.75, H / 2, 2.5);

    // Penalty arcs
    g.beginPath();
    g.arc(M + paW * 0.75, H / 2, 28, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(50), false);
    g.strokePath();
    g.beginPath();
    g.arc(W - M - paW * 0.75, H / 2, 28, Phaser.Math.DegToRad(130), Phaser.Math.DegToRad(230), false);
    g.strokePath();

    // Corner arcs
    const cr = 10;
    g.beginPath(); g.arc(M, M, cr, 0, Phaser.Math.DegToRad(90)); g.strokePath();
    g.beginPath(); g.arc(W - M, M, cr, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(180)); g.strokePath();
    g.beginPath(); g.arc(M, H - M, cr, Phaser.Math.DegToRad(270), Phaser.Math.DegToRad(360)); g.strokePath();
    g.beginPath(); g.arc(W - M, H - M, cr, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(270)); g.strokePath();

    // Goals (nets)
    const goalH = (H - M * 2) * 0.16;
    const goalW = 8;
    g.fillStyle(LINE_COLOR, 0.15);
    g.fillRect(M - goalW, H / 2 - goalH / 2, goalW, goalH);
    g.fillRect(W - M, H / 2 - goalH / 2, goalW, goalH);
    g.lineStyle(2, LINE_COLOR, 0.5);
    g.strokeRect(M - goalW, H / 2 - goalH / 2, goalW, goalH);
    g.strokeRect(W - M, H / 2 - goalH / 2, goalW, goalH);

    g.setDepth(0);
  }

  private createPlayers() {
    const homePos = getFormation(this._formation);
    const awayPos = mirrorFormation(getFormation('4-4-2')); // AI uses 4-4-2

    for (let i = 0; i < 11; i++) {
      this.createPlayer(homePos[i], i, true);
    }
    for (let i = 0; i < 11; i++) {
      this.createPlayer(awayPos[i], i, false);
    }
  }

  private createPlayer(pos: FormationPos, index: number, isHome: boolean) {
    const wx = this.normToWorldX(pos.x);
    const wy = this.normToWorldY(pos.y);
    const color = isHome ? HOME_COLOR : AWAY_COLOR;
    const lightColor = isHome ? HOME_LIGHT : AWAY_LIGHT;

    const shadow = this.add.ellipse(wx + 1, wy + 4, 14, 5, 0x000000, 0.25);
    shadow.setDepth(9);

    const circle = this.add.circle(0, 0, 8, color);
    circle.setStrokeStyle(1.5, lightColor);

    const num = this.add.text(0, 0, `${index + 1}`, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    num.setOrigin(0.5, 0.5);

    const container = this.add.container(wx, wy, [circle, num]);
    container.setDepth(10);

    this.players.push({
      container, circle, text: num, shadow,
      baseX: pos.x, baseY: pos.y,
      targetX: pos.x, targetY: pos.y,
      isHome, index,
    });
  }

  private normToWorldX(nx: number): number {
    return this.MARGIN + nx * (this.PW - this.MARGIN * 2);
  }

  private normToWorldY(ny: number): number {
    return this.MARGIN + ny * (this.PH - this.MARGIN * 2);
  }

  private positionBall(nx: number, ny: number) {
    const wx = this.normToWorldX(nx);
    const wy = this.normToWorldY(ny);
    this.ball.setPosition(wx, wy);
    this.ballShadow.setPosition(wx + 1, wy + 3);
  }

  // ── PUBLIC API (called from React) ────────────────────────────

  setMatchData(data: {
    events: SimEventData[];
    currentMinute: number;
    homeGoals: number;
    awayGoals: number;
    isFinished: boolean;
    homeTeam: string;
    awayTeam: string;
    formation?: string;
  }) {
    const prevGoals = this._homeGoals + this._awayGoals;
    
    this._events = data.events;
    this._currentMinute = data.currentMinute;
    this._homeGoals = data.homeGoals;
    this._awayGoals = data.awayGoals;
    this._isFinished = data.isFinished;
    this._homeTeam = data.homeTeam;
    this._awayTeam = data.awayTeam;

    if (data.formation && data.formation !== this._formation) {
      this._formation = data.formation;
      this.updateFormationPositions();
    }

    // Goal flash
    const newGoals = data.homeGoals + data.awayGoals;
    if (newGoals > prevGoals) {
      this._goalFlashTimer = 1.5;
    }

    // Process new events
    this.processNewEvents();
  }

  private updateFormationPositions() {
    const homePos = getFormation(this._formation);
    const awayPos = mirrorFormation(getFormation('4-4-2'));

    this.players.forEach(p => {
      const positions = p.isHome ? homePos : awayPos;
      if (positions[p.index]) {
        p.baseX = positions[p.index].x;
        p.baseY = positions[p.index].y;
      }
    });
  }

  private processNewEvents() {
    const count = this._events.length;
    if (count <= this._lastProcessedCount) return;

    // Process the latest event for ball positioning
    const latest = this._events[count - 1];
    if (latest) {
      this.handleEvent(latest);
    }

    this._lastProcessedCount = count;
    this._eventAnimTimer = 2.0; // 2 seconds of event-driven movement
  }

  private handleEvent(ev: SimEventData) {
    // Set ball target based on event
    if (ev.ballX !== undefined && ev.ballY !== undefined) {
      this.ballTarget = { x: ev.ballX, y: ev.ballY };
    } else if (ev.isGoal) {
      this.ballTarget = { x: ev.team === 'home' ? 0.94 : 0.06, y: 0.45 + Math.random() * 0.1 };
    } else if (ev.type === 'halftime' || ev.type === 'final_whistle' || ev.type === 'kickoff') {
      this.ballTarget = { x: 0.5, y: 0.5 };
    } else if (ev.team === 'home') {
      this.ballTarget = {
        x: 0.5 + Math.random() * 0.4,
        y: 0.15 + Math.random() * 0.7,
      };
    } else if (ev.team === 'away') {
      this.ballTarget = {
        x: 0.1 + Math.random() * 0.4,
        y: 0.15 + Math.random() * 0.7,
      };
    } else {
      this.ballTarget = {
        x: 0.3 + Math.random() * 0.4,
        y: 0.2 + Math.random() * 0.6,
      };
    }

    // Shift player targets based on event context
    this.shiftPlayersForEvent(ev);
  }

  private shiftPlayersForEvent(ev: SimEventData) {
    const attackTeam = ev.team;
    const ballX = this.ballTarget.x;
    const ballY = this.ballTarget.y;

    this.players.forEach(p => {
      const isAttacking = (p.isHome && attackTeam === 'home') || (!p.isHome && attackTeam === 'away');
      const isGK = p.index === 0;

      // Base formation position
      let tx = p.baseX;
      let ty = p.baseY;

      if (isGK) {
        // GK stays mostly in position, slight shift toward ball
        const gkShift = (ballX - 0.5) * (p.isHome ? 0.04 : -0.04);
        tx += gkShift;
        p.targetX = tx;
        p.targetY = ty + (ballY - 0.5) * 0.08;
        return;
      }

      if (isAttacking) {
        // Attacking team pushes forward
        const pushForward = p.isHome ? 0.08 : -0.08;
        tx += pushForward;

        // Players closer to ball attract toward it
        const dx = ballX - tx;
        const dy = ballY - ty;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.3) {
          const attraction = 0.15 * (1 - dist / 0.3);
          tx += dx * attraction;
          ty += dy * attraction;
        }
      } else {
        // Defending team falls back
        const fallBack = p.isHome ? -0.05 : 0.05;
        tx += fallBack;

        // Compress toward ball vertically
        ty += (ballY - ty) * 0.1;
      }

      // Clamp to sensible pitch areas
      if (p.isHome) {
        tx = Phaser.Math.Clamp(tx, 0.04, 0.55);
      } else {
        tx = Phaser.Math.Clamp(tx, 0.45, 0.96);
      }
      ty = Phaser.Math.Clamp(ty, 0.05, 0.95);

      p.targetX = tx;
      p.targetY = ty;
    });
  }

  // ── UPDATE LOOP ──────────────────────────────────────────────

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    const t = _time * 0.001;

    // Update ball
    this.updateBall(dt, t);

    // Update players
    this.updatePlayers(dt, t);

    // Update goal flash
    this.updateGoalFlash(dt);

    // Finished overlay dimming handled by React
  }

  private updateBall(dt: number, t: number) {
    if (this._isFinished) {
      // Lerp to center
      this.ballPos.x += (0.5 - this.ballPos.x) * dt * 3;
      this.ballPos.y += (0.5 - this.ballPos.y) * dt * 3;
    } else {
      // Organic drift around target
      const driftR = 0.02;
      const driftX = this.ballTarget.x + Math.sin(t * 1.2) * driftR;
      const driftY = this.ballTarget.y + Math.cos(t * 0.9) * driftR * 0.7;

      const speed = this._eventAnimTimer > 0 ? 5 : 2;
      this.ballPos.x += (driftX - this.ballPos.x) * dt * speed;
      this.ballPos.y += (driftY - this.ballPos.y) * dt * speed;
    }

    this.positionBall(this.ballPos.x, this.ballPos.y);

    // Decrease event anim timer
    if (this._eventAnimTimer > 0) {
      this._eventAnimTimer -= dt;
    }
  }

  private updatePlayers(dt: number, t: number) {
    const ballWX = this.normToWorldX(this.ballPos.x);
    const ballWY = this.normToWorldY(this.ballPos.y);

    this.players.forEach(p => {
      // Add organic jitter
      const jitterX = Math.sin(t * 1.3 + p.index * 2.1 + (p.isHome ? 0 : 3.14)) * 0.008;
      const jitterY = Math.cos(t * 1.1 + p.index * 1.7 + (p.isHome ? 0 : 2.71)) * 0.008;

      const goalX = p.targetX + jitterX;
      const goalY = p.targetY + jitterY;

      // Smooth lerp
      const lerpSpeed = this._eventAnimTimer > 0 ? 3.5 : 1.5;
      const currentNX = (p.container.x - this.MARGIN) / (this.PW - this.MARGIN * 2);
      const currentNY = (p.container.y - this.MARGIN) / (this.PH - this.MARGIN * 2);
      
      const newNX = currentNX + (goalX - currentNX) * dt * lerpSpeed;
      const newNY = currentNY + (goalY - currentNY) * dt * lerpSpeed;

      const wx = this.normToWorldX(newNX);
      const wy = this.normToWorldY(newNY);
      p.container.setPosition(wx, wy);
      p.shadow.setPosition(wx + 1, wy + 4);

      // Closest player to ball gets a highlight
      const distToBall = Phaser.Math.Distance.Between(wx, wy, ballWX, ballWY);
      if (distToBall < 25) {
        p.circle.setScale(1.15);
        p.circle.setAlpha(1);
      } else {
        p.circle.setScale(1);
        p.circle.setAlpha(0.9);
      }
    });
  }

  private updateGoalFlash(dt: number) {
    if (this._goalFlashTimer > 0) {
      this._goalFlashTimer -= dt;
      const alpha = Math.sin(this._goalFlashTimer * 8) * 0.15;
      this.goalFlashRect.setAlpha(Math.max(0, alpha));
    } else {
      this.goalFlashRect.setAlpha(0);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    // Phaser handles scaling via FIT mode, nothing extra needed
  }
}
