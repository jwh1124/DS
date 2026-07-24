import { Unit } from '../entities/Unit.js';
import { FloatingText } from '../entities/FloatingText.js';
import { WORLD_WIDTH } from '../../main.js';

export class WaveSystem {
  constructor(game) {
    this.game = game;
    this.waveInterval = 15;
    this.timeUntilWave = this.waveInterval;
    this.isActive = false;
    
    this.spawners = {
      player: [],
      enemy: []
    };
    
    this.aiWaveCount = 0;
    this.aiMinerals = 200;
    this.aiIncome = 45; // AI income is tuned lower than player's (70) so Player always has economic advantage!
  }

  start() {
    this.isActive = true;
    this.timeUntilWave = 3;
    
    const diff = this.game.difficulty || 1.0;
    this.aiMinerals = Math.floor(200 * diff);
    // AI Income scaling: Easy 35, Normal 45, Hard 60 (Player gets 70!)
    this.aiIncome = Math.floor(45 * diff);
  }

  stop() {
    this.isActive = false;
  }
  
  addSpawner(team, type) {
    this.spawners[team].push(type);
  }

  update(dt) {
    if (!this.isActive) return;

    this.timeUntilWave -= dt;

    if (this.timeUntilWave <= 0) {
      this.spawnWave();
      this.timeUntilWave = this.waveInterval;
    }
  }

  spawnWave() {
    this.aiWaveCount++;
    
    // AI Income
    this.aiMinerals += this.aiIncome;
    
    const unitCosts = { melee: 50, ranged: 90, tank: 180 };
    const unitTypes = ['melee', 'ranged', 'tank'];
    
    // AI purchases units prudently
    let attempts = 0;
    while (this.aiMinerals >= 50 && attempts < 6) {
      attempts++;
      const affordable = unitTypes.filter(t => unitCosts[t] <= this.aiMinerals);
      if (affordable.length === 0) break;
      
      const chosen = affordable[Math.floor(Math.random() * affordable.length)];
      this.addSpawner('enemy', chosen);
      this.aiMinerals -= unitCosts[chosen];
    }
    
    // Boss wave check (Every 6 waves)
    let isBossWave = false;
    if (this.aiWaveCount > 0 && this.aiWaveCount % 6 === 0) {
      isBossWave = true;
      this.addSpawner('enemy', 'tank');
      
      if (this.game.audio) {
        this.game.audio.playBossAlarm();
      }
      if (this.game.addScreenShake) {
        this.game.addScreenShake(8);
      }
      
      this.game.entityManager.addEntity(new FloatingText(this.game, `⚠️ 경고: 보스 출격! (Wave ${this.aiWaveCount}) ⚠️`, WORLD_WIDTH/2, 180, '#ff0055', true));
    } else {
      this.game.entityManager.addEntity(new FloatingText(this.game, `WAVE ${this.aiWaveCount} 출격!`, WORLD_WIDTH/2, 220, '#00e5ff', false));
    }
    
    // Spawn player units
    const pBaseY = this.game.canvas.height / 2;
    this.spawners.player.forEach((type, idx) => {
      const yOffset = (idx % 5 - 2) * 22;
      const unit = new Unit(this.game, 150, pBaseY + yOffset, 'player', type);
      this.game.entityManager.addEntity(unit);
    });

    // Spawn enemy units
    const eBaseY = this.game.canvas.height / 2;
    this.spawners.enemy.forEach((type, idx) => {
      const yOffset = (idx % 5 - 2) * 22;
      const unit = new Unit(this.game, WORLD_WIDTH - 200, eBaseY + yOffset, 'enemy', type);
      
      if (isBossWave && idx === this.spawners.enemy.length - 1) {
        unit.makeBoss();
      }
      
      this.game.entityManager.addEntity(unit);
    });
    
    // Trigger player income
    this.game.economy.triggerIncome();
    if (this.game.playerBase) {
      const incomeAmt = this.game.economy.income;
      this.game.entityManager.addEntity(new FloatingText(this.game, `+${incomeAmt} 💎`, this.game.playerBase.x, this.game.playerBase.y - 80, '#2ecc71', true));
    }
  }
}
