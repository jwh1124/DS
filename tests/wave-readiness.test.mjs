import assert from 'node:assert/strict';
import test from 'node:test';

import { getWaveReadiness } from '../src/waveReadiness.js';

const opening = {
  melee: 4,
  ranged: 2,
  medic: 0,
  sniper: 0,
  tank: 0,
  crusader: 0
};

test('the proven opening is ready for the first wave', () => {
  const readiness = getWaveReadiness({
    wave: 1,
    techLevel: 1,
    minerals: 0,
    counts: opening
  });

  assert.equal(readiness.level, 'ready');
  assert.equal(readiness.met, readiness.total);
});

test('the HUD calls out level-two revelation before support waves', () => {
  const saving = getWaveReadiness({
    wave: 4,
    techLevel: 1,
    minerals: 225,
    counts: opening
  });
  const affordable = getWaveReadiness({
    wave: 4,
    techLevel: 1,
    minerals: 315,
    counts: opening
  });

  assert.equal(saving.level, 'critical');
  assert.equal(saving.action, 'Lv.2 계시 자금 300 비축');
  assert.equal(affordable.action, 'Lv.2 계시 실행');
});

test('the mini-boss briefing requires one healer and one judge', () => {
  const unsupported = getWaveReadiness({
    wave: 6,
    techLevel: 2,
    minerals: 150,
    counts: opening
  });
  const supported = getWaveReadiness({
    wave: 6,
    techLevel: 2,
    minerals: 0,
    counts: { ...opening, medic: 1, sniper: 1 }
  });

  assert.equal(unsupported.level, 'critical');
  assert.deepEqual(unsupported.missing, ['roster', 'medic', 'sniper']);
  assert.equal(unsupported.action, '사제 1명 보강');
  assert.equal(supported.level, 'ready');
});

test('late waves prioritize level three before optional heavy units', () => {
  const readiness = getWaveReadiness({
    wave: 10,
    techLevel: 2,
    minerals: 356,
    counts: { ...opening, medic: 2, sniper: 2, ranged: 3 }
  });

  assert.equal(readiness.level, 'critical');
  assert.equal(readiness.action, 'Lv.3 계시 자금 400 비축');
  assert.ok(readiness.missing.includes('tech'));
});
