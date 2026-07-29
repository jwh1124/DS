import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCameraTargetX,
  getFrontlineFocusX,
  smoothCameraX
} from '../src/cameraDirector.js';

test('frontline focus frames the closest opposing fronts', () => {
  const focus = getFrontlineFocusX([
    { team: 'player', type: 'melee', x: 500, attackSpeed: 1, isAlive: true },
    { team: 'player', type: 'ranged', x: 420, attackSpeed: 1, isAlive: true },
    { team: 'enemy', type: 'melee', x: 760, attackSpeed: 1, isAlive: true },
    { team: 'enemy', type: 'ranged', x: 840, attackSpeed: 1, isAlive: true },
    { team: 'player', type: 'melee', x: 120, isAlive: true }
  ]);

  assert.equal(focus, 630);
});

test('frontline focus follows the holy advance before engagement', () => {
  const focus = getFrontlineFocusX([
    { team: 'player', type: 'melee', x: 500, attackSpeed: 1, isAlive: true },
    { team: 'enemy', type: 'melee', x: 1600, attackSpeed: 1, isAlive: true }
  ]);

  assert.equal(focus, 680);
});

test('single-army focus looks ahead in its direction of travel', () => {
  assert.equal(getFrontlineFocusX([
    { team: 'player', type: 'melee', x: 520, attackSpeed: 1, isAlive: true }
  ]), 640);
  assert.equal(getFrontlineFocusX([
    { team: 'enemy', type: 'melee', x: 1480, attackSpeed: 1, isAlive: true }
  ]), 1360);
  assert.equal(getFrontlineFocusX([]), null);
});

test('camera deadzone, smoothing, and world bounds remain stable', () => {
  assert.equal(getCameraTargetX({
    currentX: 0,
    focusX: 640,
    viewportWidth: 1280,
    worldWidth: 2000
  }), 0);

  assert.equal(getCameraTargetX({
    currentX: 0,
    focusX: 1500,
    viewportWidth: 1280,
    worldWidth: 2000
  }), 720);

  const atSixtyFps = smoothCameraX(0, 720, 1 / 60);
  const atThirtyFps = smoothCameraX(0, 720, 1 / 30);
  assert.ok(atSixtyFps > 0 && atSixtyFps < atThirtyFps);
  assert.ok(Math.abs(
    smoothCameraX(atSixtyFps, 720, 1 / 60) - atThirtyFps
  ) < 0.000001);
});
