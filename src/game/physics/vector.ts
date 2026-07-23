import type { Vec2 } from './types';

export const length = (vector: Vec2): number => Math.hypot(vector.x, vector.y);
export const subtract = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const scale = (vector: Vec2, amount: number): Vec2 => ({
  x: vector.x * amount,
  y: vector.y * amount,
});
export const normalize = (vector: Vec2): Vec2 => {
  const magnitude = length(vector);
  return magnitude > 0 ? scale(vector, 1 / magnitude) : { x: 0, y: 0 };
};
