# Project instructions

- Mobile-first and portrait-first behavior are product requirements. Preserve the fixed 390 × 780 logical arena and fit it without stretching.
- Smoothness takes priority over visual effects. Avoid expensive shaders, blur, shadows, large assets, and oversized particle systems.
- Keep core physics and input calculations testable independently of Phaser.
- Do not introduce React, Matter.js, backend services, authentication, databases, or PWA/service-worker functionality without an explicit task.
- After meaningful changes, run tests, type checking, linting, formatting checks, and a production build.
- Preserve one-finger accessibility: gameplay must remain operable with one touch gesture and no simultaneous controls.
- Do not silently alter physics constants. Document the reason in the change and update relevant tests or README guidance.
- Keep changes focused and avoid speculative features.
