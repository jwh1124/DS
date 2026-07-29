const PLAYER_TEAM = 'player';
const ENEMY_TEAM = 'enemy';

function isActiveCombatUnit(entity) {
  return entity
    && entity.isAlive !== false
    && typeof entity.x === 'number'
    && typeof entity.type === 'string'
    && typeof entity.attackSpeed === 'number'
    && (entity.team === PLAYER_TEAM || entity.team === ENEMY_TEAM);
}

export function getFrontlineFocusX(entities, {
  engagementDistance = 900,
  playerLookAhead = 180,
  singleArmyLookAhead = 120
} = {}) {
  const units = (entities ?? []).filter(isActiveCombatUnit);
  const playerUnits = units.filter(unit => unit.team === PLAYER_TEAM);
  const enemyUnits = units.filter(unit => unit.team === ENEMY_TEAM);

  if (playerUnits.length > 0 && enemyUnits.length > 0) {
    const playerFront = Math.max(...playerUnits.map(unit => unit.x));
    const enemyFront = Math.min(...enemyUnits.map(unit => unit.x));
    if (enemyFront - playerFront > engagementDistance) {
      return playerFront + playerLookAhead;
    }
    return (playerFront + enemyFront) / 2;
  }

  if (playerUnits.length > 0) {
    return Math.max(...playerUnits.map(unit => unit.x)) + singleArmyLookAhead;
  }

  if (enemyUnits.length > 0) {
    return Math.min(...enemyUnits.map(unit => unit.x)) - singleArmyLookAhead;
  }

  return null;
}

export function getCameraTargetX({
  currentX,
  focusX,
  viewportWidth,
  worldWidth,
  deadzone = 90
}) {
  const maxX = Math.max(0, worldWidth - viewportWidth);
  if (!Number.isFinite(focusX)) return Math.max(0, Math.min(maxX, currentX));

  const screenX = focusX - currentX;
  const center = viewportWidth * 0.5;
  if (Math.abs(screenX - center) <= deadzone) {
    return Math.max(0, Math.min(maxX, currentX));
  }

  return Math.max(0, Math.min(maxX, focusX - center));
}

export function smoothCameraX(currentX, targetX, dt, followRate = 4.2) {
  if (dt <= 0 || currentX === targetX) return currentX;
  const blend = 1 - Math.exp(-followRate * dt);
  return currentX + (targetX - currentX) * blend;
}
