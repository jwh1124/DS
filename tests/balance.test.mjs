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
  UNIT_MOVEMENT_SPEED_MULTIPLIER,
  WAVE_ASSAULT_TIME,
  WAVE_PREP_TIME,
  WAVE_WITHDRAWAL_TIME,
  UNIT_COSTS
} from '../src/gameConfig.js';
import {
  canLaunchNextWaveEarly,
  resolveExpiredPhase,
  resolvePostCombatPhase,
  WAVE_PHASES
} from '../src/wavePacing.js';
import {
  getAttackRangeAgainst,
  getCombatDistance,
  getPointToTargetDistance,
  getWaveFormationSlot
} from '../src/combatMath.js';
import {
  getCounterProfile,
  getTargetPriorityBonus,
  PLAYER_UNIT_ROLE_INFO
} from '../src/unitRoles.js';
import {
  applyDoctrineToBonuses,
  createDoctrineBonuses,
  getDoctrineById,
  getDoctrineChoices,
  getDoctrineUnitMultipliers
} from '../src/doctrines.js';
import {
  BOSS_RECOVERY_DELAY,
  getBossProfile,
  getBossProfileForWave,
  resolveBossGate,
  selectBossEscortContracts
} from '../src/bosses.js';
import {
  AI_TECH_RESERVE_PER_WAVE,
  getAiRosterCap,
  getAiRecruitmentPriority,
  shouldUpgradeEnemyTech
} from '../src/aiStrategy.js';
import { FloatingText } from '../src/entities/FloatingText.js';

assert.deepEqual(getUnlockedUnitTypes(1), ['melee', 'ranged']);
assert.deepEqual(getUnlockedUnitTypes(2), ['melee', 'ranged', 'medic', 'sniper']);
assert.deepEqual(getUnlockedUnitTypes(3), ['melee', 'ranged', 'medic', 'sniper', 'tank', 'crusader']);
assert.equal(getTechUpgradeCost(1), 300);
assert.equal(getTechUpgradeCost(2), 400);
assert.equal(getTechUpgradeCost(3), Infinity);
assert.equal(MAX_WAVES, 12);
assert.equal(MAX_SPAWNERS, 16);
assert.equal(WAVE_ASSAULT_TIME, 12);
assert.equal(WAVE_WITHDRAWAL_TIME, 3);
assert.equal(WAVE_PREP_TIME, 10);
assert.equal(PLAYER_STARTING_MINERALS, 400);
assert.equal(PLAYER_STARTING_INCOME, 90);
assert.equal(AI_STARTING_MINERALS, 180);
assert.equal(AI_STARTING_INCOME, 50);
assert.equal(UNIT_MOVEMENT_SPEED_MULTIPLIER, 3);
assert.equal(BASE_TECH_HP_GAIN, 2000);
assert.equal(getUnitVsBaseDamageMultiplier('player'), 2);
assert.equal(getUnitVsBaseDamageMultiplier('enemy'), 1);

