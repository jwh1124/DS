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
    
    // AI Spawner simulation
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
    // Enemy AI: Randomly add spawners based on wave count to simulate an opponent
    this.aiWaveCount++;
    if (this.aiWaveCount % 2 === 0) {
      const types = ['melee', 'ranged', 'tank'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      this.addSpawner('enemy', randomType);
    }
    
    // Process player spawners
    let playerSpawnY = this.game.canvas.height / 2 - 100;
    this.spawners.player.forEach((type, index) => {
      // Add small delay per unit for visual effect, for MVP just spawn them
      const unit = new Unit(this.game, 200, playerSpawnY + (index % 5) * 40, 'player', type);
      this.game.entityManager.addEntity(unit);
    });

    // Process enemy spawners
    let enemySpawnY = this.game.canvas.height / 2 - 100;
    this.spawners.enemy.forEach((type, index) => {
      const unit = new Unit(this.game, this.game.canvas.width - 200, enemySpawnY + (index % 5) * 40, 'enemy', type);
      this.game.entityManager.addEntity(unit);
    });
    
    // Also trigger income
    this.game.economy.triggerIncome();
  }
}
