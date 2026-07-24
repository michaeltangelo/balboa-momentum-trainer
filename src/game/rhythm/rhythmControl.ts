import type { Tuning } from '../config/tuning';

export function createRhythmControl(tuning: Tuning): void {
  const control = document.createElement('label');
  control.className = 'rhythm-control';

  const value = document.createElement('output');
  value.textContent = `${tuning.rhythmBpm} BPM`;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '60';
  slider.max = '240';
  slider.step = '1';
  slider.value = String(tuning.rhythmBpm);
  slider.setAttribute('aria-label', 'Tempo in beats per minute');
  slider.addEventListener('input', () => {
    tuning.rhythmBpm = Number(slider.value);
    value.textContent = `${tuning.rhythmBpm} BPM`;
  });

  control.append(value, slider);
  document.body.append(control);
}
