export const TACTICAL_ORDERS = Object.freeze([
  Object.freeze({
    id: 'balanced',
    key: '7',
    label: '균형 전투',
    shortLabel: '균형',
    hint: '거리와 병종 상성을 함께 판단합니다.'
  }),
  Object.freeze({
    id: 'rear',
    key: '8',
    label: '후열 처단',
    shortLabel: '후열',
    hint: '원거리 성직자가 사격·치유 악마를 우선합니다.'
  }),
  Object.freeze({
    id: 'boss',
    key: '9',
    label: '대악마 집중',
    shortLabel: '대형',
    hint: '모든 공격 병종이 보스와 대형 악마를 우선합니다.'
  })
]);

const TACTICAL_ORDER_MAP = new Map(TACTICAL_ORDERS.map(order => [order.id, order]));
const REAR_TARGET_TYPES = new Set(['ranged', 'medic', 'sniper']);
const HEAVY_TARGET_TYPES = new Set(['tank', 'crusader']);

export function getTacticalOrderDefinition(orderId) {
  return TACTICAL_ORDER_MAP.get(orderId) ?? TACTICAL_ORDER_MAP.get('balanced');
}

export function getTacticalOrderTargetBonus(orderId, attacker, target) {
  if (!attacker || !target || attacker.team !== 'player') return 0;
  if (target.techLevel !== undefined) return 0;

  if (orderId === 'rear') {
    const canReachRearLine = (attacker.range ?? 0) >= 150;
    return canReachRearLine && REAR_TARGET_TYPES.has(target.type) ? 170 : 0;
  }

  if (orderId === 'boss') {
    if (target.isBoss) return 260;
    return HEAVY_TARGET_TYPES.has(target.type) ? 150 : 0;
  }

  return 0;
}
