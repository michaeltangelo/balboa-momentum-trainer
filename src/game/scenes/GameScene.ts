import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH, tuning } from '../config/tuning';
import type { DebugStats } from '../debug/debugPanel';
import { calculateTargetThrust } from '../input/targetInput';
import {
  applyConnectionForces,
  calculateConnection,
  type ConnectionResult,
} from '../physics/connection';
import { capsulesCollide, createTorsoCapsule } from '../physics/capsule';
import { calculateBlendedLeaderFacing, rotateTowards } from '../physics/orientation';
import { addForce, containBody, integrate, speed } from '../physics/simulation';
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
  private leaderFacing = -Math.PI / 2;
  private partnerFacing = Math.PI / 2;
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
    const boundsRadius = Math.max(tuning.torsoWidth, tuning.torsoDepth) / 2;
    this.rocket = createBody(WORLD_WIDTH / 2, 454.75, tuning.rocketMass, boundsRadius);
    this.partner = createBody(WORLD_WIDTH / 2, 370.25, tuning.partnerMass, boundsRadius);
    this.leaderFacing = -Math.PI / 2;
    this.partnerFacing = Math.PI / 2;
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
    this.rocket.radius = Math.max(tuning.torsoWidth, tuning.torsoDepth) / 2;
    this.partner.radius = this.rocket.radius;
    const thrust = this.getThrust();
    addForce(this.rocket, { x: thrust.x * tuning.thrust, y: thrust.y * tuning.thrust });
    this.lastConnection = this.getConnection();
    applyConnectionForces(this.rocket, this.partner, this.lastConnection);
    integrate(this.rocket, dt, tuning.generalDrag);
    integrate(this.partner, dt, tuning.generalDrag);
    containBody(this.rocket, WORLD_WIDTH, WORLD_HEIGHT, ARENA_MARGIN);
    containBody(this.partner, WORLD_WIDTH, WORLD_HEIGHT, ARENA_MARGIN);
    this.updateOrientations(dt);
    if (
      capsulesCollide(
        createTorsoCapsule(
          this.rocket.position,
          this.leaderFacing,
          tuning.torsoWidth,
          tuning.torsoDepth,
        ),
        createTorsoCapsule(
          this.partner.position,
          this.partnerFacing,
          tuning.torsoWidth,
          tuning.torsoDepth,
        ),
      )
    ) {
      this.collided = true;
      this.pointerActive = false;
      this.resultText.setText('PATH CROSSED\n\nTap anywhere to try again');
    }
  }

  private updateOrientations(dt: number): void {
    const leaderTarget = calculateBlendedLeaderFacing(
      this.rocket.position,
      this.rocket.velocity,
      this.partner.position,
      {
        travelWeight: tuning.leaderTravelFacingWeight,
        travelBlendStartSpeed: tuning.leaderTravelBlendStartSpeed,
        travelBlendFullSpeed: tuning.leaderTravelBlendFullSpeed,
      },
    );
    this.leaderFacing = rotateTowards(this.leaderFacing, leaderTarget, tuning.leaderTurnSpeed * dt);
    this.partnerFacing = Math.atan2(
      this.rocket.position.y - this.partner.position.y,
      this.rocket.position.x - this.partner.position.x,
    );
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
    this.drawTorso(g, this.partner, this.partnerFacing, 0x6c91bd, 0xd6e8ff, 0xbcd7ef);
    this.drawTorso(g, this.rocket, this.leaderFacing, 0xeef5ff, 0x6ea9e8, 0xf1b36a);
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
    const visualScale = tuning.torsoWidth / 50;
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

  private drawTorso(
    g: Phaser.GameObjects.Graphics,
    body: Body,
    facingAngle: number,
    fillColor: number,
    outlineColor: number,
    frontColor: number,
  ): void {
    const capsule = createTorsoCapsule(
      body.position,
      facingAngle,
      tuning.torsoWidth,
      tuning.torsoDepth,
    );
    const axis = { x: Math.cos(capsule.axisAngle), y: Math.sin(capsule.axisAngle) };
    const facing = { x: Math.cos(facingAngle), y: Math.sin(facingAngle) };
    const start = {
      x: body.position.x - axis.x * capsule.halfSegment,
      y: body.position.y - axis.y * capsule.halfSegment,
    };
    const end = {
      x: body.position.x + axis.x * capsule.halfSegment,
      y: body.position.y + axis.y * capsule.halfSegment,
    };
    const visualScale = tuning.torsoWidth / 50;
    const outlineRadius = capsule.radius + 2 * visualScale;

    g.lineStyle(outlineRadius * 2, outlineColor, 0.72).lineBetween(start.x, start.y, end.x, end.y);
    g.fillStyle(outlineColor, 0.72)
      .fillCircle(start.x, start.y, outlineRadius)
      .fillCircle(end.x, end.y, outlineRadius);
    g.lineStyle(capsule.radius * 2, fillColor, 1).lineBetween(start.x, start.y, end.x, end.y);
    g.fillStyle(fillColor, 1)
      .fillCircle(start.x, start.y, capsule.radius)
      .fillCircle(end.x, end.y, capsule.radius);

    const frontOffset = capsule.radius * 0.58;
    const markerHalfLength = capsule.halfSegment * 0.62;
    const markerCenter = {
      x: body.position.x + facing.x * frontOffset,
      y: body.position.y + facing.y * frontOffset,
    };
    g.lineStyle(2 * visualScale, frontColor, 0.9).lineBetween(
      markerCenter.x - axis.x * markerHalfLength,
      markerCenter.y - axis.y * markerHalfLength,
      markerCenter.x + axis.x * markerHalfLength,
      markerCenter.y + axis.y * markerHalfLength,
    );
  }

  private drawInput(g: Phaser.GameObjects.Graphics): void {
    const visualScale = tuning.torsoWidth / 50;
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
