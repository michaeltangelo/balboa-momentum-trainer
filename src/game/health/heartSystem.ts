export interface HeartSystemSettings {
  invulnerabilityDuration: number;
  flashDuration: number;
  heartLossDuration: number;
}

export interface HeartSystemState {
  lives: number;
  maximumLives: number;
  invulnerabilityRemaining: number;
  flashRemaining: number;
  heartLossRemaining: number;
  lastLostHeartIndex: number | null;
}

export interface HeartHitResult {
  state: HeartSystemState;
  damaged: boolean;
  gameOver: boolean;
}

export function createHeartSystemState(maximumLives: number): HeartSystemState {
  const safeMaximum = Math.max(1, Math.floor(maximumLives));
  return {
    lives: safeMaximum,
    maximumLives: safeMaximum,
    invulnerabilityRemaining: 0,
    flashRemaining: 0,
    heartLossRemaining: 0,
    lastLostHeartIndex: null,
  };
}

export function applyHeartHit(
  state: HeartSystemState,
  settings: HeartSystemSettings,
): HeartHitResult {
  if (state.lives <= 0 || state.invulnerabilityRemaining > 0) {
    return { state, damaged: false, gameOver: state.lives <= 0 };
  }

  const lives = state.lives - 1;
  return {
    damaged: true,
    gameOver: lives === 0,
    state: {
      ...state,
      lives,
      invulnerabilityRemaining: lives === 0 ? 0 : Math.max(0, settings.invulnerabilityDuration),
      flashRemaining: Math.max(0, settings.flashDuration),
      heartLossRemaining: Math.max(0, settings.heartLossDuration),
      lastLostHeartIndex: lives,
    },
  };
}

export function advanceHeartSystem(
  state: HeartSystemState,
  deltaSeconds: number,
): HeartSystemState {
  const elapsed = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds : 0;
  const heartLossRemaining = Math.max(0, state.heartLossRemaining - elapsed);
  return {
    ...state,
    invulnerabilityRemaining: Math.max(0, state.invulnerabilityRemaining - elapsed),
    flashRemaining: Math.max(0, state.flashRemaining - elapsed),
    heartLossRemaining,
    lastLostHeartIndex: heartLossRemaining > 0 ? state.lastLostHeartIndex : null,
  };
}