const clearedWaveAssault = resolvePostCombatPhase({
  currentPhase: WAVE_PHASES.COMBAT,
  wave: 1,
  maxWaves: MAX_WAVES,
  hasActiveEnemyWave: false,
  hasActivePlayerWave: true,
  assaultTime: WAVE_ASSAULT_TIME,
  prepTime: WAVE_PREP_TIME
});
assert.deepEqual(clearedWaveAssault, {
  phase: WAVE_PHASES.ASSAULT,
  timeRemaining: WAVE_ASSAULT_TIME,
  siegeTeam: 'player'
});
assert.deepEqual(resolvePostCombatPhase({
  currentPhase: WAVE_PHASES.COMBAT,
  wave: 1,
  maxWaves: MAX_WAVES,
  hasActiveEnemyWave: false,
  hasActivePlayerWave: false,
  assaultTime: WAVE_ASSAULT_TIME,
  withdrawalTime: WAVE_WITHDRAWAL_TIME
}), {
  phase: WAVE_PHASES.WITHDRAWAL,
  timeRemaining: WAVE_WITHDRAWAL_TIME,
  withdrawTeam: 'both'
});
assert.deepEqual(resolvePostCombatPhase({
  currentPhase: WAVE_PHASES.COMBAT,
  wave: 1,
  maxWaves: MAX_WAVES,
  hasActiveEnemyWave: true,
  hasActivePlayerWave: false,
  assaultTime: WAVE_ASSAULT_TIME,
  withdrawalTime: WAVE_WITHDRAWAL_TIME
}), {
  phase: WAVE_PHASES.BREACH,
  timeRemaining: WAVE_ASSAULT_TIME,
  siegeTeam: 'enemy'
});
assert.equal(resolvePostCombatPhase({
  currentPhase: WAVE_PHASES.COMBAT,
  wave: 1,
  maxWaves: MAX_WAVES,
  hasActiveEnemyWave: true,
  hasActivePlayerWave: true,
  assaultTime: WAVE_ASSAULT_TIME,
  prepTime: WAVE_PREP_TIME
}), null);
assert.equal(resolvePostCombatPhase({
  currentPhase: WAVE_PHASES.COMBAT,
  wave: MAX_WAVES,
  maxWaves: MAX_WAVES,
  hasActiveEnemyWave: false,
  hasActivePlayerWave: true,
  assaultTime: WAVE_ASSAULT_TIME,
  prepTime: WAVE_PREP_TIME
}), null);
assert.deepEqual(resolveExpiredPhase({
  phase: WAVE_PHASES.ASSAULT,
  prepTime: WAVE_PREP_TIME,
  withdrawalTime: WAVE_WITHDRAWAL_TIME
}), {
  phase: WAVE_PHASES.WITHDRAWAL,
  timeRemaining: WAVE_WITHDRAWAL_TIME,
  withdrawTeam: 'player'
});
assert.deepEqual(resolveExpiredPhase({
  phase: WAVE_PHASES.BREACH,
  prepTime: WAVE_PREP_TIME,
  withdrawalTime: WAVE_WITHDRAWAL_TIME
}), {
  phase: WAVE_PHASES.WITHDRAWAL,
  timeRemaining: WAVE_WITHDRAWAL_TIME,
  withdrawTeam: 'enemy'
});
assert.deepEqual(resolveExpiredPhase({
  phase: WAVE_PHASES.WITHDRAWAL,
  prepTime: WAVE_PREP_TIME,
  withdrawalTime: WAVE_WITHDRAWAL_TIME
}), {
  phase: WAVE_PHASES.PREPARE,
  timeRemaining: WAVE_PREP_TIME,
  shouldStartPreparation: true
});
assert.deepEqual(resolveExpiredPhase({
  phase: WAVE_PHASES.PREPARE,
  prepTime: WAVE_PREP_TIME
}), {
  phase: WAVE_PHASES.PREPARE,
  timeRemaining: 0,
  shouldSpawnWave: true
});
assert.equal(canLaunchNextWaveEarly({
  isActive: true,
  phase: WAVE_PHASES.PREPARE,
  bossGateLocked: false,
  hasActiveEnemyWave: false,
  timeUntilWave: WAVE_PREP_TIME
}), true);
assert.equal(canLaunchNextWaveEarly({
  isActive: true,
  phase: WAVE_PHASES.PREPARE,
  bossGateLocked: false,
  hasActiveEnemyWave: true,
  timeUntilWave: WAVE_PREP_TIME
}), false);
assert.equal(canLaunchNextWaveEarly({
  isActive: true,
  phase: WAVE_PHASES.COMBAT,
  bossGateLocked: false,
  hasActiveEnemyWave: false,
  timeUntilWave: WAVE_PREP_TIME
}), false);
assert.equal(canLaunchNextWaveEarly({
  isActive: true,
  phase: WAVE_PHASES.PREPARE,
  bossGateLocked: true,
  hasActiveEnemyWave: false,
  timeUntilWave: WAVE_PREP_TIME
}), false);

