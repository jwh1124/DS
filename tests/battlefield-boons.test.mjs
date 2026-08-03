import assert from 'node:assert/strict';
import test from 'node:test';
import { getBoonById, getBoonChoices } from '../src/battlefieldBoons.js';

test('wave 4 offers distinct short, long, and defensive battlefield boons', () => {
  const choices = getBoonChoices(4);
  assert.equal(choices.length, 3);
  assert.deepEqual(choices.map(choice => choice.effect.kind), ['minerals', 'income', 'baseFortify']);
});

test('wave 8 boon data exposes current-roster and emergency choices', () => {
  const choices = getBoonChoices(8);
  assert.equal(choices[0].effect.kind, 'unitHeal');
  assert.equal(getBoonById('emergencyVow').effect.minerals, 150);
  assert.equal(getBoonChoices(6).length, 0);
});
