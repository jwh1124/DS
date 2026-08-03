import assert from 'node:assert/strict';
import test from 'node:test';

import { applyWaveMutator, getWaveMutator, getWaveMutatorPreview } from '../src/waveMutators.js';

test('authored wave mutators expose the same scouting information used in combat', () => {
  const rush = getWaveMutator(2);
  assert.equal(rush.id, 'bloodRush');
  assert.match(getWaveMutatorPreview(2), /혈군의 돌격/);
  assert.equal(getWaveMutator(3), null);
});

test('wave mutators change only their authored enemy roles', () => {
  const unit = { type: 'melee', maxHp: 120, hp: 120, damage: 25, speed: 170 };
  assert.equal(applyWaveMutator(unit, getWaveMutator(2)), true);
  assert.equal(unit.maxHp, 120);
  assert.equal(unit.speed, 210.8);
  assert.equal(unit.waveMutatorId, 'bloodRush');

  const ranged = { type: 'ranged', maxHp: 60, hp: 60, damage: 35, speed: 140 };
  assert.equal(applyWaveMutator(ranged, getWaveMutator(2)), false);
  assert.equal(ranged.speed, 140);
});
