const BOSS_ABILITY_PROFILES = Object.freeze({
  executioner: Object.freeze({
    id: 'executionerSentence',
    name: '처형 선고',
    thresholds: Object.freeze([0.68, 0.34]),
    castDuration: 2.4,
    interruptRatio: 0.1,
    staggerDuration: 1.8,
    executionTargetCount: 3,
    instruction: '[9] 대형 집중으로 저지'
  }),
  sovereign: Object.freeze({
    id: 'throneRite',
    name: '왕좌 의식',
    thresholds: Object.freeze([0.72, 0.38]),
    castDuration: 4.2,
    anchorCount: 2,
    shieldMultiplier: 0.35,
    staggerDuration: 2.2,
    instruction: '[8] 후열로 시종 제거'
  })
});

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function getBossAbilityProfile(profileId) {
  return BOSS_ABILITY_PROFILES[profileId] ?? null;
}

export function createBossAbilityState(profileId) {
  const profile = getBossAbilityProfile(profileId);
  if (!profile) return null;

  return {
    profileId,
    status: 'idle',
    nextThresholdIndex: 0,
    remaining: 0,
    duration: profile.castDuration,
    interruptDamage: 0,
    interruptRequired: 0,
    staggerRemaining: 0,
    lastResult: ''
  };
}

export function tryBeginBossAbility(state, hp, maxHp) {
  if (!state || state.status !== 'idle') return false;
  const profile = getBossAbilityProfile(state.profileId);
  const threshold = profile?.thresholds[state.nextThresholdIndex];
  if (threshold === undefined || maxHp <= 0 || hp / maxHp > threshold) return false;

  state.status = 'casting';
  state.remaining = profile.castDuration;
  state.duration = profile.castDuration;
  state.interruptDamage = 0;
  state.interruptRequired = state.profileId === 'executioner'
    ? Math.ceil(maxHp * profile.interruptRatio)
    : 0;
  state.nextThresholdIndex += 1;
  state.lastResult = '';
  return true;
}

export function recordBossFocusedDamage(state, damage, hitLabel) {
  if (
    !state
    || state.status !== 'casting'
    || state.profileId !== 'executioner'
    || hitLabel !== '대악마 집중'
  ) {
    return 0;
  }

  state.interruptDamage += Math.max(0, Number(damage) || 0);
  return state.interruptDamage;
}

export function updateBossAbilityState(state, dt, { anchorsAlive = 0 } = {}) {
  if (!state) return null;
  const profile = getBossAbilityProfile(state.profileId);
  if (!profile) return null;

  if (state.status === 'staggered') {
    state.staggerRemaining = Math.max(0, state.staggerRemaining - Math.max(0, dt));
    if (state.staggerRemaining <= 0) {
      state.status = 'idle';
      return { type: 'recovered' };
    }
    return null;
  }

  if (state.status !== 'casting') return null;
  state.remaining = Math.max(0, state.remaining - Math.max(0, dt));

  const interrupted = state.profileId === 'executioner'
    ? state.interruptDamage >= state.interruptRequired
    : anchorsAlive <= 0;
  if (interrupted) {
    state.status = 'staggered';
    state.staggerRemaining = profile.staggerDuration;
    state.lastResult = 'interrupted';
    return { type: 'interrupted', staggerDuration: profile.staggerDuration };
  }

  if (state.remaining <= 0) {
    state.status = 'idle';
    state.lastResult = 'executed';
    return { type: 'executed' };
  }

  return null;
}

export function getBossDamageTakenMultiplier(state) {
  if (state?.status !== 'casting' || state.profileId !== 'sovereign') return 1;
  return getBossAbilityProfile('sovereign').shieldMultiplier;
}

export function getBossAbilityHudState(state, { anchorsAlive = 0 } = {}) {
  if (!state || state.status === 'idle') return { active: false };
  const profile = getBossAbilityProfile(state.profileId);

  if (state.status === 'staggered') {
    return {
      active: true,
      state: 'staggered',
      name: '대악마 무력화',
      detail: `${state.staggerRemaining.toFixed(1)}초 집중 공격 기회`,
      progress: clamp01(state.staggerRemaining / profile.staggerDuration)
    };
  }

  if (state.profileId === 'executioner') {
    return {
      active: true,
      state: 'casting',
      name: profile.name,
      detail: `${Math.floor(state.interruptDamage)} / ${state.interruptRequired} 집중 피해 · ${profile.instruction}`,
      progress: clamp01(state.interruptDamage / state.interruptRequired)
    };
  }

  return {
    active: true,
    state: 'casting',
    name: profile.name,
    detail: `의식 시종 ${anchorsAlive}명 · ${profile.instruction}`,
    progress: clamp01(1 - state.remaining / state.duration)
  };
}
