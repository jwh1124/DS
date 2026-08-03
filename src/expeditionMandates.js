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
