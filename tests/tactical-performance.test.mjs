import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTacticalPerformance,
  getTacticalPerformanceLiveText,
  getTacticalPerformanceSummary,
  recordTacticalDamage,
  recordTacticalOrderChange,
  recordTacticalOrderTime
} from '../src/tacticalPerformance.js';

test('tactical performance records time, changes, focused hits, and damage', () => {
  const performance = createTacticalPerformance();
  recordTacticalOrderTime(performance, 'balanced', 12.8);
  recordTacticalOrderChange(performance);
  recordTacticalOrderTime(performance, 'rear', 4.2);
  recordTacticalDamage(performance, { orderId: 'rear', damage: 75, focused: true });
  recordTacticalDamage(performance, { orderId: 'rear', damage: 25, focused: false });
  recordTacticalOrderChange(performance);
  recordTacticalDamage(performance, { orderId: 'boss', damage: 140, focused: true });

  assert.equal(performance.changes, 2);
  assert.equal(performance.focusedHits.rear, 1);
  assert.equal(performance.damage.rear, 100);
  assert.equal(performance.focusedDamage.rear, 75);
  assert.match(getTacticalPerformanceLiveText(performance, 'rear'), /후열 집중 1회 · 75 피해/);
  assert.match(getTacticalPerformanceSummary(performance), /대악마 집중 1회\/140 피해/);
});

test('invalid orders and zero damage do not pollute performance', () => {
  const performance = createTacticalPerformance();
  recordTacticalOrderTime(performance, 'unknown', 10);
  recordTacticalDamage(performance, { orderId: 'boss', damage: 0, focused: true });

  assert.equal(performance.seconds.balanced, 0);
  assert.equal(performance.focusedHits.boss, 0);
  assert.equal(performance.damage.boss, 0);
  assert.equal(performance.focusedDamage.boss, 0);
});
