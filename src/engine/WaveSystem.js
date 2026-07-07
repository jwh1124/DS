import { Unit } from '../entities/Unit.js';

export class WaveSystem {
  constructor(game) {
    this.game = game;
    this.waveInterval = 15; // 15 seconds per wave
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
  
  // Directly add a unit type to the spawn queue
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
    
    // AI Builder Logic
    if (this.aiWaveCount % 2 === 0) {
      const types = ['melee', 'ranged', 'tank'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      this.addSpawner('enemy', randomType);
    }
    
    // Spawn player units near player base
    const pBaseY = this.game.canvas.height / 2;
    this.spawners.player.forEach((type, idx) => {
      // Stagger them slightly
      const yOffset = (idx % 5 - 2) * 20;
      const unit = new Unit(this.game, 150, pBaseY + yOffset, 'player', type);
      this.game.entityManager.addEntity(unit);
    });

    // Spawn enemy units near enemy base
    const eBaseY = this.game.canvas.height / 2;
    this.spawners.enemy.forEach((type, idx) => {
      const yOffset = (idx % 5 - 2) * 20;
      const unit = new Unit(this.game, this.game.canvas.width - 150, eBaseY + yOffset, 'enemy', type);
      this.game.entityManager.addEntity(unit);
    });
    
    // Trigger income
    this.game.economy.triggerIncome();
  }
}
