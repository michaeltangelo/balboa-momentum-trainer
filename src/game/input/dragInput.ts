import type { Vec2 } from '../physics/types';
import { length, scale, subtract } from '../physics/vector';

export interface DragResult {
  direction: Vec2;
  magnitude: number;
  cappedOffset: Vec2;
}

export function calculateDrag(
  origin: Vec2,
  current: Vec2,
  deadZone: number,
  maximum: number,
): DragResult {
  const offset = subtract(current, origin);
  const distance = length(offset);
  if (distance <= deadZone || maximum <= deadZone) {
    return { direction: { x: 0, y: 0 }, magnitude: 0, cappedOffset: { x: 0, y: 0 } };
  }
  const direction = scale(offset, 1 / distance);
  const cappedDistance = Math.min(distance, maximum);
  return {
    direction,
    magnitude: (cappedDistance - deadZone) / (maximum - deadZone),
    cappedOffset: scale(direction, cappedDistance),
  };
}
