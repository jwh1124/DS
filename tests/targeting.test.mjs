import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMATION_ROW_DEPTH, getAttackRangeAgainst } from '../src/combatMath.js';
import {
  getCombatTargetTier,
  isValidMedicTarget,
  MEDIC_HEAL_RANGE,
  selectCombatTarget
} from '../src/targeting.js';

const distanceTo = target => target.distance;
const scoreByDistance = (_target, distance) => distance;

test('medic healing reaches past the ordinary ranged firing line from a rear formation row', () => {
  const rearMedic = { range: MEDIC_HEAL_RANGE, formationRow: 1 };
  assert.equal(MEDIC_HEAL_RANGE, 260);
  assert.equal(getAttackRangeAgainst(rearMedic, { type: 'melee' }), 260 + FORMATION_ROW_DEPTH);
  assert.ok(getAttackRangeAgainst(rearMedic, { type: 'melee' }) > 250);
});

test('both teams leave a medic until every combat unit is gone', () => {
  for (const team of ['player', 'enemy']) {
    const medic = { team, type: 'medic', distance: 40 };
    const distantCombatant = { team, type: 'ranged', distance: 500 };
    const selected = selectCombatTarget(
      [medic, distantCombatant],
      distanceTo,
      scoreByDistance
    );
    assert.equal(selected.target, distantCombatant);
  }
});

test('medic is still eliminated before the enemy base once no combat unit remains', () => {
  const medic = { type: 'medic', distance: 300 };
  const base = { techLevel: 2, distance: 100 };
  const selected = selectCombatTarget([base, medic], distanceTo, scoreByDistance);

  assert.equal(getCombatTargetTier(medic), 1);
  assert.equal(getCombatTargetTier(base), 2);
  assert.equal(selected.target, medic);
});

test('base artillery shares the same medic-last ranking among reachable enemies', () => {
  const nearbyMedic = { type: 'medic', distance: 40 };
  const distantCombatant = { type: 'melee', distance: 500 };
  const selected = selectCombatTarget(
    [nearbyMedic, distantCombatant],
    distanceTo,
    scoreByDistance
  );

  assert.equal(selected.target, distantCombatant);
});

test('medics sustain ordinary allies but cannot erase boss damage indefinitely', () => {
  const healer = { type: 'medic' };
  const ally = { type: 'melee', isAlive: true, hp: 50, maxHp: 120 };
  const boss = { type: 'tank', isBoss: true, isAlive: true, hp: 900, maxHp: 1500 };

  assert.equal(isValidMedicTarget(healer, ally), true);
  assert.equal(isValidMedicTarget(healer, boss), false);
});
