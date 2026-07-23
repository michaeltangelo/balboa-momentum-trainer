import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH, tuning } from '../config/tuning';
import type { DebugStats } from '../debug/debugPanel';
import { calculateTargetThrust } from '../input/targetInput';
import {
  applyConnectionForces,
  calculateConnection,
  type ConnectionResult,
} from '../physics/connection';
import { addForce, circlesCollide, containBody, integrate, speed } from '../physics/simulation';
import { createBody, type Body, type Vec2 } from '../physics/types';

const STEP = 1 / 60;
const ARENA_MARGIN = 16;

export class GameScene extends Phaser.Scene {
  private rocket!: Body;
  private partner!: Body;
  private graphics!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D' | 'R', Phaser.Input.Keyboard.Key>;
  private pointerActive = false;
  private pointerCurrent: Vec2 = { x: 0, y: 0 };
  private accumulator = 0;
  private collided = false;
  private lastConnection!: ConnectionResult;
  private averagedFrameMs = 16.7;
  private readonly reportStats?: (stats: DebugStats) => void;

  constructor(reportStats?: (stats: DebugStats) => void) {
    super('game');
    this.reportStats = reportStats;
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.titleText = this.add
      .text(WORLD_WIDTH / 2, 42, 'MOVE FIRST • MAKE A PATH • CLEAR IT', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#a9bddc',
        letterSpacing: 1,
      })
      .setOrigin(0.5);
    this.resultText = this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, '', {
        align: 'center',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#f4f8ff',
        stroke: '#071020',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.cursorKeys = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,R') as typeof this.wasd;
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.keyboard!.on('keydown-R', this.restart, this);
    window.addEventListener('balboa-resume', this.clearElapsedTime);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('balboa-resume', this.clearElapsedTime);
    });
    this.restart();
  }

  update(_time: number, deltaMs: number): void {
    this.averagedFrameMs += (deltaMs - this.averagedFrameMs) * 0.08;
    if (!this.collided) {
      this.accumulator += Math.min(deltaMs / 1000, 0.1);
      let steps = 0;
      while (this.accumulator >= STEP && steps < 6) {
        this.simulate(STEP);
        this.accumulator -= STEP;
        steps += 1;
      }
    }
    this.draw();
    this.reportStats?.({
      frameMs: this.averagedFrameMs,
      rocketSpeed: speed(this.rocket),
      partnerSpeed: speed(this.partner),
      distance: this.lastConnection.distance,
      extension: this.lastConnection.extension,
      tension: this.lastConnection.tension,
    });
  }

  private restart = (): void => {
    this.rocket = createBody(WORLD_WIDTH / 2, 454.75, tuning.rocketMass, tuning.rocketRadius);
    this.partner = createBody(WORLD_WIDTH / 2, 370.25, tuning.partnerMass, tuning.partnerRadius);
    this.collided = false;
    this.pointerActive = false;
    this.accumulator = 0;
    this.resultText?.setText('');
    this.lastConnection = this.getConnection();
  };

  private clearElapsedTime = (): void => {
    this.accumulator = 0;
  };

  private getConnection(): ConnectionResult {
    return calculateConnection(this.rocket, this.partner, {
      restLength: tuning.restLength,
      slack: tuning.slack,
      stiffness: tuning.springStiffness,
      damping: tuning.springDamping,
      healthyExtension: tuning.healthyExtension,
      overstretchFactor: tuning.overstretchFactor,
    });
  }

  private simulate(dt: number): void {
    this.rocket.mass = tuning.rocketMass;
    this.partner.mass = tuning.partnerMass;
    const thrust = this.getThrust();
    addForce(this.rocket, { x: thrust.x * tuning.thrust, y: thrust.y * tuning.thrust });
    this.lastConnection = this.getConnection();
    applyConnectionForces(this.rocket, this.partner, this.lastConnection);
    integrate(this.rocket, dt, tuning.generalDrag);
    integrate(this.partner, dt, tuning.generalDrag);
    containBody(this.rocket, WORLD_WIDTH, WORLD_HEIGHT, ARENA_MARGIN);
    containBody(this.partner, WORLD_WIDTH, WORLD_HEIGHT, ARENA_MARGIN);
    if (circlesCollide(this.rocket, this.partner)) {
      this.collided = true;
      this.pointerActive = false;
      this.resultText.setText('PATH CROSSED\n\nTap anywhere to try again');
    }
  }

  private getThrust(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.cursorKeys.left.isDown || this.wasd.A.isDown) x -= 1;
    if (this.cursorKeys.right.isDown || this.wasd.D.isDown) x += 1;
    if (this.cursorKeys.up.isDown || this.wasd.W.isDown) y -= 1;
    if (this.cursorKeys.down.isDown || this.wasd.S.isDown) y += 1;
    const keyboardLength = Math.hypot(x, y);
    if (keyboardLength > 0) return { x: x / keyboardLength, y: y / keyboardLength };
    if (!this.pointerActive) return { x: 0, y: 0 };
    return calculateTargetThrust(this.rocket.position, this.rocket.velocity, this.pointerCurrent, {
      stopRadius: tuning.targetStopRadius,
      slowRadius: tuning.targetSlowRadius,
      maxSpeed: tuning.targetMaxSpeed,
      velocityResponse: tuning.targetVelocityResponse,
    });
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.collided) {
      this.restart();
      return;
    }
    this.pointerActive = true;
    this.pointerCurrent = { x: pointer.worldX, y: pointer.worldY };
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.pointerActive) this.pointerCurrent = { x: pointer.worldX, y: pointer.worldY };
  }

  private onPointerUp(): void {
    this.pointerActive = false;
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();
    g.fillStyle(0x070b18, 1).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    g.lineStyle(1, 0x8193b5, 0.18).strokeRoundedRect(
      ARENA_MARGIN,
      72,
      WORLD_WIDTH - 32,
      WORLD_HEIGHT - 96,
      18,
    );
    this.drawStars(g);
    this.drawBand(g);
    this.drawPartner(g);
    this.drawRocket(g);
    if (this.pointerActive && !this.collided) this.drawInput(g);
    this.titleText.setAlpha(this.collided ? 0.35 : 1);
  }

  private drawStars(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x9fb9df, 0.2);
    const stars = [
      [47, 114],
      [331, 135],
      [90, 222],
      [302, 358],
      [58, 448],
      [338, 612],
      [98, 694],
      [280, 718],
    ];
    for (const [x, y] of stars) g.fillCircle(x, y, 1.2);
  }

  private drawBand(g: Phaser.GameObjects.Graphics): void {
    const a = this.rocket.position;
    const b = this.partner.position;
    const visualScale = (this.rocket.radius / 17 + this.partner.radius / 16) / 2;
    const tensionRatio = Math.min(
      1,
      this.lastConnection.extension / Math.max(1, tuning.healthyExtension),
    );
    if (this.lastConnection.extension === 0) {
      g.lineStyle(2 * visualScale, 0x9eb2d4, 0.4);
      const segments = 12;
      for (let i = 0; i < segments; i += 2) {
        const from = i / segments;
        const to = (i + 1) / segments;
        g.lineBetween(
          a.x + (b.x - a.x) * from,
          a.y + (b.y - a.y) * from,
          a.x + (b.x - a.x) * to,
          a.y + (b.y - a.y) * to,
        );
      }
    } else {
      g.lineStyle((2 + tensionRatio * 3) * visualScale, 0xaed2ff, 0.58 + tensionRatio * 0.38);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  private drawPartner(g: Phaser.GameObjects.Graphics): void {
    const { x, y } = this.partner.position;
    const visualScale = this.partner.radius / 16;
    g.fillStyle(0x172a49, 1).fillCircle(x, y, this.partner.radius + 3 * visualScale);
    g.fillStyle(0x6c91bd, 1).fillCircle(x, y, this.partner.radius);
    g.fillStyle(0xbcd7ef, 0.22).fillCircle(x, y, this.partner.radius * 0.58);
    g.lineStyle(2 * visualScale, 0xd6e8ff, 0.5).strokeCircle(x, y, this.partner.radius);
  }

  private drawRocket(g: Phaser.GameObjects.Graphics): void {
    const { x, y } = this.rocket.position;
    const visualScale = this.rocket.radius / 15;
    const velocityAngle =
      speed(this.rocket) > 8
        ? Math.atan2(this.rocket.velocity.y, this.rocket.velocity.x)
        : -Math.PI / 2;
    const thrust = this.getThrust();
    const angle =
      Math.hypot(thrust.x, thrust.y) > 0.05 ? Math.atan2(thrust.y, thrust.x) : velocityAngle;
    const nose = {
      x: x + Math.cos(angle) * 18 * visualScale,
      y: y + Math.sin(angle) * 18 * visualScale,
    };
    const left = {
      x: x + Math.cos(angle + 2.45) * 14 * visualScale,
      y: y + Math.sin(angle + 2.45) * 14 * visualScale,
    };
    const right = {
      x: x + Math.cos(angle - 2.45) * 14 * visualScale,
      y: y + Math.sin(angle - 2.45) * 14 * visualScale,
    };
    if (Math.hypot(thrust.x, thrust.y) > 0.05 && !this.collided) {
      g.lineStyle(4 * visualScale, 0xf1b36a, 0.72).lineBetween(
        x - Math.cos(angle) * 12 * visualScale,
        y - Math.sin(angle) * 12 * visualScale,
        x - Math.cos(angle) * 25 * visualScale,
        y - Math.sin(angle) * 25 * visualScale,
      );
    }
    g.fillStyle(0xeef5ff, 1).fillTriangle(nose.x, nose.y, left.x, left.y, right.x, right.y);
    g.lineStyle(2 * visualScale, 0x6ea9e8, 1).strokeTriangle(
      nose.x,
      nose.y,
      left.x,
      left.y,
      right.x,
      right.y,
    );
  }

  private drawInput(g: Phaser.GameObjects.Graphics): void {
    const visualScale = this.rocket.radius / 17;
    g.lineStyle(2 * visualScale, 0xd5e6ff, 0.22).lineBetween(
      this.rocket.position.x,
      this.rocket.position.y,
      this.pointerCurrent.x,
      this.pointerCurrent.y,
    );
    g.lineStyle(2 * visualScale, 0xd5e6ff, 0.55).strokeCircle(
      this.pointerCurrent.x,
      this.pointerCurrent.y,
      tuning.targetStopRadius,
    );
    g.fillStyle(0xd5e6ff, 0.72).fillCircle(
      this.pointerCurrent.x,
      this.pointerCurrent.y,
      4 * visualScale,
    );
  }
}
