import type { Vec2 } from '../physics/types';

export type PassPhase = 'READY' | 'APPROACHING' | 'CONFIRMING' | 'COOLDOWN';

export interface PassDetectorSettings {
  entryDistance: number;
  maximumClosestDistance: number;
  minimumBearingChange: number;
  minimumLeaderTurn: number;
  minimumFollowTurn: number;
  minimumBodySpeed: number;
  minimumClosingSpeed: number;
  minimumOutgoingSpeed: number;
  minimumOutgoingDuration: number;
  minimumOutwardTravel: number;
  candidateTimeout: number;
  rearmDistance: number;
}

export interface PassSample {
  leaderPosition: Vec2;
  followPosition: Vec2;
  leaderVelocity: Vec2;
  followVelocity: Vec2;
  leaderFacing: number;
  followFacing: number;
}

export interface PassDebugState {
  score: number;
  phase: PassPhase;
  lastResult: string;
  distance: number;
  closestDistance: number;
  radialSpeed: number;
  bearingChange: number;
  leaderTurn: number;
  followTurn: number;
  outwardDuration: number;
  leaderSpeed: number;
  followSpeed: number;
}

export interface PassUpdate {
  scored: boolean;
  debug: PassDebugState;
}

const magnitude = (value: Vec2): number => Math.hypot(value.x, value.y);

const shortestAngleDelta = (from: number, to: number): number =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

function angleBetween(a: Vec2, b: Vec2): number {
  const denominator = magnitude(a) * magnitude(b);
  if (denominator <= Number.EPSILON) return 0;
  const cosine = Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / denominator));
  return Math.acos(cosine);
}

export class PassDetector {
  private phase: PassPhase = 'READY';
  private score = 0;
  private lastResult = 'READY';
  private initialRelative: Vec2 = { x: 0, y: 0 };
  private closestDistance = Number.POSITIVE_INFINITY;
  private candidateTime = 0;
  private bearingChange = 0;
  private leaderTurn = 0;
  private followTurn = 0;
  private outwardDuration = 0;
  private lastLeaderFacing = 0;
  private lastFollowFacing = 0;

  constructor(private settings: PassDetectorSettings) {}

  setSettings(settings: PassDetectorSettings): void {
    this.settings = settings;
  }

  reset(): void {
    this.phase = 'READY';
    this.score = 0;
    this.lastResult = 'READY';
    this.clearCandidate();
  }

  cancelCandidate(reason: string): void {
    this.phase = 'COOLDOWN';
    this.lastResult = reason;
  }

  update(sample: PassSample, dt: number): PassUpdate {
    const metrics = this.getMetrics(sample);

    if (this.phase === 'COOLDOWN') {
      if (metrics.distance >= this.settings.rearmDistance) {
        this.phase = 'READY';
        this.clearCandidate();
      }
      return { scored: false, debug: this.getDebug(metrics) };
    }

    if (this.phase === 'READY') {
      if (
        metrics.distance <= this.settings.entryDistance &&
        metrics.radialSpeed <= -this.settings.minimumClosingSpeed &&
        metrics.leaderSpeed >= this.settings.minimumBodySpeed &&
        metrics.followSpeed >= this.settings.minimumBodySpeed
      ) {
        this.beginCandidate(sample, metrics.distance);
      }
      return { scored: false, debug: this.getDebug(metrics) };
    }

    this.candidateTime += Math.max(0, dt);
    this.leaderTurn += Math.abs(shortestAngleDelta(this.lastLeaderFacing, sample.leaderFacing));
    this.followTurn += Math.abs(shortestAngleDelta(this.lastFollowFacing, sample.followFacing));
    this.lastLeaderFacing = sample.leaderFacing;
    this.lastFollowFacing = sample.followFacing;
    this.closestDistance = Math.min(this.closestDistance, metrics.distance);
    this.bearingChange = Math.max(
      this.bearingChange,
      angleBetween(this.initialRelative, metrics.relative),
    );

    if (metrics.radialSpeed >= this.settings.minimumOutgoingSpeed) {
      this.phase = 'CONFIRMING';
      this.outwardDuration += Math.max(0, dt);
    } else if (this.phase === 'CONFIRMING') {
      this.outwardDuration = 0;
    }

    if (this.isGoodPass(metrics)) {
      this.score += 1;
      this.phase = 'COOLDOWN';
      this.lastResult = 'GOOD PASS +1';
      return { scored: true, debug: this.getDebug(metrics) };
    }

    if (
      this.candidateTime >= this.settings.candidateTimeout ||
      (this.phase === 'CONFIRMING' &&
        metrics.distance >= this.settings.rearmDistance &&
        this.outwardDuration >= this.settings.minimumOutgoingDuration)
    ) {
      this.lastResult = this.getRejectionReason(metrics);
      this.phase = 'COOLDOWN';
    }

    return { scored: false, debug: this.getDebug(metrics) };
  }

