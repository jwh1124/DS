const BOSS_PROFILES = Object.freeze({
  executioner: Object.freeze({
    id: 'executioner',
    wave: 6,
    name: '심연의 집행관',
    tierLabel: 'WAVE 6 · 대악마',
    counterHint: '[9] 대형 집중으로 처형 선고 저지 · 심판관 피해 +35%',
    spritePath: 'sprites/abyssal-executioner-boss-v1.png',
    drawHeight: 110,
    worldScale: 1.7,
    hpMultiplier: 3.5,
    damageMultiplier: 0.65,
    splashRadius: 60,
    splashRatio: 0.15,
    canCrit: false,
    escortCap: 4,
    radiusMultiplier: 2.2
  }),
  sovereign: Object.freeze({
    id: 'sovereign',
    wave: 12,
    name: '지옥 군주',
    tierLabel: 'FINAL WAVE · 지옥의 왕좌',
    counterHint: '[8] 후열로 의식 시종 제거 · [9] 대형으로 군주 집중',
    spritePath: 'sprites/hell-sovereign-boss-v1.png',
    drawHeight: 125,
    worldScale: 1.85,
    hpMultiplier: 5,
    damageMultiplier: 1.2,
    splashRadius: 80,
    splashRatio: 0.35,
    canCrit: false,
    escortCap: 10,
    radiusMultiplier: 2.2
  })
});

const BOSS_BY_WAVE = Object.freeze({
  6: BOSS_PROFILES.executioner,
  12: BOSS_PROFILES.sovereign
});

export const BOSS_RECOVERY_DELAY = 8;
const BOSS_GATE_INACTIVE = Object.freeze({ locked: false, completed: false });
const BOSS_GATE_LOCKED = Object.freeze({ locked: true, completed: false });
const BOSS_GATE_COMPLETED = Object.freeze({ locked: false, completed: true });

export function getBossProfile(id) {
  return BOSS_PROFILES[id] ?? null;
}

export function getBossProfileForWave(wave) {
  return BOSS_BY_WAVE[wave] ?? null;
}

export function selectBossEscortContracts(contracts, cap) {
  const safeContracts = Array.isArray(contracts) ? contracts : [];
  const safeCap = Math.max(0, Math.floor(Number(cap) || 0));
  if (safeContracts.length <= safeCap) return safeContracts.slice();

  const medic = safeContracts.find(contract => contract.type === 'medic');
  const combatants = safeContracts.filter(contract => contract !== medic);
  if (!medic || safeCap === 0) return combatants.slice(0, safeCap);
  return [...combatants.slice(0, safeCap - 1), medic];
}

export function resolveBossGate(gateActive, bossAlive) {
  if (!gateActive) return BOSS_GATE_INACTIVE;
  return bossAlive ? BOSS_GATE_LOCKED : BOSS_GATE_COMPLETED;
}
