export const UNIT_TYPES = ['melee', 'ranged', 'medic', 'sniper', 'tank', 'crusader'];

export const UNIT_TECH_REQUIREMENTS = {
  melee: 1,
  ranged: 1,
  medic: 2,
  sniper: 2,
  tank: 3,
  crusader: 3
};

export const UNIT_COSTS = {
  melee: 50,
  ranged: 100,
  medic: 120,
  sniper: 150,
  tank: 200,
  crusader: 250
};

// Three readable milestones are easier to play around than the old five-level
// exponential ladder. A player can choose economy, troops, or one of two
// tangible unlocks during a normal-length match.
export const MAX_TECH_LEVEL = 3;
// A compact roster keeps every role legible in a single wave.
export const MAX_SPAWNERS = 16;
export const MAX_WAVES = 12;
// Normal mode needs enough room to field an opening line and still make a
// meaningful economy/tech decision before the mid-boss arrives.
export const PLAYER_STARTING_MINERALS = 400;
export const AI_STARTING_MINERALS = 180;
export const PLAYER_STARTING_INCOME = 90;
export const AI_STARTING_INCOME = 50;
// A full twelve-wave campaign is roughly eight minutes without early starts.
export const FIRST_WAVE_DELAY = 15;
export const WAVE_INTERVAL = 40;

// Base artillery should protect the final approach, not control half the map.
// Level 2 is 38 DPS and level 3 is 58 DPS before the reduced splash damage.
export const BASE_TURRET_BALANCE = Object.freeze({
  range: 360,
  baseDamage: 35,
  damagePerUpgrade: 20,
  baseInterval: 1.6,
  intervalMultiplier: 0.9,
  splashRadius: 70,
  splashRatio: 0.25
});

export function getBaseTurretStats(techLevel) {
  const upgrades = Math.max(0, Math.min(MAX_TECH_LEVEL, techLevel) - 1);
  return {
    range: BASE_TURRET_BALANCE.range,
    damage: BASE_TURRET_BALANCE.baseDamage + BASE_TURRET_BALANCE.damagePerUpgrade * upgrades,
    interval: BASE_TURRET_BALANCE.baseInterval * (BASE_TURRET_BALANCE.intervalMultiplier ** upgrades)
  };
}

export function getTechUpgradeCost(currentTechLevel) {
  if (currentTechLevel >= MAX_TECH_LEVEL) return Infinity;
  return 400;
}

export function getUnlockedUnitTypes(techLevel) {
  return UNIT_TYPES.filter(type => UNIT_TECH_REQUIREMENTS[type] <= techLevel);
}

export function chooseAffordableUnit(preferredType, minerals, techLevel, random = Math.random) {
  const affordable = getUnlockedUnitTypes(techLevel).filter(type => UNIT_COSTS[type] <= minerals);
  if (affordable.length === 0) return null;
  if (affordable.includes(preferredType)) return preferredType;
  return affordable[Math.floor(random() * affordable.length)];
}
