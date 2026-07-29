const BOSS_PROFILES = Object.freeze({
  executioner: Object.freeze({
    id: 'executioner',
    wave: 6,
    name: '심연의 집행관',
    tierLabel: 'WAVE 6 · 대악마',
    counterHint: '대형 약점 · 심판관 피해 +35%',
    spritePath: 'sprites/abyssal-executioner-boss-v1.png',
    drawHeight: 110,
    worldScale: 1.7,
    hpMultiplier: 5,
    damageMultiplier: 1.8,
    radiusMultiplier: 2.2
  }),
  sovereign: Object.freeze({
    id: 'sovereign',
    wave: 12,
    name: '지옥 군주',
    tierLabel: 'FINAL WAVE · 지옥의 왕좌',
    counterHint: '대형 약점 · 심판관과 사제 권장',
    spritePath: 'sprites/hell-sovereign-boss-v1.png',
    drawHeight: 125,
    worldScale: 1.85,
    hpMultiplier: 5,
    damageMultiplier: 1.8,
    radiusMultiplier: 2.2
  })
});

const BOSS_BY_WAVE = Object.freeze({
  6: BOSS_PROFILES.executioner,
  12: BOSS_PROFILES.sovereign
});

export function getBossProfile(id) {
  return BOSS_PROFILES[id] ?? null;
}

export function getBossProfileForWave(wave) {
  return BOSS_BY_WAVE[wave] ?? null;
}
