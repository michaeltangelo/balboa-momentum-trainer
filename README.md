# Balboa Momentum Trainer

A lightweight, mobile-first browser physics toy inspired by Balboa partner-dance mechanics. Move the leader first, use the elastic connection to establish momentum for the follow, then clear the path you created.

## Current MVP

The single-screen prototype includes a fixed portrait arena, inertial leader and follow bodies, a slack-and-tension elastic connection, boundary response, a three-heart collision system, a good-pass score detector, one-finger target-seeking controls, mouse and keyboard support, visibility pause/resume, and a development tuning panel. Both dancers use lightweight, code-drawn top-down torso capsules with collision geometry matching their visuals.

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

- Touch or click and hold anywhere in the arena to guide the leader toward that point. Move your finger to update the target; the leader slows as it arrives. Release to coast.
- WASD or arrow keys apply full thrust on desktop.
- Press `R` to restart.
- Colliding with the follow removes one heart, flashes the arena red, and separates the dancers so play can continue. After all three hearts are lost, tap or click anywhere to restart.

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

Physics constants live in `src/game/config/tuning.ts`. Gameplay motion remains at the iteratively tested 1.3× profile inside the unchanged 390 × 780 arena. The tether begins tension at 75.4 px, remains elastic until 153.4 px, and then ramps sharply through quadratic overstretch. Its 78 px healthy extension, 1.8 base stiffness, and 2.4 damping preserve the prior proportional spring behavior; the overstretch factor is approximately 0.02959 so the larger extension does not alter the nonlinear multiplier. Target steering begins slowing at 143 px, uses an 84.5 px/s velocity response, and targets 325 px/s. The leader uses mass 1.2 and thrust 1185.6, while the follow mass is 1, making the player 20% heavier and scaling acceleration to traverse the larger distances in the same time. Mass ratio controls how tether force is distributed; stiffness and damping control the follow's character.

Both dancers are 50 × 16 px torso capsules. The narrow front-to-back depth allows close in-and-out passes while the rounded shoulder ends avoid corner catches. The follow always faces the leader. The leader smoothly blends its facing between the follow and its travel axis: travel begins influencing orientation above 20 px/s, reaches its full 30% weight at 160 px/s, and uses whichever end of the travel axis is closer to facing the follow to avoid backward-motion flips. This places the leader halfway between the original follow-facing behavior and the initial 60% travel-oriented hybrid. Rotation remains capped at 4 radians per second, giving orientation continuity without adding another control gesture. Visuals and collision use the same capsule geometry. These defaults reflect iterative playtesting; document the reason when changing them.

The player starts with three hearts. A collision removes one heart, shows a 0.35-second red flash and 0.65-second heart-loss animation, separates the dancers to 88 px, and sends them apart at 90 px/s. Surviving collisions grant 0.9 seconds of temporary immunity so a single overlap cannot consume multiple hearts. Losing the third heart ends the run with the message “GG, you killed your follow. Try again.” These recovery values are exposed in the debug panel and do not change ordinary tether behavior.

A pass candidate begins when both dancers are moving and their center distance closes inside 115 px. One point is awarded only after they come within 65 px, their relative bearing changes by at least 100 degrees, the leader turns at least 15 degrees, the follow turns at least 50 degrees, and both bodies carry the crossover outward for at least 0.18 seconds and 18 px. Wide slings, same-side retreats, stalled exits, insufficient pivots, and collisions are rejected. The on-screen diagnostic readout shows the current state, closest distance, radial speed, crossover angle, accumulated pivots, body speeds, and the last acceptance or rejection reason. Scoring thresholds are available in the `?debug=1` tuning panel for playtesting.

Each successful pass triggers a 0.68-second positive-feedback animation: a subtle mint arena-border pulse, a floating `GOOD PASS +1` label at the crossing midpoint, a brief score-counter bump, and six small code-drawn particles that travel along the dancers' exit directions. The particles use the existing frame graphics instead of a particle emitter to keep the effect inexpensive on mobile.
