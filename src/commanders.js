export const COMMANDERS = Object.freeze({
  inquisitor: Object.freeze({
    id: 'inquisitor',
    name: '대심문관 세라핀',
    role: '처형 지휘',
    icon: 'target',
    summary: '후열과 보스를 지정해 빠르게 처형합니다.',
    short: '사격 피해 +12% · 명령 집중 피해 +10%',
    effects: Object.freeze([
      Object.freeze({ kind: 'unitDamage', types: Object.freeze(['ranged', 'sniper']), multiplier: 1.12 }),
      Object.freeze({ kind: 'tacticalFocusDamage', multiplier: 1.1 })
    ])
  }),
  archbishop: Object.freeze({
    id: 'archbishop',
    name: '대주교 마티아스',
    role: '구원 지휘',
    icon: 'cross',
    summary: '헌금과 치유로 전열을 오래 유지합니다.',
    short: '귀환 헌금 +10 · 치유 +18%',
    effects: Object.freeze([
      Object.freeze({ kind: 'startingIncome', amount: 10 }),
      Object.freeze({ kind: 'healing', multiplier: 1.18 })
    ])
  }),
  marshal: Object.freeze({
    id: 'marshal',
    name: '성전원수 가브리엘',
    role: '공성 지휘',
    icon: 'shield',
    summary: '튼튼한 전열로 돌파해 지옥문을 압박합니다.',
    short: '전열 체력 +12% · 공성 피해 +12%',
    effects: Object.freeze([
      Object.freeze({ kind: 'unitHp', types: Object.freeze(['melee', 'crusader']), multiplier: 1.12 }),
      Object.freeze({ kind: 'baseDamage', multiplier: 1.12 })
    ])
  })
});

export function getCommander(id) {
  return COMMANDERS[id] ?? COMMANDERS.inquisitor;
}

export function applyCommanderToBonuses(bonuses, commander) {
  const selected = getCommander(commander?.id ?? commander);
  const next = {
    ...bonuses,
    hpByType: { ...bonuses.hpByType },
    damageByType: { ...bonuses.damageByType }
  };
  let incomeBonus = 0;

  selected.effects.forEach(effect => {
    if (effect.kind === 'unitHp') {
      effect.types.forEach(type => { next.hpByType[type] *= effect.multiplier; });
    } else if (effect.kind === 'unitDamage') {
      effect.types.forEach(type => { next.damageByType[type] *= effect.multiplier; });
    } else if (effect.kind === 'healing') {
      next.healingMultiplier *= effect.multiplier;
    } else if (effect.kind === 'baseDamage') {
      next.baseDamageMultiplier *= effect.multiplier;
    } else if (effect.kind === 'tacticalFocusDamage') {
      next.tacticalFocusDamageMultiplier *= effect.multiplier;
    } else if (effect.kind === 'startingIncome') {
      incomeBonus += effect.amount;
    }
  });

  return { bonuses: next, incomeBonus, commander: selected };
}
