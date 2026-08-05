import assert from 'node:assert/strict';
import test from 'node:test';

import { applyCommanderToBonuses, getCommander } from '../src/commanders.js';
import { createDoctrineBonuses } from '../src/doctrines.js';

test('three commanders create distinct combat plans without mutating base bonuses', () => {
  const base = createDoctrineBonuses();
  const inquisitor = applyCommanderToBonuses(base, 'inquisitor');
  const archbishop = applyCommanderToBonuses(base, 'archbishop');
  const marshal = applyCommanderToBonuses(base, 'marshal');

  assert.equal(inquisitor.bonuses.damageByType.sniper, 1.12);
  assert.equal(inquisitor.bonuses.tacticalFocusDamageMultiplier, 1.1);
  assert.equal(archbishop.bonuses.healingMultiplier, 1.18);
  assert.equal(archbishop.incomeBonus, 10);
  assert.equal(marshal.bonuses.hpByType.crusader, 1.12);
  assert.equal(marshal.bonuses.baseDamageMultiplier, 1.12);
  assert.equal(base.damageByType.sniper, 1);
  assert.equal(base.healingMultiplier, 1);
});

test('unknown commander ids safely fall back to the inquisitor', () => {
  assert.equal(getCommander('missing').id, 'inquisitor');
});
