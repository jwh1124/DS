import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyRunOmen,
  getRunOmen,
  getRunOmenBriefing,
  getRunOmenDoctrineAdvice
} from '../src/runOmens.js';

test('seeded run omens cover three distinct campaign threats', () => {
  assert.equal(getRunOmen(0).id, 'bloodMoon');
  assert.equal(getRunOmen(0.34).id, 'ironCovenant');
  assert.equal(getRunOmen(0.8).id, 'nightChoir');
});

test('a run omen changes only its authored enemy role', () => {
  const omen = getRunOmen(0);
  const imp = { type: 'melee', maxHp: 100, hp: 60, damage: 12, speed: 170 };
  const succubus = { type: 'ranged', maxHp: 100, hp: 100, damage: 12, speed: 170 };
  assert.equal(applyRunOmen(imp, omen), true);
  assert.ok(Math.abs(imp.speed - 183.6) < 0.000001);
  assert.equal(imp.hp, 100);
  assert.equal(applyRunOmen(succubus, omen), false);
  assert.equal(succubus.speed, 170);
});

test('run omen briefing turns the modifier into a player-facing response', () => {
  const briefing = getRunOmenBriefing(getRunOmen(0.8));
  assert.equal(briefing.title, '밤의 합창 · 서큐버스·밴시 피해 +8%');
  assert.match(briefing.advice, /사제/);
});

test('each omen points the player at a doctrine that counters its threat', () => {
  assert.equal(getRunOmenDoctrineAdvice(getRunOmen(0), 3), 'shieldWall');
  assert.equal(getRunOmenDoctrineAdvice(getRunOmen(0.34), 6), 'martyrVow');
  assert.equal(getRunOmenDoctrineAdvice(getRunOmen(0.8), 9), 'sanctuary');
});
