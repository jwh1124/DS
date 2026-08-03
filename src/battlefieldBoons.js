const BOONS = Object.freeze({
  reliquaryCache: Object.freeze({
    id: 'reliquaryCache',
    wave: 4,
    icon: 'coins',
    role: '즉시 보급',
    title: '성유물 금고',
    description: '즉시 신앙심 220을 획득합니다.',
    effect: Object.freeze({ kind: 'minerals', amount: 220 })
  }),
  pilgrimTithe: Object.freeze({
    id: 'pilgrimTithe',
    wave: 4,
    icon: 'candle',
    role: '장기 보급',
    title: '순례자 헌금',
    description: '이후 웨이브마다 신앙심을 14 더 획득합니다.',
    effect: Object.freeze({ kind: 'income', amount: 14 })
  }),
  consecratedMasonry: Object.freeze({
    id: 'consecratedMasonry',
    wave: 4,
    icon: 'cathedral',
    role: '성당 보수',
    title: '축성 석재',
    description: '성당 최대 체력과 현재 체력이 700 증가합니다.',
    effect: Object.freeze({ kind: 'baseFortify', amount: 700 })
  }),
  fieldChaplains: Object.freeze({
    id: 'fieldChaplains',
    wave: 8,
    icon: 'heart',
    role: '전열 회복',
    title: '야전 성직자',
    description: '현재 성직자 부대가 최대 체력의 35%만큼 회복됩니다.',
    effect: Object.freeze({ kind: 'unitHeal', amount: 0.35 })
  }),
  blessedArmory: Object.freeze({
    id: 'blessedArmory',
    wave: 8,
    icon: 'shield',
    role: '결전 무장',
    title: '축복받은 무기고',
    description: '현재 성직자 부대의 공격력이 10% 증가합니다.',
    effect: Object.freeze({ kind: 'unitDamage', multiplier: 1.1 })
  }),
  emergencyVow: Object.freeze({
    id: 'emergencyVow',
    wave: 8,
    icon: 'cross',
    role: '최후의 맹세',
    title: '비상 서약',
    description: '즉시 신앙심 150을 얻고 성당을 450 회복합니다.',
    effect: Object.freeze({ kind: 'mixed', minerals: 150, baseFortify: 450 })
  })
});

const BOON_CHOICES = Object.freeze({
  4: Object.freeze(['reliquaryCache', 'pilgrimTithe', 'consecratedMasonry']),
  8: Object.freeze(['fieldChaplains', 'blessedArmory', 'emergencyVow'])
});

export function getBoonById(id) {
  return BOONS[id] ?? null;
}

export function getBoonChoices(wave) {
  return (BOON_CHOICES[wave] ?? []).map(id => BOONS[id]);
}
