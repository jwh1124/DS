import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBossPatternPerformance,
  getBossPatternSummary,
  recordBossPatternEvent
} from '../src/bossPatternPerformance.js';

test('boss pattern outcomes produce a compact after-action record', () => {
  const performance = createBossPatternPerformance();
  recordBossPatternEvent(performance, 'started');
  recordBossPatternEvent(performance, 'interrupted');
  recordBossPatternEvent(performance, 'started');
  recordBossPatternEvent(performance, 'failed');

  assert.deepEqual(performance, {
    started: 2,
    interrupted: 1,
    failed: 1
  });
  assert.equal(getBossPatternSummary(performance), '패턴 저지 1/2 · 실패 1회');
});
