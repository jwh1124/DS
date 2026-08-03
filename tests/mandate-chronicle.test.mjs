import test from 'node:test';
import assert from 'node:assert/strict';
import { recordMandateClear, getMandateChronicleSummary } from '../src/mandateChronicle.js';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('fulfilled mandates accumulate clears and preserve their best score', () => {
  const store = storage();
  const result = { fulfilled: true, mandate: { id: 'vanguardPledge' } };
  assert.equal(recordMandateClear(store, { mandateResult: result, score: 104 }).firstClear, true);
  const second = recordMandateClear(store, { mandateResult: result, score: 97 });
  assert.equal(second.record.clears, 2);
  assert.equal(second.record.bestScore, 104);
  assert.equal(getMandateChronicleSummary(store, 'vanguardPledge'), '정화 2회 · 최고 104점');
});

test('an unfulfilled mandate never advances the chronicle', () => {
  const store = storage();
  const result = recordMandateClear(store, {
    mandateResult: { fulfilled: false, mandate: { id: 'bastionPledge' } },
    score: 140
  });
  assert.equal(result.record.clears, 0);
  assert.equal(getMandateChronicleSummary(store, 'bastionPledge'), '첫 서약 달성 대기');
});