const levelTwoTurret = getBaseTurretStats(2);
const levelThreeTurret = getBaseTurretStats(3);
assert.equal(levelTwoTurret.range, 640);
assert.equal(levelTwoTurret.damage, 45);
assert.ok(Math.abs(levelTwoTurret.interval - 1.564) < Number.EPSILON * 2);
assert.ok(levelTwoTurret.damage / levelTwoTurret.interval < 30);
assert.ok(levelThreeTurret.damage / levelThreeTurret.interval < 45);
assert.equal(BASE_TURRET_BALANCE.splashRatio, 0);
assert.equal(BASE_TURRET_BALANCE.splashRadius, 0);

const executionerProfile = getBossProfile('executioner');
const normalTechMultiplier = 1.18;
const executionerDirectHit = 60 * normalTechMultiplier * executionerProfile.damageMultiplier;
const levelTwoRangedHp = 60 * normalTechMultiplier;
assert.ok(executionerDirectHit < levelTwoRangedHp);
assert.ok(executionerDirectHit * executionerProfile.splashRatio < 30);
assert.equal(executionerProfile.canCrit, false);
assert.ok(executionerProfile.splashRadius < 90);

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

const frontLineTarget = { x: 1280, y: 360, radius: 20, type: 'melee' };
const firingLineRanged = { x: 990, y: 360, radius: 20, range: 250, formationRow: 0, type: 'ranged' };
const rearLineRanged = { x: 938, y: 360, radius: 20, range: 250, formationRow: 1, type: 'ranged' };
const rearLineMelee = { ...rearLineRanged, range: 45, type: 'melee' };
assert.equal(getCombatDistance(firingLineRanged, frontLineTarget), 250);
assert.equal(getCombatDistance(rearLineRanged, frontLineTarget), 302);
assert.equal(getAttackRangeAgainst(firingLineRanged, frontLineTarget), 250);
assert.equal(getAttackRangeAgainst(rearLineRanged, frontLineTarget), 302);
assert.equal(getAttackRangeAgainst(rearLineMelee, frontLineTarget), 45);

const outerLaneSniper = { x: 1310, y: 530, radius: 20, range: 450, formationRow: 0 };
assert.equal(getCombatDistance(outerLaneSniper, enemyBase), 450);
const enemyTurretMount = { x: 1766, y: 278 };
assert.ok(getPointToTargetDistance(enemyTurretMount, outerLaneSniper) < levelTwoTurret.range);

const rearOuterLaneSniper = { x: 1258, y: 530, radius: 20, range: 450, formationRow: 1, type: 'sniper' };
assert.equal(getCombatDistance(rearOuterLaneSniper, enemyBase), 502);
assert.equal(getAttackRangeAgainst(rearOuterLaneSniper, enemyBase), 502);
assert.ok(
  getPointToTargetDistance(enemyTurretMount, rearOuterLaneSniper) < levelTwoTurret.range,
  'base artillery must engage the farthest rear-line sniper that can hit the base'
);
const playerBase = { x: 150, y: 360, radius: 70, maxHp: 12000, techLevel: 2 };
const playerTurretMount = { x: 234, y: 278 };
const enemyRearOuterLaneSniper = { x: 742, y: 530, radius: 20, range: 450, formationRow: 1, type: 'sniper' };
assert.equal(getCombatDistance(enemyRearOuterLaneSniper, playerBase), 502);
assert.ok(
  getPointToTargetDistance(playerTurretMount, enemyRearOuterLaneSniper) < levelTwoTurret.range,
  'holy and infernal artillery must use the same coverage rule'
);

const rangedAttacker = { type: 'ranged' };
const sniperAttacker = { type: 'sniper' };
const meleeAttacker = { type: 'melee' };
const airborneTarget = { type: 'ranged', isAirUnit: true };
const heavyTarget = { type: 'tank', isAirUnit: false };
const backlineTarget = { type: 'medic', isAirUnit: false };
assert.equal(getCounterProfile(rangedAttacker, airborneTarget).multiplier, 1.25);
assert.equal(getCounterProfile(sniperAttacker, heavyTarget).multiplier, 1.35);
assert.equal(getCounterProfile(meleeAttacker, backlineTarget).multiplier, 1.15);
assert.equal(getCounterProfile(sniperAttacker, enemyBase).multiplier, 1);
assert.equal(getTargetPriorityBonus(sniperAttacker, heavyTarget), 120);
assert.equal(PLAYER_UNIT_ROLE_INFO.ranged.tag, '대공 +25%');

