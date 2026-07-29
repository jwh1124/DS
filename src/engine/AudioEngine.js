import {
  AUDIO_BUS_DB,
  dbToGain,
  getCombatMusicMix,
  shouldEmitVoice,
  VOICE_INTERVALS
} from '../audioMix.js';

export class AudioEngine {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.isMuted = false;
    this.bgmPlaying = false;
    this.bgmInterval = null;
    this.musicStep = 0;
    this.combatIntensity = 0;
    this.lastAppliedIntensity = -1;
    this.duckUntil = 0;
    this.lastVoiceAt = {};
    this.voiceStats = { played: 0, dropped: 0 };
    this.maxObservedPeak = 0;

    this.masterGain = this.audioCtx.createGain();
    this.musicGain = this.audioCtx.createGain();
    this.sfxGain = this.audioCtx.createGain();
    this.uiGain = this.audioCtx.createGain();
    this.analyser = this.audioCtx.createAnalyser();
    this.limiter = this.audioCtx.createDynamicsCompressor();
    this.analysisBuffer = new Float32Array(256);

    this.masterGain.gain.value = dbToGain(AUDIO_BUS_DB.master);
    this.musicGain.gain.value = dbToGain(AUDIO_BUS_DB.music);
    this.sfxGain.gain.value = dbToGain(AUDIO_BUS_DB.sfx);
    this.uiGain.gain.value = dbToGain(AUDIO_BUS_DB.ui);

    this.limiter.threshold.value = -5;
    this.limiter.knee.value = 4;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.22;
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.55;

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.uiGain.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.limiter);
    this.limiter.connect(this.audioCtx.destination);

    const bufferSize = this.audioCtx.sampleRate * 0.5;
    this.noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  ensureRunning() {
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
  }

  allowVoice(group, bypassLimit = false) {
    if (bypassLimit) {
      this.voiceStats.played++;
      return true;
    }

    const now = this.audioCtx.currentTime;
    const interval = VOICE_INTERVALS[group] ?? 0;
    if (!shouldEmitVoice(this.lastVoiceAt[group], now, interval)) {
      this.voiceStats.dropped++;
      return false;
    }

    this.lastVoiceAt[group] = now;
    this.voiceStats.played++;
    return true;
  }

  getDebugState() {
    this.analyser.getFloatTimeDomainData(this.analysisBuffer);
    let peak = 0;
    for (const sample of this.analysisBuffer) peak = Math.max(peak, Math.abs(sample));
    this.maxObservedPeak = Math.max(this.maxObservedPeak, peak);
    return {
      played: this.voiceStats.played,
      dropped: this.voiceStats.dropped,
      intensity: this.combatIntensity,
      peak: this.maxObservedPeak,
      contextState: this.audioCtx.state
    };
  }

  setCombatIntensity(value) {
    this.combatIntensity = Math.max(0, Math.min(1, Number(value) || 0));
    const now = this.audioCtx.currentTime;
    if (now < this.duckUntil || Math.abs(this.combatIntensity - this.lastAppliedIntensity) < 0.05) return;

    const mix = getCombatMusicMix(this.combatIntensity);
    this.musicGain.gain.setTargetAtTime(dbToGain(mix.musicDb), now, 0.35);
    this.lastAppliedIntensity = this.combatIntensity;
  }

  duckMusic(major = false) {
    if (!this.bgmPlaying) return;
    const now = this.audioCtx.currentTime;
    const normal = dbToGain(getCombatMusicMix(this.combatIntensity).musicDb);
    const ducked = normal * (major ? 0.28 : 0.58);
    const hold = major ? 0.55 : 0.24;

    this.duckUntil = Math.max(this.duckUntil, now + hold);
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(ducked, now, 0.015);
    this.musicGain.gain.setTargetAtTime(normal, now + hold, major ? 0.28 : 0.18);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    const now = this.audioCtx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(
      this.isMuted ? 0.0001 : dbToGain(AUDIO_BUS_DB.master),
      now,
      0.025
    );
    if (this.isMuted) this.stopBGM();
    else this.startBGM();
    return this.isMuted;
  }

  startBGM() {
    if (this.bgmPlaying || this.isMuted) return;
    this.bgmPlaying = true;
    this.ensureRunning();
    this.playMusicPulse();
    this.bgmInterval = setInterval(() => this.playMusicPulse(), 720);
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  playMusicPulse() {
    if (!this.bgmPlaying || this.isMuted) return;
    const roots = [110, 110, 146.83, 123.47, 98, 110, 164.81, 123.47];
    const root = roots[this.musicStep % roots.length];
    const now = this.audioCtx.currentTime;
    const mix = getCombatMusicMix(this.combatIntensity);

    const osc = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(root, now);
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    gain.gain.setValueAtTime(0.34, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.7);

    if (mix.upperLayerGain > 0) {
      const upper = this.audioCtx.createOscillator();
      const upperGain = this.audioCtx.createGain();
      upper.type = 'sine';
      upper.frequency.setValueAtTime(root * 1.5, now);
      upperGain.gain.setValueAtTime(0.08 * mix.upperLayerGain, now);
      upperGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      upper.connect(upperGain);
      upperGain.connect(this.musicGain);
      upper.start(now);
      upper.stop(now + 0.44);
    }

    this.musicStep++;
  }

  playShoot() {
    if (this.isMuted || !this.allowVoice('shoot')) return false;
    this.ensureRunning();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const variation = 0.94 + Math.random() * 0.12;

    osc.type = 'square';
    osc.frequency.setValueAtTime(620 * variation, now);
    osc.frequency.exponentialRampToValueAtTime(105 * variation, now + 0.07);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.075);
    return true;
  }

  playHit() {
    if (this.isMuted || !this.allowVoice('hit')) return false;
    this.ensureRunning();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const variation = 0.95 + Math.random() * 0.1;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(135 * variation, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.055);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
    return true;
  }

  playExplosion(options = {}) {
    const major = Boolean(options.major);
    if (this.isMuted || !this.allowVoice('explosion', major)) return false;
    this.ensureRunning();
    this.duckMusic(major);
    const now = this.audioCtx.currentTime;
    const noise = this.audioCtx.createBufferSource();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();
    noise.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(major ? 1350 : 900, now);
    filter.frequency.exponentialRampToValueAtTime(75, now + (major ? 0.48 : 0.3));
    gain.gain.setValueAtTime(major ? 0.36 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (major ? 0.48 : 0.3));
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + (major ? 0.5 : 0.32));
    return true;
  }

  playBossAlarm() {
    if (this.isMuted) return;
    this.ensureRunning();
    this.duckMusic(true);

    for (let i = 0; i < 2; i++) {
      setTimeout(() => {
        if (this.isMuted) return;
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(196, now);
        osc.frequency.linearRampToValueAtTime(293.66, now + 0.28);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.3);
      }, i * 330);
    }
  }

  playClick() {
    if (this.isMuted || !this.allowVoice('click')) return false;
    this.ensureRunning();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(1080, now + 0.045);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(this.uiGain);
    osc.start(now);
    osc.stop(now + 0.05);
    return true;
  }

  playMagic() {
    if (this.isMuted || !this.allowVoice('magic')) return false;
    this.ensureRunning();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const variation = 0.96 + Math.random() * 0.08;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330 * variation, now);
    osc.frequency.linearRampToValueAtTime(660 * variation, now + 0.32);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.34);
    return true;
  }
}
