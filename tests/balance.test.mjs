import assert from 'node:assert/strict';
import {
  chooseAffordableUnit,
  getTechUpgradeCost,
  getUnlockedUnitTypes,
  UNIT_COSTS
} from '../src/gameConfig.js';

assert.deepEqual(getUnlockedUnitTypes(1), ['melee', 'ranged']);
assert.deepEqual(getUnlockedUnitTypes(3), ['melee', 'ranged', 'medic', 'sniper']);
assert.equal(getTechUpgradeCost(1), 800);
assert.equal(getTechUpgradeCost(4), 6400);
assert.equal(getTechUpgradeCost(5), Infinity);

// A level-one AI may not counter with a late-game Pit Lord/Crusader equivalent.
assert.equal(chooseAffordableUnit('crusader', 300, 1, () => 0), 'melee');
assert.equal(chooseAffordableUnit('ranged', 300, 1, () => 0), 'ranged');
assert.equal(chooseAffordableUnit('crusader', UNIT_COSTS.crusader, 5, () => 0), 'crusader');

console.log('balance rules: ok');
