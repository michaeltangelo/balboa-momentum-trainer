import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH, tuning } from '../config/tuning';
import type { DebugStats } from '../debug/debugPanel';
import {
  advanceHeartSystem,
  applyHeartHit,
  createHeartSystemState,
  type HeartSystemState,
} from '../health/heartSystem';
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
import {
  PassDetector,
  type PassDebugState,
  type PassDetectorSettings,
  type PassSample,
} from '../scoring/passDetector';

const STEP = 1 / 60;
const ARENA_MARGIN = 16;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

const getPassSettings = (): PassDetectorSettings => ({
  entryDistance: tuning.passEntryDistance,
  maximumClosestDistance: tuning.passMaximumClosestDistance,
  minimumBearingChange: toRadians(tuning.passMinimumBearingDegrees),
  minimumLeaderTurn: toRadians(tuning.passMinimumLeaderTurnDegrees),
  minimumFollowTurn: toRadians(tuning.passMinimumFollowTurnDegrees),
  minimumBodySpeed: tuning.passMinimumBodySpeed,
  minimumClosingSpeed: tuning.passMinimumClosingSpeed,
  minimumOutgoingSpeed: tuning.passMinimumOutgoingSpeed,
  minimumOutgoingDuration: tuning.passMinimumOutgoingDuration,
  minimumOutwardTravel: tuning.passMinimumOutwardTravel,
  candidateTimeout: tuning.passCandidateTimeout,
  rearmDistance: tuning.passRearmDistance,
});

interface ScoreParticle {
  start: Vec2;
  direction: Vec2;
  speed: number;
  color: number;
}

interface ScoreCelebration {
  elapsed: number;
  duration: number;
  origin: Vec2;
  particles: ScoreParticle[];
}

export class GameScene extends Phaser.Scene {
  private rocket!: Body;
  private partner!: Body;
  private graphics!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private passDebugText!: Phaser.GameObjects.Text;
  private scoreCelebrationText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D' | 'R', Phaser.Input.Keyboard.Key>;
  private pointerActive = false;
  private pointerCurrent: Vec2 = { x: 0, y: 0 };
  private accumulator = 0;
  private gameOver = false;
  private hearts: HeartSystemState = createHeartSystemState(3);
  private leaderFacing = -Math.PI / 2;
  private partnerFacing = Math.PI / 2;
  private lastConnection!: ConnectionResult;
  private averagedFrameMs = 16.7;
  private readonly passDetector = new PassDetector(getPassSettings());
  private passDebug: PassDebugState = this.passDetector.getState();
  private scoreCelebration?: ScoreCelebration;
  private readonly reportStats?: (stats: DebugStats) => void;

