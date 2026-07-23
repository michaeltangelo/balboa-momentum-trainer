import { describe, expect, it } from 'vitest';
import { calculateDrag } from '../src/game/input/dragInput';

describe('floating drag input', () => {
  it('produces no thrust inside the dead zone', () => {
    expect(calculateDrag({ x: 10, y: 10 }, { x: 15, y: 10 }, 10, 80).magnitude).toBe(0);
  });

  it('caps magnitude and offset at the maximum radius', () => {
    const result = calculateDrag({ x: 0, y: 0 }, { x: 1000, y: 0 }, 10, 80);
    expect(result.magnitude).toBe(1);
    expect(result.cappedOffset).toEqual({ x: 80, y: 0 });
  });
});
