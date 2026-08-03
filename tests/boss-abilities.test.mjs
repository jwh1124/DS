import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBossAbilityState,
  getBossAbilityHudState,
  getBossDamageTakenMultiplier,
  recordBossFocusedDamage,
  tryBeginBossAbility,
  updateBossAbilityState
} from '../src/bossAbilities.js';
import { resolveInfernalGateDamage } from '../src/baseDefense.js';

test('executioner sentence starts at authored health gates and only boss focus interrupts it', () => {
  const state = createBossAbilityState('executioner');
  assert.equal(tryBeginBossAbility(state, 700, 1000), false);
  assert.equal(tryBeginBossAbility(state, 680, 1000), true);
  assert.equal(state.interruptRequired, 100);

  recordBossFocusedDamage(state, 90, '후열 집중');
  assert.equal(updateBossAbilityState(state, 0.2), null);
  recordBossFocusedDamage(state, 100, '대악마 집중');

  assert.equal(updateBossAbilityState(state, 0.01).type, 'interrupted');
  assert.equal(state.status, 'staggered');
  assert.match(getBossAbilityHudState(state).detail, /집중 공격 기회/);
});

test('an unanswered executioner sentence resolves instead of repeating the same threshold', () => {
  const state = createBossAbilityState('executioner');
  assert.equal(tryBeginBossAbility(state, 650, 1000), true);
  assert.equal(updateBossAbilityState(state, 2.5).type, 'executed');
  assert.equal(tryBeginBossAbility(state, 650, 1000), false);
  assert.equal(tryBeginBossAbility(state, 330, 1000), true);
});

test('sovereign rite shields the boss until rear ritual anchors are destroyed', () => {
  const state = createBossAbilityState('sovereign');
  assert.equal(tryBeginBossAbility(state, 710, 1000), true);
  assert.equal(getBossDamageTakenMultiplier(state), 0.35);
  assert.equal(updateBossAbilityState(state, 1, { anchorsAlive: 2 }), null);

  const hud = getBossAbilityHudState(state, { anchorsAlive: 2 });
  assert.match(hud.detail, /\[8\] 후열/);
  assert.equal(hud.recommendedOrder, 'rear');
  assert.equal(hud.shortcut, '8');
  assert.equal(updateBossAbilityState(state, 0.01, { anchorsAlive: 0 }).type, 'interrupted');
  assert.equal(getBossDamageTakenMultiplier(state), 1);
  assert.equal(getBossAbilityHudState(state).recommendedOrder, 'boss');
});

test('infernal gate rejects stale damage while a living boss locks the objective', () => {
  const locked = resolveInfernalGateDamage({
    hp: 1680,
    maxHp: 14000,
    amount: 4000,
    wave: 12,
    bossGateLocked: true
  });
  assert.equal(locked.nextHp, 1680);
  assert.equal(locked.blockedByBoss, true);

  const unlocked = resolveInfernalGateDamage({
    hp: 1680,
    maxHp: 14000,
    amount: 4000,
    wave: 12,
    bossGateLocked: false
  });
  assert.ok(unlocked.nextHp <= 0);
});

test('early infernal gate damage preserves only the final seal core', () => {
  const result = resolveInfernalGateDamage({
    hp: 1800,
    maxHp: 14000,
    amount: 1000,
    wave: 11
  });
  assert.equal(result.nextHp, 800);
  assert.equal(result.heldBySeal, false);

  const core = resolveInfernalGateDamage({
    hp: result.nextHp,
    maxHp: 14000,
    amount: 1000,
    wave: 11
  });
  assert.equal(core.nextHp, 1);
  assert.equal(core.heldBySeal, true);
});
