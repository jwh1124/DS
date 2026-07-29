export const AI_TECH_RESERVE_PER_WAVE = 80;

export function shouldUpgradeEnemyTech(wave, currentTechLevel, reserve, cost) {
  const milestone = currentTechLevel === 1
    ? 5
    : currentTechLevel === 2
      ? 9
      : Infinity;
  return wave >= milestone && reserve >= cost;
}

export function getAiRecruitmentPriority({
  wave,
  playerCounts,
  enemyCounts,
  enemyRosterSize
}) {
  if (enemyRosterSize >= 5 && enemyCounts.medic < 1) {
    return { type: 'medic', saveForRole: true };
  }
  if (wave >= 7 && enemyCounts.sniper < 1) {
    return { type: 'sniper', saveForRole: true };
  }
  if (wave >= 9 && enemyCounts.tank < 1) {
    return { type: 'tank', saveForRole: true };
  }
  if (wave >= 10 && enemyCounts.crusader < 1) {
    return { type: 'crusader', saveForRole: true };
  }

  const playerFrontline = playerCounts.tank + playerCounts.crusader;
  if (playerFrontline > 2) {
    return { type: 'sniper', saveForRole: false };
  }
  if (playerCounts.melee >= playerCounts.ranged && playerCounts.melee >= playerCounts.tank) {
    return { type: 'ranged', saveForRole: false };
  }
  if (playerCounts.ranged >= playerCounts.melee && playerCounts.ranged >= playerCounts.tank) {
    return { type: 'crusader', saveForRole: false };
  }
  return { type: 'melee', saveForRole: false };
}
