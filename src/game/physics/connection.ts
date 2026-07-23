import type { Body, Vec2 } from './types';
import { dot, length, scale, subtract } from './vector';

export interface ConnectionSettings {
  restLength: number;
  slack: number;
  stiffness: number;
  damping: number;
  healthyExtension: number;
  overstretchFactor: number;
}

export interface ConnectionResult {
  distance: number;
  extension: number;
  tension: number;
  forceOnA: Vec2;
  forceOnB: Vec2;
}

export function calculateConnection(
  bodyA: Pick<Body, 'position' | 'velocity'>,
  bodyB: Pick<Body, 'position' | 'velocity'>,
  settings: ConnectionSettings,
): ConnectionResult {
  const displacement = subtract(bodyB.position, bodyA.position);
  const distance = length(displacement);
  const direction = distance > 0 ? scale(displacement, 1 / distance) : { x: 0, y: 0 };
  const extension = Math.max(0, distance - settings.restLength - settings.slack);

  if (extension === 0) {
    return { distance, extension, tension: 0, forceOnA: { x: 0, y: 0 }, forceOnB: { x: 0, y: 0 } };
  }

  const relativeVelocity = subtract(bodyB.velocity, bodyA.velocity);
  const separatingSpeed = dot(relativeVelocity, direction);
  const overstretch = Math.max(0, extension - settings.healthyExtension);
  const springForce =
    settings.stiffness * extension * (1 + settings.overstretchFactor * overstretch * overstretch);
  const tension = Math.max(0, springForce + settings.damping * separatingSpeed);
  const forceOnA = scale(direction, tension);
  return { distance, extension, tension, forceOnA, forceOnB: scale(forceOnA, -1) };
}

export function applyConnectionForces(bodyA: Body, bodyB: Body, result: ConnectionResult): void {
  bodyA.force.x += result.forceOnA.x;
  bodyA.force.y += result.forceOnA.y;
  bodyB.force.x += result.forceOnB.x;
  bodyB.force.y += result.forceOnB.y;
}
