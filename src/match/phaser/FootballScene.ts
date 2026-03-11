/**
 * FootballScene — Professional 2D football match visualization
 *
 * Renders a realistic pitch with animated players, independent ball physics,
 * real-time event overlays, and smooth 60fps animations.
 * Pure visualization — receives pre-computed events from server.
 */

import Phaser from 'phaser';
import { getFormation, mirrorFormation, FormationPos } from './formations';

/* ── Types ─────────────────────────────────────────────── */

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

interface PlayerSprite {
  body: Phaser.GameObjects.Arc;
  outline: Phaser.GameObjects.Arc;
  number: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  roleLabel: Phaser.GameObjects.Text;
  baseX: number;
  baseY: number;
  targetX: number;
  targetY: number;
  isHome: boolean;
  index: number;
  hasball: boolean;
}

/* ── Color Palette ─────────────────────────────────────── */

const C = {
  pitchDark:    0x1b7a3d,
  pitchLight:   0x20904a,
  lines:        0xffffff,
  lineAlpha:    0.55,
  // Teams
  homeMain:     0x2563eb,
  homeLight:    0x60a5fa,
  homeDark:     0x1d4ed8,
  awayMain:     0xe11d48,
  awayLight:    0xfb7185,
  awayDark:     0xbe123c,
  // Ball
  ball:         0xfefefe,
  ballStroke:   0x222222,
  // UI
  hudBg:        0x111827,
  textWhite:    '#ffffff',
  textMuted:    '#94a3b8',
  goalFlash:    0xfbbf24,
  eventBg:      0x0f172a,
};

/* ── Scene ─────────────────────────────────────────────── */

export class FootballScene extends Phaser.Scene {
  // Pitch geometry (world coordinates)
  private PW = 900;
  private PH = 560;
  private MX = 40; // margin X
  private MY = 40; // margin Y

  // Objects
  private pitchGfx!: Phaser.GameObjects.Graphics;
  private ball!: Phaser.GameObjects.Arc;
  private ballGlow!: Phaser.GameObjects.Arc;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private players: PlayerSprite[] = [];
  private goalOverlay!: Phaser.GameObjects.Rectangle;
  private eventBar!: Phaser.GameObjects.Container;
  private eventText!: Phaser.GameObjects.Text;
  private eventBg!: Phaser.GameObjects.Rectangle;

  // HUD
  private clockText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private homeLabel!: Phaser.GameObjects.Text;
  private awayLabel!: Phaser.GameObjects.Text;
  private hudBg!: Phaser.GameObjects.Rectangle;

  // Ball state
  private ballTarget = { x: 0.5, y: 0.5 };
  private ballPos = { x: 0.5, y: 0.5 };
  private ballVelX = 0;
  private ballVelY = 0;

  // Match state
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
  private _eventBarTimer = 0;
  private _ballPossession: 'home' | 'away' | 'neutral' = 'neutral';

  constructor() {
    super({ key: 'FootballScene' });
  }

  /* ── CREATE ──────────────────────────────────────────── */

  create() {
    this.cameras.main.setBackgroundColor('#0f1a0f');
    this.drawPitch();
    this.createGoalOverlay();
    this.createBall();
    this.createPlayers();
    this.createHUD();
    this.createEventBar();
    this.positionBall(0.5, 0.5);
  }

  /* ── PITCH ───────────────────────────────────────────── */

