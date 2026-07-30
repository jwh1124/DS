const ORDER_IDS = Object.freeze(['balanced', 'rear', 'boss']);

function createOrderMap(initialValue = 0) {
  return Object.fromEntries(ORDER_IDS.map(id => [id, initialValue]));
}

export function createTacticalPerformance() {
  return {
    changes: 0,
    seconds: createOrderMap(),
    damage: createOrderMap(),
    focusedDamage: createOrderMap(),
    focusedHits: createOrderMap()
  };
}

export function recordTacticalOrderChange(performance) {
  if (!performance) return;
  performance.changes += 1;
}

export function recordTacticalOrderTime(performance, orderId, dt) {
  if (!performance || !ORDER_IDS.includes(orderId)) return;
  performance.seconds[orderId] += Math.max(0, Number(dt) || 0);
}

export function recordTacticalDamage(performance, {
  orderId,
  damage,
  focused = false
}) {
  if (!performance || !ORDER_IDS.includes(orderId)) return;
  const appliedDamage = Math.max(0, Number(damage) || 0);
  if (appliedDamage <= 0) return;
  performance.damage[orderId] += appliedDamage;
  if (focused && orderId !== 'balanced') {
    performance.focusedHits[orderId] += 1;
    performance.focusedDamage[orderId] += appliedDamage;
  }
}

export function getTacticalPerformanceLiveText(performance, orderId) {
  if (!performance || !ORDER_IDS.includes(orderId)) return '명령 성과 집계 대기';
  if (orderId === 'balanced') {
    return `균형 유지 ${Math.floor(performance.seconds.balanced)}초 · 전환 ${performance.changes}회`;
  }

  const label = orderId === 'rear' ? '후열 집중' : '대악마 집중';
  return `${label} ${performance.focusedHits[orderId]}회 · ${Math.round(performance.focusedDamage[orderId])} 피해`;
}

export function getTacticalPerformanceSummary(performance) {
  if (!performance) return '명령 성과 없음';
  return [
    `전환 ${performance.changes}회`,
    `후열 집중 ${performance.focusedHits.rear}회/${Math.round(performance.focusedDamage.rear)} 피해`,
    `대악마 집중 ${performance.focusedHits.boss}회/${Math.round(performance.focusedDamage.boss)} 피해`
  ].join(' · ');
}
