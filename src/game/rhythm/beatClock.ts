export type FourCount = 1 | 2 | 3 | 4;

export interface BeatState {
  bpm: number;
  count: FourCount;
  beatProgress: number;
  cycleProgress: number;
}

export class BeatClock {
  private elapsedBeats = 0;
  private currentBpm: number;

  constructor(bpm: number) {
    this.currentBpm = sanitizeBpm(bpm);
  }

  setBpm(bpm: number): void {
    this.currentBpm = sanitizeBpm(bpm);
  }

  reset(): void {
    this.elapsedBeats = 0;
  }

  advance(deltaSeconds: number): BeatState {
    if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
      this.elapsedBeats += (deltaSeconds * this.currentBpm) / 60;
    }
    return this.getState();
  }

  getState(): BeatState {
    const beatInCycle = modulo(this.elapsedBeats, 4);
    const completedBeats = Math.floor(beatInCycle);
    return {
      bpm: this.currentBpm,
      count: (completedBeats + 1) as FourCount,
      beatProgress: beatInCycle - completedBeats,
      cycleProgress: beatInCycle / 4,
    };
  }
}

const sanitizeBpm = (bpm: number): number => (Number.isFinite(bpm) && bpm > 0 ? bpm : 120);

const modulo = (value: number, divisor: number): number => ((value % divisor) + divisor) % divisor;