  private drawPitch() {
    this.pitchGfx = this.add.graphics();
    const g = this.pitchGfx;
    const W = this.PW, H = this.PH, MX = this.MX, MY = this.MY;
    const fw = W - MX * 2, fh = H - MY * 2;

    // Grass stripes
    const stripes = 16;
    const sw = fw / stripes;
    for (let i = 0; i < stripes; i++) {
      g.fillStyle(i % 2 === 0 ? C.pitchDark : C.pitchLight, 1);
      g.fillRect(MX + i * sw, MY, sw + 0.5, fh);
    }

    // Outer border
    g.lineStyle(2.5, C.lines, C.lineAlpha);
    g.strokeRect(MX, MY, fw, fh);

    // Center line
    g.beginPath(); g.moveTo(W / 2, MY); g.lineTo(W / 2, H - MY); g.strokePath();

    // Center circle
    g.strokeCircle(W / 2, H / 2, 60);
    g.fillStyle(C.lines, 0.25); g.fillCircle(W / 2, H / 2, 4);

    // Penalty areas
    const paW = fw * 0.165, paH = fh * 0.55, paY = H / 2 - paH / 2;
    g.strokeRect(MX, paY, paW, paH);
    g.strokeRect(W - MX - paW, paY, paW, paH);

    // Goal areas (6-yard box)
    const gaW = fw * 0.055, gaH = fh * 0.26, gaY = H / 2 - gaH / 2;
    g.strokeRect(MX, gaY, gaW, gaH);
    g.strokeRect(W - MX - gaW, gaY, gaW, gaH);

    // Penalty spots
    g.fillStyle(C.lines, 0.5);
    g.fillCircle(MX + paW * 0.72, H / 2, 3);
    g.fillCircle(W - MX - paW * 0.72, H / 2, 3);

    // Penalty arcs
    g.lineStyle(2.5, C.lines, C.lineAlpha);
    g.beginPath();
    g.arc(MX + paW * 0.72, H / 2, 32, Phaser.Math.DegToRad(-55), Phaser.Math.DegToRad(55), false);
    g.strokePath();
    g.beginPath();
    g.arc(W - MX - paW * 0.72, H / 2, 32, Phaser.Math.DegToRad(125), Phaser.Math.DegToRad(235), false);
    g.strokePath();

    // Corner arcs
    const cr = 12;
    [[MX, MY, 0, 90], [W - MX, MY, 90, 180], [MX, H - MY, 270, 360], [W - MX, H - MY, 180, 270]].forEach(
      ([cx, cy, s, e]) => {
        g.beginPath();
        g.arc(cx, cy, cr, Phaser.Math.DegToRad(s), Phaser.Math.DegToRad(e));
        g.strokePath();
      }
    );

    // Goal nets
    const goalH = fh * 0.17, goalW = 10;
    g.fillStyle(C.lines, 0.08);
    g.fillRect(MX - goalW, H / 2 - goalH / 2, goalW, goalH);
    g.fillRect(W - MX, H / 2 - goalH / 2, goalW, goalH);
    g.lineStyle(2, C.lines, 0.4);
    g.strokeRect(MX - goalW, H / 2 - goalH / 2, goalW, goalH);
    g.strokeRect(W - MX, H / 2 - goalH / 2, goalW, goalH);

    // Net lines
    g.lineStyle(0.5, C.lines, 0.12);
    for (let i = 1; i < 4; i++) {
      const ly = H / 2 - goalH / 2 + (goalH / 4) * i;
      g.beginPath(); g.moveTo(MX - goalW, ly); g.lineTo(MX, ly); g.strokePath();
      g.beginPath(); g.moveTo(W - MX, ly); g.lineTo(W - MX + goalW, ly); g.strokePath();
    }

    g.setDepth(0);
  }

  /* ── GOAL OVERLAY ────────────────────────────────────── */

  private createGoalOverlay() {
    this.goalOverlay = this.add.rectangle(this.PW / 2, this.PH / 2, this.PW, this.PH, C.goalFlash, 0);
    this.goalOverlay.setDepth(200);
  }

  /* ── BALL ────────────────────────────────────────────── */

  private createBall() {
    this.ballShadow = this.add.ellipse(0, 0, 14, 5, 0x000000, 0.25);
    this.ballShadow.setDepth(48);

    this.ballGlow = this.add.circle(0, 0, 10, C.ball, 0.08);
    this.ballGlow.setDepth(49);

    this.ball = this.add.circle(0, 0, 5.5, C.ball);
    this.ball.setStrokeStyle(1.5, C.ballStroke);
    this.ball.setDepth(50);
  }

  /* ── PLAYERS ─────────────────────────────────────────── */

  private createPlayers() {
    const homePos = getFormation(this._formation);
    const awayPos = mirrorFormation(getFormation('4-4-2'));

    for (let i = 0; i < 11; i++) this.createPlayer(homePos[i], i, true);
    for (let i = 0; i < 11; i++) this.createPlayer(awayPos[i], i, false);
  }

