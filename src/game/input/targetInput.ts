import type { Vec2 } from '../physics/types';
import { length, scale, subtract } from '../physics/vector';

export interface TargetInputSettings {
  stopRadius: number;
  slowRadius: number;
  maxSpeed: number;
  velocityResponse: number;
}

export function calculateTargetThrust(
  position: Vec2,
  velocity: Vec2,
  target: Vec2,
  settings: TargetInputSettings,
): Vec2 {
  const offset = subtract(target, position);
  const distance = length(offset);
  const stopRadius = Math.max(0, settings.stopRadius);
  const slowRadius = Math.max(stopRadius, settings.slowRadius);
  const arrivalRange = slowRadius - stopRadius;
  const speedScale =
    distance <= stopRadius
      ? 0
      : arrivalRange > 0
        ? Math.min(1, (distance - stopRadius) / arrivalRange)
        : 1;
  const desiredVelocity =
    distance > 0 ? scale(offset, (Math.max(0, settings.maxSpeed) * speedScale) / distance) : offset;
  const velocityError = subtract(desiredVelocity, velocity);
  const errorMagnitude = length(velocityError);

  if (errorMagnitude === 0 || settings.velocityResponse <= 0) return { x: 0, y: 0 };

  return scale(
    velocityError,
    Math.min(1, errorMagnitude / settings.velocityResponse) / errorMagnitude,
  );
}
