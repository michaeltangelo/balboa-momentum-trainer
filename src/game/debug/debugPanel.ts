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
  { key: 'rocketMass', label: 'Rocket mass', min: 0.5, max: 5, step: 0.1 },
  { key: 'rocketRadius', label: 'Rocket radius', min: 10, max: 60, step: 1 },
  { key: 'partnerMass', label: 'Partner mass', min: 1, max: 12, step: 0.1 },
  { key: 'partnerRadius', label: 'Partner radius', min: 12, max: 60, step: 1 },
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
    ['rocketSpeed', 'Rocket speed'],
    ['partnerSpeed', 'Partner speed'],
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
