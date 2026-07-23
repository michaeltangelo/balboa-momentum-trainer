import { describe, expect, it } from 'vitest';
import { tuning } from '../src/game/config/tuning';
import { applyConnectionForces, calculateConnection } from '../src/game/physics/connection';
import { circlesCollide } from '../src/game/physics/simulation';
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
    expect(tuning.rocketRadius).toBe(22.1);
    expect(tuning.partnerRadius).toBe(20.8);
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

describe('circle collision', () => {
  it.each([
    [20, true],
    [19.9, true],
    [20.1, false],
  ])('handles distance %s', (distance, expected) => {
    const a = createBody(0, 0, 1, 10);
    const b = createBody(distance, 0, 1, 10);
    expect(circlesCollide(a, b)).toBe(expected);
  });
});