  private createPlayer(pos: FormationPos, index: number, isHome: boolean) {
    const wx = this.nX(pos.x), wy = this.nY(pos.y);
    const main = isHome ? C.homeMain : C.awayMain;
    const light = isHome ? C.homeLight : C.awayLight;

    const shadow = this.add.ellipse(wx + 1, wy + 5, 16, 5, 0x000000, 0.2).setDepth(9);
    const outline = this.add.circle(wx, wy, 10.5, light, 0.3).setDepth(10);
    const body = this.add.circle(wx, wy, 9, main).setDepth(11);
    body.setStrokeStyle(1.5, light);

    const num = this.add.text(wx, wy, `${index + 1}`, {
      fontSize: '9px', fontFamily: 'Arial, sans-serif', color: C.textWhite, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(12);

    const roleLabel = this.add.text(wx, wy + 15, pos.role, {
      fontSize: '7px', fontFamily: 'Arial, sans-serif', color: C.textMuted,
    }).setOrigin(0.5, 0).setDepth(12).setAlpha(0.6);

    this.players.push({
      body, outline, number: num, shadow, roleLabel,
      baseX: pos.x, baseY: pos.y, targetX: pos.x, targetY: pos.y,
      isHome, index, hasball: false,
    });
  }

  /* ── HUD ─────────────────────────────────────────────── */

  private createHUD() {
    const cx = this.PW / 2;

    // Background bar
    this.hudBg = this.add.rectangle(cx, 0, 320, 40, C.hudBg, 0.85)
      .setOrigin(0.5, 0).setDepth(300);

    // Add rounded corners via graphics
    const hudGfx = this.add.graphics().setDepth(299);
    hudGfx.fillStyle(C.hudBg, 0.85);
    hudGfx.fillRoundedRect(cx - 160, 0, 320, 40, { tl: 0, tr: 0, bl: 12, br: 12 });

    this.homeLabel = this.add.text(cx - 85, 12, '', {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#93c5fd',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(301);

    this.scoreText = this.add.text(cx, 12, '0 × 0', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: C.textWhite,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(301);

    this.awayLabel = this.add.text(cx + 85, 12, '', {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#fda4af',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(301);

    this.clockText = this.add.text(cx, 30, "0'", {
      fontSize: '11px', fontFamily: 'monospace', color: '#a3e635',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(301);
  }

  /* ── EVENT BAR (bottom) ──────────────────────────────── */

  private createEventBar() {
    const barW = 500, barH = 28;
    const bx = this.PW / 2, by = this.PH - 8;

    this.eventBg = this.add.rectangle(0, 0, barW, barH, C.eventBg, 0.8)
      .setOrigin(0.5, 0.5);

    this.eventText = this.add.text(0, 0, '', {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: C.textWhite,
      fontStyle: 'bold', wordWrap: { width: barW - 20 },
    }).setOrigin(0.5, 0.5);

    this.eventBar = this.add.container(bx, by, [this.eventBg, this.eventText])
      .setDepth(250).setAlpha(0);
  }

  /* ── COORD HELPERS ───────────────────────────────────── */

  private nX(nx: number): number { return this.MX + nx * (this.PW - this.MX * 2); }
  private nY(ny: number): number { return this.MY + ny * (this.PH - this.MY * 2); }

  private positionBall(nx: number, ny: number) {
    const wx = this.nX(nx), wy = this.nY(ny);
    this.ball.setPosition(wx, wy);
    this.ballGlow.setPosition(wx, wy);
    this.ballShadow.setPosition(wx + 1, wy + 4);
  }

  /* ── PUBLIC API ──────────────────────────────────────── */

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
    if (data.homeGoals + data.awayGoals > prevGoals) {
      this._goalFlashTimer = 2.0;
    }

    this.processNewEvents();
  }

  /* ── FORMATION UPDATE ────────────────────────────────── */

  private updateFormationPositions() {
    const homePos = getFormation(this._formation);
    const awayPos = mirrorFormation(getFormation('4-4-2'));

    this.players.forEach(p => {
      const positions = p.isHome ? homePos : awayPos;
      if (positions[p.index]) {
        p.baseX = positions[p.index].x;
        p.baseY = positions[p.index].y;
        p.roleLabel.setText(positions[p.index].role);
      }
    });
  }

  /* ── EVENT PROCESSING ────────────────────────────────── */

  private processNewEvents() {
    const count = this._events.length;
    if (count <= this._lastProcessedCount) return;

    const latest = this._events[count - 1];
    if (latest) {
      this.handleEvent(latest);
      this.showEventBar(latest);
    }
    this._lastProcessedCount = count;
    this._eventAnimTimer = 2.5;
  }

  private handleEvent(ev: SimEventData) {
    this._ballPossession = ev.team === 'neutral' ? 'neutral' : ev.team;

    // Ball target
    if (ev.ballX !== undefined && ev.ballY !== undefined) {
      this.ballTarget = { x: ev.ballX, y: ev.ballY };
    } else if (ev.isGoal) {
      this.ballTarget = { x: ev.team === 'home' ? 0.95 : 0.05, y: 0.45 + Math.random() * 0.1 };
    } else if (['halftime', 'final_whistle', 'kickoff'].includes(ev.type)) {
      this.ballTarget = { x: 0.5, y: 0.5 };
    } else if (ev.team === 'home') {
      this.ballTarget = { x: 0.5 + Math.random() * 0.4, y: 0.12 + Math.random() * 0.76 };
    } else if (ev.team === 'away') {
      this.ballTarget = { x: 0.1 + Math.random() * 0.4, y: 0.12 + Math.random() * 0.76 };
    } else {
      this.ballTarget = { x: 0.3 + Math.random() * 0.4, y: 0.2 + Math.random() * 0.6 };
    }

    this.shiftPlayersForEvent(ev);
  }

  private showEventBar(ev: SimEventData) {
    let icon = '⚽';
    if (ev.isGoal) icon = '🥅';
    else if (ev.type === 'yellow_card') icon = '🟡';
    else if (ev.type === 'red_card') icon = '🔴';
    else if (ev.type === 'great_save') icon = '🧤';
    else if (['tackle', 'interception'].includes(ev.type)) icon = '🦶';
    else if (['dribble_ok'].includes(ev.type)) icon = '💨';
    else if (['corner_danger', 'crossing'].includes(ev.type)) icon = '🏳️';
    else if (['halftime', 'kickoff', 'final_whistle'].includes(ev.type)) icon = '📢';
    else if (ev.type === 'substitution') icon = '🔄';
    else if (['dangerous_foul', 'foul', 'midfield_foul'].includes(ev.type)) icon = '⚠️';
    else if (['woodwork', 'long_shot_miss', 'header_miss'].includes(ev.type)) icon = '🎯';

    const msg = `${ev.minute}' ${icon} ${ev.description}`;
    this.eventText.setText(msg);

    // Color coding
    if (ev.isGoal) {
      this.eventText.setColor('#4ade80');
    } else if (ev.type === 'yellow_card' || ev.type === 'red_card') {
      this.eventText.setColor('#fbbf24');
    } else {
      this.eventText.setColor(C.textWhite);
    }

    this._eventBarTimer = 3.5;
  }

  /* ── PLAYER SHIFTING ─────────────────────────────────── */

  private shiftPlayersForEvent(ev: SimEventData) {
    const bx = this.ballTarget.x, by = this.ballTarget.y;

    this.players.forEach(p => {
      const isAttacking = (p.isHome && ev.team === 'home') || (!p.isHome && ev.team === 'away');
      const isGK = p.index === 0;

      let tx = p.baseX, ty = p.baseY;

      if (isGK) {
        tx += (bx - 0.5) * (p.isHome ? 0.05 : -0.05);
        ty += (by - 0.5) * 0.1;
        p.targetX = tx; p.targetY = ty;
        return;
      }

      if (isAttacking) {
        const push = p.isHome ? 0.1 : -0.1;
        tx += push;
        const dx = bx - tx, dy = by - ty;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.35) {
          const pull = 0.2 * (1 - dist / 0.35);
          tx += dx * pull;
          ty += dy * pull;
        }
      } else {
        const fall = p.isHome ? -0.06 : 0.06;
        tx += fall;
        ty += (by - ty) * 0.12;
      }

      // Clamp
      tx = Phaser.Math.Clamp(tx, p.isHome ? 0.03 : 0.45, p.isHome ? 0.56 : 0.97);
      ty = Phaser.Math.Clamp(ty, 0.04, 0.96);

      p.targetX = tx; p.targetY = ty;
    });
  }

  /* ── UPDATE LOOP (60fps) ─────────────────────────────── */

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    const t = _time * 0.001;

    this.updateBall(dt, t);
    this.updatePlayers(dt, t);
    this.updateGoalFlash(dt);
    this.updateEventBar(dt);
    this.updateHUD();
  }

  private updateBall(dt: number, t: number) {
    const speed = this._eventAnimTimer > 0 ? 6 : 2.5;

    if (this._isFinished) {
      this.ballPos.x += (0.5 - this.ballPos.x) * dt * 3;
      this.ballPos.y += (0.5 - this.ballPos.y) * dt * 3;
    } else {
      // Organic drift
      const dr = 0.018;
      const dx = this.ballTarget.x + Math.sin(t * 1.5) * dr;
      const dy = this.ballTarget.y + Math.cos(t * 1.1) * dr * 0.6;
      this.ballPos.x += (dx - this.ballPos.x) * dt * speed;
      this.ballPos.y += (dy - this.ballPos.y) * dt * speed;
    }

    this.positionBall(this.ballPos.x, this.ballPos.y);

    // Ball glow pulse
    const pulse = 0.06 + Math.sin(t * 4) * 0.04;
    this.ballGlow.setAlpha(pulse);

    if (this._eventAnimTimer > 0) this._eventAnimTimer -= dt;
  }

  private updatePlayers(dt: number, t: number) {
    const ballWX = this.nX(this.ballPos.x);
    const ballWY = this.nY(this.ballPos.y);

    let closestDist = Infinity;
    let closestPlayer: PlayerSprite | null = null;

    this.players.forEach(p => {
      // Organic jitter per player
      const jx = Math.sin(t * 1.4 + p.index * 2.3 + (p.isHome ? 0 : 3.14)) * 0.006;
      const jy = Math.cos(t * 1.2 + p.index * 1.8 + (p.isHome ? 0 : 2.71)) * 0.006;

      const gx = p.targetX + jx, gy = p.targetY + jy;
      const ls = this._eventAnimTimer > 0 ? 4.0 : 1.8;

      // Current normalized position
      const cnx = (p.body.x - this.MX) / (this.PW - this.MX * 2);
      const cny = (p.body.y - this.MY) / (this.PH - this.MY * 2);
      const nnx = cnx + (gx - cnx) * dt * ls;
      const nny = cny + (gy - cny) * dt * ls;

      const wx = this.nX(nnx), wy = this.nY(nny);

      p.body.setPosition(wx, wy);
      p.outline.setPosition(wx, wy);
      p.number.setPosition(wx, wy);
      p.shadow.setPosition(wx + 1, wy + 5);
      p.roleLabel.setPosition(wx, wy + 15);

      // Check distance to ball
      const dist = Phaser.Math.Distance.Between(wx, wy, ballWX, ballWY);
      if (dist < closestDist) {
        closestDist = dist;
        closestPlayer = p;
      }

      // Reset
      p.hasball = false;
      p.body.setScale(1);
      p.outline.setAlpha(0.3);
    });

    // Mark closest player to ball
    if (closestPlayer && closestDist < 30) {
      (closestPlayer as PlayerSprite).hasball = true;
      (closestPlayer as PlayerSprite).body.setScale(1.2);
      (closestPlayer as PlayerSprite).outline.setAlpha(0.7);
    }
  }

  private updateGoalFlash(dt: number) {
    if (this._goalFlashTimer > 0) {
      this._goalFlashTimer -= dt;
      const a = Math.sin(this._goalFlashTimer * 10) * 0.12;
      this.goalOverlay.setAlpha(Math.max(0, a));
    } else {
      this.goalOverlay.setAlpha(0);
    }
  }

  private updateEventBar(dt: number) {
    if (this._eventBarTimer > 0) {
      this._eventBarTimer -= dt;
      const fadeIn = Math.min(1, (3.5 - this._eventBarTimer) * 4);
      const fadeOut = Math.min(1, this._eventBarTimer * 3);
      this.eventBar.setAlpha(Math.min(fadeIn, fadeOut));
    } else {
      this.eventBar.setAlpha(0);
    }
  }

  private updateHUD() {
    if (this.clockText) {
      this.clockText.setText(this._isFinished ? "90'" : `${this._currentMinute}'`);
    }
    if (this.scoreText) {
      this.scoreText.setText(`${this._homeGoals} × ${this._awayGoals}`);
    }
    if (this.homeLabel) {
      this.homeLabel.setText(this._homeTeam.substring(0, 12));
    }
    if (this.awayLabel) {
      this.awayLabel.setText(this._awayTeam.substring(0, 12));
    }
  }
}
