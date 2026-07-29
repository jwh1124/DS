export function cancelContractForNextWave({
  waveSystem,
  entityManager,
  economy,
  team,
  type,
  unitCost
}) {
  const removed = waveSystem.removeSpawner(team, type);
  if (!removed) {
    return { removed: null, refundAmount: 0, fieldedUnits: [] };
  }

  const refundAmount = Math.floor(unitCost * 0.5);
  economy.minerals += refundAmount;
  const fieldedUnits = entityManager.entities.filter(entity =>
    entity.team === team
    && entity.spawnerId === removed.id
    && entity.isAlive
  );

  // Fielded units are deliberately left untouched. Removing the contract now
  // prevents a replacement from spawning in the next wave.
  return { removed, refundAmount, fieldedUnits };
}
