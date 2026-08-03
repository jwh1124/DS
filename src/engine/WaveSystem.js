import { Unit } from '../entities/Unit.js';
import { Particle } from '../entities/Particle.js';
import { FloatingText } from '../entities/FloatingText.js';
import { WORLD_WIDTH } from '../../main.js';
import { getWaveFormationSlot } from '../combatMath.js';
import {
  getBossProfileForWave,
  resolveBossGate,
  selectBossEscortContracts
} from '../bosses.js';
import {
  AI_TECH_RESERVE_PER_WAVE,
  getAiRosterCap,
  getAiRecruitmentPriority,
  shouldUpgradeEnemyTech
} from '../aiStrategy.js';
import {
  AI_STARTING_INCOME,
  AI_STARTING_MINERALS,
  chooseAffordableUnit,
  FIRST_WAVE_DELAY,
  getTechUpgradeCost,
  MAX_SPAWNERS,
  MAX_WAVES,
  UNIT_COSTS,
  WAVE_ASSAULT_TIME,
  WAVE_PREP_TIME
} from '../gameConfig.js';
import {
  canLaunchNextWaveEarly,
  resolveExpiredPhase,
  resolvePostCombatPhase,
  WAVE_PHASES
} from '../wavePacing.js';
import {
  applyWaveMutator,
  getWaveMutator,
  getWaveMutatorPreview
} from '../waveMutators.js';
import { applyRunOmen } from '../runOmens.js';

export class WaveSystem {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
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
    this.finalReinforcementTimer = 5;
    this.bossGateActive = false;
    this.phase = WAVE_PHASES.SCOUT;
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
    this.phase = WAVE_PHASES.SCOUT;
    this.timeUntilWave = FIRST_WAVE_DELAY;
    const omen = this.game.runOmen;
    const host = this.game.infernalHost;
    this.lastActionLog = `[지옥문]: ${host?.name ?? '미확인 군단'} · ${host?.summary ?? ''} · 징조 ${omen?.name ?? '불길한 정적'} · ${omen?.advice ?? '정찰을 확인하십시오.'}`;
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
    const activeBoss = this.getActiveBoss();
    if (this.bossGateActive && activeBoss) {
      return `${activeBoss.bossName} 격퇴 후 진군 · ${activeBoss.bossCounterHint}`;
    }

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

    const mutator = getWaveMutator(nextWave);
    const omen = this.game.runOmen;
    if (mutator) {
      return `정찰: ${getWaveMutatorPreview(nextWave)} · 군단 ${this.game.infernalHost?.name ?? '미확인'} · 징조 ${omen?.name ?? '미확인'}: ${omen?.summary ?? ''} · 권장 ${mutator.advice}`;
    }

    const pMelee = this.countSpawners('player', 'melee');
    const pRanged = this.countSpawners('player', 'ranged');
    const pTank = this.countSpawners('player', 'tank');
    const pCrusader = this.countSpawners('player', 'crusader');
    const enemyTechLevel = this.game.enemyBase?.techLevel ?? 1;
    const nextTechCost = getTechUpgradeCost(enemyTechLevel);
    const ascends = shouldUpgradeEnemyTech(
      nextWave,
      enemyTechLevel,
      this.aiTechReserve + AI_TECH_RESERVE_PER_WAVE,
      nextTechCost
    );

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

