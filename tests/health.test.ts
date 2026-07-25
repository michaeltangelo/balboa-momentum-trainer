import { describe, expect, it } from 'vitest';
import {
  advanceHeartSystem,
  applyHeartHit,
  createHeartSystemState,
} from '../src/game/health/heartSystem';

const settings = {
  invulnerabilityDuration: 0.9,
  flashDuration: 0.35,
  heartLossDuration: 0.65,
};

describe('heart system', () => {
  it('starts with three lives', () => {
    expect(createHeartSystemState(3)).toMatchObject({
      lives: 3,
      maximumLives: 3,
    });
  });

  it('removes one heart and starts hit feedback', () => {
    const hit = applyHeartHit(createHeartSystemState(3), settings);

    expect(hit.damaged).toBe(true);
    expect(hit.gameOver).toBe(false);
    expect(hit.state).toMatchObject({
      lives: 2,
      invulnerabilityRemaining: 0.9,
      flashRemaining: 0.35,
      heartLossRemaining: 0.65,
      lastLostHeartIndex: 2,
    });
  });

  it('ignores repeated collisions during temporary immunity', () => {
    const firstHit = applyHeartHit(createHeartSystemState(3), settings);
    const repeatedHit = applyHeartHit(firstHit.state, settings);

    expect(repeatedHit.damaged).toBe(false);
    expect(repeatedHit.state.lives).toBe(2);
  });

  it('allows another hit after immunity expires', () => {
    const firstHit = applyHeartHit(createHeartSystemState(3), settings);
    const recovered = advanceHeartSystem(firstHit.state, 0.9);
    const secondHit = applyHeartHit(recovered, settings);

    expect(secondHit.damaged).toBe(true);
    expect(secondHit.state.lives).toBe(1);
  });

  it('ends the game when the final heart is lost', () => {
    let state = createHeartSystemState(3);
    for (let hitNumber = 0; hitNumber < 3; hitNumber += 1) {
      const hit = applyHeartHit(state, settings);
      state = advanceHeartSystem(hit.state, settings.invulnerabilityDuration);
      if (hitNumber === 2) expect(hit.gameOver).toBe(true);
    }

    expect(state.lives).toBe(0);
  });

  it('clears visual feedback as its timers expire', () => {
    const hit = applyHeartHit(createHeartSystemState(3), settings);
    const advanced = advanceHeartSystem(hit.state, 0.65);

    expect(advanced.flashRemaining).toBe(0);
    expect(advanced.heartLossRemaining).toBe(0);
    expect(advanced.lastLostHeartIndex).toBeNull();
  });
});
