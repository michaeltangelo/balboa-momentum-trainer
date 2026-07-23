export interface Vec2 {
  x: number;
  y: number;
}

export interface Body {
  position: Vec2;
  velocity: Vec2;
  force: Vec2;
  mass: number;
  radius: number;
}

export function createBody(x: number, y: number, mass: number, radius: number): Body {
  return {
    position: { x, y },
    velocity: { x: 0, y: 0 },
    force: { x: 0, y: 0 },
    mass,
    radius,
  };
}
