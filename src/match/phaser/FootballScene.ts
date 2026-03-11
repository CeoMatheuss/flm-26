/**
 * FootballScene — Professional 2D football match visualization
 *
 * Renders a realistic pitch with animated players, independent ball physics,
 * real-time event overlays, possession indicator, and smooth 60fps animations.
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
}

/* ── Color Palette ─────────────────────────────────────── */

const C = {
  pitchDark:    0x1b7a3d,
  pitchLight:   0x20904a,
  lines:        0xffffff,
  lineAlpha:    0.55,
  homeMain:     0x2563eb,
  homeLight:    0x60a5fa,
  awayMain:     0xe11d48,
  awayLight:    0xfb7185,
  ball:         0xfefefe,
  ballStroke:   0x222222,
  hudBg:        0x111827,
  eventBg:      0x0f172a,
  goalFlash:    0xfbbf24,
};

/* ── Scene ─────────────────────────────────────────────── */

export class FootballScene extends Phaser.Scene {
  private PW = 900;
  private PH = 560;
  private MX = 40;
  private MY = 50; // extra top margin for HUD

  // Objects
  private pitchGfx!: Phaser.GameObjects.Graphics;
  private ball!: Phaser.GameObjects.Arc;
  private ballGlow!: Phaser.GameObjects.Arc;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private players: PlayerSprite[] = [];
  private goalOverlay!: Phaser.GameObjects.Rectangle;

  // Event bar
  private eventBarContainer!: Phaser.GameObjects.Container;
  private eventBgRect!: Phaser.GameObjects.Graphics;
  private eventText!: Phaser.GameObjects.Text;

  // HUD elements
  private clockText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private homeLabel!: Phaser.GameObjects.Text;
  private awayLabel!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private possessionBar!: Phaser.GameObjects.Graphics;
  private possessionHomeText!: Phaser.GameObjects.Text;
  private possessionAwayText!: Phaser.GameObjects.Text;
  private eventCountText!: Phaser.GameObjects.Text;

  // Ball state
  private ballTarget = { x: 0.5, y: 0.5 };
  private ballPos = { x: 0.5, y: 0.5 };

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
  private _possession: [number, number] = [50, 50];
  private _progress = 0;
  private _phase = '';

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
    this.createPossessionBar();
    this.createProgressBar();
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

    // Border
    g.lineStyle(2.5, C.lines, C.lineAlpha);
    g.strokeRect(MX, MY, fw, fh);

    // Center line
    g.beginPath(); g.moveTo(W / 2, MY); g.lineTo(W / 2, H - MY); g.strokePath();
    g.strokeCircle(W / 2, (MY + H - MY) / 2, 55);
    g.fillStyle(C.lines, 0.25); g.fillCircle(W / 2, (MY + H - MY) / 2, 4);

    // Penalty areas
    const cy = (MY + H - MY) / 2;
    const paW = fw * 0.165, paH = fh * 0.55, paY = cy - paH / 2;
    g.strokeRect(MX, paY, paW, paH);
    g.strokeRect(W - MX - paW, paY, paW, paH);

    // Goal areas
    const gaW = fw * 0.055, gaH = fh * 0.26, gaY = cy - gaH / 2;
    g.strokeRect(MX, gaY, gaW, gaH);
    g.strokeRect(W - MX - gaW, gaY, gaW, gaH);

    // Penalty spots
    g.fillStyle(C.lines, 0.5);
    g.fillCircle(MX + paW * 0.72, cy, 3);
    g.fillCircle(W - MX - paW * 0.72, cy, 3);

    // Penalty arcs
    g.lineStyle(2.5, C.lines, C.lineAlpha);
    g.beginPath();
    g.arc(MX + paW * 0.72, cy, 32, Phaser.Math.DegToRad(-55), Phaser.Math.DegToRad(55), false);
    g.strokePath();
    g.beginPath();
    g.arc(W - MX - paW * 0.72, cy, 32, Phaser.Math.DegToRad(125), Phaser.Math.DegToRad(235), false);
    g.strokePath();

    // Corner arcs
    const cr = 12;
    [[MX, MY, 0, 90], [W - MX, MY, 90, 180], [MX, H - MY, 270, 360], [W - MX, H - MY, 180, 270]].forEach(
      ([cx2, cy2, s, e]) => {
        g.beginPath();
        g.arc(cx2, cy2, cr, Phaser.Math.DegToRad(s), Phaser.Math.DegToRad(e));
        g.strokePath();
      }
    );

