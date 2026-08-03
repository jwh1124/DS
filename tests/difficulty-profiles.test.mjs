import assert from 'node:assert/strict';
import test from 'node:test';
import { getDifficultyProfile } from '../src/difficultyProfiles.js';

test('normal and hard retain their established enemy multipliers', () => {
  assert.deepEqual(getDifficultyProfile(1), { enemyHp: 1, enemyDamage: 1, bossHp: 1, bossDamage: 1 });
  assert.deepEqual(getDifficultyProfile(1.25), { enemyHp: 1.125, enemyDamage: 1.125, bossHp: 1, bossDamage: 1 });
});

test('inferno materially raises both ordinary enemy and boss pressure', () => {
  const normal = getDifficultyProfile(1);
  const inferno = getDifficultyProfile(1.5);
  assert.ok(inferno.enemyHp > normal.enemyHp);
  assert.ok(inferno.enemyDamage > normal.enemyDamage);
  assert.ok(inferno.bossHp > normal.bossHp);
  assert.ok(inferno.bossDamage > normal.bossDamage);
});
