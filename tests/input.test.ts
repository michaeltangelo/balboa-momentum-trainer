import { describe, expect, it } from 'vitest';
import { calculateTargetThrust } from '../src/game/input/targetInput';

const settings = {
  stopRadius: 10,
  slowRadius: 110,
  maxSpeed: 200,
  velocityResponse: 100,
};

describe('target-seeking input', () => {
  it('accelerates toward a distant target', () => {
    expect(
      calculateTargetThrust({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 200, y: 0 }, settings),
    ).toEqual({
      x: 1,
      y: 0,
    });
  });

  it('tapers thrust as the rocket approaches the target', () => {
    const result = calculateTargetThrust({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 35, y: 0 }, settings);
    expect(result.x).toBeCloseTo(0.5);
    expect(result.y).toBe(0);
  });

  it('brakes existing velocity inside the stop radius', () => {
    expect(
      calculateTargetThrust({ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 5, y: 0 }, settings),
    ).toEqual({
      x: -0.6,
      y: 0,
    });
  });

  it('settles when stopped at the target', () => {
    expect(calculateTargetThrust({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 0 }, settings)).toEqual(
      {
        x: 0,
        y: 0,
      },
    );
  });
});
