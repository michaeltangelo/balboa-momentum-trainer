import { describe, expect, it } from 'vitest';
import { tuning } from '../src/game/config/tuning';
import { applyConnectionForces, calculateConnection } from '../src/game/physics/connection';
import { capsulesCollide, createTorsoCapsule } from '../src/game/physics/capsule';
import { rotateTowards, shortestAngleDelta } from '../src/game/physics/orientation';
import { createBody } from '../src/game/physics/types';

const settings = {
  restLength: 100,
  slack: 20,
  stiffness: 5,
  damping: 3,
  healthyExtension: 50,
  overstretchFactor: 0,
};

describe('elastic connection', () => {
  it('has no force within the slack region', () => {
    const a = createBody(0, 0, 1, 1);
    const b = createBody(115, 0, 2, 1);
    expect(calculateConnection(a, b, settings).tension).toBe(0);
  });

  it('produces increasing force as extension increases', () => {
    const a = createBody(0, 0, 1, 1);
    const near = createBody(130, 0, 2, 1);
    const far = createBody(150, 0, 2, 1);
    expect(calculateConnection(a, far, settings).tension).toBeGreaterThan(
      calculateConnection(a, near, settings).tension,
    );
  });

  it('uses damping to oppose relative movement along the connection', () => {
    const a = createBody(0, 0, 1, 1);
    const b = createBody(140, 0, 2, 1);
    b.velocity.x = -5;
    const approaching = calculateConnection(a, b, settings).tension;
    b.velocity.x = 5;
    const separating = calculateConnection(a, b, settings).tension;
    expect(approaching).toBeLessThan(separating);
  });

  it('applies equal and opposite forces', () => {
    const a = createBody(0, 0, 1, 1);
    const b = createBody(140, 0, 2, 1);
    applyConnectionForces(a, b, calculateConnection(a, b, settings));
    expect(a.force.x).toBeCloseTo(-b.force.x);
    expect(a.force.y).toBeCloseTo(-b.force.y);
  });
});

describe('default tether tuning', () => {
  it('starts tension at 75.4 px and overstretch at 153.4 px', () => {
    expect(tuning.restLength + tuning.slack).toBeCloseTo(75.4);
    expect(tuning.restLength + tuning.slack + tuning.healthyExtension).toBeCloseTo(153.4);
  });

  it('uses the short, tight partner and spring profile', () => {
    expect(tuning.torsoWidth).toBe(50);
    expect(tuning.torsoDepth).toBe(16);
    expect(tuning.leaderTurnSpeed).toBe(4);
    expect(tuning.rocketMass).toBe(1.2);
    expect(tuning.partnerMass).toBe(1);
    expect(tuning.springStiffness).toBe(1.8);
    expect(tuning.springDamping).toBe(2.4);
    expect(tuning.overstretchFactor).toBeCloseTo(0.029585798816568046);
    expect(tuning.targetMaxSpeed).toBe(325);
  });

  it('preserves touch acceleration with a player that is 20% heavier than the partner', () => {
    expect(tuning.thrust / tuning.rocketMass).toBeCloseTo(988);
    expect(tuning.rocketMass / tuning.partnerMass).toBe(1.2);
    expect(1 / tuning.partnerMass).toBeGreaterThan(1 / tuning.rocketMass);
  });

  it('stays elastic through its short range and ramps sharply after it', () => {
    const a = createBody(0, 0, 1, 1);
    const connectionSettings = {
      restLength: tuning.restLength,
      slack: tuning.slack,
      stiffness: tuning.springStiffness,
      damping: tuning.springDamping,
      healthyExtension: tuning.healthyExtension,
      overstretchFactor: tuning.overstretchFactor,
    };
    const early = calculateConnection(a, createBody(104, 0, 1, 1), connectionSettings);
    const elasticEnd = calculateConnection(a, createBody(153.4, 0, 1, 1), connectionSettings);
    const overstretched = calculateConnection(a, createBody(166.4, 0, 1, 1), connectionSettings);

    expect(early.tension).toBeCloseTo(51.48);
    expect(elasticEnd.tension).toBeCloseTo(140.4);
    expect(overstretched.tension).toBeCloseTo(982.8);
  });
});

describe('torso capsule collision', () => {
  const torso = (x: number, y: number, facing = -Math.PI / 2) =>
    createTorsoCapsule({ x, y }, facing, 50, 16);

  it.each([
    [16, true],
    [15.9, true],
    [16.1, false],
  ])('handles front-to-front distance %s', (distance, expected) => {
    expect(capsulesCollide(torso(0, 0), torso(0, distance, Math.PI / 2))).toBe(expected);
  });

  it('uses the narrow torso depth when partners pass one another', () => {
    expect(capsulesCollide(torso(0, 0), torso(0, 30, Math.PI / 2))).toBe(false);
  });

  it('detects contact at the rounded shoulder ends', () => {
    expect(capsulesCollide(torso(0, 0), torso(50, 0))).toBe(true);
    expect(capsulesCollide(torso(0, 0), torso(50.1, 0))).toBe(false);
  });

  it('detects crossing torsos at different orientations', () => {
    expect(capsulesCollide(torso(0, 0), torso(0, 0, 0))).toBe(true);
  });
});

describe('torso orientation', () => {
  it('turns the leader toward the follow at a bounded rate', () => {
    expect(rotateTowards(0, Math.PI / 2, 0.25)).toBeCloseTo(0.25);
  });

  it('takes the shortest path across the angle boundary', () => {
    const from = Math.PI - 0.1;
    const target = -Math.PI + 0.1;
    expect(shortestAngleDelta(from, target)).toBeCloseTo(0.2);
    expect(rotateTowards(from, target, 0.05)).toBeCloseTo(from + 0.05);
  });
});
