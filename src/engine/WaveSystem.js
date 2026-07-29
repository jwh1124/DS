import { Unit } from '../entities/Unit.js';
import { Particle } from '../entities/Particle.js';
import { FloatingText } from '../entities/FloatingText.js';
import { WORLD_WIDTH } from '../../main.js';
import { getWaveFormationSlot } from '../combatMath.js';
import { getBossProfileForWave } from '../bosses.js';
import {
  AI_STARTING_INCOME,
  AI_STARTING_MINERALS,
  chooseAffordableUnit,
  FIRST_WAVE_DELAY,
  getTechUpgradeCost,
  MAX_SPAWNERS,
  MAX_WAVES,
  UNIT_COSTS,
  WAVE_INTERVAL
} from '../gameConfig.js';

export class WaveSystem {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.waveInterval = WAVE_INTERVAL;
    this.timeUntilWave = FIRST_WAVE_DELAY;
    this.isActive = false;
    this.spawners = { player: [], enemy: [] };
    this.nextSpawnerId = 1;
    this.aiWaveCount = 0;
    this.aiMinerals = AI_STARTING_MINERALS;
    this.aiTechReserve = Math.floor(AI_STARTING_MINERALS * 0.6);
    this.aiIncome = AI_STARTING_INCOME;
    this.aiUltimateCooldown = 0;
    this.finalWaveStarted = false;
    this.finalBattleTime = 0;
    this.lastActionLog = '[교단]: 첫 악마 웨이브에 대비하십시오.';
  }

  start() {
    this.isActive = true;
    this.timeUntilWave = FIRST_WAVE_DELAY;
    
    const diff = this.game.difficulty || 1.0;
    this.aiMinerals = Math.floor(AI_STARTING_MINERALS * diff);
    // A separate ascension reserve guarantees visible AI growth while the
    // regular war chest is still free to counter the player's army.
    this.aiTechReserve = Math.floor(AI_STARTING_MINERALS * diff * 0.6);
    this.aiIncome = Math.floor(AI_STARTING_INCOME * diff);
    this.aiUltimateCooldown = 20;
    this.lastActionLog = `[지옥문]: 악마 군단 소환력 ${this.aiMinerals}🔥 / 증원 +${this.aiIncome}🔥`;
  }

  stop() {
    this.isActive = false;
  }
  
  addSpawner(team, type) {
    if (this.spawners[team].length < MAX_SPAWNERS) {
      const contract = { id: `${team}-${this.nextSpawnerId++}`, type };
      this.spawners[team].push(contract);
      return contract;
    }
    return false;
  }

  removeSpawner(team, type) {
    const idx = this.spawners[team].findIndex(contract => contract.type === type);
    if (idx !== -1) {
      return this.spawners[team].splice(idx, 1)[0];
    }
    return false;
  }

  countSpawners(team, type) {
    return this.spawners[team].filter(contract => contract.type === type).length;
  }

  getUpcomingWavePreview() {
    const nextWave = this.aiWaveCount + 1;
    if (nextWave > MAX_WAVES) {
      return '최후의 정화 진행 중 — 지옥문을 무너뜨리십시오';
    }
    if (nextWave === MAX_WAVES) {
      return '최후 보스: 지옥 군주 · 봉인 해제 · 권장 심판관 + 사제';
    }
    if (nextWave === 6) {
      return '대악마: 심연의 집행관 · 대형 약점 · 권장 심판관 + 사제';
    }

    const pMelee = this.countSpawners('player', 'melee');
    const pRanged = this.countSpawners('player', 'ranged');
    const pTank = this.countSpawners('player', 'tank');
    const pCrusader = this.countSpawners('player', 'crusader');
    const enemyTechLevel = this.game.enemyBase?.techLevel ?? 1;
    const nextTechCost = getTechUpgradeCost(enemyTechLevel);
    const ascends = this.aiTechReserve + this.aiIncome >= nextTechCost;

    let threat = '임프 돌격대';
    let advice = '엑소시스트';
    if (pTank + pCrusader > 2) {
      threat = '밴시 저격대';
      advice = '엑소시스트 / 수도승';
    } else if (pMelee >= pRanged && pMelee >= pTank) {
      threat = '서큐버스 사격대';
      advice = '엑소시스트';
    } else if (pRanged >= pMelee && pRanged >= pTank) {
      threat = '핏로드 돌격대';
      advice = '심판관';
    }

    return `정찰: ${threat} · 권장 ${advice}${ascends ? ' · 각성 임박' : ''}`;
  }

  launchNextWaveEarly() {
    if (!this.isActive || this.timeUntilWave <= 0.25) return false;
    this.timeUntilWave = 0;
    return true;
  }

  update(dt) {
    if (!this.isActive) return;

    if (this.aiUltimateCooldown > 0) {
      this.aiUltimateCooldown -= dt;
    }

    if (this.aiWaveCount >= MAX_WAVES) {
      this.updateFinalBattle(dt);
      return;
    }

    this.timeUntilWave -= dt;

    if (this.timeUntilWave <= 0) {
      this.spawnWave();
      this.timeUntilWave = this.waveInterval;
    }
  }

  spawnWave() {
    const recalledCount = this.retirePreviousWave();
    this.aiWaveCount++;
    this.finalWaveStarted = this.aiWaveCount === MAX_WAVES;
    if (this.finalWaveStarted) this.finalBattleTime = 60;
    
    // AI Income addition
    this.aiMinerals += this.aiIncome;
    this.aiTechReserve += this.aiIncome;
    
    const unitNames = { melee: '임프', ranged: '서큐버스', medic: '리치', sniper: '밴시', tank: '발록', crusader: '핏로드' };
    
    // AI Tactical Orbital Strike Check
    const playerUnits = this.game.entityManager.getEntitiesByTeam('player').filter(e => e.radius && e.type);
    const enemyTechCost = this.game.enemyBase ? getTechUpgradeCost(this.game.enemyBase.techLevel) : Infinity;
    if (this.aiTechReserve >= enemyTechCost && this.game.enemyBase) {
      // Progression is deterministic: a large player army no longer prevents
      // the enemy base from ever reaching its expected defensive tier.
      this.game.enemyBase.upgradeTech();
      this.aiTechReserve -= enemyTechCost;
      this.lastActionLog = `[지옥 각성]: 악마 군단 강화 (Lv.${this.game.enemyBase.techLevel})! (-${enemyTechCost}🔥)`;
    } else if (playerUnits.length >= 8 && this.aiUltimateCooldown <= 0 && this.aiMinerals >= 300) {
      this.triggerAiOrbitalStrike();
      this.aiMinerals -= 300;
      this.aiUltimateCooldown = 35;
      this.lastActionLog = `[☠️ 악마의 저주]: 성직자 부대에 저주 폭격! (-300🔥, 쿨타임 35s)`;
    } else {
      // Smart Counter-Pick AI Logic
      const pMelee = this.countSpawners('player', 'melee');
      const pRanged = this.countSpawners('player', 'ranged');
      const pSniper = this.countSpawners('player', 'sniper');
      const pTank = this.countSpawners('player', 'tank');
      const pCrusader = this.countSpawners('player', 'crusader');
      
      let preferredUnit = 'melee';
      if (pTank + pCrusader > 2) {
        preferredUnit = 'sniper';
      } else if (pMelee >= pRanged && pMelee >= pTank) {
        preferredUnit = 'ranged';
      } else if (pRanged >= pMelee && pRanged >= pTank) {
        preferredUnit = 'crusader';
      } else if (this.spawners.enemy.length > 5 && this.countSpawners('enemy', 'medic') === 0) {
        preferredUnit = 'medic';
      } else {
        preferredUnit = 'melee';
      }
      
      let purchasedCount = 0;
      let lastBoughtType = '';
      let attempts = 0;
      
      const enemyTechLevel = this.game.enemyBase ? this.game.enemyBase.techLevel : 1;
      while (this.aiMinerals >= UNIT_COSTS.melee && attempts < 6 && this.spawners.enemy.length < MAX_SPAWNERS) {
        attempts++;

        const chosen = chooseAffordableUnit(preferredUnit, this.aiMinerals, enemyTechLevel);
        if (!chosen) break;
        
        const success = this.addSpawner('enemy', chosen);
        if (success) {
          this.aiMinerals -= UNIT_COSTS[chosen];
          purchasedCount++;
          lastBoughtType = chosen;
        } else {
          break;
        }
      }
      
      if (this.spawners.enemy.length >= MAX_SPAWNERS) {
        this.lastActionLog = `[지옥문 만원]: 악마 소환진 ${MAX_SPAWNERS}/${MAX_SPAWNERS} 최대 가동!`;
      } else if (purchasedCount > 0) {
        this.lastActionLog = `[악마 소환]: ${unitNames[lastBoughtType]} 강림! (-${UNIT_COSTS[lastBoughtType]}🔥, 잔여 ${Math.floor(this.aiMinerals)}🔥)`;
      } else if (!this.lastActionLog.includes('시대 발전') && !this.lastActionLog.includes('궤도 폭격')) {
        this.lastActionLog = `[악마 축적]: 소환 보류 (잔여 ${Math.floor(this.aiMinerals)}🔥, 증원 +${this.aiIncome}🔥)`;
      }
    }
    
    const eBaseY = this.game.canvas.height / 2;
    
    const bossProfile = getBossProfileForWave(this.aiWaveCount);
    if (bossProfile) {
      const bossX = WORLD_WIDTH - 350;
      const bossY = Math.min(this.game.canvas.height - 200, eBaseY + 160);
      const boss = new Unit(this.game, bossX, bossY, 'enemy', 'tank');
      boss.makeBoss(bossProfile.id);
      boss.isWaveFighter = true;
      this.game.entityManager.addEntity(boss);
      this.game.focusCameraOn?.(boss.x);
      this.lastActionLog = `[대악마]: ${bossProfile.name} 강림 · ${bossProfile.counterHint}`;
      
      if (this.game.audio) {
        this.game.audio.playBossAlarm();
      }
      if (this.game.addScreenShake) {
        this.game.addScreenShake(this.finalWaveStarted ? 12 : 8);
      }

      this.game.entityManager.addEntity(new Particle(
        this.game, boss.x, boss.y + 18, '#6e3c32', 0.55, 0, 0, 58, 'shockwave'
      ));
      for (let i = 0; i < 18; i++) {
        const angle = Math.PI + Math.random() * Math.PI;
        this.game.entityManager.addEntity(new Particle(
          this.game,
          boss.x + (Math.random() - 0.5) * 70,
          boss.y + 10,
          i % 2 === 0 ? '#6e3c32' : '#9c795a',
          0.7,
          55 + Math.random() * 95,
          angle,
          2 + Math.random() * 3,
          'spark'
        ));
      }

    }
    
    // Spawn player units
    const pBaseY = this.game.canvas.height / 2;
    this.spawners.player.forEach((contract, idx) => {
      const slot = getWaveFormationSlot(150, pBaseY, idx, 'player');
      const unit = new Unit(this.game, slot.x, slot.y, 'player', contract.type);
      unit.formationRow = slot.row;
      unit.spawnerId = contract.id;
      unit.isWaveFighter = true;
      this.game.entityManager.addEntity(unit);
    });

    // Spawn enemy units
    this.spawners.enemy.forEach((contract, idx) => {
      const slot = getWaveFormationSlot(WORLD_WIDTH - 200, eBaseY, idx, 'enemy');
      const unit = new Unit(this.game, slot.x, slot.y, 'enemy', contract.type);
      unit.formationRow = slot.row;
      unit.spawnerId = contract.id;
      unit.isWaveFighter = true;
      this.game.entityManager.addEntity(unit);
    });
    
    // Trigger player income
    this.game.economy.triggerIncome();
    if (this.game.playerBase) {
      const incomeAmt = this.game.economy.income;
      this.game.entityManager.addEntity(new FloatingText(
        this.game, `+${incomeAmt} ✝️`, this.game.playerBase.x, this.game.playerBase.y - 80, '#d8bf8a', 'emphasis'
      ));
    }

    if (recalledCount > 0) {
      this.game.entityManager.addEntity(new FloatingText(
        this.game, `전열 교대 · 이전 분대 ${recalledCount}명 귀환`, WORLD_WIDTH / 2, 252, '#c9c1b6', false
      ));
    }

    if ([3, 6, 9].includes(this.aiWaveCount) && this.game.offerDoctrineChoice) {
      this.game.offerDoctrineChoice(this.aiWaveCount);
    }
  }

  retirePreviousWave() {
    let recalledCount = 0;
    for (const entity of this.game.entityManager.entities) {
      if (entity.isWaveFighter && entity.isAlive) {
        entity.isAlive = false;
        recalledCount++;
      }
    }
    return recalledCount;
  }

  updateFinalBattle(dt) {
    if (this.finalBattleTime <= 0) return;
    this.finalBattleTime = Math.max(0, this.finalBattleTime - dt);
    if (this.finalBattleTime > 0) return;

    const playerBase = this.game.playerBase;
    const enemyBase = this.game.enemyBase;
    if (!playerBase?.isAlive || !enemyBase?.isAlive) return;

    const playerIntegrity = playerBase.hp / playerBase.maxHp;
    const enemyIntegrity = enemyBase.hp / enemyBase.maxHp;
    const winner = playerIntegrity >= enemyIntegrity ? 'player' : 'enemy';
    this.lastActionLog = winner === 'player'
      ? '[최후 심판]: 성당의 신성이 지옥문을 압도했습니다.'
      : '[최후 심판]: 지옥문의 잔존 마력이 성당을 삼켰습니다.';
    this.isActive = false;
    this.game.stop(winner);
  }

  triggerAiOrbitalStrike() {
    if (this.game.audio) {
      this.game.audio.playExplosion();
      this.game.audio.playBossAlarm();
    }
    if (this.game.addScreenShake) {
      this.game.addScreenShake(22);
    }
    
    this.game.entityManager.addEntity(new FloatingText(
      this.game, '악마의 저주 폭풍 · 부대 피해 150', WORLD_WIDTH / 2, 180, '#b97872', 'emphasis'
    ));

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
