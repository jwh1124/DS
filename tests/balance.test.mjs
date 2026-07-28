import assert from 'node:assert/strict';
import {
  BASE_TECH_HP_GAIN,
  BASE_TURRET_BALANCE,
  chooseAffordableUnit,
  getBaseTurretStats,
  getTechUpgradeCost,
  getUnlockedUnitTypes,
  getUnitVsBaseDamageMultiplier,
  MAX_SPAWNERS,
  MAX_WAVES,
  PLAYER_STARTING_INCOME,
  PLAYER_STARTING_MINERALS,
  AI_STARTING_INCOME,
  AI_STARTING_MINERALS,
  WAVE_INTERVAL,
  UNIT_COSTS
} from '../src/gameConfig.js';
import {
  getAttackRangeAgainst,
  getCombatDistance,
  getWaveFormationSlot
} from '../src/combatMath.js';

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
assert.equal(BASE_TECH_HP_GAIN, 2000);
assert.equal(getUnitVsBaseDamageMultiplier('player'), 2);
assert.equal(getUnitVsBaseDamageMultiplier('enemy'), 1);

const levelTwoTurret = getBaseTurretStats(2);
const levelThreeTurret = getBaseTurretStats(3);
assert.equal(levelTwoTurret.range, 560);
assert.equal(levelTwoTurret.damage, 55);
assert.ok(Math.abs(levelTwoTurret.interval - 1.44) < Number.EPSILON * 2);
assert.ok(levelTwoTurret.damage / levelTwoTurret.interval < 40);
assert.ok(levelThreeTurret.damage / levelThreeTurret.interval < 60);
assert.equal(BASE_TURRET_BALANCE.splashRatio, 0);
assert.equal(BASE_TURRET_BALANCE.splashRadius, 0);

const playerFrontSlot = getWaveFormationSlot(150, 360, 0, 'player');
const playerRearSlot = getWaveFormationSlot(150, 360, 8, 'player');
const enemyRearSlot = getWaveFormationSlot(1800, 360, 8, 'enemy');
assert.deepEqual(playerFrontSlot, { x: 150, y: 250, row: 0 });
assert.deepEqual(playerRearSlot, { x: 98, y: 250, row: 1 });
assert.deepEqual(enemyRearSlot, { x: 1852, y: 250, row: 1 });

const rangedFront = { x: 1510, y: 530, radius: 20, range: 250, formationRow: 0 };
const rangedRear = { x: 1458, y: 530, radius: 20, range: 250, formationRow: 1 };
const enemyBase = { x: 1850, y: 360, radius: 70, maxHp: 12000, techLevel: 2 };
assert.equal(getCombatDistance(rangedFront, enemyBase), 250);
assert.equal(getAttackRangeAgainst(rangedFront, enemyBase), 250);
assert.equal(getCombatDistance(rangedRear, enemyBase), 302);
assert.equal(getAttackRangeAgainst(rangedRear, enemyBase), 302);

const outerLaneSniper = { x: 1310, y: 530, radius: 20, range: 450, formationRow: 0 };
assert.equal(getCombatDistance(outerLaneSniper, enemyBase), 450);
assert.ok(getCombatDistance(enemyBase, outerLaneSniper) < levelTwoTurret.range);

// A level-one AI may not counter with a late-game Pit Lord/Crusader equivalent.
assert.equal(chooseAffordableUnit('crusader', 300, 1, () => 0), 'melee');
assert.equal(chooseAffordableUnit('ranged', 300, 1, () => 0), 'ranged');
assert.equal(chooseAffordableUnit('crusader', UNIT_COSTS.crusader, 3, () => 0), 'crusader');

console.log('balance rules: ok');
