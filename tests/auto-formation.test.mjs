import assert from 'node:assert/strict';
import test from 'node:test';
import { getAutoFormationAction } from '../src/autoFormation.js';

test('automatic formation preserves funds for level two immediately after the opening', () => {
  const baseState = {
    currentWave: 1,
    techLevel: 1,
    counts: { melee: 3, ranged: 1 },
    maxSpawners: 16
  };
  assert.equal(getAutoFormationAction({ ...baseState, minerals: 299 }), null);
  assert.deepEqual(getAutoFormationAction({ ...baseState, minerals: 300 }), { type: 'tech', cost: 300 });
});

test('automatic formation does not pad the compact opening before revelation', () => {
  assert.equal(getAutoFormationAction({
    currentWave: 0,
    techLevel: 1,
    minerals: 150,
    counts: { melee: 3, ranged: 1 },
    maxSpawners: 16
  }), null);
});

test('automatic formation unlocks support and final durable roles in time', () => {
  assert.deepEqual(getAutoFormationAction({
    currentWave: 4,
    techLevel: 2,
    minerals: 120,
    counts: { melee: 4, ranged: 2 },
    maxSpawners: 16
  }), { type: 'medic', cost: 120 });
  assert.deepEqual(getAutoFormationAction({
    currentWave: 9,
    techLevel: 3,
    minerals: 200,
    counts: { melee: 4, ranged: 2, medic: 2, sniper: 2 },
    maxSpawners: 16
  }), { type: 'tank', cost: 200 });
});

test('automatic formation starts saving for level three before it fills the final slots', () => {
  const state = {
    currentWave: 7,
    techLevel: 2,
    counts: { melee: 4, ranged: 2, medic: 2, sniper: 2 },
    maxSpawners: 16
  };
  assert.equal(getAutoFormationAction({ ...state, minerals: 399 }), null);
  assert.deepEqual(getAutoFormationAction({ ...state, minerals: 400 }), { type: 'tech', cost: 400 });
});