assert.deepEqual(getDoctrineChoices(3).map(doctrine => doctrine.id), [
  'shieldWall',
  'silverRite',
  'faithfulTithe'
]);
assert.equal(getDoctrineChoices(6).length, 3);
assert.equal(getDoctrineChoices(9).length, 3);
assert.equal(getDoctrineChoices(4).length, 0);

const initialDoctrines = createDoctrineBonuses();
const shieldDoctrine = applyDoctrineToBonuses(initialDoctrines, 'shieldWall');
const fortifiedDoctrine = applyDoctrineToBonuses(shieldDoctrine, 'martyrVow');
const silverDoctrine = applyDoctrineToBonuses(fortifiedDoctrine, 'silverRite');
const exorcismDoctrine = applyDoctrineToBonuses(silverDoctrine, 'grandExorcism');
assert.equal(getDoctrineUnitMultipliers(shieldDoctrine, 'melee').hp, 1.25);
assert.equal(getDoctrineUnitMultipliers(shieldDoctrine, 'ranged').hp, 1);
assert.ok(Math.abs(getDoctrineUnitMultipliers(fortifiedDoctrine, 'melee').hp - 1.4) < 1e-10);
assert.ok(Math.abs(getDoctrineUnitMultipliers(silverDoctrine, 'ranged').damage - 1.18) < 1e-10);
assert.equal(exorcismDoctrine.baseDamageMultiplier, 1.15);
assert.equal(applyDoctrineToBonuses(shieldDoctrine, 'shieldWall'), shieldDoctrine);
assert.equal(getDoctrineById('sanctuary').effect.amount, 1500);

const midBoss = getBossProfileForWave(6);
const finalBoss = getBossProfileForWave(12);
assert.equal(midBoss.id, 'executioner');
assert.equal(finalBoss.id, 'sovereign');
assert.equal(getBossProfileForWave(9), null);
assert.notEqual(midBoss.spritePath, finalBoss.spritePath);
assert.equal(midBoss.hpMultiplier, 3.5);
assert.equal(midBoss.damageMultiplier, 0.65);
assert.equal(finalBoss.damageMultiplier, 1.2);
assert.equal(midBoss.escortCap, 4);
assert.equal(finalBoss.escortCap, 10);
assert.equal(getBossProfile('executioner'), midBoss);
assert.equal(BOSS_RECOVERY_DELAY, 8);
assert.deepEqual(resolveBossGate(true, true), { locked: true, completed: false });
assert.deepEqual(resolveBossGate(true, false), { locked: false, completed: true });
assert.deepEqual(resolveBossGate(false, false), { locked: false, completed: false });
const bossEscortPool = [
  { id: 'm1', type: 'melee' },
  { id: 'r1', type: 'ranged' },
  { id: 'm2', type: 'melee' },
  { id: 'r2', type: 'ranged' },
  { id: 'm3', type: 'melee' },
  { id: 'medic', type: 'medic' },
  { id: 'r3', type: 'ranged' }
];
const midBossEscorts = selectBossEscortContracts(bossEscortPool, midBoss.escortCap);
assert.equal(midBossEscorts.length, midBoss.escortCap);
assert.ok(midBossEscorts.some(contract => contract.type === 'medic'));
assert.equal(selectBossEscortContracts(bossEscortPool, 0).length, 0);
const rangedPriorityEscorts = selectBossEscortContracts(bossEscortPool, 3, ['ranged']);
assert.equal(rangedPriorityEscorts[0].type, 'ranged');

