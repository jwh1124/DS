export function resolveClearedWavePrep({
  aiWaveCount,
  maxWaves,
  bossGateLocked,
  hasActiveEnemyWave,
  timeUntilWave,
  clearPrepTime
}) {
  const canEnterClearPrep = aiWaveCount > 0
    && aiWaveCount < maxWaves
    && !bossGateLocked
    && !hasActiveEnemyWave;
  const nextTime = canEnterClearPrep
    ? Math.min(timeUntilWave, clearPrepTime)
    : timeUntilWave;

  return {
    timeUntilWave: nextTime,
    accelerated: nextTime < timeUntilWave,
    clearPrepActive: canEnterClearPrep && nextTime <= clearPrepTime
  };
}

export function canLaunchNextWaveEarly({
  isActive,
  bossGateLocked,
  hasActiveEnemyWave,
  timeUntilWave
}) {
  return Boolean(isActive)
    && !bossGateLocked
    && !hasActiveEnemyWave
    && timeUntilWave > 0.25;
}

export function shouldTickWaveCountdown({ bossGateLocked, hasActiveEnemyWave }) {
  return !bossGateLocked && !hasActiveEnemyWave;
}
