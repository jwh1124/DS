const EVENT_CHOICES = Object.freeze({
  cinderVanguard: Object.freeze([
    Object.freeze({ id: 'cinder-scouts', icon: 'coins', role: '정찰대 매수', title: '재의 길목 확보', description: '임프 정찰대를 매수해 즉시 신앙석 180을 확보합니다.', effect: Object.freeze({ kind: 'minerals', amount: 180 }) }),
    Object.freeze({ id: 'cinder-wards', icon: 'cathedral', role: '성벽 봉인', title: '잿불 방진', description: '성당에 420의 보호를 더해 초반 돌파를 막습니다.', effect: Object.freeze({ kind: 'baseFortify', amount: 420 }) })
  ]),
  graveCoven: Object.freeze([
    Object.freeze({ id: 'grave-chaplains', icon: 'heart', role: '부상자 회수', title: '장례 기도', description: '현재 성직자 부대를 최대 체력의 28%만큼 회복합니다.', effect: Object.freeze({ kind: 'unitHeal', amount: 0.28 }) }),
    Object.freeze({ id: 'grave-wards', icon: 'cathedral', role: '후열 결계', title: '성가 차단막', description: '성당에 360의 보호를 더해 밴시의 후열 압박을 버팁니다.', effect: Object.freeze({ kind: 'baseFortify', amount: 360 }) })
  ]),
  ironLegion: Object.freeze([
    Object.freeze({ id: 'iron-armory', icon: 'shield', role: '방진 보강', title: '흑철 파쇄구', description: '현재 성직자 부대의 피해를 6% 올려 중장갑을 뚫습니다.', effect: Object.freeze({ kind: 'unitDamage', multiplier: 1.06 }) }),
    Object.freeze({ id: 'iron-tithe', icon: 'coins', role: '보급 탈취', title: '끊어진 보급선', description: '흑철 군단의 보급을 가로채 신앙석 150을 얻습니다.', effect: Object.freeze({ kind: 'minerals', amount: 150 }) })
  ])
});

export function getBattlefieldEventChoices(host, wave) {
  if (wave !== 5 || !host) return [];
  return EVENT_CHOICES[host.id] ?? [];
}
