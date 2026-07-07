import { Unit } from '../entities/Unit.js';
import { Building } from '../entities/Building.js';

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
  
  addSpawner(team, type, x, y) {
    const building = new Building(this.game, x, y, team, type);
    this.spawners[team].push(building);
    this.game.entityManager.addEntity(building);
    return building;
  }
  
  removeSpawner(building) {
    const arr = this.spawners[building.team];
    const idx = arr.indexOf(building);
    if (idx !== -1) arr.splice(idx, 1);
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
      // Enemy area bounds (rough right half)
      const ex = this.game.canvas.width - 200 - Math.random() * 200;
      const ey = 200 + Math.random() * 400;
      this.addSpawner('enemy', randomType, ex, ey);
    }
    
    // Process player spawners
    this.spawners.player.forEach((spawner) => {
      spawner.triggerSpawn();
      // Spawn unit near building
      const unit = new Unit(this.game, spawner.x + 30, spawner.y, 'player', spawner.type);
      this.game.entityManager.addEntity(unit);
    });

    // Process enemy spawners
    this.spawners.enemy.forEach((spawner) => {
      spawner.triggerSpawn();
      const unit = new Unit(this.game, spawner.x - 30, spawner.y, 'enemy', spawner.type);
      this.game.entityManager.addEntity(unit);
    });
    
    // Trigger income
    this.game.economy.triggerIncome();
  }
}
