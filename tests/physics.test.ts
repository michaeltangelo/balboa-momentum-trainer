import { describe, expect, it } from 'vitest';
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
