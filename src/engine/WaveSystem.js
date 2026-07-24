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
  }

  start() {
    this.isActive = true;
    this.timeUntilWave = this.waveInterval;
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
    
    const types = ['melee', 'ranged', 'tank'];
    this.spawners.enemy = [];
    
    const difficultyMultiplier = this.game.difficulty || 1.0;
    const maxEnemies = Math.floor(18 * difficultyMultiplier);
    // Smoother scaling formula so Normal difficulty is fun and manageable
    const numEnemies = Math.min(1 + Math.floor(this.aiWaveCount * 0.9 * difficultyMultiplier), maxEnemies);
    
    for(let i = 0; i < numEnemies; i++) {
      const randomType = types[Math.floor(Math.random() * types.length)];
      this.addSpawner('enemy', randomType);
    }
    
    let isBossWave = false;
    // Boss wave every 6 waves
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
      this.game.entityManager.addEntity(new FloatingText(this.game, `WAVE ${this.aiWaveCount} 돌격!`, WORLD_WIDTH/2, 220, '#00e5ff', false));
    }
    
    // Spawn player units
    const pBaseY = this.game.canvas.height / 2;
    this.spawners.player.forEach((type, idx) => {
      const yOffset = (idx % 5 - 2) * 20;
      const unit = new Unit(this.game, 150, pBaseY + yOffset, 'player', type);
      this.game.entityManager.addEntity(unit);
    });

    // Spawn enemy units
    const eBaseY = this.game.canvas.height / 2;
    this.spawners.enemy.forEach((type, idx) => {
      const yOffset = (idx % 5 - 2) * 20;
      const unit = new Unit(this.game, WORLD_WIDTH - 200, eBaseY + yOffset, 'enemy', type);
      
      if (isBossWave && idx === this.spawners.enemy.length - 1) {
        unit.makeBoss();
      }
      
      this.game.entityManager.addEntity(unit);
    });
    
    // Trigger income
    this.game.economy.triggerIncome();
    if (this.game.playerBase) {
      const incomeAmt = this.game.economy.income;
      this.game.entityManager.addEntity(new FloatingText(this.game, `+${incomeAmt} 💎`, this.game.playerBase.x, this.game.playerBase.y - 80, '#2ecc71', true));
    }
  }
}
