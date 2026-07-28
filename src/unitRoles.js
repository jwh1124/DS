const NEUTRAL_COUNTER = Object.freeze({
  multiplier: 1,
  label: ''
});

const COUNTER_PROFILES = Object.freeze({
  backline: Object.freeze({ multiplier: 1.15, label: '후열 압박' }),
  antiAir: Object.freeze({ multiplier: 1.25, label: '대공 약점' }),
  antiHeavy: Object.freeze({ multiplier: 1.35, label: '대형 약점' })
});

export const PLAYER_UNIT_ROLE_INFO = Object.freeze({
  melee: Object.freeze({
    tag: '전열',
    description: '높은 체력의 저가 전열. 후열 직업에 접근하면 15% 추가 피해.'
  }),
  ranged: Object.freeze({
    tag: '대공 +25%',
    description: '안정적인 원거리 사격. 공중 악마에게 25% 추가 피해.'
  }),
  medic: Object.freeze({
    tag: '치유',
    description: '가장 많이 다친 아군을 우선해 30 HP씩 회복.'
  }),
  sniper: Object.freeze({
    tag: '대형 +35%',
    description: '초장거리 처형 사격. 대형 적과 보스에게 35% 추가 피해.'
  }),
  tank: Object.freeze({
    tag: '광역',
    description: '높은 생명력과 광역탄으로 밀집한 적을 정리.'
  }),
  crusader: Object.freeze({
    tag: '강화 오라',
    description: '근접 수호병. 주변 아군의 이동과 공격 능력을 강화.'
  })
});

function isBase(target) {
  return Boolean(target && target.techLevel !== undefined && target.maxHp);
}

function isHeavy(target) {
  return Boolean(target && (target.isBoss || target.type === 'tank' || target.type === 'crusader'));
}

function isBackline(target) {
  return Boolean(target && ['ranged', 'medic', 'sniper'].includes(target.type));
}

export function getCounterProfile(attacker, target) {
  if (!attacker || !target || isBase(target)) return NEUTRAL_COUNTER;

  if (attacker.type === 'ranged' && target.isAirUnit) {
    return COUNTER_PROFILES.antiAir;
  }
  if (attacker.type === 'sniper' && isHeavy(target)) {
    return COUNTER_PROFILES.antiHeavy;
  }
  if (attacker.type === 'melee' && isBackline(target)) {
    return COUNTER_PROFILES.backline;
  }
  return NEUTRAL_COUNTER;
}

export function getTargetPriorityBonus(attacker, target) {
  const profile = getCounterProfile(attacker, target);
  if (profile.multiplier === COUNTER_PROFILES.antiHeavy.multiplier) return 120;
  if (profile.multiplier === COUNTER_PROFILES.antiAir.multiplier) return 80;
  if (profile.multiplier === COUNTER_PROFILES.backline.multiplier) return 45;
  return 0;
}
