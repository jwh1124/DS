import assert from 'node:assert/strict';
import test from 'node:test';
import { applyRunOmen, getRunOmen } from '../src/runOmens.js';

test('seeded run omens cover three distinct campaign threats', () => {
  assert.equal(getRunOmen(0).id, 'bloodMoon');
  assert.equal(getRunOmen(0.34).id, 'ironCovenant');
  assert.equal(getRunOmen(0.8).id, 'nightChoir');
});

test('a run omen changes only its authored enemy role', () => {
  const omen = getRunOmen(0);
  const imp = { type: 'melee', maxHp: 100, hp: 60, damage: 12, speed: 170 };
  const succubus = { type: 'ranged', maxHp: 100, hp: 100, damage: 12, speed: 170 };
  assert.equal(applyRunOmen(imp, omen), true);
  assert.ok(Math.abs(imp.speed - 183.6) < 0.000001);
  assert.equal(imp.hp, 100);
  assert.equal(applyRunOmen(succubus, omen), false);
  assert.equal(succubus.speed, 170);
});
