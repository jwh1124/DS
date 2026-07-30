export const WAVE_PHASES = Object.freeze({
  SCOUT: 'scout',
  COMBAT: 'combat',
  ASSAULT: 'assault',
  PREPARE: 'prepare',
  FINAL: 'final'
});

export function resolvePostCombatPhase({
  currentPhase,
  wave,
  maxWaves,
  hasActiveEnemyWave,
  hasActivePlayerWave,
  assaultTime,
  prepTime
}) {
  if (
    currentPhase !== WAVE_PHASES.COMBAT
    || wave <= 0
    || wave >= maxWaves
    || hasActiveEnemyWave
  ) {
    return null;
  }

  if (!hasActivePlayerWave) {
    return {
      phase: WAVE_PHASES.PREPARE,
      timeRemaining: prepTime,
      shouldWithdraw: false
    };
  }

  return {
    phase: WAVE_PHASES.ASSAULT,
    timeRemaining: assaultTime,
    shouldWithdraw: false
  };
}

export function resolveExpiredPhase({ phase, prepTime }) {
  if (phase === WAVE_PHASES.ASSAULT) {
    return {
      phase: WAVE_PHASES.PREPARE,
      timeRemaining: prepTime,
      shouldWithdraw: true,
      shouldSpawnWave: false
    };
  }

  if (phase === WAVE_PHASES.SCOUT || phase === WAVE_PHASES.PREPARE) {
    return {
      phase,
      timeRemaining: 0,
      shouldWithdraw: false,
      shouldSpawnWave: true
    };
  }

  return null;
}

export function canLaunchNextWaveEarly({
  isActive,
  phase,
  bossGateLocked,
  hasActiveEnemyWave,
  timeUntilWave
}) {
  const launchPhase = phase === WAVE_PHASES.SCOUT || phase === WAVE_PHASES.PREPARE;
  return Boolean(isActive)
    && launchPhase
    && !bossGateLocked
    && !hasActiveEnemyWave
    && timeUntilWave > 0.25;
}
