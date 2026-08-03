const DIFFICULTY_PROFILES = Object.freeze({
  '0.7': Object.freeze({ enemyHp: 0.85, enemyDamage: 0.85, bossHp: 0.9, bossDamage: 0.9 }),
  '1': Object.freeze({ enemyHp: 1, enemyDamage: 1, bossHp: 1, bossDamage: 1 }),
  // Preserve the shipped Hard tuning while making Inferno a distinct endgame test.
  '1.25': Object.freeze({ enemyHp: 1.125, enemyDamage: 1.125, bossHp: 1, bossDamage: 1 }),
  '1.5': Object.freeze({ enemyHp: 1.5, enemyDamage: 1.35, bossHp: 1.2, bossDamage: 1.1 })
});

export function getDifficultyProfile(difficulty) {
  return DIFFICULTY_PROFILES[String(Number(difficulty) || 1)] ?? DIFFICULTY_PROFILES['1'];
}
