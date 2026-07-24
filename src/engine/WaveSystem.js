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
    this.aiMinerals = 250; // AI starts with equal minerals as player!
    this.aiIncome = 60;    // AI income per wave
  }

  start() {
    this.isActive = true;
    this.timeUntilWave = 3; // Initial 3s countdown for quick first wave action!
    
    // Configure AI Economy based on difficulty
    const diff = this.game.difficulty || 1.0;
    this.aiMinerals = Math.floor(250 * diff);
    this.aiIncome = Math.floor(60 * diff);
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
    
    // 1. AI Economy & Fair Purchase Logic
    // AI receives wave income
    this.aiMinerals += this.aiIncome;
    
    // AI buys units into its persistent spawner list using its mineral budget
    const unitCosts = { melee: 50, ranged: 100, tank: 200 };
    const unitTypes = ['melee', 'ranged', 'tank'];
    
    // AI tries to buy units as long as it has minerals
    let attempts = 0;
    while (this.aiMinerals >= 50 && attempts < 10) {
      attempts++;
      // Pick affordable unit
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
    
    // 2. Spawn player units from persistent queue
    const pBaseY = this.game.canvas.height / 2;
    this.spawners.player.forEach((type, idx) => {
      const yOffset = (idx % 5 - 2) * 22;
      const unit = new Unit(this.game, 150, pBaseY + yOffset, 'player', type);
      this.game.entityManager.addEntity(unit);
    });

    // 3. Spawn enemy units from persistent queue
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