    // Goal nets
    const goalH = fh * 0.17, goalW = 10;
    g.fillStyle(C.lines, 0.08);
    g.fillRect(MX - goalW, cy - goalH / 2, goalW, goalH);
    g.fillRect(W - MX, cy - goalH / 2, goalW, goalH);
    g.lineStyle(2, C.lines, 0.4);
    g.strokeRect(MX - goalW, cy - goalH / 2, goalW, goalH);
    g.strokeRect(W - MX, cy - goalH / 2, goalW, goalH);

    // Net lines
    g.lineStyle(0.5, C.lines, 0.12);
    for (let i = 1; i < 4; i++) {
      const ly = cy - goalH / 2 + (goalH / 4) * i;
      g.beginPath(); g.moveTo(MX - goalW, ly); g.lineTo(MX, ly); g.strokePath();
      g.beginPath(); g.moveTo(W - MX, ly); g.lineTo(W - MX + goalW, ly); g.strokePath();
    }

    g.setDepth(0);
  }

  private createGoalOverlay() {
    this.goalOverlay = this.add.rectangle(this.PW / 2, this.PH / 2, this.PW, this.PH, C.goalFlash, 0);
    this.goalOverlay.setDepth(200);
  }

  /* ── BALL ────────────────────────────────────────────── */

  private createBall() {
    this.ballShadow = this.add.ellipse(0, 0, 14, 5, 0x000000, 0.25).setDepth(48);
    this.ballGlow = this.add.circle(0, 0, 10, C.ball, 0.08).setDepth(49);
    this.ball = this.add.circle(0, 0, 5.5, C.ball).setStrokeStyle(1.5, C.ballStroke).setDepth(50);
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
    const body = this.add.circle(wx, wy, 9, main).setStrokeStyle(1.5, light).setDepth(11);

    const num = this.add.text(wx, wy, `${index + 1}`, {
      fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(12);

    const roleLabel = this.add.text(wx, wy + 15, pos.role, {
      fontSize: '7px', fontFamily: 'Arial, sans-serif', color: '#94a3b8',
    }).setOrigin(0.5, 0).setDepth(12).setAlpha(0.6);

    this.players.push({
      body, outline, number: num, shadow, roleLabel,
      baseX: pos.x, baseY: pos.y, targetX: pos.x, targetY: pos.y,
      isHome, index,
    });
  }

  /* ── HUD ─────────────────────────────────────────────── */

  private createHUD() {
    const cx = this.PW / 2;

    // HUD background
    const hudGfx = this.add.graphics().setDepth(299);
    hudGfx.fillStyle(C.hudBg, 0.9);
    hudGfx.fillRoundedRect(cx - 175, 0, 350, 44, { tl: 0, tr: 0, bl: 14, br: 14 });

    this.homeLabel = this.add.text(cx - 80, 13, '', {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#93c5fd', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(301);

    this.scoreText = this.add.text(cx, 13, '0 × 0', {
      fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(301);

    this.awayLabel = this.add.text(cx + 80, 13, '', {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#fda4af', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(301);

    this.clockText = this.add.text(cx - 40, 33, "0'", {
      fontSize: '11px', fontFamily: 'monospace', color: '#a3e635', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(301);

    this.phaseText = this.add.text(cx + 40, 33, '', {
      fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#94a3b8',
    }).setOrigin(0.5, 0.5).setDepth(301);

    this.eventCountText = this.add.text(cx, 33, '', {
      fontSize: '9px', fontFamily: 'monospace', color: '#64748b',
    }).setOrigin(0.5, 0.5).setDepth(301);
  }

  /* ── POSSESSION BAR ──────────────────────────────────── */

  private createPossessionBar() {
    this.possessionBar = this.add.graphics().setDepth(300);
    
    this.possessionHomeText = this.add.text(this.MX + 5, this.PH - 14, '50%', {
      fontSize: '9px', fontFamily: 'monospace', color: '#93c5fd', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(301);

    this.possessionAwayText = this.add.text(this.PW - this.MX - 5, this.PH - 14, '50%', {
      fontSize: '9px', fontFamily: 'monospace', color: '#fda4af', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(301);
  }

  private drawPossessionBar() {
    const g = this.possessionBar;
    g.clear();
    
    const barX = this.MX + 40, barY = this.PH - 18;
    const barW = this.PW - this.MX * 2 - 80, barH = 6;
    const homeW = barW * (this._possession[0] / 100);

    // Background
    g.fillStyle(0x1e293b, 0.7);
    g.fillRoundedRect(barX, barY, barW, barH, 3);

    // Home portion
    g.fillStyle(C.homeMain, 0.8);
    g.fillRoundedRect(barX, barY, homeW, barH, 3);

    // Away portion
    g.fillStyle(C.awayMain, 0.8);
    g.fillRoundedRect(barX + homeW, barY, barW - homeW, barH, 3);

    this.possessionHomeText.setText(`${this._possession[0]}%`);
    this.possessionAwayText.setText(`${this._possession[1]}%`);
  }

  /* ── PROGRESS BAR ────────────────────────────────────── */

  private createProgressBar() {
    this.progressBar = this.add.graphics().setDepth(300);
  }

  private drawProgressBar() {
    const g = this.progressBar;
    g.clear();

    const barX = this.MX, barY = this.MY - 6;
    const barW = this.PW - this.MX * 2, barH = 3;

    // Background
    g.fillStyle(0x1e293b, 0.5);
    g.fillRect(barX, barY, barW, barH);

    // Progress fill
    const fillColor = this._isFinished ? 0xa3e635 : 0x3b82f6;
    g.fillStyle(fillColor, 0.8);
    g.fillRect(barX, barY, barW * this._progress, barH);

    // Halftime marker
    g.fillStyle(0xffffff, 0.3);
    g.fillRect(barX + barW * 0.5 - 1, barY, 2, barH);
  }

  /* ── EVENT BAR ───────────────────────────────────────── */

  private createEventBar() {
    const barW = 520, barH = 30;
    const bx = this.PW / 2, by = this.PH - 32;

    this.eventBgRect = this.add.graphics().setDepth(249);
    this.eventText = this.add.text(bx, by, '', {
      fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
      fontStyle: 'bold', wordWrap: { width: barW - 20 },
    }).setOrigin(0.5, 0.5).setDepth(250).setAlpha(0);
  }

  private showEventBarText(ev: SimEventData) {
    let icon = '⚽';
    if (ev.isGoal) icon = '🥅 GOL!';
    else if (ev.type === 'yellow_card') icon = '🟡';
    else if (ev.type === 'red_card') icon = '🔴';
    else if (ev.type === 'great_save') icon = '🧤';
    else if (['tackle', 'interception'].includes(ev.type)) icon = '🦶';
    else if (ev.type === 'dribble_ok') icon = '💨';
    else if (['corner_danger', 'crossing'].includes(ev.type)) icon = '🏳️';
    else if (['halftime', 'kickoff', 'final_whistle'].includes(ev.type)) icon = '📢';
    else if (ev.type === 'substitution') icon = '🔄';
    else if (['dangerous_foul', 'foul', 'midfield_foul'].includes(ev.type)) icon = '⚠️';
    else if (['woodwork', 'long_shot_miss', 'header_miss'].includes(ev.type)) icon = '🎯';

    const msg = `${ev.minute}' ${icon} ${ev.description}`;
    this.eventText.setText(msg);

    if (ev.isGoal) this.eventText.setColor('#4ade80');
    else if (ev.type === 'yellow_card' || ev.type === 'red_card') this.eventText.setColor('#fbbf24');
    else this.eventText.setColor('#ffffff');

    this._eventBarTimer = 4.0;
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
    possession?: [number, number];
    progress?: number;
    phase?: string;
  }) {
    const prevGoals = this._homeGoals + this._awayGoals;

    this._events = data.events;
    this._currentMinute = data.currentMinute;
    this._homeGoals = data.homeGoals;
    this._awayGoals = data.awayGoals;
    this._isFinished = data.isFinished;
    this._homeTeam = data.homeTeam;
    this._awayTeam = data.awayTeam;
    if (data.possession) this._possession = data.possession;
    if (data.progress !== undefined) this._progress = data.progress;
    if (data.phase) this._phase = data.phase;

    if (data.formation && data.formation !== this._formation) {
      this._formation = data.formation;
      this.updateFormationPositions();
    }

    if (data.homeGoals + data.awayGoals > prevGoals) {
      this._goalFlashTimer = 2.0;
    }

    // Compute possession from events
    this.computePossession();
    this.processNewEvents();
  }

  private computePossession() {
    if (this._events.length === 0) return;
    let home = 0, away = 0;
    for (const ev of this._events) {
      if (ev.team === 'home') home++;
      else if (ev.team === 'away') away++;
    }
    const total = home + away;
    if (total > 0) {
      this._possession = [Math.round((home / total) * 100), Math.round((away / total) * 100)];
    }
  }

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

  private processNewEvents() {
    const count = this._events.length;
    if (count <= this._lastProcessedCount) return;

    const latest = this._events[count - 1];
    if (latest) {
      this.handleEvent(latest);
      this.showEventBarText(latest);
    }
    this._lastProcessedCount = count;
    this._eventAnimTimer = 2.5;
  }

  private handleEvent(ev: SimEventData) {
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

      tx = Phaser.Math.Clamp(tx, p.isHome ? 0.03 : 0.45, p.isHome ? 0.56 : 0.97);
      ty = Phaser.Math.Clamp(ty, 0.04, 0.96);
      p.targetX = tx; p.targetY = ty;
    });
  }

  /* ── UPDATE LOOP ─────────────────────────────────────── */

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    const t = _time * 0.001;
    this.updateBall(dt, t);
    this.updatePlayers(dt, t);
    this.updateGoalFlash(dt);
    this.updateEventBarAnim(dt);
    this.updateHUD();
    this.drawPossessionBar();
    this.drawProgressBar();
  }

  private updateBall(dt: number, t: number) {
    const speed = this._eventAnimTimer > 0 ? 6 : 2.5;

    if (this._isFinished) {
      this.ballPos.x += (0.5 - this.ballPos.x) * dt * 3;
      this.ballPos.y += (0.5 - this.ballPos.y) * dt * 3;
    } else {
      const dr = 0.018;
      const dx = this.ballTarget.x + Math.sin(t * 1.5) * dr;
      const dy = this.ballTarget.y + Math.cos(t * 1.1) * dr * 0.6;
      this.ballPos.x += (dx - this.ballPos.x) * dt * speed;
      this.ballPos.y += (dy - this.ballPos.y) * dt * speed;
    }

    this.positionBall(this.ballPos.x, this.ballPos.y);
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
      const jx = Math.sin(t * 1.4 + p.index * 2.3 + (p.isHome ? 0 : 3.14)) * 0.006;
      const jy = Math.cos(t * 1.2 + p.index * 1.8 + (p.isHome ? 0 : 2.71)) * 0.006;
      const gx = p.targetX + jx, gy = p.targetY + jy;
      const ls = this._eventAnimTimer > 0 ? 4.0 : 1.8;

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

      const dist = Phaser.Math.Distance.Between(wx, wy, ballWX, ballWY);
      if (dist < closestDist) { closestDist = dist; closestPlayer = p; }

      p.body.setScale(1);
      p.outline.setAlpha(0.3);
    });

    if (closestPlayer && closestDist < 30) {
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

  private updateEventBarAnim(dt: number) {
    if (this._eventBarTimer > 0) {
      this._eventBarTimer -= dt;
      const fadeIn = Math.min(1, (4.0 - this._eventBarTimer) * 5);
      const fadeOut = Math.min(1, this._eventBarTimer * 3);
      const alpha = Math.min(fadeIn, fadeOut);
      this.eventText.setAlpha(alpha);

      // Draw background for event bar
      this.eventBgRect.clear();
      if (alpha > 0.01) {
        const tw = this.eventText.width + 24;
        const th = 26;
        const tx = this.PW / 2 - tw / 2;
        const ty = this.PH - 32 - th / 2;
        this.eventBgRect.fillStyle(C.eventBg, 0.85 * alpha);
        this.eventBgRect.fillRoundedRect(tx, ty, tw, th, 6);
      }
    } else {
      this.eventText.setAlpha(0);
      this.eventBgRect.clear();
    }
  }

  private updateHUD() {
    this.clockText?.setText(this._isFinished ? "90'" : `${this._currentMinute}'`);
    this.scoreText?.setText(`${this._homeGoals} × ${this._awayGoals}`);
    this.homeLabel?.setText(this._homeTeam.substring(0, 14));
    this.awayLabel?.setText(this._awayTeam.substring(0, 14));

    // Phase label
    let phaseStr = '';
    if (this._isFinished) phaseStr = 'FIM';
    else if (this._currentMinute <= 45) phaseStr = '1ºT';
    else if (this._currentMinute <= 50) phaseStr = 'INT';
    else phaseStr = '2ºT';
    this.phaseText?.setText(phaseStr);

    // Event count
    this.eventCountText?.setText(`${this._events.length} lances`);
  }
}
