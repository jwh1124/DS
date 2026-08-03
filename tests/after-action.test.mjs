import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAfterActionReport } from '../src/afterAction.js';

const fullRoster = {
  melee: 4,
  ranged: 3,
  medic: 2,
  sniper: 3,
  tank: 2,
  crusader: 2
};

test('early defeat with no frontline gives an actionable formation recommendation', () => {
  const report = buildAfterActionReport({
    winner: 'enemy',
    endReason: 'baseDestroyed',
    wave: 3,
    maxWaves: 12,
    playerIntegrity: 0,
    enemyIntegrity: 88,
    roster: { ranged: 2 },
    techLevel: 1
  });

  assert.match(report.summary, /3\/12웨이브에서 성당이 무너졌/);
  assert.equal(report.recommendation.title, '초반 전열이 너무 얇았습니다');
  assert.match(report.recommendation.text, /수도승을 최소 3명/);
});

test('boss defeat recognizes missing support roles', () => {
  const report = buildAfterActionReport({
    winner: 'enemy',
    endReason: 'baseDestroyed',
    wave: 6,
    maxWaves: 12,
    playerIntegrity: 0,
    enemyIntegrity: 72,
    roster: { melee: 5, ranged: 4, medic: 0, sniper: 0 },
    techLevel: 2,
    ultimates: 1
  });

  assert.equal(report.recommendation.title, '대악마 대응 병종이 부족했습니다');
  assert.match(report.recommendation.text, /사제.*심판관/);
});

test('a late defeat with a failed boss pattern teaches the exact response sequence', () => {
  const report = buildAfterActionReport({
    winner: 'enemy',
    endReason: 'baseDestroyed',
    wave: 12,
    maxWaves: 12,
    playerIntegrity: 0,
    enemyIntegrity: 12,
    roster: fullRoster,
    techLevel: 3,
    ultimates: 1,
    bossPatternPerformance: { started: 2, interrupted: 1, failed: 1 }
  });

  assert.equal(report.recommendation.title, '보스 패턴 1회를 허용했습니다');
  assert.match(report.recommendation.text, /\[8\].*\[9\].*천벌/);
});

test('victory report includes grade, composition, and doctrine record', () => {
  const report = buildAfterActionReport({
    winner: 'player',
    endReason: 'baseDestroyed',
    wave: 12,
    maxWaves: 12,
    playerIntegrity: 58,
    enemyIntegrity: 0,
    roster: fullRoster,
    techLevel: 3,
    contractsSigned: 18,
    earlyStarts: 2,
    incomeRites: 4,
    ultimates: 2,
    bossPatternPerformance: { started: 4, interrupted: 3, failed: 1 },
    bossPatternSummary: '패턴 저지 3/4 · 실패 1회',
    tacticalPerformanceSummary: '전환 3회 · 후열 집중 8회/420 피해 · 대악마 집중 5회/610 피해',
    doctrineNames: ['은탄 의식', '순교자의 맹세']
  });

  assert.equal(report.kicker, '원정 완료 · AFTER ACTION');
  assert.ok(report.grade);
  assert.match(report.summary, /최종 편성: 수도승 4 · 엑소시스트 3/);
  assert.match(report.summary, /전술 균형 전투/);
  assert.match(report.summary, /명령 성과: 전환 3회 · 후열 집중 8회\/420 피해/);
  assert.match(report.summary, /보스 대응: 패턴 저지 3\/4 · 실패 1회/);
  assert.match(report.summary, /선택 교리: 은탄 의식 · 순교자의 맹세/);
  assert.equal(report.metrics.find(metric => metric.label === '최종 편성').value, '16명');
  assert.equal(report.metrics.find(metric => metric.label === '패턴 저지').value, '3/4');
  assert.equal(report.recommendation.title, '보스 패턴 1회를 허용했습니다');
});

test('after action preserves the battlefield response that shaped the midgame', () => {
  const report = buildAfterActionReport({
    winner: 'player',
    wave: 12,
    maxWaves: 12,
    playerIntegrity: 76,
    enemyIntegrity: 0,
    roster: fullRoster,
    infernalHostName: '묘지의 성가대',
    infernalBounty: { hostId: 'graveCoven' },
    expeditionMandate: { id: 'flawlessRite' },
    bossPatternPerformance: { started: 2, interrupted: 2, failed: 0 },
    infernalBossAdvice: '의식 시종과 리치 호위를 후열 명령으로 함께 끊으십시오.',
    battlefieldEventName: '장례 기도'
  });

  assert.match(report.summary, /적 군단: 묘지의 성가대/);
  assert.match(report.summary, /전장 대응: 장례 기도/);
  assert.match(report.summary, /보스 대응: 의식 시종/);
  assert.match(report.summary, /군단 특명: 침묵의 장례식 달성/);
});

test('a clean boss run points toward score optimization instead of generic survival advice', () => {
  const report = buildAfterActionReport({
    winner: 'player',
    wave: 12,
    maxWaves: 12,
    playerIntegrity: 76,
    enemyIntegrity: 0,
    roster: fullRoster,
    techLevel: 3,
    bossPatternPerformance: { started: 4, interrupted: 4, failed: 0 },
    bossPatternSummary: '패턴 저지 4/4 · 실패 0회'
  });

  assert.equal(report.recommendation.title, '모든 보스 패턴을 저지했습니다');
  assert.match(report.recommendation.text, /S등급/);
});

test('a final squad wipe is reported without pretending the cathedral collapsed', () => {
  const report = buildAfterActionReport({
    winner: 'enemy',
    endReason: 'finalSquadDefeated',
    wave: 12,
    maxWaves: 12,
    playerIntegrity: 72,
    enemyIntegrity: 38,
    roster: { melee: 4, ranged: 4, medic: 2, sniper: 2 }
  });

  assert.match(report.summary, /최종 성직자 분대가 전멸/);
  assert.doesNotMatch(report.summary, /성당이 무너졌습니다/);
});
