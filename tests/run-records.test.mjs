import assert from 'node:assert/strict';
import test from 'node:test';
import { getRunRecordSummary, recordRunResult } from '../src/runRecords.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

test('a victory becomes the personal best for its selected difficulty', () => {
  const storage = createStorage();
  const result = recordRunResult(storage, {
    difficulty: 1,
    report: { grade: 'A', score: 96, playerIntegrity: 87 }
  });
  assert.equal(result.isPersonalBest, true);
  assert.equal(getRunRecordSummary(storage, 1), '시련 최고 A · 96점 · 성당 87%');
});

test('lower scores and defeats do not overwrite a difficulty record', () => {
  const storage = createStorage();
  recordRunResult(storage, {
    difficulty: 1.25,
    report: { grade: 'S', score: 120, playerIntegrity: 92 }
  });
  const lower = recordRunResult(storage, {
    difficulty: 1.25,
    report: { grade: 'A', score: 94, playerIntegrity: 100 }
  });
  const defeat = recordRunResult(storage, {
    difficulty: 1.25,
    report: { grade: null, score: 0, playerIntegrity: 0 }
  });
  assert.equal(lower.isPersonalBest, false);
  assert.equal(defeat.isPersonalBest, false);
  assert.equal(getRunRecordSummary(storage, 1.25), '연옥 최고 S · 120점 · 성당 92%');
});
