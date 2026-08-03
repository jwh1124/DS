const ROSTER_LABELS = Object.freeze({
  melee: '수도승',
  ranged: '엑소시스트',
  medic: '사제',
  sniper: '심판관',
  tank: '대천사',
  crusader: '십자군'
});

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getRosterTotal(roster) {
  return Object.values(roster).reduce((total, count) => total + (Number(count) || 0), 0);
}

function getRosterSummary(roster) {
  const fielded = Object.entries(ROSTER_LABELS)
    .filter(([type]) => (roster[type] ?? 0) > 0)
    .map(([type, label]) => `${label} ${roster[type]}`);
  return fielded.length ? fielded.join(' · ') : '편성 없음';
}

function getRecommendation({
  winner,
  wave,
  playerIntegrity,
  roster,
  techLevel,
  ultimates,
  bossPatternPerformance
}) {
  const frontLine = (roster.melee ?? 0) + (roster.crusader ?? 0);
  const bossSupport = (roster.medic ?? 0) + (roster.sniper ?? 0);
  const patternStarts = Math.max(0, Number(bossPatternPerformance?.started) || 0);
  const patternInterrupts = Math.max(0, Number(bossPatternPerformance?.interrupted) || 0);
  const patternFailures = Math.max(0, Number(bossPatternPerformance?.failed) || 0);

  if (winner === 'player') {
    if (patternFailures > 0) {
      return {
        title: `보스 패턴 ${patternFailures}회를 허용했습니다`,
        text: '처형 선고는 [9] 대형, 왕좌 의식은 [8] 후열로 끊은 뒤 무력화 순간 [9] 대형으로 전환하세요.'
      };
    }
    if (playerIntegrity < 35) {
      return {
        title: '승리는 했지만 전열이 얇았습니다',
        text: '다음 원정에서는 수도승·십자군 또는 사제를 늘려 성당 보전율을 높여보세요.'
      };
    }
    if (patternStarts > 0 && patternInterrupts === patternStarts) {
      return {
        title: '모든 보스 패턴을 저지했습니다',
        text: '같은 전술 전환을 유지하면서 조기 진군과 성당 보전율을 높이면 S등급에 도전할 수 있습니다.'
      };
    }
    return {
      title: '공세와 생존의 균형이 좋았습니다',
      text: '현재 편성의 핵심 병종과 교리를 유지하면서 더 높은 난이도에 도전할 수 있습니다.'
    };
  }

  if (wave <= 4 && frontLine < 3) {
    return {
      title: '초반 전열이 너무 얇았습니다',
      text: '첫 편성에 수도승을 최소 3명 배치한 뒤 엑소시스트를 추가하면 성당으로 새는 적을 줄일 수 있습니다.'
    };
  }
  if ((wave === 6 || wave === 12) && bossSupport < 2) {
    return {
      title: '대악마 대응 병종이 부족했습니다',
      text: '[9] 대악마 집중 명령을 켜고, 사제로 전열을 유지하면서 심판관의 대형·보스 추가 피해를 집중하세요.'
    };
  }
  if (patternFailures > 0) {
    return {
      title: `보스 패턴 ${patternFailures}회를 허용했습니다`,
      text: '왕좌 의식은 [8] 후열 처단을 시종이 사라질 때까지 유지한 뒤 [9] 대악마 집중으로 전환하세요. 무력화 직후 천벌을 겹치면 결전 시간을 줄일 수 있습니다.'
    };
  }
  if (wave >= 5 && techLevel < 2) {
    return {
      title: '성서 계시가 늦었습니다',
      text: '웨이브 5 전까지 Lv.2 계시를 확보하면 사제·심판관과 강화 대포를 사용할 수 있습니다.'
    };
  }
  if (wave >= 6 && ultimates === 0) {
    return {
      title: '신성 기적을 아껴두었습니다',
      text: '적 후열이 겹치거나 보스 호위대가 모였을 때 천벌을 사용하면 성당 피해를 크게 줄일 수 있습니다.'
    };
  }
  return {
    title: '전열과 지원 병종의 비율을 조정하세요',
    text: '전열 3~5명을 유지하고, 적 정찰 정보에 맞춰 사격·치유·심판 역할을 나눠 편성해 보세요.'
  };
}

export function buildAfterActionReport({
  winner,
  wave,
  maxWaves,
  playerIntegrity,
  enemyIntegrity,
  roster = {},
  techLevel = 1,
  contractsSigned = 0,
  earlyStarts = 0,
  incomeRites = 0,
  ultimates = 0,
  doctrineNames = [],
  boonNames = [],
  tacticalOrderLabel = '균형 전투',
  tacticalPerformanceSummary = '명령 성과 없음',
  bossPatternPerformance = {},
  bossPatternSummary = '패턴 조우 없음'
}) {
  const safeWave = Math.max(1, Math.min(maxWaves, Math.round(wave)));
  const safePlayerIntegrity = clampPercent(playerIntegrity);
  const safeEnemyIntegrity = clampPercent(enemyIntegrity);
  const rosterTotal = getRosterTotal(roster);
  const isVictory = winner === 'player';
  const patternInterrupts = Math.max(0, Number(bossPatternPerformance?.interrupted) || 0);
  const patternFailures = Math.max(0, Number(bossPatternPerformance?.failed) || 0);
  const score = safePlayerIntegrity
    + earlyStarts * 2
    + Math.max(0, techLevel - 1) * 4
    + incomeRites * 2
    + patternInterrupts * 3
    - patternFailures * 3;
  const grade = score >= 112 ? 'S' : score >= 92 ? 'A' : score >= 72 ? 'B' : 'C';

  const outcome = isVictory
    ? `${safeWave}웨이브에서 지옥문을 직접 정화했습니다.`
    : `${safeWave}/${maxWaves}웨이브에서 성당이 무너졌습니다.`;

  const doctrineRecord = doctrineNames.length ? doctrineNames.join(' · ') : '없음';
  const boonRecord = boonNames.length ? boonNames.join(' · ') : '없음';
  const recommendation = getRecommendation({
    winner,
    wave: safeWave,
    playerIntegrity: safePlayerIntegrity,
    roster,
    techLevel,
    ultimates,
    bossPatternPerformance
  });

  return {
    kicker: isVictory ? '원정 완료 · AFTER ACTION' : '원정 실패 · AFTER ACTION',
    grade: isVictory ? grade : null,
    score,
    playerIntegrity: safePlayerIntegrity,
    metrics: [
      { label: '도달 웨이브', value: `${safeWave} / ${maxWaves}` },
      { label: '성당 보전', value: `${safePlayerIntegrity}%` },
      isVictory
        ? {
            label: '패턴 저지',
            value: `${patternInterrupts}/${Math.max(
              patternInterrupts + patternFailures,
              Number(bossPatternPerformance?.started) || 0
            )}`
          }
        : { label: '지옥문 잔존', value: `${safeEnemyIntegrity}%` },
      { label: '최종 편성', value: `${rosterTotal}명` }
    ],
    summary: [
      outcome,
      `전술 ${tacticalOrderLabel} · 계시 Lv.${techLevel} · 천벌 ${ultimates}회 · 조기 진군 ${earlyStarts}회 · 계약 ${contractsSigned}회`,
      `명령 성과: ${tacticalPerformanceSummary}`,
      `보스 대응: ${bossPatternSummary}`,
      `최종 편성: ${getRosterSummary(roster)}`,
      `선택 교리: ${doctrineRecord}`,
      `전장 보급: ${boonRecord}`
    ].join('\n'),
    recommendation
  };
}
