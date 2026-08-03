export const WAVE_PHASES = Object.freeze({
  SCOUT: 'scout',
  COMBAT: 'combat',
  ASSAULT: 'assault',
  BREACH: 'breach',
  WITHDRAWAL: 'withdrawal',
  PREPARE: 'prepare',
  FINAL: 'final'
});

export function resolvePostCombatPhase({
  currentPhase,
  wave,
  maxWaves,
  hasActiveEnemyWave,
  hasActivePlayerWave,
  hasActiveEnemyAttackers = hasActiveEnemyWave,
  hasActivePlayerAttackers = hasActivePlayerWave,
  assaultTime,
  withdrawalTime = 3
}) {
  if (
    currentPhase !== WAVE_PHASES.COMBAT
    || wave <= 0
    || wave >= maxWaves
    || (hasActiveEnemyWave && hasActivePlayerWave)
  ) {
    return null;
  }

  if (!hasActiveEnemyWave && hasActivePlayerAttackers) {
    return {
      phase: WAVE_PHASES.ASSAULT,
      timeRemaining: assaultTime,
      siegeTeam: 'player'
    };
  }

  if (!hasActivePlayerWave && hasActiveEnemyAttackers) {
    return {
      phase: WAVE_PHASES.BREACH,
      timeRemaining: assaultTime,
      siegeTeam: 'enemy'
    };
  }

  return {
    phase: WAVE_PHASES.WITHDRAWAL,
    timeRemaining: withdrawalTime,
    withdrawTeam: hasActivePlayerWave ? 'player' : hasActiveEnemyWave ? 'enemy' : 'both'
  };
}

export function resolveExpiredPhase({ phase, prepTime, withdrawalTime = 3 }) {
  if (phase === WAVE_PHASES.ASSAULT) {
    return {
      phase: WAVE_PHASES.WITHDRAWAL,
      timeRemaining: withdrawalTime,
      withdrawTeam: 'player'
    };
  }

  if (phase === WAVE_PHASES.BREACH) {
    return {
      phase: WAVE_PHASES.WITHDRAWAL,
      timeRemaining: withdrawalTime,
      withdrawTeam: 'enemy'
    };
  }

  if (phase === WAVE_PHASES.WITHDRAWAL) {
    return {
      phase: WAVE_PHASES.PREPARE,
      timeRemaining: prepTime,
      shouldStartPreparation: true
    };
  }

  if (phase === WAVE_PHASES.SCOUT || phase === WAVE_PHASES.PREPARE) {
    return {
      phase,
      timeRemaining: 0,
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