  getState(): PassDebugState {
    return this.getDebug({
      relative: { x: 0, y: 0 },
      distance: 0,
      radialSpeed: 0,
      leaderSpeed: 0,
      followSpeed: 0,
    });
  }

  private beginCandidate(sample: PassSample, distance: number): void {
    this.phase = 'APPROACHING';
    this.lastResult = 'TRACKING';
    this.initialRelative = {
      x: sample.followPosition.x - sample.leaderPosition.x,
      y: sample.followPosition.y - sample.leaderPosition.y,
    };
    this.closestDistance = distance;
    this.candidateTime = 0;
    this.bearingChange = 0;
    this.leaderTurn = 0;
    this.followTurn = 0;
    this.outwardDuration = 0;
    this.lastLeaderFacing = sample.leaderFacing;
    this.lastFollowFacing = sample.followFacing;
  }

  private clearCandidate(): void {
    this.initialRelative = { x: 0, y: 0 };
    this.closestDistance = Number.POSITIVE_INFINITY;
    this.candidateTime = 0;
    this.bearingChange = 0;
    this.leaderTurn = 0;
    this.followTurn = 0;
    this.outwardDuration = 0;
  }

  private isGoodPass(metrics: ReturnType<PassDetector['getMetrics']>): boolean {
    return (
      this.phase === 'CONFIRMING' &&
      this.closestDistance <= this.settings.maximumClosestDistance &&
      this.bearingChange >= this.settings.minimumBearingChange &&
      this.leaderTurn >= this.settings.minimumLeaderTurn &&
      this.followTurn >= this.settings.minimumFollowTurn &&
      metrics.leaderSpeed >= this.settings.minimumBodySpeed &&
      metrics.followSpeed >= this.settings.minimumBodySpeed &&
      metrics.distance - this.closestDistance >= this.settings.minimumOutwardTravel &&
      this.outwardDuration >= this.settings.minimumOutgoingDuration
    );
  }

  private getRejectionReason(metrics: ReturnType<PassDetector['getMetrics']>): string {
    if (this.closestDistance > this.settings.maximumClosestDistance) return 'TOO WIDE';
    if (this.bearingChange < this.settings.minimumBearingChange) return 'NO CROSSOVER';
    if (
      this.leaderTurn < this.settings.minimumLeaderTurn ||
      this.followTurn < this.settings.minimumFollowTurn
    ) {
      return 'NOT ENOUGH PIVOT';
    }
    if (
      metrics.leaderSpeed < this.settings.minimumBodySpeed ||
      metrics.followSpeed < this.settings.minimumBodySpeed
    ) {
      return 'LOST MOMENTUM';
    }
    return 'NO FOLLOW-THROUGH';
  }

  private getMetrics(sample: PassSample): {
    relative: Vec2;
    distance: number;
    radialSpeed: number;
    leaderSpeed: number;
    followSpeed: number;
  } {
    const relative = {
      x: sample.followPosition.x - sample.leaderPosition.x,
      y: sample.followPosition.y - sample.leaderPosition.y,
    };
    const relativeVelocity = {
      x: sample.followVelocity.x - sample.leaderVelocity.x,
      y: sample.followVelocity.y - sample.leaderVelocity.y,
    };
    const distance = magnitude(relative);
    const radialSpeed =
      distance <= Number.EPSILON
        ? 0
        : (relative.x * relativeVelocity.x + relative.y * relativeVelocity.y) / distance;

    return {
      relative,
      distance,
      radialSpeed,
      leaderSpeed: magnitude(sample.leaderVelocity),
      followSpeed: magnitude(sample.followVelocity),
    };
  }

  private getDebug(metrics: ReturnType<PassDetector['getMetrics']>): PassDebugState {
    return {
      score: this.score,
      phase: this.phase,
      lastResult: this.lastResult,
      distance: metrics.distance,
      closestDistance: Number.isFinite(this.closestDistance)
        ? this.closestDistance
        : metrics.distance,
      radialSpeed: metrics.radialSpeed,
      bearingChange: this.bearingChange,
      leaderTurn: this.leaderTurn,
      followTurn: this.followTurn,
      outwardDuration: this.outwardDuration,
      leaderSpeed: metrics.leaderSpeed,
      followSpeed: metrics.followSpeed,
    };
  }
}
