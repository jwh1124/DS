export class HUD {
  constructor(game) {
    this.game = game;
    
    // Cache DOM elements
    this.mineralsText = document.getElementById('minerals-text');
    this.incomeText = document.getElementById('income-text');
    this.timerText = document.getElementById('timer-text');
    this.waveLabel = document.getElementById('wave-label');
    this.wavePreview = document.getElementById('wave-preview');
    this.launchWaveButton = document.getElementById('launch-wave-btn');
    
    this.pHealthText = document.getElementById('player-health-text');
    this.pHealthBar = document.getElementById('player-health-bar');
    
    this.eHealthText = document.getElementById('enemy-health-text');
    this.eHealthBar = document.getElementById('enemy-health-bar');
    this.eDefenseStatus = document.getElementById('enemy-defense-status');

    this.bossHud = document.getElementById('boss-hud');
    this.bossTier = document.getElementById('boss-tier');
    this.bossName = document.getElementById('boss-name');
    this.bossHealthText = document.getElementById('boss-health-text');
    this.bossHealthFill = document.getElementById('boss-health-fill');
    this.bossCounterHint = document.getElementById('boss-counter-hint');
    
    this.buildButtons = document.querySelectorAll('.build-btn');
  }

  update() {
    // Update economy
    this.mineralsText.textContent = Math.floor(this.game.economy.minerals);
    this.incomeText.textContent = `+${Math.floor(this.game.economy.income)} / wave`;
    
    // Update timer
    const waveSystem = this.game.waveSystem;
    const isFinale = waveSystem.aiWaveCount >= MAX_WAVES;
    const activeBoss = waveSystem.getActiveBoss?.();
    const bossGateLocked = waveSystem.isBossGateLocked?.() ?? false;
    this.timerText.textContent = bossGateLocked
      ? '격퇴'
      : isFinale
        ? `${Math.ceil(waveSystem.finalBattleTime)}s`
        : Math.max(0, waveSystem.timeUntilWave).toFixed(1);
    if (this.waveLabel) {
      this.waveLabel.textContent = bossGateLocked
        ? `WAVE ${waveSystem.aiWaveCount}/${MAX_WAVES} · 보스 교전`
        : isFinale
          ? 'FINAL WAVE · 지옥문 정화'
          : `WAVE ${waveSystem.aiWaveCount + 1}/${MAX_WAVES} · 악마 정찰`;
    }
    if (this.wavePreview) {
      this.wavePreview.textContent = bossGateLocked && activeBoss
        ? `${activeBoss.bossName} 격퇴 후 진군 · ${activeBoss.bossCounterHint}`
        : isFinale
          ? `최후 심판까지 ${Math.ceil(waveSystem.finalBattleTime)}초 · 지옥문을 정화하십시오`
          : waveSystem.getUpcomingWavePreview();
    }
    if (this.launchWaveButton) {
      this.launchWaveButton.disabled = bossGateLocked || isFinale || waveSystem.timeUntilWave <= 0.25;
      this.launchWaveButton.textContent = bossGateLocked
        ? '대악마 격퇴 필요'
        : isFinale
          ? '최후 정화 진행 중'
          : '[F] 조기 개시 · +20';
    }
    
    // Update Base Health
    const pBase = this.game.playerBase;
    const eBase = this.game.enemyBase;
    
    if (pBase) {
      this.pHealthText.textContent = `${Math.ceil(pBase.hp)} / ${pBase.maxHp}`;
      this.pHealthBar.style.width = `${(pBase.hp / pBase.maxHp) * 100}%`;
    }
    
    if (eBase) {
      this.eHealthText.textContent = `${Math.ceil(eBase.hp)} / ${eBase.maxHp}`;
      this.eHealthBar.style.width = `${(eBase.hp / eBase.maxHp) * 100}%`;
      if (this.eDefenseStatus) {
        const sealWavesLeft = Math.max(0, MAX_WAVES - waveSystem.aiWaveCount);
        this.eDefenseStatus.textContent = sealWavesLeft > 0
          ? `봉인 ${sealWavesLeft}W 후 해제 · 포탑 Lv.${eBase.techLevel}`
          : `봉인 해제 · 포탑 Lv.${eBase.techLevel}`;
        this.eDefenseStatus.classList.toggle('unsealed', sealWavesLeft === 0);
      }
    }

    this.updateBossHud();
    
    // Keep affordability and rule locks in one place so a locked card can never look purchasable.
    const currentMinerals = this.game.economy.minerals;
    const currentTech = this.game.playerBase?.techLevel ?? 1;
    const queueIsFull = this.game.waveSystem.spawners.player.length >= MAX_SPAWNERS;
    this.buildButtons.forEach(btn => {
      const type = btn.dataset.type;
      const cost = Number(btn.dataset.cost);
      const requiredTech = UNIT_TECH_REQUIREMENTS[type] ?? 1;
      const isLocked = requiredTech > currentTech;
      const isMaxTech = type === 'tech' && currentTech >= MAX_TECH_LEVEL;
      const isUnit = Object.hasOwn(UNIT_TECH_REQUIREMENTS, type);
      const isCoolingDown = type === 'ultimate' && this.game.ultimateCooldown > 0;

      btn.classList.toggle('locked-unit', isLocked);
      btn.disabled = isLocked || isMaxTech || isCoolingDown || currentMinerals < cost || (isUnit && queueIsFull);
    });
  }

  updateBossHud() {
    if (!this.bossHud) return;
    const boss = this.game.entityManager.entities
      .find(entity => entity.isBoss && entity.isAlive);

    if (!boss) {
      this.bossHud.classList.add('hidden');
      this.bossHud.setAttribute('aria-hidden', 'true');
      return;
    }

    const hpRatio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
    this.bossTier.textContent = boss.bossTierLabel;
    this.bossName.textContent = boss.bossName;
    this.bossHealthText.textContent = `${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;
    this.bossHealthFill.style.transform = `scaleX(${hpRatio})`;
    this.bossCounterHint.textContent = boss.bossCounterHint;
    this.bossHud.classList.remove('hidden');
    this.bossHud.setAttribute('aria-hidden', 'false');
  }
}
import { MAX_SPAWNERS, MAX_TECH_LEVEL, MAX_WAVES, UNIT_TECH_REQUIREMENTS } from '../gameConfig.js';
