import test from 'node:test';
import assert from 'node:assert/strict';
import { getInfernalChronicleSummary, recordInfernalClear } from '../src/infernalChronicle.js';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('infernal regions persist clears and retain their highest score', () => {
  const store = storage();
  const host = { id: 'graveCoven' };
  assert.equal(recordInfernalClear(store, { host, won: true, score: 96 }).firstClear, true);
  const second = recordInfernalClear(store, { host, won: true, score: 88 });
  assert.deepEqual(second.record, { clears: 2, bestScore: 96 });
  assert.equal(getInfernalChronicleSummary(store, host), '지역 정화 2회 · 최고 96점');
});

test('a defeat does not advance the infernal region chronicle', () => {
  const result = recordInfernalClear(storage(), { host: { id: 'ironLegion' }, won: false, score: 140 });
  assert.equal(result.record.clears, 0);
});
