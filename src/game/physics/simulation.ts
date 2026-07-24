import type { Body, Vec2 } from './types';

export function integrate(body: Body, dt: number, drag: number): void {
  const damping = Math.exp(-drag * dt);
  body.velocity.x = (body.velocity.x + (body.force.x / body.mass) * dt) * damping;
  body.velocity.y = (body.velocity.y + (body.force.y / body.mass) * dt) * damping;
  body.position.x += body.velocity.x * dt;
  body.position.y += body.velocity.y * dt;
  body.force.x = 0;
  body.force.y = 0;
}

export function containBody(body: Body, width: number, height: number, margin: number): void {
  const bounce = 0.58;
  const minX = margin + body.radius;
  const maxX = width - margin - body.radius;
  const minY = margin + body.radius;
  const maxY = height - margin - body.radius;
  if (body.position.x < minX || body.position.x > maxX) {
    body.position.x = Math.min(maxX, Math.max(minX, body.position.x));
    body.velocity.x *= -bounce;
  }
  if (body.position.y < minY || body.position.y > maxY) {
    body.position.y = Math.min(maxY, Math.max(minY, body.position.y));
    body.velocity.y *= -bounce;
  }
}

export const speed = (body: Body): number => Math.hypot(body.velocity.x, body.velocity.y);

export function addForce(body: Body, force: Vec2): void {
  body.force.x += force.x;
  body.force.y += force.y;
}
