const BOUNTIES = Object.freeze({
  cinderVanguard: Object.freeze({ hostId: 'cinderVanguard', mandateId: 'vanguardPledge', name: '불씨 추격령', description: '선봉의 서약을 달성해 도주로를 봉쇄하십시오.', scoreBonus: 10 }),
  graveCoven: Object.freeze({ hostId: 'graveCoven', mandateId: 'flawlessRite', name: '침묵의 장례식', description: '무결의 의식으로 성가대의 의식을 한 번도 허용하지 마십시오.', scoreBonus: 12 }),
  ironLegion: Object.freeze({ hostId: 'ironLegion', mandateId: 'bastionPledge', name: '흑철 방어선', description: '성벽의 서약으로 흑철 공세를 버텨내십시오.', scoreBonus: 10 })
});

export function getInfernalBounty(host) {
  return BOUNTIES[host?.id] ?? null;
}

export function evaluateInfernalBounty(host, mandateResult) {
  const bounty = getInfernalBounty(host);
  const fulfilled = Boolean(bounty && mandateResult?.fulfilled && mandateResult.mandate?.id === bounty.mandateId);
  return {
    bounty,
    fulfilled,
    scoreBonus: fulfilled ? bounty.scoreBonus : 0,
    status: fulfilled ? `특명 달성 · +${bounty.scoreBonus}점` : bounty ? `특명: ${bounty.name}` : '특명 없음'
  };
}
