import { Unit } from '../entities/Unit.js';
import { Particle } from '../entities/Particle.js';
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
    this.aiIncome = 60;
    this.aiUltimateCooldown = 0;
    this.lastActionLog = '[전략적 스폰 환급]: 스폰 라인 80% 미네랄 환급 시스템 가동';
  }

  start() {
    this.isActive = true;
    this.timeUntilWave = 3;
    
    const diff = this.game.difficulty || 1.0;
    this.aiMinerals = Math.floor(250 * diff);
    this.aiIncome = Math.floor(60 * diff);
    this.aiUltimateCooldown = 20;
    this.lastActionLog = `[스마트 AI]: 초기 자원 ${this.aiMinerals}💎 / 인컴 +${this.aiIncome}💎 세팅 완료`;
  }

  stop() {
    this.isActive = false;
  }
  
  addSpawner(team, type) {
    if (this.spawners[team].length < 50) {
      this.spawners[team].push(type);
      return true;
    }
    return false;
  }

  removeSpawner(team, type) {
    const idx = this.spawners[team].indexOf(type);
    if (idx !== -1) {
      this.spawners[team].splice(idx, 1);
      return true;
    }
    return false;
  }

  update(dt) {
    if (!this.isActive) return;

    if (this.aiUltimateCooldown > 0) {
      this.aiUltimateCooldown -= dt;
    }

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
    
    const unitCosts = { melee: 50, ranged: 100, medic: 120, sniper: 150, tank: 200 };
    const unitNames = { melee: '질럿', ranged: '마린', medic: '메딕(힐러)', sniper: '스나이퍼', tank: '골리앗' };
    
    // AI Tactical Orbital Strike Check
    const playerUnits = this.game.entityManager.getEntitiesByTeam('player').filter(e => e.radius && e.type);
    if (playerUnits.length >= 8 && this.aiUltimateCooldown <= 0 && this.aiMinerals >= 300) {
      this.triggerAiOrbitalStrike();
      this.aiMinerals -= 300;
      this.aiUltimateCooldown = 35;
      this.lastActionLog = `[AI 궤도 폭격 ☠️]: 플레이어 부대 타격! (-300💎, 쿨타임 35s)`;
    } else {
      // Smart AI Tech Upgrade Decision
      if (this.aiMinerals >= 800 && this.game.enemyBase && this.game.enemyBase.techLevel < 5) {
        this.game.enemyBase.upgradeTech();
        this.aiMinerals -= 800;
        this.lastActionLog = `[스마트 AI 업그레이드]: AI 시대 발전 (Lv.${this.game.enemyBase.techLevel}) 완료! (-800💎)`;
      }
      
      // Smart Counter-Pick AI Logic
      const pMelee = this.spawners.player.filter(t => t === 'melee').length;
      const pRanged = this.spawners.player.filter(t => t === 'ranged').length;
      const pSniper = this.spawners.player.filter(t => t === 'sniper').length;
      const pTank = this.spawners.player.filter(t => t === 'tank').length;
      
      let preferredUnit = 'melee';
      if (pTank > 2) {
        preferredUnit = 'sniper';
      } else if (pMelee >= pRanged && pMelee >= pTank) {
        preferredUnit = 'ranged';
      } else if (pRanged >= pMelee && pRanged >= pTank) {
        preferredUnit = 'tank';
      } else if (this.spawners.enemy.length > 5 && !this.spawners.enemy.includes('medic')) {
        preferredUnit = 'medic';
      } else {
        preferredUnit = 'melee';
      }
      
      let purchasedCount = 0;
      let lastBoughtType = '';
      let attempts = 0;
      
      while (this.aiMinerals >= 50 && attempts < 6 && this.spawners.enemy.length < 50) {
        attempts++;
        
        let chosen = preferredUnit;
        if (unitCosts[chosen] > this.aiMinerals) {
          const unitTypes = ['melee', 'ranged', 'medic', 'sniper', 'tank'];
          const affordable = unitTypes.filter(t => unitCosts[t] <= this.aiMinerals);
          if (affordable.length === 0) break;
          chosen = affordable[Math.floor(Math.random() * affordable.length)];
        }
        
        const success = this.addSpawner('enemy', chosen);
        if (success) {
          this.aiMinerals -= unitCosts[chosen];
          purchasedCount++;
          lastBoughtType = chosen;
        } else {
          break;
        }
      }
      
      if (this.spawners.enemy.length >= 50) {
        this.lastActionLog = `[AI 최대 한도]: 적군 영구 스폰라인 50/50 풀 가동 중!`;
      } else if (purchasedCount > 0) {
        this.lastActionLog = `[AI 카운터 저격]: ${unitNames[lastBoughtType]} 추가 (-${unitCosts[lastBoughtType]}💎, 잔여 ${Math.floor(this.aiMinerals)}💎)`;
      } else if (!this.lastActionLog.includes('시대 발전') && !this.lastActionLog.includes('궤도 폭격')) {
        this.lastActionLog = `[AI 자원 저축]: 구매 없음 (잔여 ${Math.floor(this.aiMinerals)}💎, 인컴 +${this.aiIncome}💎)`;
      }
    }
    
    const eBaseY = this.game.canvas.height / 2;
    
    // Boss wave check (Every 6 waves)
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
    
    // Spawn player units
    const pBaseY = this.game.canvas.height / 2;
    this.spawners.player.forEach((type, idx) => {
      const yOffset = (idx % 5 - 2) * 22;
      const unit = new Unit(this.game, 150, pBaseY + yOffset, 'player', type);
      this.game.entityManager.addEntity(unit);
    });

    // Spawn enemy units
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

  triggerAiOrbitalStrike() {
    if (this.game.audio) {
      this.game.audio.playExplosion();
      this.game.audio.playBossAlarm();
    }
    if (this.game.addScreenShake) {
      this.game.addScreenShake(22);
    }
    
    this.game.entityManager.addEntity(new FloatingText(this.game, `⚠️ 경고: AI 전술 궤도 폭격 발사! (-150 피해) ⚠️`, WORLD_WIDTH/2, 180, '#ff0055', true));

    const players = this.game.entityManager.getEntitiesByTeam('player');
    players.forEach(p => {
      for (let i = 0; i < 18; i++) {
        this.game.entityManager.addEntity(new Particle(
          this.game, p.x + (Math.random()-0.5)*30, p.y - 80 - Math.random()*200, '#ff0055', 0.8, 300, Math.PI/2, 5, 'spark'
        ));
      }
      this.game.entityManager.addEntity(new Particle(
        this.game, p.x, p.y, '#ff0055', 0.4, 0, 0, 30, 'shockwave'
      ));
      p.takeDamage(150, true);
    });
  }
}