  constructor(reportStats?: (stats: DebugStats) => void) {
    super('game');
    this.reportStats = reportStats;
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.scoreText = this.add
      .text(WORLD_WIDTH - 24, 48, 'SCORE 0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f4f8ff',
      })
      .setOrigin(1, 0.5);
    this.passDebugText = this.add.text(24, 108, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#91a8c9',
      lineSpacing: 3,
    });
    this.scoreCelebrationText = this.add
      .text(0, 0, 'GOOD PASS +1', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#a8f0c3',
        stroke: '#071020',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setVisible(false);
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
    this.hearts = advanceHeartSystem(this.hearts, Math.min(deltaMs / 1000, 0.1));
    this.advanceScoreCelebration(Math.min(deltaMs / 1000, 0.1));
    if (!this.gameOver) {
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
    this.gameOver = false;
    this.hearts = createHeartSystemState(3);
    this.pointerActive = false;
    this.accumulator = 0;
    this.passDetector.setSettings(getPassSettings());
    this.passDetector.reset();
    this.passDebug = this.passDetector.getState();
    this.scoreCelebration = undefined;
    this.scoreCelebrationText?.setVisible(false);
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
    const collided = capsulesCollide(
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
    );
    this.passDetector.setSettings(getPassSettings());
    if (collided) {
      this.handleCollision();
      this.passDetector.cancelCandidate('COLLISION');
      this.passDebug = this.passDetector.update(this.getPassSample(), 0).debug;
      return;
    }
    const passUpdate = this.passDetector.update(this.getPassSample(), dt);
    this.passDebug = passUpdate.debug;
    if (passUpdate.scored) this.startScoreCelebration();
  }

  private getPassSample(): PassSample {
    return {
      leaderPosition: this.rocket.position,
      followPosition: this.partner.position,
      leaderVelocity: this.rocket.velocity,
      followVelocity: this.partner.velocity,
      leaderFacing: this.leaderFacing,
      followFacing: this.partnerFacing,
    };
  }

  private startScoreCelebration(): void {
    const origin = {
      x: (this.rocket.position.x + this.partner.position.x) / 2,
      y: (this.rocket.position.y + this.partner.position.y) / 2,
    };
    const particles: ScoreParticle[] = [];
    const dancers = [this.rocket, this.partner];
    const speeds = [38, 54, 70];
    const angleOffsets = [-0.22, 0, 0.22];

    for (const [dancerIndex, dancer] of dancers.entries()) {
      const bodySpeed = Math.hypot(dancer.velocity.x, dancer.velocity.y);
      const baseDirection =
        bodySpeed > Number.EPSILON
          ? { x: dancer.velocity.x / bodySpeed, y: dancer.velocity.y / bodySpeed }
          : { x: dancerIndex === 0 ? -1 : 1, y: 0 };
      const baseAngle = Math.atan2(baseDirection.y, baseDirection.x);
      for (let index = 0; index < angleOffsets.length; index += 1) {
        const angle = baseAngle + angleOffsets[index];
        particles.push({
          start: { ...dancer.position },
          direction: { x: Math.cos(angle), y: Math.sin(angle) },
          speed: speeds[index],
          color: index === 1 ? 0xf4cf72 : 0x8ce7b0,
        });
      }
    }

    this.scoreCelebration = {
      elapsed: 0,
      duration: 0.68,
      origin,
      particles,
    };
  }

  private advanceScoreCelebration(dt: number): void {
    if (!this.scoreCelebration) return;
    this.scoreCelebration.elapsed += Math.max(0, dt);
    if (this.scoreCelebration.elapsed >= this.scoreCelebration.duration) {
      this.scoreCelebration = undefined;
      this.scoreCelebrationText?.setVisible(false);
    }
  }

  private handleCollision(): void {
    const hit = applyHeartHit(this.hearts, {
      invulnerabilityDuration: tuning.collisionInvulnerabilityDuration,
      flashDuration: tuning.collisionFlashDuration,
      heartLossDuration: tuning.collisionHeartLossDuration,
    });
    if (!hit.damaged) return;

    this.hearts = hit.state;
    this.pointerActive = false;
    if (hit.gameOver) {
      this.gameOver = true;
      this.resultText.setText('GG, you killed your follow.\n\nTry again');
      return;
    }
    this.recoverFromCollision();
  }

  private recoverFromCollision(): void {
    const dx = this.partner.position.x - this.rocket.position.x;
    const dy = this.partner.position.y - this.rocket.position.y;
    const distance = Math.hypot(dx, dy);
    const direction =
      distance > Number.EPSILON ? { x: dx / distance, y: dy / distance } : { x: 0, y: -1 };
    const midpoint = {
      x: (this.rocket.position.x + this.partner.position.x) / 2,
      y: (this.rocket.position.y + this.partner.position.y) / 2,
    };
    const halfSeparation = tuning.collisionRecoverySeparation / 2;
    this.rocket.position = {
      x: midpoint.x - direction.x * halfSeparation,
      y: midpoint.y - direction.y * halfSeparation,
    };
    this.partner.position = {
      x: midpoint.x + direction.x * halfSeparation,
      y: midpoint.y + direction.y * halfSeparation,
    };
    this.rocket.velocity = {
      x: -direction.x * tuning.collisionKnockbackSpeed,
      y: -direction.y * tuning.collisionKnockbackSpeed,
    };
    this.partner.velocity = {
      x: direction.x * tuning.collisionKnockbackSpeed,
      y: direction.y * tuning.collisionKnockbackSpeed,
    };
    containBody(this.rocket, WORLD_WIDTH, WORLD_HEIGHT, ARENA_MARGIN);
    containBody(this.partner, WORLD_WIDTH, WORLD_HEIGHT, ARENA_MARGIN);
    this.lastConnection = this.getConnection();
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
    if (this.gameOver) {
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
    if (this.pointerActive && !this.gameOver) this.drawInput(g);
    this.drawScoreCelebration(g);
    this.drawHitFlash(g);
    this.drawHearts(g);
    this.drawPassDebug();
  }

  private drawPassDebug(): void {
    const debug = this.passDebug;
    const celebrationProgress = this.scoreCelebration
      ? this.scoreCelebration.elapsed / this.scoreCelebration.duration
      : 1;
    const scoreBump =
      celebrationProgress < 1
        ? 1 +
          Math.sin(Math.PI * Math.min(1, celebrationProgress / 0.45)) *
            (1 - celebrationProgress) *
            0.32
        : 1;
    this.scoreText
      .setText(`SCORE ${debug.score}`)
      .setScale(scoreBump)
      .setAlpha(this.gameOver ? 0.45 : 1);
    this.passDebugText
      .setText([
        `${debug.phase} | ${debug.lastResult}`,
        `distance ${debug.distance.toFixed(1)}  closest ${debug.closestDistance.toFixed(1)}`,
        `radial ${debug.radialSpeed.toFixed(1)}  outward ${debug.outwardDuration.toFixed(2)}s`,
        `crossover ${toDegrees(debug.bearingChange).toFixed(0)}° / ${tuning.passMinimumBearingDegrees}°`,
        `pivot L ${toDegrees(debug.leaderTurn).toFixed(0)}°  F ${toDegrees(debug.followTurn).toFixed(0)}°`,
        `speed L ${debug.leaderSpeed.toFixed(0)}  F ${debug.followSpeed.toFixed(0)}`,
      ])
      .setColor(debug.lastResult === 'GOOD PASS +1' ? '#8ce7b0' : '#91a8c9')
      .setAlpha(this.gameOver ? 0.35 : 0.82);
  }

  private drawScoreCelebration(g: Phaser.GameObjects.Graphics): void {
    const celebration = this.scoreCelebration;
    if (!celebration) {
      this.scoreCelebrationText.setVisible(false);
      return;
    }

    const progress = Math.min(1, celebration.elapsed / celebration.duration);
    const remaining = 1 - progress;
    const pulse = Math.sin(Math.PI * progress);
    const easedProgress = 1 - remaining * remaining;

    g.lineStyle(2 + pulse * 2, 0x8ce7b0, remaining * 0.5).strokeRoundedRect(
      ARENA_MARGIN,
      72,
      WORLD_WIDTH - 32,
      WORLD_HEIGHT - 96,
      18,
    );

    for (const particle of celebration.particles) {
      const travel = particle.speed * celebration.elapsed;
      const x = particle.start.x + particle.direction.x * travel;
      const y = particle.start.y + particle.direction.y * travel;
      g.fillStyle(particle.color, remaining * 0.9).fillCircle(x, y, 0.8 + remaining * 1.8);
    }

    const textAlpha = progress < 0.72 ? 1 : remaining / 0.28;
    this.scoreCelebrationText
      .setPosition(celebration.origin.x, celebration.origin.y - 18 - easedProgress * 28)
      .setScale(0.9 + pulse * 0.15)
      .setAlpha(Math.max(0, Math.min(1, textAlpha)))
      .setVisible(true);
  }

  private drawHitFlash(g: Phaser.GameObjects.Graphics): void {
    if (this.hearts.flashRemaining <= 0) return;
    const progress =
      this.hearts.flashRemaining / Math.max(Number.EPSILON, tuning.collisionFlashDuration);
    g.fillStyle(0xe34444, 0.1 + progress * 0.24).fillRoundedRect(
      ARENA_MARGIN,
      72,
      WORLD_WIDTH - 32,
      WORLD_HEIGHT - 96,
      18,
    );
    g.lineStyle(4, 0xff5c5c, 0.35 + progress * 0.55).strokeRoundedRect(
      ARENA_MARGIN,
      72,
      WORLD_WIDTH - 32,
      WORLD_HEIGHT - 96,
      18,
    );
  }

  private drawHearts(g: Phaser.GameObjects.Graphics): void {
    for (let index = 0; index < this.hearts.maximumLives; index += 1) {
      const x = 32 + index * 24;
      const y = 48;
      const filled = index < this.hearts.lives;
      this.drawHeart(g, x, y, 1, filled ? 0xe65362 : 0x26354e, filled ? 1 : 0.7);
      if (index === this.hearts.lastLostHeartIndex && this.hearts.heartLossRemaining > 0) {
        const progress =
          this.hearts.heartLossRemaining /
          Math.max(Number.EPSILON, tuning.collisionHeartLossDuration);
        this.drawHeart(g, x, y, 0.7 + progress * 0.45, 0xff5a68, progress);
      }
    }
  }

  private drawHeart(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number,
    color: number,
    alpha: number,
  ): void {
    const radius = 4.5 * scale;
    g.fillStyle(color, alpha)
      .fillCircle(x - radius * 0.75, y, radius)
      .fillCircle(x + radius * 0.75, y, radius)
      .fillTriangle(
        x - radius * 1.65,
        y + radius * 0.25,
        x + radius * 1.65,
        y + radius * 0.25,
        x,
        y + radius * 2.1,
      );
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
