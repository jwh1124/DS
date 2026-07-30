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
// The battlefield is intentionally wide. At the old speeds, a victorious
// squad spent the whole preparation window walking and never reached the gate.
export const UNIT_MOVEMENT_SPEED_MULTIPLIER = 2;
// Forty seconds is the maximum combat-to-combat cadence, not a forced idle
// break. Once every enemy wave fighter is defeated, the remaining countdown
// contracts to a short, readable preparation window.
export const FIRST_WAVE_DELAY = 15;
// A victorious squad gets a short, explicit chance to damage the opposing
// fortress before withdrawing. Preparation starts only after that assault.
export const WAVE_ASSAULT_TIME = 8;
export const WAVE_PREP_TIME = 10;
export const BASE_TECH_HP_GAIN = 2000;

// The enemy gate is sealed until wave 12, while the cathedral has no matching
// protection. Holy units keep their exorcism bonus; demons deal normal damage
// to the cathedral so one leaked wave does not erase an entire run.
export const UNIT_VS_BASE_DAMAGE_MULTIPLIERS = Object.freeze({
  player: 2,
  enemy: 1
});

export function getUnitVsBaseDamageMultiplier(attackerTeam) {
  return UNIT_VS_BASE_DAMAGE_MULTIPLIERS[attackerTeam] ?? 1;
}

// Base artillery owns the longest engagement range, but only pressures one target.
// Level 2 is about 29 DPS and level 3 is about 42 DPS; neither level deals splash damage.
export const BASE_TURRET_BALANCE = Object.freeze({
  range: 640,
  baseDamage: 30,
  damagePerUpgrade: 15,
  baseInterval: 1.7,
  intervalMultiplier: 0.92,
  splashRadius: 0,
  splashRatio: 0
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
  return currentTechLevel === 1 ? 300 : 400;
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
