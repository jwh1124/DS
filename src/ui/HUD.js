export class HUD {
  constructor(game) {
    this.game = game;
    
    // Cache DOM elements
    this.mineralsText = document.getElementById('minerals-text');
    this.incomeText = document.getElementById('income-text');
    this.timerText = document.getElementById('timer-text');
    
    this.pHealthText = document.getElementById('player-health-text');
    this.pHealthBar = document.getElementById('player-health-bar');
    
    this.eHealthText = document.getElementById('enemy-health-text');
    this.eHealthBar = document.getElementById('enemy-health-bar');
    
    this.buildButtons = document.querySelectorAll('.build-btn');
  }

  update() {
    // Update economy
    this.mineralsText.textContent = Math.floor(this.game.economy.minerals);
    this.incomeText.textContent = `+${Math.floor(this.game.economy.income)} / wave`;
    
    // Update timer
    this.timerText.textContent = Math.max(0, this.game.waveSystem.timeUntilWave).toFixed(1);
    
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
    }
    
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
}
import { MAX_SPAWNERS, MAX_TECH_LEVEL, UNIT_TECH_REQUIREMENTS } from '../gameConfig.js';
