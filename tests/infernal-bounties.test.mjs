import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateInfernalBounty, getInfernalBounty } from '../src/infernalBounties.js';

test('each infernal host has a distinct mandate bounty', () => {
  assert.equal(getInfernalBounty({ id: 'cinderVanguard' }).mandateId, 'vanguardPledge');
  assert.equal(getInfernalBounty({ id: 'graveCoven' }).mandateId, 'flawlessRite');
  assert.equal(getInfernalBounty({ id: 'ironLegion' }).mandateId, 'bastionPledge');
});

test('a bounty pays only when its matching mandate is fulfilled', () => {
  const hit = evaluateInfernalBounty({ id: 'graveCoven' }, { fulfilled: true, mandate: { id: 'flawlessRite' } });
  const miss = evaluateInfernalBounty({ id: 'graveCoven' }, { fulfilled: true, mandate: { id: 'bastionPledge' } });
  assert.equal(hit.scoreBonus, 12);
  assert.equal(miss.scoreBonus, 0);
});
