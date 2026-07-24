import type { Vec2 } from './types';

export interface LeaderOrientationSettings {
  travelWeight: number;
  travelBlendStartSpeed: number;
  travelBlendFullSpeed: number;
}

export function calculateBlendedLeaderFacing(
  leaderPosition: Vec2,
  leaderVelocity: Vec2,
  followPosition: Vec2,
  settings: LeaderOrientationSettings,
): number {
  const followAngle = Math.atan2(
    followPosition.y - leaderPosition.y,
    followPosition.x - leaderPosition.x,
  );
  const travelSpeed = Math.hypot(leaderVelocity.x, leaderVelocity.y);
  const blendRange = Math.max(
    Number.EPSILON,
    settings.travelBlendFullSpeed - settings.travelBlendStartSpeed,
  );
  const speedInfluence = clamp01((travelSpeed - settings.travelBlendStartSpeed) / blendRange);
  if (speedInfluence === 0) return followAngle;

  const travelAngle = Math.atan2(leaderVelocity.y, leaderVelocity.x);
  const reverseTravelAngle = travelAngle + Math.PI;
  const travelAxisAngle =
    Math.abs(shortestAngleDelta(followAngle, travelAngle)) <=
    Math.abs(shortestAngleDelta(followAngle, reverseTravelAngle))
      ? travelAngle
      : reverseTravelAngle;
  const travelInfluence = clamp01(settings.travelWeight) * speedInfluence;
  return followAngle + shortestAngleDelta(followAngle, travelAxisAngle) * travelInfluence;
}

export function rotateTowards(current: number, target: number, maximumStep: number): number {
  const delta = shortestAngleDelta(current, target);
  if (Math.abs(delta) <= maximumStep) return target;
  return current + Math.sign(delta) * Math.max(0, maximumStep);
}

export function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
