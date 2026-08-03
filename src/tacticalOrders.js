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
    hint: '원거리 성직자가 서큐버스·밴시를 우선합니다. 리치는 마지막에 공격합니다.'
  }),
  Object.freeze({
    id: 'boss',
    key: '9',
    label: '대악마 집중',
    shortLabel: '대형',
    hint: '원거리 성직자는 보스에 집중하고 전열은 호위대를 막습니다.'
  })
]);

const TACTICAL_ORDER_MAP = new Map(TACTICAL_ORDERS.map(order => [order.id, order]));
const REAR_TARGET_TYPES = new Set(['ranged', 'sniper']);
const HEAVY_TARGET_TYPES = new Set(['tank', 'crusader']);

export function getTacticalOrderDefinition(orderId) {
  return TACTICAL_ORDER_MAP.get(orderId) ?? TACTICAL_ORDER_MAP.get('balanced');
}

export function getTacticalOrderTargetBonus(orderId, attacker, target) {
  if (!attacker || !target || attacker.team !== 'player') return 0;
  if (target.techLevel !== undefined) return 0;

  if (orderId === 'rear') {
    const canReachRearLine = (attacker.range ?? 0) >= 150;
    if (!canReachRearLine) return 0;
    // A sovereign rite is a real response window, not merely a HUD hint.
    // Ranged holy units must abandon nearby escorts long enough to break its anchors.
    if (target.isRitualAnchor) return 620;
    return REAR_TARGET_TYPES.has(target.type) ? 170 : 0;
  }

  if (orderId === 'boss') {
    const canFocusHeavy = (attacker.range ?? 0) >= 150;
    if (!canFocusHeavy) return 0;
    if (target.isBoss) return 260;
    return HEAVY_TARGET_TYPES.has(target.type) ? 150 : 0;
  }

  return 0;
}

export function getTacticalOrderHitLabel(orderId, attacker, target) {
  if (getTacticalOrderTargetBonus(orderId, attacker, target) <= 0) return '';
  if (orderId === 'rear') return target?.isRitualAnchor ? '의식 시종 집중' : '후열 집중';
  return orderId === 'boss' ? '대악마 집중' : '';
}
