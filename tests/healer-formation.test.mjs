import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMedicSupportPoint,
  MEDIC_TRAILING_DISTANCE
} from '../src/healerFormation.js';

test('holy and infernal medics stay behind their own frontline', () => {
  const holyMedic = { team: 'player', x: 500, y: 360 };
  const holyPoint = getMedicSupportPoint(holyMedic, [
    { type: 'melee', x: 900, y: 340, isAlive: true },
    { type: 'ranged', x: 760, y: 390, isAlive: true }
  ]);
  assert.equal(holyPoint.x, 900 - MEDIC_TRAILING_DISTANCE);
  assert.ok(holyPoint.x < 900);

  const infernalMedic = { team: 'enemy', x: 1400, y: 360 };
  const infernalPoint = getMedicSupportPoint(infernalMedic, [
    { type: 'melee', x: 1000, y: 340, isAlive: true },
    { type: 'ranged', x: 1160, y: 390, isAlive: true }
  ]);
  assert.equal(infernalPoint.x, 1000 + MEDIC_TRAILING_DISTANCE);
  assert.ok(infernalPoint.x > 1000);
});

test('a medic follows a wounded rear ally without crossing the frontline', () => {
  const medic = { team: 'player', x: 700, y: 360 };
  const frontline = { type: 'melee', x: 1050, y: 350, isAlive: true };
  const woundedRear = { type: 'ranged', x: 650, y: 410, isAlive: true };
  const point = getMedicSupportPoint(medic, [frontline, woundedRear], woundedRear);

  assert.equal(point.x, woundedRear.x - MEDIC_TRAILING_DISTANCE);
  assert.ok(point.x < frontline.x - MEDIC_TRAILING_DISTANCE);
  assert.equal(point.y, woundedRear.y);
});

test('a lone medic holds position instead of charging a fortress', () => {
  assert.equal(getMedicSupportPoint({ team: 'player', x: 700, y: 360 }, []), null);
});
