export const MEDIC_HEAL_RANGE = 260;

export function getCombatTargetTier(target) {
  if (target?.techLevel !== undefined) return 2;
  if (target?.type === 'medic') return 1;
  return 0;
}

export function isValidMedicTarget(healer, target) {
  return Boolean(target)
    && target !== healer
    && target.isAlive
    && target.type !== undefined
    && !target.isBoss
    && target.hp < target.maxHp;
}

export function selectCombatTarget(candidates, getDistance, getScore) {
  let bestTarget = null;
  let bestDistance = Infinity;
  let bestTier = Infinity;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    const distance = getDistance(candidate);
    const tier = getCombatTargetTier(candidate);
    const score = getScore(candidate, distance);

    if (tier < bestTier || (tier === bestTier && score < bestScore)) {
      bestTarget = candidate;
      bestDistance = distance;
      bestTier = tier;
      bestScore = score;
    }
  }

  return { target: bestTarget, distance: bestDistance };
}
