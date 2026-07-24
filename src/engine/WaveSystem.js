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
    this.aiIncome = 45;
    this.lastActionLog = '[AI 시스템]: 공정 자원 법칙 적용 완료';
  }

  start() {
    this.isActive = true;
    this.timeUntilWave = 3;
    
    const diff = this.game.difficulty || 1.0;
    this.aiMinerals = Math.floor(200 * diff);
    this.aiIncome = Math.floor(45 * diff);
    this.lastActionLog = `[AI 시스템]: 초기 자원 ${this.aiMinerals}💎 / 인컴 +${this.aiIncome}💎 세팅 완료`;
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
    
    // AI Income addition
    this.aiMinerals += this.aiIncome;
    
    const unitCosts = { melee: 50, ranged: 90, tank: 180 };
    const unitNames = { melee: '질럿', ranged: '마린', tank: '골리앗' };
    const unitTypes = ['melee', 'ranged', 'tank'];
    
    // AI buys unit spawner ONLY if AI has enough minerals!
    let purchasedCount = 0;
    let lastBoughtType = '';
    let attempts = 0;
    
    while (this.aiMinerals >= 50 && attempts < 6) {
      attempts++;
      const affordable = unitTypes.filter(t => unitCosts[t] <= this.aiMinerals);
      if (affordable.length === 0) break;
      
      const chosen = affordable[Math.floor(Math.random() * affordable.length)];
      this.addSpawner('enemy', chosen);
      this.aiMinerals -= unitCosts[chosen];
      purchasedCount++;
      lastBoughtType = chosen;
    }
    
    if (purchasedCount > 0) {
      this.lastActionLog = `[AI 정상 구매]: ${unitNames[lastBoughtType]} 스폰라인 추가 (-${unitCosts[lastBoughtType]}💎, 잔여 ${Math.floor(this.aiMinerals)}💎)`;
    } else {
      this.lastActionLog = `[AI 자원 부족]: 구매 없음 (잔여 ${Math.floor(this.aiMinerals)}💎, 인컴 +${this.aiIncome}💎)`;
    }
    
    const eBaseY = this.game.canvas.height / 2;
    
    // Boss wave check (Every 6 waves)
    // FIX: Spawn Boss as a ONE-TIME temporary battlefield unit! NEVER add to permanent spawners for free!
    if (this.aiWaveCount > 0 && this.aiWaveCount % 6 === 0) {
      const tempBoss = new Unit(this.game, WORLD_WIDTH - 200, eBaseY, 'enemy', 'tank');
      tempBoss.makeBoss();
      this.game.entityManager.addEntity(tempBoss);
      
      if (this.game.audio) {
        this.game.audio.playBossAlarm();
      }
      if (this.game.addScreenShake) {
        this.game.addScreenShake(8);
      }
      
      this.game.entityManager.addEntity(new FloatingText(this.game, `⚠️ 경고: 이벤트 보스 출격! (Wave ${this.aiWaveCount}) ⚠️`, WORLD_WIDTH/2, 180, '#ff0055', true));
    } else {
      this.game.entityManager.addEntity(new FloatingText(this.game, `WAVE ${this.aiWaveCount} 출격!`, WORLD_WIDTH/2, 220, '#00e5ff', false));
    }
    
    // Spawn player units from permanent queue
    const pBaseY = this.game.canvas.height / 2;
    this.spawners.player.forEach((type, idx) => {
      const yOffset = (idx % 5 - 2) * 22;
      const unit = new Unit(this.game, 150, pBaseY + yOffset, 'player', type);
      this.game.entityManager.addEntity(unit);
    });

    // Spawn enemy units ONLY from paid permanent queue
    this.spawners.enemy.forEach((type, idx) => {
      const yOffset = (idx % 5 - 2) * 22;
      const unit = new Unit(this.game, WORLD_WIDTH - 200, eBaseY + yOffset, 'enemy', type);
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
