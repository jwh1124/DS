import {
  getTechUpgradeCost,
  MAX_SPAWNERS,
  UNIT_COSTS
} from './gameConfig.js';

const EMPTY_ROSTER = Object.freeze({
  melee: 0,
  ranged: 0,
  medic: 0,
  sniper: 0,
  tank: 0,
  crusader: 0
});

function normalizedRoster(counts = {}) {
  return Object.fromEntries(
    Object.keys(EMPTY_ROSTER).map(type => [type, Math.max(0, Math.floor(Number(counts[type]) || 0))])
  );
}

function targetTechLevel(nextWave) {
  // Start banking during the late roster window so Lv.3 and one durable unit
  // are both available before the final battle, rather than reaching the cap
  // with a strong-but-fragile support roster.
  if (nextWave >= 8) return 3;
  // Automatic formation commits to support tech directly after the first
  // encounter; otherwise it keeps spending the early income on filler units
  // and cannot field a medic + judge before the wave-six mini-boss.
  if (nextWave >= 2) return 2;
  return 1;
}

function targetRoster(nextWave) {
  if (nextWave >= 10) {
    return { melee: 4, ranged: 2, medic: 2, sniper: 2, tank: 1, crusader: 1 };
  }
  if (nextWave >= 7) {
    return { melee: 4, ranged: 2, medic: 2, sniper: 2 };
  }
  if (nextWave >= 4) {
    return { melee: 4, ranged: 2, medic: 1, sniper: 1 };
  }
  // A compact opening leaves enough starting faith to reach Lv.2 on time.
  // The planner fills the fourth frontline slot after support is unlocked.
  return { melee: 3, ranged: 1 };
}

function fallbackType(techLevel, roster) {
  if (techLevel >= 3 && roster.tank + roster.crusader < 3) return 'tank';
  if (techLevel >= 2 && roster.medic < roster.melee / 3) return 'medic';
  if (techLevel >= 2 && roster.sniper < roster.ranged / 2) return 'sniper';
  return roster.melee <= roster.ranged * 2 ? 'melee' : 'ranged';
}

export function getAutoFormationAction({
  currentWave = 0,
  techLevel = 1,
  minerals = 0,
  counts = {},
  maxSpawners = MAX_SPAWNERS
}) {
  const wave = Math.max(1, Math.floor(Number(currentWave) || 0) + 1);
  const tech = Math.max(1, Math.floor(Number(techLevel) || 1));
  const faith = Math.max(0, Math.floor(Number(minerals) || 0));
  const roster = normalizedRoster(counts);
  const rosterSize = Object.values(roster).reduce((total, count) => total + count, 0);
  const requiredTech = targetTechLevel(wave);

  if (tech < requiredTech) {
    const cost = getTechUpgradeCost(tech);
    return faith >= cost ? { type: 'tech', cost } : null;
  }
  if (rosterSize >= maxSpawners) return null;

  const target = targetRoster(wave);
  const missingTarget = Object.keys(target).find(unitType => roster[unitType] < target[unitType]);
  // Once the compact opening is complete, retain every remaining coin for the
  // first revelation instead of padding the roster with units that delay it.
  if (!missingTarget && tech < 2) return null;
  const type = missingTarget ?? fallbackType(tech, roster);
  const cost = UNIT_COSTS[type];
  return faith >= cost ? { type, cost } : null;
}
