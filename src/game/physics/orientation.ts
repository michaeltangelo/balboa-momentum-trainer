export function rotateTowards(current: number, target: number, maximumStep: number): number {
  const delta = shortestAngleDelta(current, target);
  if (Math.abs(delta) <= maximumStep) return target;
  return current + Math.sign(delta) * Math.max(0, maximumStep);
}

export function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
