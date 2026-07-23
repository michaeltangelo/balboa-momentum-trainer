# Balboa Momentum Trainer

A lightweight, mobile-first browser physics toy inspired by Balboa partner-dance mechanics. Move the rocket first, use the elastic connection to establish momentum for the larger partner mass, then clear the path you created.

## Current MVP

The single-screen prototype includes a fixed portrait arena, inertial rocket and partner bodies, a slack-and-tension elastic connection, boundary response, collision/result state, one-finger target-seeking controls, mouse and keyboard support, visibility pause/resume, and a development tuning panel. Shapes are drawn in code with no external art assets.

## Stack

TypeScript, Vite, Phaser, npm, Vitest, ESLint, and Prettier. Core physics and input math do not depend on Phaser.

## Local setup

Requires a current Node.js LTS release.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Add `?debug=1` (for example, `http://localhost:5173/?debug=1`) for live performance statistics and physics controls.

## Controls

- Touch or click and hold anywhere in the arena to guide the rocket toward that point. Move your finger to update the target; the rocket slows as it arrives. Release to coast.
- WASD or arrow keys apply full thrust on desktop.
- Press `R` to restart.
- After a collision, tap or click anywhere to restart.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — type-check and create a production build
- `npm test` — run tests once
- `npm run test:watch` — run tests in watch mode
- `npm run typecheck` — run TypeScript checks
- `npm run lint` — run ESLint
- `npm run format` — format source files
- `npm run format:check` — verify formatting

## Deferred

This version intentionally excludes tutorials, formal drills or levels, workshop/QR codes, accounts, backends, leaderboards, multiplayer, live instructor controls, PWA/offline behavior, music, localization, advanced graphics, obstacles, multiple masses, and progression systems.

Physics constants live in `src/game/config/tuning.ts`. Gameplay geometry and motion are scaled to 1.3× their original size inside the unchanged 390 × 780 arena. The tether begins tension at 75.4 px, remains elastic until 153.4 px, and then ramps sharply through quadratic overstretch. Its 78 px healthy extension, 1.8 base stiffness, and 2.4 damping preserve the prior proportional spring behavior; the overstretch factor is scaled to approximately 0.02959 so the larger extension does not alter the nonlinear multiplier. Target steering begins slowing at 143 px, uses an 84.5 px/s velocity response, and targets 325 px/s. The rocket uses mass 1.2 and thrust 1185.6, while the partner mass is 1, making the player 20% heavier and scaling acceleration to traverse the larger distances in the same time. Mass ratio controls how tether force is distributed; stiffness and damping control the follow's character. The rocket radius is 22.1 px and the partner radius is 20.8 px. Both visuals scale from these radii so their appearance remains aligned with collision geometry. These defaults reflect iterative playtesting; document the reason when changing them.
