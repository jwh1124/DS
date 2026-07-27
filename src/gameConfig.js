export const UNIT_TYPES = ['melee', 'ranged', 'medic', 'sniper', 'tank', 'crusader'];

export const UNIT_TECH_REQUIREMENTS = {
  melee: 1,
  ranged: 1,
  medic: 2,
  sniper: 3,
  tank: 4,
  crusader: 5
};

export const UNIT_COSTS = {
  melee: 50,
  ranged: 100,
  medic: 120,
  sniper: 150,
  tank: 200,
  crusader: 250
};

export const MAX_TECH_LEVEL = 5;
export const MAX_SPAWNERS = 50;
export const PLAYER_STARTING_MINERALS = 300;
export const AI_STARTING_MINERALS = 250;
export const PLAYER_STARTING_INCOME = 60;
export const AI_STARTING_INCOME = 60;
export const FIRST_WAVE_DELAY = 10;
export const WAVE_INTERVAL = 15;

export function getTechUpgradeCost(currentTechLevel) {
  if (currentTechLevel >= MAX_TECH_LEVEL) return Infinity;
  return 800 * (2 ** (currentTechLevel - 1));
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
