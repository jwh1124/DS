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

test('final judgement defeat reports a verdict instead of a destroyed cathedral', () => {
  const report = buildAfterActionReport({
    winner: 'enemy',
    endReason: 'finalJudgement',
    wave: 12,
    maxWaves: 12,
    playerIntegrity: 39,
    enemyIntegrity: 61,
    roster: fullRoster,
    techLevel: 3,
    ultimates: 1
  });

  assert.match(report.summary, /최후 심판에서 지옥문의 잔존 마력이 우세/);
  assert.doesNotMatch(report.summary, /성당이 무너졌/);
  assert.equal(report.recommendation.title, '최후 심판에서 지옥문 압박이 부족했습니다');
  assert.match(report.recommendation.text, /성당 39% 대 지옥문 61%/);
});

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
    doctrineNames: ['은탄 의식', '순교자의 맹세']
  });

  assert.equal(report.kicker, '원정 완료 · AFTER ACTION');
  assert.ok(report.grade);
  assert.match(report.summary, /최종 편성: 수도승 4 · 엑소시스트 3/);
  assert.match(report.summary, /전술 균형 전투/);
  assert.match(report.summary, /선택 교리: 은탄 의식 · 순교자의 맹세/);
  assert.equal(report.metrics.find(metric => metric.label === '최종 편성').value, '16명');
});
