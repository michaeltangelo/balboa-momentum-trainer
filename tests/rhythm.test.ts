import { describe, expect, it } from 'vitest';
import { BeatClock } from '../src/game/rhythm/beatClock';

describe('four-count beat clock', () => {
  it('advances through four counts and loops to one', () => {
    const clock = new BeatClock(120);

    expect(clock.getState().count).toBe(1);
    expect(clock.advance(0.5).count).toBe(2);
    expect(clock.advance(0.5).count).toBe(3);
    expect(clock.advance(0.5).count).toBe(4);
    expect(clock.advance(0.5).count).toBe(1);
  });

  it('reports progress within the current beat and cycle', () => {
    const clock = new BeatClock(120);
    const state = clock.advance(0.25);

    expect(state.count).toBe(1);
    expect(state.beatProgress).toBeCloseTo(0.5);
    expect(state.cycleProgress).toBeCloseTo(0.125);
  });

  it('changes future tempo without jumping the current phase', () => {
    const clock = new BeatClock(120);
    clock.advance(0.25);
    clock.setBpm(60);

    expect(clock.getState().beatProgress).toBeCloseTo(0.5);
    expect(clock.advance(0.5).count).toBe(2);
  });

  it('restarts precisely on count one', () => {
    const clock = new BeatClock(120);
    clock.advance(1.6);
    clock.reset();

    expect(clock.getState()).toMatchObject({
      count: 1,
      beatProgress: 0,
      cycleProgress: 0,
    });
  });
});
