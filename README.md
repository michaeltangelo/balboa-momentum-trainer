# Balboa Momentum Trainer

A lightweight, mobile-first browser physics toy inspired by Balboa partner-dance mechanics. Move the rocket first, use the elastic connection to establish momentum for the larger partner mass, then clear the path you created.

## Current MVP

The single-screen prototype includes a fixed portrait arena, inertial rocket and partner bodies, a slack-and-tension elastic connection, boundary response, collision/result state, one-finger floating drag controls, mouse and keyboard support, visibility pause/resume, and a development tuning panel. Shapes are drawn in code with no external art assets.

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

- Touch or click anywhere in the arena, then drag to apply thrust. Distance controls strength; direction controls thrust direction. Release to coast.
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

Physics constants live in `src/game/config/tuning.ts`. Document the reason when changing their defaults.
