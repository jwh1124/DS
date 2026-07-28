import assert from 'node:assert/strict';
import {
  chooseAffordableUnit,
  getTechUpgradeCost,
  getUnlockedUnitTypes,
  MAX_SPAWNERS,
  MAX_WAVES,
  PLAYER_STARTING_INCOME,
  PLAYER_STARTING_MINERALS,
  AI_STARTING_INCOME,
  AI_STARTING_MINERALS,
  WAVE_INTERVAL,
  UNIT_COSTS
} from '../src/gameConfig.js';

assert.deepEqual(getUnlockedUnitTypes(1), ['melee', 'ranged']);
assert.deepEqual(getUnlockedUnitTypes(2), ['melee', 'ranged', 'medic', 'sniper']);
assert.deepEqual(getUnlockedUnitTypes(3), ['melee', 'ranged', 'medic', 'sniper', 'tank', 'crusader']);
assert.equal(getTechUpgradeCost(1), 400);
assert.equal(getTechUpgradeCost(2), 400);
assert.equal(getTechUpgradeCost(3), Infinity);
assert.equal(MAX_WAVES, 12);
assert.equal(MAX_SPAWNERS, 16);
assert.equal(WAVE_INTERVAL, 40);
assert.equal(MAX_WAVES * WAVE_INTERVAL, 480);
assert.equal(PLAYER_STARTING_MINERALS, 400);
assert.equal(PLAYER_STARTING_INCOME, 90);
assert.equal(AI_STARTING_MINERALS, 180);
assert.equal(AI_STARTING_INCOME, 50);

// A level-one AI may not counter with a late-game Pit Lord/Crusader equivalent.
assert.equal(chooseAffordableUnit('crusader', 300, 1, () => 0), 'melee');
assert.equal(chooseAffordableUnit('ranged', 300, 1, () => 0), 'ranged');
assert.equal(chooseAffordableUnit('crusader', UNIT_COSTS.crusader, 3, () => 0), 'crusader');

console.log('balance rules: ok');
