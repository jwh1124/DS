import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTacticalOrderDefinition,
  getTacticalOrderTargetBonus,
  TACTICAL_ORDERS
} from '../src/tacticalOrders.js';

const rangedHoly = { team: 'player', type: 'ranged', range: 250 };
const meleeHoly = { team: 'player', type: 'melee', range: 45 };
const enemyRear = { team: 'enemy', type: 'sniper' };
const enemyMedic = { team: 'enemy', type: 'medic' };
const enemyHeavy = { team: 'enemy', type: 'tank' };
const enemyBoss = { team: 'enemy', type: 'tank', isBoss: true };
const enemyBase = { team: 'enemy', techLevel: 2 };

test('tactical order definitions are stable and unknown input falls back to balanced', () => {
  assert.deepEqual(TACTICAL_ORDERS.map(order => order.id), ['balanced', 'rear', 'boss']);
  assert.equal(getTacticalOrderDefinition('rear').key, '8');
  assert.equal(getTacticalOrderDefinition('unknown').id, 'balanced');
});

test('rear order redirects holy ranged attackers without overriding medic protection', () => {
  assert.equal(getTacticalOrderTargetBonus('rear', rangedHoly, enemyRear), 170);
  assert.equal(getTacticalOrderTargetBonus('rear', rangedHoly, enemyMedic), 0);
  assert.equal(getTacticalOrderTargetBonus('rear', meleeHoly, enemyRear), 0);
  assert.equal(getTacticalOrderTargetBonus('rear', rangedHoly, enemyHeavy), 0);
  assert.equal(getTacticalOrderTargetBonus('rear', rangedHoly, enemyBase), 0);
});

test('boss order prioritizes bosses over ordinary heavy units without affecting enemy AI', () => {
  assert.equal(getTacticalOrderTargetBonus('boss', rangedHoly, enemyBoss), 260);
  assert.equal(getTacticalOrderTargetBonus('boss', rangedHoly, enemyHeavy), 150);
  assert.equal(getTacticalOrderTargetBonus('boss', meleeHoly, enemyBoss), 0);
  assert.equal(getTacticalOrderTargetBonus('balanced', rangedHoly, enemyBoss), 0);
  assert.equal(getTacticalOrderTargetBonus('boss', { team: 'enemy', range: 250 }, enemyBoss), 0);
});

test('order bonuses can deliberately overturn a nearby default target', () => {
  const nearbyFrontDistance = 100;
  const rearSupportDistance = 240;
  const bossDistance = 300;

  const rearScore = rearSupportDistance
    - getTacticalOrderTargetBonus('rear', rangedHoly, enemyRear);
  const bossScore = bossDistance
    - getTacticalOrderTargetBonus('boss', rangedHoly, enemyBoss);

  assert.ok(rearScore < nearbyFrontDistance);
  assert.ok(bossScore < nearbyFrontDistance);
});
