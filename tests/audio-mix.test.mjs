import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIO_BUS_DB,
  dbToGain,
  getCombatMusicMix,
  shouldEmitVoice,
  VOICE_INTERVALS
} from '../src/audioMix.js';

test('audio buses preserve headroom before the master limiter', () => {
  assert.ok(AUDIO_BUS_DB.master < 0);
  assert.ok(AUDIO_BUS_DB.music < AUDIO_BUS_DB.sfx);
  assert.ok(AUDIO_BUS_DB.ui < 0);
  assert.ok(dbToGain(AUDIO_BUS_DB.master) < 1);
  assert.ok(dbToGain(-6) > 0.5 && dbToGain(-6) < 0.51);
});

test('rapid repeated voices are suppressed at category-specific intervals', () => {
  assert.equal(shouldEmitVoice(undefined, 1, VOICE_INTERVALS.shoot), true);
  assert.equal(shouldEmitVoice(1, 1.02, VOICE_INTERVALS.shoot), false);
  assert.equal(shouldEmitVoice(1, 1.06, VOICE_INTERVALS.shoot), true);
  assert.ok(VOICE_INTERVALS.explosion > VOICE_INTERVALS.hit);
});

test('combat music layer rises gradually without exceeding its mix ceiling', () => {
  assert.deepEqual(getCombatMusicMix(0), { musicDb: -15, upperLayerGain: 0 });
  assert.deepEqual(getCombatMusicMix(1), { musicDb: -13, upperLayerGain: 1 });
  assert.deepEqual(getCombatMusicMix(3), { musicDb: -13, upperLayerGain: 1 });
  assert.equal(getCombatMusicMix(0.4).upperLayerGain, 0);
});
