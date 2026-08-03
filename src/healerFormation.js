export const MEDIC_TRAILING_DISTANCE = 210;

export function isMedicFormationGuard(unit) {
  return Boolean(unit)
    && unit.isAlive !== false
    && unit.isTargetable !== false
    && unit.type !== undefined
    && unit.type !== 'medic'
    && !unit.isRitualAnchor;
}

export function getMedicSupportPoint(healer, allies, healTarget = null) {
  const guards = (allies ?? []).filter(isMedicFormationGuard);
  if (!healer || guards.length === 0) return null;

  const direction = healer.team === 'player' ? 1 : -1;
  const frontlineX = direction > 0
    ? Math.max(...guards.map(unit => unit.x))
    : Math.min(...guards.map(unit => unit.x));
  const formationLimitX = frontlineX - direction * MEDIC_TRAILING_DISTANCE;
  const reference = healTarget && isMedicFormationGuard(healTarget)
    ? healTarget
    : guards.reduce((best, unit) => (
        Math.abs(unit.x - frontlineX) < Math.abs(best.x - frontlineX) ? unit : best
      ), guards[0]);
  const desiredHealX = reference.x - direction * MEDIC_TRAILING_DISTANCE;
  const x = direction > 0
    ? Math.min(desiredHealX, formationLimitX)
    : Math.max(desiredHealX, formationLimitX);

  return { x, y: reference.y };
}
