const INFERNAL_HOSTS = Object.freeze([
  Object.freeze({
    id: 'cinderVanguard',
    name: '재의 선봉대',
    summary: '초반 임프·서큐버스 비중이 높습니다.',
    advice: '수도승 전열과 엑소시스트 사격선을 먼저 갖추십시오.'
  }),
  Object.freeze({
    id: 'graveCoven',
    name: '묘지의 성가대',
    summary: '리치 치유와 밴시 후열이 빠르게 합류합니다.',
    advice: '사제를 보호하고 [8] 후열 처단을 준비하십시오.'
  }),
  Object.freeze({
    id: 'ironLegion',
    name: '흑철 군단',
    summary: '후반 발록·핏로드 비중이 높습니다.',
    advice: '심판관을 확보하고 대형 집중 [9]을 준비하십시오.'
  })
]);

export function getInfernalHost(seed = Math.random()) {
  const normalized = Math.max(0, Math.min(0.999999, Number(seed) || 0));
  return INFERNAL_HOSTS[Math.floor(normalized * INFERNAL_HOSTS.length)];
}

export function getInfernalHostBriefing(host) {
  if (!host) return { title: '군단 편성 미확인', detail: '균형 편성으로 첫 정찰을 대비하십시오.' };
  return { title: `${host.name} · ${host.summary}`, detail: host.advice };
}
