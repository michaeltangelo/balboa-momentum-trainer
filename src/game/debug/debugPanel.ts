import type { Tuning } from '../config/tuning';

export interface DebugStats {
  frameMs: number;
  rocketSpeed: number;
  partnerSpeed: number;
  distance: number;
  extension: number;
  tension: number;
}

const controls: Array<{
  key: keyof Tuning;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: 'thrust', label: 'Thrust', min: 100, max: 3000, step: 10 },
  {
    key: 'collisionInvulnerabilityDuration',
    label: 'Hit immunity',
    min: 0.1,
    max: 3,
    step: 0.05,
  },
  {
    key: 'collisionFlashDuration',
    label: 'Hit flash',
    min: 0.05,
    max: 1,
    step: 0.05,
  },
  {
    key: 'collisionHeartLossDuration',
    label: 'Heart loss',
    min: 0.1,
    max: 2,
    step: 0.05,
  },
  {
    key: 'collisionRecoverySeparation',
    label: 'Hit separation',
    min: 40,
    max: 160,
    step: 1,
  },
  {
    key: 'collisionKnockbackSpeed',
    label: 'Hit knockback',
    min: 0,
    max: 240,
    step: 5,
  },
  { key: 'passEntryDistance', label: 'Pass entry distance', min: 60, max: 180, step: 1 },
  {
    key: 'passMaximumClosestDistance',
    label: 'Pass max closest',
    min: 20,
    max: 120,
    step: 1,
  },
  {
    key: 'passMinimumBearingDegrees',
    label: 'Pass crossover angle',
    min: 30,
    max: 180,
    step: 5,
  },
  {
    key: 'passMinimumLeaderTurnDegrees',
    label: 'Pass leader pivot',
    min: 0,
    max: 180,
    step: 5,
  },
  {
    key: 'passMinimumFollowTurnDegrees',
    label: 'Pass follow pivot',
    min: 0,
    max: 180,
    step: 5,
  },
  { key: 'passMinimumBodySpeed', label: 'Pass body speed', min: 0, max: 200, step: 2 },
  {
    key: 'passMinimumClosingSpeed',
    label: 'Pass closing speed',
    min: 0,
    max: 200,
    step: 2,
  },
  {
    key: 'passMinimumOutgoingSpeed',
    label: 'Pass outgoing speed',
    min: 0,
    max: 200,
    step: 2,
  },
  {
    key: 'passMinimumOutgoingDuration',
    label: 'Pass follow-through',
    min: 0,
    max: 1,
    step: 0.02,
  },
  {
    key: 'passMinimumOutwardTravel',
    label: 'Pass outward travel',
    min: 0,
    max: 100,
    step: 2,
  },
  {
    key: 'passCandidateTimeout',
    label: 'Pass timeout',
    min: 0.5,
    max: 4,
    step: 0.1,
  },
  { key: 'passRearmDistance', label: 'Pass rearm distance', min: 60, max: 180, step: 1 },
  { key: 'rocketMass', label: 'Leader mass', min: 0.5, max: 5, step: 0.1 },
  { key: 'partnerMass', label: 'Follow mass', min: 1, max: 12, step: 0.1 },
  { key: 'torsoWidth', label: 'Torso width', min: 24, max: 80, step: 1 },
  { key: 'torsoDepth', label: 'Torso depth', min: 8, max: 30, step: 1 },
  { key: 'leaderTurnSpeed', label: 'Leader turn speed', min: 0.5, max: 12, step: 0.1 },
  {
    key: 'leaderTravelFacingWeight',
    label: 'Leader travel weight',
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'leaderTravelBlendStartSpeed',
    label: 'Travel blend start',
    min: 0,
    max: 300,
    step: 5,
  },
  {
    key: 'leaderTravelBlendFullSpeed',
    label: 'Travel blend full',
    min: 10,
    max: 500,
    step: 5,
  },
  { key: 'restLength', label: 'Rest length', min: 80, max: 320, step: 1 },
  { key: 'slack', label: 'Slack', min: 0, max: 80, step: 1 },
  { key: 'springStiffness', label: 'Stiffness', min: 0.5, max: 14, step: 0.1 },
  { key: 'springDamping', label: 'Damping', min: 0, max: 8, step: 0.1 },
  { key: 'generalDrag', label: 'General drag', min: 0, max: 2, step: 0.01 },
  { key: 'targetStopRadius', label: 'Target stop radius', min: 0, max: 40, step: 1 },
  { key: 'targetSlowRadius', label: 'Target slow radius', min: 20, max: 240, step: 1 },
  { key: 'targetMaxSpeed', label: 'Target max speed', min: 40, max: 800, step: 5 },
  { key: 'targetVelocityResponse', label: 'Target response', min: 10, max: 300, step: 5 },
  { key: 'healthyExtension', label: 'Healthy extension', min: 10, max: 160, step: 1 },
];

export function createDebugPanel(tuning: Tuning): (stats: DebugStats) => void {
  const panel = document.createElement('aside');
  panel.className = 'debug-panel';
  panel.innerHTML = '<h2>Live tuning</h2>';

  const statNames: Array<[keyof DebugStats, string]> = [
    ['frameMs', 'Frame'],
    ['rocketSpeed', 'Leader speed'],
    ['partnerSpeed', 'Follow speed'],
    ['distance', 'Distance'],
    ['extension', 'Extension'],
    ['tension', 'Tension'],
  ];
  const statsContainer = document.createElement('div');
  statsContainer.className = 'debug-stats';
  const outputs = new Map<keyof DebugStats, HTMLElement>();
  for (const [key, label] of statNames) {
    const name = document.createElement('span');
    name.textContent = label;
    const output = document.createElement('output');
    statsContainer.append(name, output);
    outputs.set(key, output);
  }
  panel.append(statsContainer);

  for (const control of controls) {
    const row = document.createElement('label');
    row.className = 'debug-control';
    row.textContent = control.label;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(control.min);
    input.max = String(control.max);
    input.step = String(control.step);
    input.value = String(tuning[control.key]);
    input.addEventListener('change', () => {
      const next = Math.min(control.max, Math.max(control.min, Number(input.value)));
      if (Number.isFinite(next)) tuning[control.key] = next;
      input.value = String(tuning[control.key]);
    });
    row.append(input);
    panel.append(row);
  }
  document.body.append(panel);

  return (stats) => {
    for (const [key] of statNames) {
      const suffix = key === 'frameMs' ? ' ms' : '';
      const output = outputs.get(key);
      if (output) output.textContent = `${stats[key].toFixed(1)}${suffix}`;
    }
  };
}
