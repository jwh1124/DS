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
    this.aiMinerals = 250;
    this.aiIncome = 60; // 100% EQUAL & FAIR default (60 / wave)
    this.lastActionLog = '[스마트 AI]: 실시간 상성 카운터 AI 가동 준비 완료';
  }

  start() {
    this.isActive = true;
    this.timeUntilWave = 3;
    
    const diff = this.game.difficulty || 1.0;
    this.aiMinerals = Math.floor(250 * diff);
    // Fair difficulty scaling: Easy 45, Normal 60 (Equal to player!), Hard 75, Insane 90
    this.aiIncome = Math.floor(60 * diff);
    this.lastActionLog = `[스마트 AI]: AI 초기 자원 ${this.aiMinerals}💎 / 인컴 +${this.aiIncome}💎 세팅 완료`;
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
    
    const unitCosts = { melee: 50, ranged: 100, tank: 200 };
    const unitNames = { melee: '질럿(근접)', ranged: '마린(원거리)', tank: '골리앗(탱크)' };
    
    // Smart AI Tech Upgrade Decision
    if (this.aiMinerals >= 800 && this.game.enemyBase && this.game.enemyBase.techLevel < 5) {
      this.game.enemyBase.upgradeTech();
      this.aiMinerals -= 800;
      this.lastActionLog = `[스마트 AI 업그레이드]: AI 시대 발전 (Lv.${this.game.enemyBase.techLevel}) 완료! (-800💎)`;
    }
    
    // Smart Counter-Pick AI Logic:
    // AI analyzes player's army composition to counter-pick units!
    const pMelee = this.spawners.player.filter(t => t === 'melee').length;
    const pRanged = this.spawners.player.filter(t => t === 'ranged').length;
    const pTank = this.spawners.player.filter(t => t === 'tank').length;
    
    // Counter Strategy:
    // Player has mostly Melee -> AI buys Ranged (Marines counter Zealots)
    // Player has mostly Ranged -> AI buys Tank (Goliaths counter Marines)
    // Player has mostly Tank -> AI buys Melee (Zealots counter Goliaths)
    let preferredUnit = 'melee';
    if (pMelee >= pRanged && pMelee >= pTank) {
      preferredUnit = 'ranged'; // Counter Melee with Ranged
    } else if (pRanged >= pMelee && pRanged >= pTank) {
      preferredUnit = 'tank';   // Counter Ranged with Tank
    } else {
      preferredUnit = 'melee';  // Counter Tank with Melee
    }
    
    // AI purchases preferred counter unit if affordable
    let purchasedCount = 0;
    let lastBoughtType = '';
    let attempts = 0;
    
    while (this.aiMinerals >= 50 && attempts < 6) {
      attempts++;
      
      let chosen = preferredUnit;
      if (unitCosts[chosen] > this.aiMinerals) {
        // Fallback to affordable unit if preferred is too expensive
        const unitTypes = ['melee', 'ranged', 'tank'];
        const affordable = unitTypes.filter(t => unitCosts[t] <= this.aiMinerals);
        if (affordable.length === 0) break;
        chosen = affordable[Math.floor(Math.random() * affordable.length)];
      }
      
      this.addSpawner('enemy', chosen);
      this.aiMinerals -= unitCosts[chosen];
      purchasedCount++;
      lastBoughtType = chosen;
    }
    
    if (purchasedCount > 0) {
      this.lastActionLog = `[AI 카운터 저격]: ${unitNames[lastBoughtType]} 추가 (-${unitCosts[lastBoughtType]}💎, 잔여 ${Math.floor(this.aiMinerals)}💎)`;
    } else if (!this.lastActionLog.includes('시대 발전')) {
      this.lastActionLog = `[AI 자원 저축]: 구매 없음 (잔여 ${Math.floor(this.aiMinerals)}💎, 인컴 +${this.aiIncome}💎)`;
    }
    
    const eBaseY = this.game.canvas.height / 2;
    
    // Boss wave check (Every 6 waves) - Spawn ONE-TIME temporary event boss!
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

    // Spawn enemy units from paid permanent queue
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