assert.equal(AI_TECH_RESERVE_PER_WAVE, 80);
assert.equal(getAiRosterCap(1), 3);
assert.equal(getAiRosterCap(6), 8);
assert.equal(getAiRosterCap(7), 9);
assert.equal(getAiRosterCap(9), 11);
assert.equal(getAiRosterCap(10), 12);
assert.equal(getAiRosterCap(11), 12);
assert.equal(getAiRosterCap(12), 16);
assert.equal(shouldUpgradeEnemyTech(4, 1, 500, 400), false);
assert.equal(shouldUpgradeEnemyTech(5, 1, 400, 400), true);
assert.equal(shouldUpgradeEnemyTech(8, 2, 500, 400), false);
assert.equal(shouldUpgradeEnemyTech(9, 2, 400, 400), true);
assert.equal(shouldUpgradeEnemyTech(12, 3, 999, Infinity), false);

const balancedPlayerCounts = { melee: 3, ranged: 2, medic: 1, sniper: 2, tank: 1, crusader: 1 };
const emptyEnemyRoles = { melee: 4, ranged: 2, medic: 0, sniper: 0, tank: 0, crusader: 0 };
assert.deepEqual(getAiRecruitmentPriority({
  wave: 3,
  playerCounts: balancedPlayerCounts,
  enemyCounts: { melee: 0, ranged: 2, medic: 0, sniper: 0, tank: 0, crusader: 0 },
  enemyRosterSize: 2
}), { type: 'melee', saveForRole: false });
assert.deepEqual(getAiRecruitmentPriority({
  wave: 3,
  playerCounts: balancedPlayerCounts,
  enemyCounts: { melee: 2, ranged: 0, medic: 0, sniper: 0, tank: 0, crusader: 0 },
  enemyRosterSize: 2
}), { type: 'ranged', saveForRole: false });
assert.deepEqual(getAiRecruitmentPriority({
  wave: 3,
  playerCounts: { ...balancedPlayerCounts, melee: 1, ranged: 5 },
  enemyCounts: { melee: 1, ranged: 1, medic: 0, sniper: 0, tank: 0, crusader: 0 },
  enemyRosterSize: 2
}), { type: 'melee', saveForRole: false });
assert.deepEqual(getAiRecruitmentPriority({
  wave: 5,
  playerCounts: balancedPlayerCounts,
  enemyCounts: emptyEnemyRoles,
  enemyRosterSize: 6
}), { type: 'medic', saveForRole: true });
assert.deepEqual(getAiRecruitmentPriority({
  wave: 7,
  playerCounts: balancedPlayerCounts,
  enemyCounts: { ...emptyEnemyRoles, medic: 1 },
  enemyRosterSize: 7
}), { type: 'sniper', saveForRole: true });
assert.deepEqual(getAiRecruitmentPriority({
  wave: 9,
  playerCounts: balancedPlayerCounts,
  enemyCounts: { ...emptyEnemyRoles, medic: 1, sniper: 1 },
  enemyRosterSize: 8
}), { type: 'tank', saveForRole: true });
assert.deepEqual(getAiRecruitmentPriority({
  wave: 10,
  playerCounts: balancedPlayerCounts,
  enemyCounts: { ...emptyEnemyRoles, medic: 1, sniper: 1, tank: 1 },
  enemyRosterSize: 9
}), { type: 'crusader', saveForRole: true });

const criticalDamageText = new FloatingText({}, 'CRIT! -100', 0, 0, '#fff', true);
const emphasizedStatusText = new FloatingText({}, '웨이브 개시', 0, 0, '#fff', 'emphasis');
assert.equal(criticalDamageText.isCritical, true);
assert.equal(emphasizedStatusText.isCritical, false);
assert.equal(emphasizedStatusText.isEmphasis, true);
assert.ok(emphasizedStatusText.scale < criticalDamageText.scale);

// A level-one AI may not counter with a late-game Pit Lord/Crusader equivalent.
assert.equal(chooseAffordableUnit('crusader', 300, 1, () => 0), 'melee');
assert.equal(chooseAffordableUnit('ranged', 300, 1, () => 0), 'ranged');
assert.equal(chooseAffordableUnit('crusader', UNIT_COSTS.crusader, 3, () => 0), 'crusader');

console.log('balance rules: ok');
