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
