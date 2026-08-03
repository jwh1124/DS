import assert from 'node:assert/strict';
import test from 'node:test';
import { getBattlefieldEventChoices } from '../src/battlefieldEvents.js';

test('each infernal host creates one distinct, timely battlefield response', () => {
  const grave = getBattlefieldEventChoices({ id: 'graveCoven' }, 5);
  const iron = getBattlefieldEventChoices({ id: 'ironLegion' }, 5);
  assert.equal(grave.length, 2);
  assert.equal(iron.length, 2);
  assert.ok(grave.some(choice => choice.effect.kind === 'unitHeal'));
  assert.ok(iron.some(choice => choice.effect.kind === 'unitDamage'));
  assert.deepEqual(getBattlefieldEventChoices({ id: 'graveCoven' }, 4), []);
});
