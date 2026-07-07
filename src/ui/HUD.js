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
    
    // Update button states (disabled if not enough minerals)
    const currentMinerals = this.game.economy.minerals;
    this.buildButtons.forEach(btn => {
      const cost = parseInt(btn.dataset.cost);
      if (currentMinerals >= cost) {
        btn.disabled = false;
      } else {
        btn.disabled = true;
      }
    });
  }
}
