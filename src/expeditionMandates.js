export const EXPEDITION_MANDATES = Object.freeze({
  bastionPledge: Object.freeze({
    id: 'bastionPledge',
    name: '성벽의 서약',
    description: '성당 보전율 80% 이상으로 원정을 완수하십시오.',
    scoreBonus: 18
  }),
  vanguardPledge: Object.freeze({
    id: 'vanguardPledge',
    name: '선봉의 서약',
    description: '조기 진군을 2회 이상 선언하고 원정을 완수하십시오.',
    scoreBonus: 22
  }),
  flawlessRite: Object.freeze({
    id: 'flawlessRite',
    name: '무결의 의식',
    description: '보스 패턴을 한 번도 허용하지 않고 원정을 완수하십시오.',
    scoreBonus: 22
  })
});

export function getExpeditionMandate(id) {
  return EXPEDITION_MANDATES[id] ?? EXPEDITION_MANDATES.bastionPledge;
}

export function evaluateExpeditionMandate(mandate, { winner, playerIntegrity, earlyStarts, bossPatternPerformance } = {}) {
  const selected = getExpeditionMandate(mandate?.id ?? mandate);
  const didWin = winner === 'player';
  const integrity = Math.max(0, Math.min(100, Number(playerIntegrity) || 0));
  const early = Math.max(0, Number(earlyStarts) || 0);
  const started = Math.max(0, Number(bossPatternPerformance?.started) || 0);
  const failed = Math.max(0, Number(bossPatternPerformance?.failed) || 0);
  const fulfilled = didWin && (
    selected.id === 'bastionPledge' ? integrity >= 80
      : selected.id === 'vanguardPledge' ? early >= 2
        : started > 0 && failed === 0
  );
  return {
    mandate: selected,
    fulfilled,
    scoreBonus: fulfilled ? selected.scoreBonus : 0,
    status: fulfilled ? `서약 달성 · +${selected.scoreBonus}점` : `서약 미달 · ${selected.name}`
  };
}

export function getExpeditionMandateLiveStatus(mandate, {
  playerIntegrity,
  earlyStarts,
  bossPatternPerformance
} = {}) {
  const selected = getExpeditionMandate(mandate?.id ?? mandate);
  const integrity = Math.max(0, Math.min(100, Math.round(Number(playerIntegrity) || 0)));
  const early = Math.max(0, Number(earlyStarts) || 0);
  const started = Math.max(0, Number(bossPatternPerformance?.started) || 0);
  const interrupted = Math.max(0, Number(bossPatternPerformance?.interrupted) || 0);
  const failed = Math.max(0, Number(bossPatternPerformance?.failed) || 0);

  if (selected.id === 'bastionPledge') {
    return {
      tone: integrity >= 80 ? 'on-track' : 'at-risk',
      text: `성당 보전 ${integrity}% / 목표 80%`
    };
  }
  if (selected.id === 'vanguardPledge') {
    return {
      tone: early >= 2 ? 'complete' : 'on-track',
      text: `즉시 진군 ${Math.min(early, 2)}/2회`
    };
  }
  return {
    tone: failed > 0 ? 'failed' : started > 0 ? 'on-track' : 'waiting',
    text: failed > 0
      ? `보스 패턴 허용 ${failed}회 · 이번 서약은 미달`
      : started > 0
        ? `보스 패턴 저지 ${interrupted}/${started} · 무실패 유지`
        : '첫 보스 패턴 대기 · 무실패 유지'
  };
}
