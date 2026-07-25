import { describe, expect, it } from 'vitest';
import {
  PassDetector,
  type PassDetectorSettings,
  type PassSample,
} from '../src/game/scoring/passDetector';

const settings: PassDetectorSettings = {
  entryDistance: 110,
  maximumClosestDistance: 65,
  minimumBearingChange: (100 * Math.PI) / 180,
  minimumLeaderTurn: (10 * Math.PI) / 180,
  minimumFollowTurn: (40 * Math.PI) / 180,
  minimumBodySpeed: 10,
  minimumClosingSpeed: 5,
  minimumOutgoingSpeed: 5,
  minimumOutgoingDuration: 0.1,
  minimumOutwardTravel: 10,
  candidateTimeout: 1,
  rearmDistance: 90,
};

function sample(
  relative: { x: number; y: number },
  relativeVelocity: { x: number; y: number },
  leaderFacing = 0,
  followFacing = 0,
): PassSample {
  return {
    leaderPosition: { x: -relative.x / 2, y: -relative.y / 2 },
    followPosition: { x: relative.x / 2, y: relative.y / 2 },
    leaderVelocity: { x: -relativeVelocity.x / 2, y: -relativeVelocity.y / 2 },
    followVelocity: { x: relativeVelocity.x / 2, y: relativeVelocity.y / 2 },
    leaderFacing,
    followFacing,
  };
}

describe('pass detector', () => {
  it('scores a close crossover with pivots and continued momentum', () => {
    const detector = new PassDetector(settings);
    detector.update(sample({ x: 0, y: -100 }, { x: 0, y: 40 }), 0.02);
    detector.update(sample({ x: 0, y: -55 }, { x: 0, y: 40 }, 0.1, 0.2), 0.02);

    let update = detector.update(sample({ x: 20, y: 15 }, { x: 40, y: 30 }, 0.4, 1), 0.02);
    let scored = update.scored;
    for (let index = 1; index <= 6; index += 1) {
      update = detector.update(
        sample({ x: 20 + index * 2, y: 15 + index * 1.5 }, { x: 40, y: 30 }, 0.4, 1),
        0.02,
      );
      scored ||= update.scored;
    }

    expect(scored).toBe(true);
    expect(update.debug.score).toBe(1);
    expect(update.debug.lastResult).toBe('GOOD PASS +1');

    const cooldown = detector.update(sample({ x: 40, y: 30 }, { x: 40, y: 30 }, 0.4, 1), 0.2);
    expect(cooldown.scored).toBe(false);
    expect(cooldown.debug.score).toBe(1);
  });

  it('rejects a wide orbit even when the relative bearing crosses', () => {
    const detector = new PassDetector(settings);
    detector.update(sample({ x: 0, y: -100 }, { x: 0, y: 40 }), 0.02);
    detector.update(sample({ x: 0, y: -80 }, { x: 0, y: 40 }, 0.2, 0.4), 0.02);

    let update = detector.update(sample({ x: 80, y: 20 }, { x: 40, y: 10 }, 0.5, 1), 0.02);
    for (let index = 0; index < 6; index += 1) {
      update = detector.update(
        sample({ x: 90 + index * 3, y: 22 }, { x: 40, y: 10 }, 0.5, 1),
        0.02,
      );
    }

    expect(update.debug.score).toBe(0);
    expect(update.debug.lastResult).toBe('TOO WIDE');
  });

  it('rejects an approach that moves outward on the same side', () => {
    const detector = new PassDetector(settings);
    detector.update(sample({ x: 0, y: -100 }, { x: 0, y: 40 }), 0.02);
    detector.update(sample({ x: 0, y: -50 }, { x: 0, y: 40 }, 0.3, 0.8), 0.02);

    let update = detector.update(sample({ x: 0, y: -70 }, { x: 0, y: -40 }, 0.5, 1), 0.02);
    for (let index = 0; index < 6; index += 1) {
      update = detector.update(
        sample({ x: 0, y: -92 - index * 2 }, { x: 0, y: -40 }, 0.5, 1),
        0.02,
      );
    }

    expect(update.debug.score).toBe(0);
    expect(update.debug.lastResult).toBe('NO CROSSOVER');
  });

  it('cancels a candidate after a collision', () => {
    const detector = new PassDetector(settings);
    detector.update(sample({ x: 0, y: -100 }, { x: 0, y: 40 }), 0.02);
    detector.cancelCandidate('COLLISION');

    const update = detector.update(sample({ x: 0, y: -50 }, { x: 0, y: 40 }), 0.02);
    expect(update.debug.phase).toBe('COOLDOWN');
    expect(update.debug.lastResult).toBe('COLLISION');
    expect(update.debug.score).toBe(0);
  });
});
