import { Unit } from '../entities/Unit.js';
import { FloatingText } from '../entities/FloatingText.js';
import { WORLD_WIDTH } from '../../main.js';

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
    
    const types = ['melee', 'ranged', 'tank'];
    
    // AI Builder Logic (scales linearly with time, not exponentially)
    this.spawners.enemy = []; // Clear previous spawners to prevent infinite scaling freeze!
    
    const numEnemies = Math.min(1 + Math.floor(this.aiWaveCount * 1.5), 30); // Cap at 30 units max per wave
    for(let i = 0; i < numEnemies; i++) {
      const randomType = types[Math.floor(Math.random() * types.length)];
      this.addSpawner('enemy', randomType);
    }
    
    // Boss wave
    let isBossWave = false;
    if (this.aiWaveCount > 0 && this.aiWaveCount % 5 === 0) {
      isBossWave = true;
      this.addSpawner('enemy', 'tank'); // The boss
      this.game.entityManager.addEntity(new FloatingText(this.game, `WARNING: BOSS WAVE!`, WORLD_WIDTH/2, 200, '#ff3333'));
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
      const unit = new Unit(this.game, WORLD_WIDTH - 200, eBaseY + yOffset, 'enemy', type);
      
      // If it's a boss wave, make the last unit the boss
      if (isBossWave && idx === this.spawners.enemy.length - 1) {
        unit.makeBoss();
      }
      
      this.game.entityManager.addEntity(unit);
    });
    
    // Trigger income
    this.game.economy.triggerIncome();
  }
}
