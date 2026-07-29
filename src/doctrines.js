const DOCTRINES = Object.freeze({
  shieldWall: Object.freeze({
    id: 'shieldWall',
    wave: 3,
    icon: '🛡️',
    title: '수호 방벽',
    role: '전열 교리',
    description: '수도승과 십자군의 최대 체력이 25% 증가합니다.',
    effect: Object.freeze({ kind: 'unitHp', types: Object.freeze(['melee', 'crusader']), multiplier: 1.25 })
  }),
  silverRite: Object.freeze({
    id: 'silverRite',
    wave: 3,
    icon: '✦',
    title: '은탄 의식',
    role: '사격 교리',
    description: '엑소시스트와 심판관의 공격력이 18% 증가합니다.',
    effect: Object.freeze({ kind: 'unitDamage', types: Object.freeze(['ranged', 'sniper']), multiplier: 1.18 })
  }),
  faithfulTithe: Object.freeze({
    id: 'faithfulTithe',
    wave: 3,
    icon: '🕯️',
    title: '신실한 십일조',
    role: '경제 교리',
    description: '이후 웨이브마다 신앙심을 20 더 획득합니다.',
    effect: Object.freeze({ kind: 'income', amount: 20 })
  }),
  mercyHymn: Object.freeze({
    id: 'mercyHymn',
    wave: 6,
    icon: '♰',
    title: '자비의 성가',
    role: '회복 교리',
    description: '사제의 치유량이 40% 증가합니다.',
    effect: Object.freeze({ kind: 'healing', multiplier: 1.4 })
  }),
  heavenlyFire: Object.freeze({
    id: 'heavenlyFire',
    wave: 6,
    icon: '☄',
    title: '천상의 화염',
    role: '광역 교리',
    description: '대천사의 공격력이 22% 증가합니다.',
    effect: Object.freeze({ kind: 'unitDamage', types: Object.freeze(['tank']), multiplier: 1.22 })
  }),
  martyrVow: Object.freeze({
    id: 'martyrVow',
    wave: 6,
    icon: '⚜',
    title: '순교자의 맹세',
    role: '생존 교리',
    description: '모든 성직자 부대의 최대 체력이 12% 증가합니다.',
    effect: Object.freeze({ kind: 'unitHp', types: Object.freeze(['all']), multiplier: 1.12 })
  }),
  finalCrusade: Object.freeze({
    id: 'finalCrusade',
    wave: 9,
    icon: '⚔',
    title: '최후의 성전',
    role: '공세 교리',
    description: '모든 성직자 부대의 공격력이 12% 증가합니다.',
    effect: Object.freeze({ kind: 'unitDamage', types: Object.freeze(['all']), multiplier: 1.12 })
  }),
  grandExorcism: Object.freeze({
    id: 'grandExorcism',
    wave: 9,
    icon: '✝',
    title: '대정화 의식',
    role: '결전 교리',
    description: '성직자 부대가 지옥문에 주는 피해가 15% 증가합니다.',
    effect: Object.freeze({ kind: 'baseDamage', multiplier: 1.15 })
  }),
  sanctuary: Object.freeze({
    id: 'sanctuary',
    wave: 9,
    icon: '⛪',
    title: '성역 선포',
    role: '요새 교리',
    description: '성당 최대 체력과 현재 체력이 1,500 증가합니다.',
    effect: Object.freeze({ kind: 'baseFortify', amount: 1500 })
  })
});

const DOCTRINE_CHOICES = Object.freeze({
  3: Object.freeze(['shieldWall', 'silverRite', 'faithfulTithe']),
  6: Object.freeze(['mercyHymn', 'heavenlyFire', 'martyrVow']),
  9: Object.freeze(['finalCrusade', 'grandExorcism', 'sanctuary'])
});

const UNIT_TYPES = Object.freeze(['melee', 'ranged', 'medic', 'sniper', 'tank', 'crusader']);

function createTypeMultiplierMap() {
  return Object.fromEntries(UNIT_TYPES.map(type => [type, 1]));
}

export function createDoctrineBonuses() {
  return {
    selected: [],
    hpAll: 1,
    damageAll: 1,
    hpByType: createTypeMultiplierMap(),
    damageByType: createTypeMultiplierMap(),
    healingMultiplier: 1,
    baseDamageMultiplier: 1
  };
}

export function getDoctrineById(id) {
  return DOCTRINES[id] ?? null;
}

export function getDoctrineChoices(wave) {
  return (DOCTRINE_CHOICES[wave] ?? []).map(id => DOCTRINES[id]);
}

export function applyDoctrineToBonuses(bonuses, doctrineId) {
  const doctrine = getDoctrineById(doctrineId);
  if (!doctrine || bonuses.selected.includes(doctrineId)) return bonuses;

  const next = {
    ...bonuses,
    selected: [...bonuses.selected, doctrineId],
    hpByType: { ...bonuses.hpByType },
    damageByType: { ...bonuses.damageByType }
  };
  const effect = doctrine.effect;

  if (effect.kind === 'unitHp') {
    if (effect.types.includes('all')) {
      next.hpAll *= effect.multiplier;
    } else {
      effect.types.forEach(type => {
        next.hpByType[type] *= effect.multiplier;
      });
    }
  } else if (effect.kind === 'unitDamage') {
    if (effect.types.includes('all')) {
      next.damageAll *= effect.multiplier;
    } else {
      effect.types.forEach(type => {
        next.damageByType[type] *= effect.multiplier;
      });
    }
  } else if (effect.kind === 'healing') {
    next.healingMultiplier *= effect.multiplier;
  } else if (effect.kind === 'baseDamage') {
    next.baseDamageMultiplier *= effect.multiplier;
  }

  return next;
}

export function getDoctrineUnitMultipliers(bonuses, type) {
  return {
    hp: bonuses.hpAll * (bonuses.hpByType[type] ?? 1),
    damage: bonuses.damageAll * (bonuses.damageByType[type] ?? 1)
  };
}