    return `정찰: ${threat} · 군단 ${this.game.infernalHost?.name ?? '미확인'} · 징조 ${omen?.name ?? '미확인'}: ${omen?.summary ?? ''} · 권장 ${advice}${ascends ? ' · 각성 임박' : ''}`;
  }

  launchNextWaveEarly() {
    if (!this.canLaunchNextWaveEarly()) return false;
    this.timeUntilWave = 0;
    return true;
  }

  canLaunchNextWaveEarly() {
    return canLaunchNextWaveEarly({
      isActive: this.isActive,
      phase: this.phase,
      bossGateLocked: this.isBossGateLocked(),
      hasActiveEnemyWave: this.hasActiveEnemyWave(),
      timeUntilWave: this.timeUntilWave
    });
  }

  getActiveBoss() {
    return this.game.entityManager.entities
      .find(entity => entity.isBoss && entity.isAlive) ?? null;
  }

  isBossGateLocked() {
    return resolveBossGate(this.bossGateActive, Boolean(this.getActiveBoss())).locked;
  }

  hasActiveEnemyWave() {
    return this.game.entityManager.entities.some(entity =>
      entity.isWaveFighter && entity.team === 'enemy' && entity.isAlive
    );
  }

  hasActivePlayerWave() {
    return this.game.entityManager.entities.some(entity =>
      entity.isWaveFighter && entity.team === 'player' && entity.isAlive
    );
  }

  isClearPrepWindow() {
    return this.phase === WAVE_PHASES.PREPARE;
  }

  isAssaultWindow() {
    return this.phase === WAVE_PHASES.ASSAULT;
  }

  update(dt) {
    if (!this.isActive) return;

    if (this.aiUltimateCooldown > 0) {
      this.aiUltimateCooldown -= dt;
    }

    if (this.phase === WAVE_PHASES.FINAL || this.aiWaveCount >= MAX_WAVES) {
      this.updateFinalBattle(dt);
      return;
    }

    const bossGate = resolveBossGate(this.bossGateActive, Boolean(this.getActiveBoss()));
    if (bossGate.locked) {
      this.phase = WAVE_PHASES.COMBAT;
      return;
    }
    if (bossGate.completed) {
      this.bossGateActive = false;
    }

    const activeEnemyWave = this.hasActiveEnemyWave();
    if (activeEnemyWave) {
      this.phase = WAVE_PHASES.COMBAT;
      return;
    }

    const postCombat = resolvePostCombatPhase({
      currentPhase: this.phase,
      wave: this.aiWaveCount,
      maxWaves: MAX_WAVES,
      hasActiveEnemyWave: activeEnemyWave,
      hasActivePlayerWave: this.hasActivePlayerWave(),
      assaultTime: WAVE_ASSAULT_TIME,
      prepTime: WAVE_PREP_TIME
    });
    if (postCombat) {
      this.phase = postCombat.phase;
      this.timeUntilWave = postCombat.timeRemaining;
      this.lastActionLog = this.phase === WAVE_PHASES.ASSAULT
        ? `[공성]: 생존 성직자 진군 · ${WAVE_ASSAULT_TIME}초간 지옥문 공격`
        : `[정비]: 생존 분대 없음 · ${WAVE_PREP_TIME}초 후 다음 웨이브`;
      return;
    }

    this.timeUntilWave -= dt;
    if (this.timeUntilWave > 0) return;

    const expired = resolveExpiredPhase({
      phase: this.phase,
      prepTime: WAVE_PREP_TIME
    });
    if (!expired) return;

    if (expired.shouldWithdraw) {
      const withdrawing = this.beginPlayerWithdrawal();
      this.phase = expired.phase;
      this.timeUntilWave = expired.timeRemaining;
      this.lastActionLog = `[귀환]: 생존 성직자 ${withdrawing}명 철수 · ${WAVE_PREP_TIME}초 재편성`;
      return;
    }

    if (expired.shouldSpawnWave) {
      this.spawnWave();
    }
  }

  spawnWave() {
    const recalledCount = this.retirePreviousWave();
    this.aiWaveCount++;
    this.finalWaveStarted = this.aiWaveCount === MAX_WAVES;
    this.phase = this.finalWaveStarted ? WAVE_PHASES.FINAL : WAVE_PHASES.COMBAT;
    this.timeUntilWave = 0;
    const waveMutator = getWaveMutator(this.aiWaveCount);
    if (this.finalWaveStarted) {
      this.finalBattleTime = 0;
      this.finalReinforcementTimer = 5;
    }
    
    // AI Income addition
    this.aiMinerals += this.aiIncome;
    this.aiTechReserve += AI_TECH_RESERVE_PER_WAVE;
    
    const unitNames = { melee: '임프', ranged: '서큐버스', medic: '리치', sniper: '밴시', tank: '발록', crusader: '핏로드' };
    
    // AI Tactical Orbital Strike Check
    const playerUnits = this.game.entityManager.getEntitiesByTeam('player').filter(e => e.radius && e.type);
    const enemyTechCost = this.game.enemyBase ? getTechUpgradeCost(this.game.enemyBase.techLevel) : Infinity;
    if (
      this.game.enemyBase
      && shouldUpgradeEnemyTech(
        this.aiWaveCount,
        this.game.enemyBase.techLevel,
        this.aiTechReserve,
        enemyTechCost
      )
    ) {
      // Progression is deterministic: a large player army no longer prevents
      // the enemy base from ever reaching its expected defensive tier.
      this.game.enemyBase.upgradeTech();
      this.aiTechReserve -= enemyTechCost;
      this.lastActionLog = `[지옥 각성]: 악마 군단 강화 (Lv.${this.game.enemyBase.techLevel})! (-${enemyTechCost} 악마력)`;
    } else if (playerUnits.length >= 8 && this.aiUltimateCooldown <= 0 && this.aiMinerals >= 300) {
      this.triggerAiOrbitalStrike();
      this.aiMinerals -= 300;
      this.aiUltimateCooldown = 35;
      this.lastActionLog = `[악마의 저주]: 성직자 부대에 저주 폭격! (-300 악마력, 쿨타임 35s)`;
    } else {
      const playerCounts = {
        melee: this.countSpawners('player', 'melee'),
        ranged: this.countSpawners('player', 'ranged'),
        medic: this.countSpawners('player', 'medic'),
        sniper: this.countSpawners('player', 'sniper'),
        tank: this.countSpawners('player', 'tank'),
        crusader: this.countSpawners('player', 'crusader')
      };
      let purchasedCount = 0;
      let lastBoughtType = '';
      let savingForType = '';
      let attempts = 0;
      
      const enemyTechLevel = this.game.enemyBase ? this.game.enemyBase.techLevel : 1;
      const enemyRosterCap = getAiRosterCap(this.aiWaveCount);
      while (
        this.aiMinerals >= UNIT_COSTS.melee
        && attempts < 6
        && this.spawners.enemy.length < enemyRosterCap
      ) {
        attempts++;

        const enemyCounts = {
          melee: this.countSpawners('enemy', 'melee'),
          ranged: this.countSpawners('enemy', 'ranged'),
          medic: this.countSpawners('enemy', 'medic'),
          sniper: this.countSpawners('enemy', 'sniper'),
          tank: this.countSpawners('enemy', 'tank'),
          crusader: this.countSpawners('enemy', 'crusader')
        };
        const priority = getAiRecruitmentPriority({
          wave: this.aiWaveCount,
          playerCounts,
          enemyCounts,
          enemyRosterSize: this.spawners.enemy.length,
          infernalHost: this.game.infernalHost
        });
        const preferredCost = UNIT_COSTS[priority.type];
        if (priority.saveForRole && this.aiMinerals < preferredCost) {
          savingForType = priority.type;
          break;
        }

        const chosen = chooseAffordableUnit(priority.type, this.aiMinerals, enemyTechLevel);
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
      } else if (this.spawners.enemy.length >= enemyRosterCap) {
        this.lastActionLog = `[악마 대기]: 현재 웨이브 편제 ${enemyRosterCap}명 완성 · 잔여 ${Math.floor(this.aiMinerals)} 악마력`;
      } else if (purchasedCount > 0) {
        this.lastActionLog = `[악마 소환]: ${unitNames[lastBoughtType]} 강림! (-${UNIT_COSTS[lastBoughtType]} 악마력, 잔여 ${Math.floor(this.aiMinerals)} 악마력)`;
      } else if (savingForType) {
        this.lastActionLog = `[악마 축적]: ${unitNames[savingForType]} 소환 준비 (필요 ${UNIT_COSTS[savingForType]} 악마력, 보유 ${Math.floor(this.aiMinerals)} 악마력)`;
      } else if (!this.lastActionLog.includes('시대 발전') && !this.lastActionLog.includes('궤도 폭격')) {
        this.lastActionLog = `[악마 축적]: 소환 보류 (잔여 ${Math.floor(this.aiMinerals)} 악마력, 증원 +${this.aiIncome} 악마력)`;
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
      this.bossGateActive = true;
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

    // Boss waves deploy authored escort sizes instead of stacking the boss on
    // top of the full persistent roster.
    const deployedEnemyContracts = bossProfile
      ? selectBossEscortContracts(this.spawners.enemy, bossProfile.escortCap)
      : this.spawners.enemy;
    deployedEnemyContracts.forEach((contract, idx) => {
      const slot = getWaveFormationSlot(WORLD_WIDTH - 200, eBaseY, idx, 'enemy');
      const unit = new Unit(this.game, slot.x, slot.y, 'enemy', contract.type);
      unit.formationRow = slot.row;
      unit.spawnerId = contract.id;
      unit.isWaveFighter = true;
      applyWaveMutator(unit, waveMutator);
      applyRunOmen(unit, this.game.runOmen);
      this.game.entityManager.addEntity(unit);
    });
    
    // Trigger player income
    this.game.economy.triggerIncome();
    if (this.game.playerBase) {
      const incomeAmt = this.game.economy.income;
      this.game.entityManager.addEntity(new FloatingText(
        this.game, `신앙심 +${incomeAmt}`, this.game.playerBase.x, this.game.playerBase.y - 80, '#d8bf8a', 'emphasis'
      ));
    }

    if (recalledCount > 0) {
      this.game.entityManager.addEntity(new FloatingText(
        this.game, `전열 교대 · 이전 분대 ${recalledCount}명 귀환`, WORLD_WIDTH / 2, 252, '#c9c1b6', false
      ));
    }

    if (waveMutator) {
      this.lastActionLog = `[전장 변주]: ${waveMutator.name} · ${waveMutator.summary} · 권장 ${waveMutator.advice}`;
      this.game.entityManager.addEntity(new FloatingText(
        this.game,
        `${waveMutator.name} · ${waveMutator.summary}`,
        WORLD_WIDTH / 2,
        228,
        '#b97872',
        'emphasis'
      ));
    }

    if (this.aiWaveCount === 1 && this.game.runOmen) {
      const omen = this.game.runOmen;
      this.game.entityManager.addEntity(new FloatingText(
        this.game,
        `지옥의 징조 · ${omen.name} · ${omen.summary}`,
        WORLD_WIDTH / 2,
        200,
        '#b97872',
        'emphasis'
      ));
    }

    if ([4, 8].includes(this.aiWaveCount) && this.game.offerBoonChoice) {
      this.game.offerBoonChoice(this.aiWaveCount);
    }

    if ([3, 6, 9].includes(this.aiWaveCount) && this.game.offerDoctrineChoice) {
      this.game.offerDoctrineChoice(this.aiWaveCount);
    }
  }

  retirePreviousWave() {
    let recalledCount = 0;
    for (const entity of this.game.entityManager.entities) {
      if (entity.isWaveFighter && entity.isAlive && !entity.isBoss) {
        entity.isAlive = false;
        recalledCount++;
      }
    }
    return recalledCount;
  }

  beginPlayerWithdrawal() {
    let withdrawing = 0;
    for (const entity of this.game.entityManager.entities) {
      if (
        entity.isWaveFighter
        && entity.team === 'player'
        && entity.isAlive
        && !entity.isBoss
      ) {
        entity.beginWithdrawal?.();
        withdrawing++;
      }
    }
    return withdrawing;
  }

  deployFinalReinforcements() {
    const baseY = this.game.canvas.height / 2;
    this.spawners.player.forEach((contract, index) => {
      const slot = getWaveFormationSlot(150, baseY, index, 'player');
      const unit = new Unit(this.game, slot.x, slot.y, 'player', contract.type);
      unit.formationRow = slot.row;
      unit.spawnerId = contract.id;
      unit.isWaveFighter = true;
      this.game.entityManager.addEntity(unit);
    });

    const finalProfile = getBossProfileForWave(MAX_WAVES);
    const enemyContracts = selectBossEscortContracts(
      this.spawners.enemy,
      finalProfile?.escortCap ?? this.spawners.enemy.length
    );
    enemyContracts.forEach((contract, index) => {
      const slot = getWaveFormationSlot(WORLD_WIDTH - 200, baseY, index, 'enemy');
      const unit = new Unit(this.game, slot.x, slot.y, 'enemy', contract.type);
      unit.formationRow = slot.row;
      unit.spawnerId = contract.id;
      unit.isWaveFighter = true;
      this.game.entityManager.addEntity(unit);
    });

    this.lastActionLog = '[최종 증원]: 양 진영 잔존 계약 부대 재투입';
    this.game.entityManager.addEntity(new FloatingText(
      this.game,
      '최종 증원 도착',
      WORLD_WIDTH / 2,
      230,
      '#d8bf8a',
      'emphasis'
    ));
  }

  updateFinalBattle(dt) {
    const playerBase = this.game.playerBase;
    const enemyBase = this.game.enemyBase;
    if (!playerBase?.isAlive || !enemyBase?.isAlive) return;

    this.finalBattleTime += dt;
    if (!this.getActiveBoss()) this.bossGateActive = false;

    const hasHolyFighters = this.hasActivePlayerWave();
    const hasDemonFighters = this.hasActiveEnemyWave();
    if (hasHolyFighters || hasDemonFighters) {
      this.finalReinforcementTimer = 5;
      return;
    }

    // A simultaneous wipe should not produce a silent soft-lock. The final
    // objective remains fortress destruction, so both contract rosters return.
    this.finalReinforcementTimer -= dt;
    if (this.finalReinforcementTimer <= 0) {
      this.deployFinalReinforcements();
      this.finalReinforcementTimer = 5;
    }
  }

  triggerAiOrbitalStrike() {
    if (this.game.audio) {
      this.game.audio.playExplosion({ major: true });
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
