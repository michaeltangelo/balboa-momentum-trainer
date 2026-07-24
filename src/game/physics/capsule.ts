import type { Vec2 } from './types';

export interface Capsule {
  position: Vec2;
  axisAngle: number;
  halfSegment: number;
  radius: number;
}

interface Segment {
  start: Vec2;
  end: Vec2;
}

export function createTorsoCapsule(
  position: Vec2,
  facingAngle: number,
  width: number,
  depth: number,
): Capsule {
  const radius = Math.max(0, depth / 2);
  return {
    position,
    axisAngle: facingAngle + Math.PI / 2,
    halfSegment: Math.max(0, width / 2 - radius),
    radius,
  };
}

export function capsulesCollide(a: Capsule, b: Capsule): boolean {
  const distanceSquared = segmentDistanceSquared(toSegment(a), toSegment(b));
  const combinedRadius = a.radius + b.radius;
  return distanceSquared <= combinedRadius * combinedRadius;
}

function toSegment(capsule: Capsule): Segment {
  const offset = {
    x: Math.cos(capsule.axisAngle) * capsule.halfSegment,
    y: Math.sin(capsule.axisAngle) * capsule.halfSegment,
  };
  return {
    start: { x: capsule.position.x - offset.x, y: capsule.position.y - offset.y },
    end: { x: capsule.position.x + offset.x, y: capsule.position.y + offset.y },
  };
}

function segmentDistanceSquared(a: Segment, b: Segment): number {
  if (segmentsIntersect(a, b)) return 0;
  return Math.min(
    pointSegmentDistanceSquared(a.start, b),
    pointSegmentDistanceSquared(a.end, b),
    pointSegmentDistanceSquared(b.start, a),
    pointSegmentDistanceSquared(b.end, a),
  );
}

function pointSegmentDistanceSquared(point: Vec2, segment: Segment): number {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    const offsetX = point.x - segment.start.x;
    const offsetY = point.y - segment.start.y;
    return offsetX * offsetX + offsetY * offsetY;
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lengthSquared,
    ),
  );
  const nearestX = segment.start.x + dx * projection;
  const nearestY = segment.start.y + dy * projection;
  const offsetX = point.x - nearestX;
  const offsetY = point.y - nearestY;
  return offsetX * offsetX + offsetY * offsetY;
}

function segmentsIntersect(a: Segment, b: Segment): boolean {
  const aDirection = subtract(a.end, a.start);
  const bDirection = subtract(b.end, b.start);
  const startOffset = subtract(b.start, a.start);
  const denominator = cross(aDirection, bDirection);

  if (Math.abs(denominator) < 1e-9) {
    if (Math.abs(cross(startOffset, aDirection)) >= 1e-9) return false;
    const axis = Math.abs(aDirection.x) >= Math.abs(aDirection.y) ? 'x' : 'y';
    const aMin = Math.min(a.start[axis], a.end[axis]);
    const aMax = Math.max(a.start[axis], a.end[axis]);
    const bMin = Math.min(b.start[axis], b.end[axis]);
    const bMax = Math.max(b.start[axis], b.end[axis]);
    return aMax >= bMin && bMax >= aMin;
  }

  const alongA = cross(startOffset, bDirection) / denominator;
  const alongB = cross(startOffset, aDirection) / denominator;
  return alongA >= 0 && alongA <= 1 && alongB >= 0 && alongB <= 1;
}

const subtract = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
