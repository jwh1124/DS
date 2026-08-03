const RUN_OMENS = Object.freeze([
  Object.freeze({
    id: 'bloodMoon', name: '핏빛 월식', icon: 'flame', types: Object.freeze(['melee']),
    speedMultiplier: 1.08, summary: '임프 이동 +8%', advice: '수도승 전열을 먼저 갖추십시오.'
  }),
  Object.freeze({
    id: 'ironCovenant', name: '철갑 서약', icon: 'shield', types: Object.freeze(['tank', 'crusader']),
    hpMultiplier: 1.1, summary: '발록·핏로드 체력 +10%', advice: '심판관과 대천사로 중장을 끊으십시오.'
  }),
  Object.freeze({
    id: 'nightChoir', name: '밤의 합창', icon: 'skull', types: Object.freeze(['ranged', 'sniper']),
    damageMultiplier: 1.08, summary: '서큐버스·밴시 피해 +8%', advice: '사제를 지키고 후열 처단을 준비하십시오.'
  })
]);

export function getRunOmen(seed = Math.random()) {
  const normalized = Math.max(0, Math.min(0.999999, Number(seed) || 0));
  return RUN_OMENS[Math.floor(normalized * RUN_OMENS.length)];
}

export function applyRunOmen(unit, omen) {
  if (!unit || !omen || !omen.types.includes(unit.type)) return false;
  unit.maxHp = Math.round(unit.maxHp * (Number(omen.hpMultiplier) || 1));
  unit.hp = unit.maxHp;
  unit.damage = Math.round(unit.damage * (Number(omen.damageMultiplier) || 1));
  unit.speed *= Number(omen.speedMultiplier) || 1;
  unit.runOmenId = omen.id;
  return true;
}
