export const AUDIO_BUS_DB = Object.freeze({
  master: -4,
  music: -15,
  sfx: -2,
  ui: -6
});

export const VOICE_INTERVALS = Object.freeze({
  shoot: 0.055,
  hit: 0.045,
  explosion: 0.12,
  magic: 0.09,
  click: 0.025
});

export function dbToGain(db) {
  return 10 ** (db / 20);
}

export function shouldEmitVoice(lastTime, now, minimumInterval) {
  return !Number.isFinite(lastTime) || now - lastTime >= minimumInterval;
}

export function getCombatMusicMix(intensity) {
  const safeIntensity = Math.max(0, Math.min(1, Number(intensity) || 0));
  return {
    musicDb: AUDIO_BUS_DB.music + safeIntensity * 2,
    upperLayerGain: safeIntensity < 0.4 ? 0 : (safeIntensity - 0.4) / 0.6
  };
}
