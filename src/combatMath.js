export const BASE_VERTICAL_ENGAGEMENT_RADIUS = 170;
export const FORMATION_LANE_COUNT = 8;
export const FORMATION_LANE_SPACING = 40;
export const FORMATION_CENTER_Y_OFFSET = 30;
export const FORMATION_ROW_DEPTH = 52;

export function isBaseTarget(target) {
  return Boolean(target && target.techLevel !== undefined && target.maxHp);
}

export function getCombatDistance(attacker, target) {
  const dx = Math.abs(target.x - attacker.x);
  const rawDy = Math.abs(target.y - attacker.y);
  const dy = isBaseTarget(target)
    ? Math.max(0, rawDy - BASE_VERTICAL_ENGAGEMENT_RADIUS)
    : rawDy;
  return Math.hypot(dx, dy) - (attacker.radius || 0) - (target.radius || 0);
}

export function getAttackRangeAgainst(attacker, target) {
  const firingRowBonus = isBaseTarget(target)
    ? Math.max(0, attacker.formationRow || 0) * FORMATION_ROW_DEPTH
    : 0;
  return attacker.range + firingRowBonus;
}

export function getWaveFormationSlot(baseX, baseY, index, team) {
  const lane = index % FORMATION_LANE_COUNT;
  const row = Math.floor(index / FORMATION_LANE_COUNT);
  const direction = team === 'player' ? 1 : -1;
  return {
    x: baseX - direction * row * FORMATION_ROW_DEPTH,
    y: baseY + FORMATION_CENTER_Y_OFFSET
      + (lane - (FORMATION_LANE_COUNT - 1) / 2) * FORMATION_LANE_SPACING,
    row
  };
}
