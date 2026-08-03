const WAVE_MUTATORS = Object.freeze({
  2: Object.freeze({ id: 'bloodRush', name: '혈군의 돌격', types: Object.freeze(['melee']), speedMultiplier: 1.24, summary: '임프 이동 +24%', advice: '수도승 전열' }),
  4: Object.freeze({ id: 'cinderVolley', name: '재의 사격대', types: Object.freeze(['ranged']), damageMultiplier: 1.18, summary: '서큐버스 피해 +18%', advice: '엑소시스트 보강' }),
  5: Object.freeze({ id: 'ironProcession', name: '철갑 행렬', types: Object.freeze(['tank', 'crusader']), hpMultiplier: 1.22, summary: '중장 악마 체력 +22%', advice: '심판관 집중' }),
  7: Object.freeze({ id: 'nightScream', name: '밤의 비명', types: Object.freeze(['sniper']), damageMultiplier: 1.2, summary: '밴시 피해 +20%', advice: '후열 처단 [8]' }),
  8: Object.freeze({ id: 'hellwind', name: '지옥풍', types: Object.freeze(['ranged', 'sniper']), speedMultiplier: 1.16, summary: '원거리 악마 이동 +16%', advice: '엑소시스트·수도승' }),
  10: Object.freeze({ id: 'abyssalLegion', name: '심연 군단', types: Object.freeze(['melee', 'ranged', 'tank', 'crusader']), hpMultiplier: 1.1, summary: '주력 악마 체력 +10%', advice: '대천사 또는 십자군' }),
  11: Object.freeze({ id: 'lastMarch', name: '최후의 행진', types: Object.freeze(['melee', 'ranged']), damageMultiplier: 1.12, speedMultiplier: 1.1, summary: '선봉 피해 +12% · 이동 +10%', advice: '결전 편성 완성' })
});

export function getWaveMutator(wave) {
  return WAVE_MUTATORS[Math.floor(Number(wave) || 0)] ?? null;
}

export function getWaveMutatorPreview(wave) {
  const mutator = getWaveMutator(wave);
  return mutator ? `${mutator.name} · ${mutator.summary}` : '';
}

export function applyWaveMutator(unit, mutator) {
  if (!unit || !mutator || !mutator.types.includes(unit.type)) return false;
  unit.maxHp = Math.round(unit.maxHp * (Number(mutator.hpMultiplier) || 1));
  unit.hp = unit.maxHp;
  unit.damage = Math.round(unit.damage * (Number(mutator.damageMultiplier) || 1));
  unit.speed *= Number(mutator.speedMultiplier) || 1;
  unit.waveMutatorId = mutator.id;
  return true;
}
