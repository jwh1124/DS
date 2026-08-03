import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getInfernalHost,
  getInfernalHostBossTactics,
  getInfernalHostBackgroundFit,
  getInfernalHostBackgroundPath,
  getInfernalHostBriefing
} from '../src/infernalHosts.js';
import { getAiRecruitmentPriority } from '../src/aiStrategy.js';

const playerCounts = { melee: 3, ranged: 2, medic: 1, sniper: 1, tank: 1, crusader: 1 };
const enemyCounts = { melee: 2, ranged: 2, medic: 0, sniper: 0, tank: 0, crusader: 0 };

test('seeded infernal hosts expose distinct enemy composition plans', () => {
  assert.equal(getInfernalHost(0).id, 'cinderVanguard');
  assert.equal(getInfernalHost(0.4).id, 'graveCoven');
  assert.equal(getInfernalHost(0.8).id, 'ironLegion');
  assert.match(getInfernalHostBriefing(getInfernalHost(0.4)).detail, /후열 처단/);
  assert.match(getInfernalHostBackgroundPath(getInfernalHost(0.4)), /moonlit-cloister/);
  assert.equal(getInfernalHostBackgroundFit(getInfernalHost(0.4)), 'stretch');
  assert.match(getInfernalHostBossTactics(getInfernalHost(0.4)).advice, /후열/);
});

test('each infernal host changes only its authored recruitment timing', () => {
  assert.deepEqual(getAiRecruitmentPriority({
    wave: 3, playerCounts, enemyCounts, enemyRosterSize: 4, infernalHost: getInfernalHost(0.4)
  }), { type: 'medic', saveForRole: true });
  assert.deepEqual(getAiRecruitmentPriority({
    wave: 6, playerCounts, enemyCounts: { ...enemyCounts, medic: 1 }, enemyRosterSize: 6, infernalHost: getInfernalHost(0.4)
  }), { type: 'sniper', saveForRole: true });
  assert.deepEqual(getAiRecruitmentPriority({
    wave: 8, playerCounts, enemyCounts: { ...enemyCounts, medic: 1, sniper: 1 }, enemyRosterSize: 8, infernalHost: getInfernalHost(0.8)
  }), { type: 'tank', saveForRole: true });
});
