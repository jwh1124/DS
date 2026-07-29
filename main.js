import { GameLoop } from './src/engine/GameLoop.js';
import { EntityManager } from './src/engine/EntityManager.js';
import { WaveSystem } from './src/engine/WaveSystem.js';
import { HUD } from './src/ui/HUD.js';
import { Minimap } from './src/ui/Minimap.js';
import { Base } from './src/entities/Base.js';
import { Economy } from './src/engine/Economy.js';
import { Particle } from './src/entities/Particle.js';
import { AudioEngine } from './src/engine/AudioEngine.js';
import { FloatingText } from './src/entities/FloatingText.js';
import {
  getTechUpgradeCost,
  getUnlockedUnitTypes,
  MAX_SPAWNERS,
  MAX_TECH_LEVEL,
  MAX_WAVES,
  UNIT_COSTS,
  UNIT_TECH_REQUIREMENTS
} from './src/gameConfig.js';
import { PLAYER_UNIT_ROLE_INFO } from './src/unitRoles.js';
import {
  applyDoctrineToBonuses,
  createDoctrineBonuses,
  getDoctrineById,
  getDoctrineChoices
} from './src/doctrines.js';
import { iconMarkup, labeledIconMarkup } from './src/ui/icons.js';
import {
  getCameraTargetX,
  getFrontlineFocusX,
  smoothCameraX
} from './src/cameraDirector.js';
import { buildAfterActionReport } from './src/afterAction.js';
import { getTacticalOrderDefinition } from './src/tacticalOrders.js';
import { getCombatDistance } from './src/combatMath.js';

export const WORLD_WIDTH = 2000;

// Exorcism Theme: Unit Name Maps
const PLAYER_UNIT_NAMES = { melee: '수도승', ranged: '엑소시스트', medic: '사제', sniper: '심판관', tank: '대천사', crusader: '십자군' };
const ENEMY_UNIT_NAMES = { melee: '임프', ranged: '서큐버스', medic: '리치', sniper: '밴시', tank: '발록', crusader: '핏로드' };

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    
    this.isRunning = false;
    this.isPaused = false;
    this.isDoctrineChoosing = false;
    this.pendingDoctrineChoices = [];
    this.doctrineBonuses = createDoctrineBonuses();
    this.screenShake = 0;
    this.shakeTime = 0;
    this.ultimateCooldown = 0;
    this.autoSpend = false;
    this.tacticalOrder = 'balanced';
    this.isDeveloperMode = new URLSearchParams(window.location.search).has('dev');
    this.runStats = this.createRunStats();
    
    this.audio = new AudioEngine();
    
    this.entityManager = new EntityManager(this);
    this.economy = new Economy(this);
    this.waveSystem = new WaveSystem(this);
    this.hud = new HUD(this);
    this.minimap = new Minimap(this);
    this.loop = new GameLoop(this.update.bind(this), this.draw.bind(this));
    
    this.playerBase = new Base(this, 150, this.canvas.height / 2, 'player', 10000);
    this.enemyBase = new Base(this, WORLD_WIDTH - 150, this.canvas.height / 2, 'enemy', 10000);
    this.entityManager.addEntity(this.playerBase);
    this.entityManager.addEntity(this.enemyBase);
    
    this.bgImage = new Image();
    this.bgImage.src = import.meta.env.BASE_URL + 'bg.jpg';
    
    this.cameraX = 0;
    this.cameraSpeed = 650;
    this.moveCameraLeft = false;
    this.moveCameraRight = false;
    this.followFrontline = true;
    
    this.gameSpeed = 1;
    this.difficulty = 1.0;
    
    this.dustParticles = Array.from({length: 120}, () => ({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * (this.canvas.height - 150),
      speed: Math.random() * 0.8 + 0.2,
      size: Math.random() * 2.5 + 0.8,
      alpha: Math.random() * 0.4 + 0.1
    }));
    
    this.setupInput();
    this.setupViewportPolicy();
    document.body.classList.toggle('developer-mode', this.isDeveloperMode);
    
    document.getElementById('ui-layer').style.display = 'none';
    
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = parseFloat(btn.dataset.diff);
      });
    });
    
    document.getElementById('start-btn').addEventListener('click', () => {
      this.audio.ensureRunning();
      document.getElementById('title-screen').style.opacity = '0';
      setTimeout(() => {
        document.getElementById('title-screen').style.display = 'none';
        document.getElementById('ui-layer').style.display = 'block';
        this.start();
        this.audio.startBGM();
      }, 1000);
    });
  }
  
  addScreenShake(intensity) {
    this.screenShake = Math.max(this.screenShake, Math.min(1, intensity / 20));
  }

  setFrontlineFollow(enabled) {
    this.followFrontline = Boolean(enabled);
    const button = document.getElementById('frontline-btn');
    if (!button) return;

    button.classList.toggle('active', this.followFrontline);
    button.setAttribute('aria-pressed', String(this.followFrontline));
    button.setAttribute('aria-label', this.followFrontline ? '전선 자동 추적 끄기' : '전선 자동 추적 켜기');
    button.title = this.followFrontline
      ? '[Space] 전선 자동 추적 중'
      : '[Space] 전선 자동 추적 꺼짐';
  }

  setTacticalOrder(orderId, announce = true) {
    const order = getTacticalOrderDefinition(orderId);
    const changed = this.tacticalOrder !== order.id;
    this.tacticalOrder = order.id;

    document.querySelectorAll('[data-tactical-order]').forEach(button => {
      const isActive = button.dataset.tacticalOrder === order.id;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    const hint = document.getElementById('tactical-order-hint');
    if (hint) hint.textContent = order.hint;

    if (changed && announce && this.isRunning) {
      this.audio.playClick();
      this.waveSystem.lastActionLog = `[전술 명령]: ${order.label} · ${order.hint}`;
      this.entityManager.addEntity(new FloatingText(
        this,
        `전술 명령 · ${order.label}`,
        this.cameraX + this.canvas.width / 2,
        160,
        '#d8bf8a',
        'emphasis'
      ));
    }
  }

  updateFrontlineCamera(dt) {
    const focusX = getFrontlineFocusX(this.entityManager.getEntities());
    if (focusX === null) return;

    const targetX = getCameraTargetX({
      currentX: this.cameraX,
      focusX,
      viewportWidth: this.canvas.width,
      worldWidth: WORLD_WIDTH
    });
    this.cameraX = smoothCameraX(this.cameraX, targetX, dt);
  }

  createRunStats() {
    return {
      contractsSigned: 0,
      contractsRefunded: 0,
      earlyStarts: 0,
      earlyFaith: 0,
      incomeRites: 0,
      techUpgrades: 0,
      ultimates: 0
    };
  }
  
  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.isDoctrineChoosing = false;
    this.pendingDoctrineChoices = [];
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    document.getElementById('pause-screen')?.classList.add('hidden');
    document.getElementById('doctrine-screen')?.classList.add('hidden');
    this.hideBossHud();
    this.loop.start();
    this.waveSystem.start();
    this.economy.start();
  }
  
  resetGame() {
    this.isRunning = false;
    this.isPaused = false;
    this.isDoctrineChoosing = false;
    this.pendingDoctrineChoices = [];
    this.doctrineBonuses = createDoctrineBonuses();
    this.loop.stop();
    this.waveSystem.stop();
    this.economy.stop();
    
    // Clear all entities
    this.entityManager.clear();
    
    // Re-create bases
    this.playerBase = new Base(this, 150, this.canvas.height / 2, 'player', 10000);
    this.enemyBase = new Base(this, WORLD_WIDTH - 150, this.canvas.height / 2, 'enemy', 10000);
    this.entityManager.addEntity(this.playerBase);
    this.entityManager.addEntity(this.enemyBase);
    
    // Reset economy, waves and player-facing session controls.
    this.economy.reset();
    this.waveSystem.reset();
    this.ultimateCooldown = 0;
    this.screenShake = 0;
    this.cameraX = 0;
    this.setFrontlineFollow(true);
    this.gameSpeed = 1;
    this.autoSpend = false;
    this.setTacticalOrder('balanced', false);
    this.runStats = this.createRunStats();
    
    // Reset Tech button UI
    const techBtn = document.querySelector('.build-btn[data-type="tech"]');
    if (techBtn) {
      techBtn.dataset.cost = getTechUpgradeCost(1);
      techBtn.querySelector('.cost').innerHTML = `<div class="mineral-icon small"></div> ${getTechUpgradeCost(1)}`;
      techBtn.querySelector('[data-action-label]').textContent = '성서 계시 (Lv.2)';
      techBtn.style.opacity = '1';
    }

    document.querySelectorAll('.cheat-btn[data-speed]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.speed === '1');
    });
    const autoSpendBtn = document.getElementById('auto-spend-btn');
    if (autoSpendBtn) {
      autoSpendBtn.innerHTML = labeledIconMarkup('cycle', '자동 소환: 끔');
      autoSpendBtn.classList.remove('active');
    }
    
    // Hide game over screen & show UI
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    document.getElementById('pause-screen')?.classList.add('hidden');
    document.getElementById('doctrine-screen')?.classList.add('hidden');
    this.hideBossHud();
    this.updateDoctrineSummary();
    
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'block';
    
    this.start();
  }

  stop(winner, endReason = 'baseDestroyed') {
    this.isRunning = false;
    this.isPaused = false;
    this.isDoctrineChoosing = false;
    this.pendingDoctrineChoices = [];
    this.loop.stop();
    this.waveSystem.stop();
    this.economy.stop();
    document.getElementById('doctrine-screen')?.classList.add('hidden');
    this.hideBossHud();
    
    const gameOverScreen = document.getElementById('game-over-screen');
    const title = document.getElementById('game-over-title');
    const summary = document.getElementById('game-over-summary');
    const kicker = document.getElementById('game-over-kicker');
    const metrics = document.getElementById('game-over-metrics');
    const adviceTitle = document.getElementById('game-over-advice-title');
    const adviceText = document.getElementById('game-over-advice-text');
    
    if (winner === 'player') {
      title.innerHTML = `${iconMarkup('cross', 'result-icon')}<span>승리!</span>`;
      title.style.color = '#c7ad77';
      title.style.textShadow = '0 5px 18px rgba(0, 0, 0, 0.72)';
    } else {
      title.innerHTML = `${iconMarkup('skull', 'result-icon')}<span>패배...</span>`;
      title.style.color = '#b66c68';
      title.style.textShadow = '0 5px 18px rgba(0, 0, 0, 0.72)';
    }
    
    const roster = Object.fromEntries(
      Object.keys(PLAYER_UNIT_NAMES).map(type => [type, this.waveSystem.countSpawners('player', type)])
    );
    const report = buildAfterActionReport({
      winner,
      endReason,
      wave: this.waveSystem.aiWaveCount,
      maxWaves: MAX_WAVES,
      playerIntegrity: this.playerBase ? (this.playerBase.hp / this.playerBase.maxHp) * 100 : 0,
      enemyIntegrity: this.enemyBase ? (this.enemyBase.hp / this.enemyBase.maxHp) * 100 : 0,
      roster,
      techLevel: this.playerBase?.techLevel ?? 1,
      contractsSigned: this.runStats.contractsSigned,
      earlyStarts: this.runStats.earlyStarts,
      incomeRites: this.runStats.incomeRites,
      ultimates: this.runStats.ultimates,
      tacticalOrderLabel: getTacticalOrderDefinition(this.tacticalOrder).label,
      doctrineNames: this.doctrineBonuses.selected
        .map(id => getDoctrineById(id)?.title)
        .filter(Boolean)
    });

    if (kicker) kicker.textContent = report.kicker;
    if (summary) summary.textContent = report.summary;
    if (metrics) {
      metrics.innerHTML = report.metrics.map(metric => `
        <div class="result-metric">
          <span>${metric.label}</span>
          <strong>${metric.value}</strong>
        </div>
      `).join('');
      if (report.grade) {
        metrics.querySelector('.result-metric')?.classList.add('grade-metric');
        const gradeValue = metrics.querySelector('.result-metric strong');
        if (gradeValue) gradeValue.textContent = `${report.grade} · ${gradeValue.textContent}`;
      }
    }
    if (adviceTitle) adviceTitle.textContent = report.recommendation.title;
    if (adviceText) adviceText.textContent = report.recommendation.text;
    if (gameOverScreen) gameOverScreen.classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('restart-btn')?.focus());
  }

  togglePause() {
    if (!this.isRunning || this.isDoctrineChoosing) return;
    this.isPaused = !this.isPaused;
    document.getElementById('pause-screen')?.classList.toggle('hidden', !this.isPaused);
  }

  offerDoctrineChoice(wave) {
    const choices = getDoctrineChoices(wave)
      .filter(doctrine => !this.doctrineBonuses.selected.includes(doctrine.id));
    if (!this.isRunning || choices.length === 0) return;

    this.pendingDoctrineChoices = choices.map(doctrine => doctrine.id);
    this.isDoctrineChoosing = true;
    this.isPaused = true;

    const screen = document.getElementById('doctrine-screen');
    const waveText = document.getElementById('doctrine-wave');
    const choiceRoot = document.getElementById('doctrine-choices');
    if (!screen || !choiceRoot) return;

    if (waveText) waveText.textContent = `WAVE ${wave} 교단 회의`;
    choiceRoot.innerHTML = choices.map((doctrine, index) => `
      <button class="doctrine-card" type="button" data-doctrine="${doctrine.id}">
        <span class="doctrine-key">[${index + 1}]</span>
        <span class="doctrine-icon" aria-hidden="true">${iconMarkup(doctrine.icon)}</span>
        <span class="doctrine-role">${doctrine.role}</span>
        <strong>${doctrine.title}</strong>
        <span class="doctrine-description">${doctrine.description}</span>
      </button>
    `).join('');

    choiceRoot.querySelectorAll('.doctrine-card').forEach(button => {
      button.addEventListener('click', () => this.selectDoctrine(button.dataset.doctrine));
    });
    screen.classList.remove('hidden');
    requestAnimationFrame(() => choiceRoot.querySelector('.doctrine-card')?.focus());
  }

  selectDoctrine(doctrineId) {
    if (!this.isDoctrineChoosing || !this.pendingDoctrineChoices.includes(doctrineId)) return;
    const doctrine = getDoctrineById(doctrineId);
    if (!doctrine) return;

    const effect = doctrine.effect;
    this.doctrineBonuses = applyDoctrineToBonuses(this.doctrineBonuses, doctrineId);

    if (effect.kind === 'income') {
      this.economy.increaseIncome(effect.amount);
    } else if (effect.kind === 'baseFortify' && this.playerBase) {
      this.playerBase.maxHp += effect.amount;
      this.playerBase.hp = Math.min(this.playerBase.maxHp, this.playerBase.hp + effect.amount);
    } else if (effect.kind === 'unitHp' || effect.kind === 'unitDamage') {
      const affectsAll = effect.types.includes('all');
      this.entityManager.entities
        .filter(entity => entity.team === 'player' && entity.type && entity.isAlive)
        .forEach(unit => {
          if (!affectsAll && !effect.types.includes(unit.type)) return;
          if (effect.kind === 'unitHp') {
            const hpRatio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 1;
            unit.maxHp = Math.round(unit.maxHp * effect.multiplier);
            unit.hp = Math.round(unit.maxHp * hpRatio);
          } else if (unit.damage > 0) {
            unit.damage = Math.round(unit.damage * effect.multiplier);
          }
        });
    }

    this.audio.playMagic();
    for (let i = 0; i < 20; i++) {
      this.entityManager.addEntity(new Particle(
        this,
        this.playerBase.x,
        this.playerBase.y - 30,
        '#d8bf8a',
        0.65,
        70,
        Math.random() * Math.PI * 2,
        3,
        'spark'
      ));
    }
    this.entityManager.addEntity(new FloatingText(
      this,
      `교리 채택 · ${doctrine.title}`,
      this.playerBase.x,
      this.playerBase.y - 120,
      '#d8bf8a',
      'emphasis'
    ));

    this.pendingDoctrineChoices = [];
    this.isDoctrineChoosing = false;
    this.isPaused = false;
    document.getElementById('doctrine-screen')?.classList.add('hidden');
    this.updateDoctrineSummary();
  }

  updateDoctrineSummary() {
    const summary = document.getElementById('doctrine-summary');
    if (!summary) return;
    const names = this.doctrineBonuses.selected
      .map(id => getDoctrineById(id)?.title)
      .filter(Boolean);
    summary.textContent = names.length ? names.join(' · ') : '아직 선택하지 않음';
  }

  hideBossHud() {
    const bossHud = document.getElementById('boss-hud');
    bossHud?.classList.add('hidden');
    bossHud?.setAttribute('aria-hidden', 'true');
  }

  focusCameraOn(worldX, viewportRatio = 0.72) {
    const maxCameraX = Math.max(0, WORLD_WIDTH - this.canvas.width);
    const targetX = worldX - this.canvas.width * viewportRatio;
    this.cameraX = Math.max(0, Math.min(maxCameraX, targetX));
  }

  setupViewportPolicy() {
    const updateScale = () => {
      const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720, 1);
      document.documentElement.style.setProperty('--game-scale', Math.max(scale, 0.1).toFixed(4));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
  }
  
  update(dt) {
    if (!this.isRunning || this.isPaused) return;
    
    const scaledDt = dt * this.gameSpeed;
    
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 1.8);
      this.shakeTime += dt;
    }
    
    if (this.ultimateCooldown > 0) {
      this.ultimateCooldown = Math.max(0, this.ultimateCooldown - scaledDt);
    }
    
    const currentTech = this.playerBase ? this.playerBase.techLevel : 1;

    // Auto-Spend
    if (this.autoSpend && this.economy.minerals >= UNIT_COSTS.melee && this.waveSystem.spawners.player.length < MAX_SPAWNERS) {
      const unlockedTypes = getUnlockedUnitTypes(currentTech);
      const affordable = unlockedTypes.filter(type => UNIT_COSTS[type] <= this.economy.minerals);
      if (affordable.length > 0) {
        const pick = affordable[Math.floor(Math.random() * affordable.length)];
        this.triggerAction(pick, UNIT_COSTS[pick], null);
      }
    }
    
    const ultBtn = document.querySelector('.build-btn[data-type="ultimate"]');
    const ultName = ultBtn?.querySelector('[data-action-label]');
    if (ultName) ultName.textContent = this.ultimateCooldown > 0
      ? `천벌 (${Math.ceil(this.ultimateCooldown)}s)`
      : '천벌 (부대 타격)';
    
    this.waveSystem.update(scaledDt);
    this.economy.update(scaledDt);
    this.entityManager.update(scaledDt);
    const attackingUnits = this.entityManager.entities.filter(entity =>
      entity.isWaveFighter && entity.isAlive && entity.state === 'attacking'
    ).length;
    this.audio.setCombatIntensity(Math.min(1, attackingUnits / 8));
    this.hud.update();
    
    // Update Build Queue Badges
    const playerSpawners = this.waveSystem.spawners.player;
    const pMelee = this.waveSystem.countSpawners('player', 'melee');
    const pRanged = this.waveSystem.countSpawners('player', 'ranged');
    const pMedic = this.waveSystem.countSpawners('player', 'medic');
    const pSniper = this.waveSystem.countSpawners('player', 'sniper');
    const pTank = this.waveSystem.countSpawners('player', 'tank');
    const pCrusader = this.waveSystem.countSpawners('player', 'crusader');
    
    const qMelee = document.getElementById('queue-melee');
    const qRanged = document.getElementById('queue-ranged');
    const qMedic = document.getElementById('queue-medic');
    const qSniper = document.getElementById('queue-sniper');
    const qTank = document.getElementById('queue-tank');
    const qCrusader = document.getElementById('queue-crusader');
    
    if (qMelee) qMelee.textContent = `x${pMelee}`;
    if (qRanged) qRanged.textContent = `x${pRanged}`;
    if (qMedic) qMedic.textContent = `x${pMedic}`;
    if (qSniper) qSniper.textContent = `x${pSniper}`;
    if (qTank) qTank.textContent = `x${pTank}`;
    if (qCrusader) qCrusader.textContent = `x${pCrusader}`;
    
    // Update Debug Monitor
    const enemySpawners = this.waveSystem.spawners.enemy;
    const aiMelee = this.waveSystem.countSpawners('enemy', 'melee');
    const aiRanged = this.waveSystem.countSpawners('enemy', 'ranged');
    const aiMedic = this.waveSystem.countSpawners('enemy', 'medic');
    const aiSniper = this.waveSystem.countSpawners('enemy', 'sniper');
    const aiTank = this.waveSystem.countSpawners('enemy', 'tank');
    const aiCrusader = this.waveSystem.countSpawners('enemy', 'crusader');
    
    const dbgAiMinerals = document.getElementById('debug-ai-minerals');
    const dbgAiIncome = document.getElementById('debug-ai-income');
    const dbgAiUnits = document.getElementById('debug-ai-units');
    const dbgPlayerUnits = document.getElementById('debug-player-units');
    const dbgHealerTactics = document.getElementById('debug-healer-tactics');
    const dbgAudioVoices = document.getElementById('debug-audio-voices');
    const dbgLastAction = document.getElementById('debug-last-action');
    
    if (dbgAiMinerals) dbgAiMinerals.textContent = `${Math.floor(this.waveSystem.aiMinerals)} 악마력`;
    if (dbgAiIncome) dbgAiIncome.textContent = `+${this.waveSystem.aiIncome} 악마력`;
    if (dbgAiUnits) dbgAiUnits.textContent = `임프${aiMelee} 서큐${aiRanged} 리치${aiMedic} 밴시${aiSniper} 발록${aiTank} 핏로드${aiCrusader} (${enemySpawners.length}/${MAX_SPAWNERS})`;
    if (dbgPlayerUnits) dbgPlayerUnits.textContent = `수도승${pMelee} 퇴마${pRanged} 사제${pMedic} 심판${pSniper} 천사${pTank} 십자군${pCrusader} (${playerSpawners.length}/${MAX_SPAWNERS})`;
    if (dbgHealerTactics) {
      const livingUnits = this.entityManager.entities.filter(entity =>
        entity.isWaveFighter && entity.isAlive
      );
      const healerSummary = (team, label) => {
        const healers = livingUnits.filter(unit => unit.team === team && unit.type === 'medic');
        const activeHealers = healers.filter(unit =>
          unit.state === 'attacking' && unit.target?.isAlive
        );
        const longestHeal = activeHealers.reduce(
          (longest, healer) => Math.max(longest, getCombatDistance(healer, healer.target)),
          0
        );
        const threats = livingUnits.filter(unit =>
          unit.target?.team === team && unit.target?.type === 'medic'
        ).length;
        return `${label}${healers.length} · 치유${activeHealers.length}`
          + `${longestHeal > 0 ? `(${Math.round(longestHeal)})` : ''} · 피격표적${threats}`;
      };
      dbgHealerTactics.textContent = `${healerSummary('player', '사제')} / ${healerSummary('enemy', '리치')}`;
    }
    if (dbgAudioVoices) {
      const audioState = this.audio.getDebugState();
      const contextLabel = audioState.contextState === 'running' ? '출력 정상' : `출력 ${audioState.contextState}`;
      dbgAudioVoices.textContent = `재생 ${audioState.played} · 억제 ${audioState.dropped} · 전투 ${Math.round(audioState.intensity * 100)}% · 최고피크 ${Math.round(audioState.peak * 100)}% · ${contextLabel}`;
    }
    if (dbgLastAction && this.waveSystem.lastActionLog) dbgLastAction.textContent = this.waveSystem.lastActionLog;
    
    if (this.moveCameraLeft) {
      this.cameraX -= this.cameraSpeed * dt;
    } else if (this.moveCameraRight) {
      this.cameraX += this.cameraSpeed * dt;
    } else if (this.followFrontline) {
      this.updateFrontlineCamera(dt);
    }
    
    if (this.cameraX < 0) this.cameraX = 0;
    if (this.cameraX > WORLD_WIDTH - this.canvas.width) this.cameraX = WORLD_WIDTH - this.canvas.width;
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0) {
      const shakeAmount = 14 * this.screenShake * this.screenShake;
      shakeX = Math.sin(this.shakeTime * 43) * shakeAmount;
      shakeY = Math.sin(this.shakeTime * 61) * shakeAmount * 0.7;
    }
    
    this.ctx.translate(-Math.floor(this.cameraX) + shakeX, shakeY);
    
    if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      this.ctx.drawImage(this.bgImage, 0, 0, 1500, this.canvas.height);
      this.ctx.drawImage(this.bgImage, 1500, 0, 1500, this.canvas.height);
    } else {
      this.drawFallbackBackground();
    }
    
    this.dustParticles.forEach(p => {
      p.x -= p.speed;
      if (p.x < 0) p.x = WORLD_WIDTH;
      
      const emberColor = Math.random() > 0.5 ? `rgba(255, 80, 40, ${p.alpha})` : `rgba(200, 120, 255, ${p.alpha * 0.6})`;
      this.ctx.fillStyle = emberColor;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    
    this.ctx.fillStyle = '#0a0508';
    this.ctx.fillRect(0, this.canvas.height - 150, WORLD_WIDTH, 150);
    
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#8b0000';
    this.ctx.fillStyle = '#8b0000';
    this.ctx.fillRect(0, this.canvas.height - 150, WORLD_WIDTH, 4);
    this.ctx.shadowBlur = 0;
    
    this.entityManager.draw(this.ctx);
    
    this.ctx.restore();
    
    if (this.minimap) {
      this.minimap.draw();
    }
  }
  
  drawFallbackBackground() {
    this.ctx.fillStyle = '#0a0508';
    this.ctx.fillRect(0, 0, WORLD_WIDTH, this.canvas.height);
  }
  
  triggerAction(type, cost, btnElement) {
    if (!this.isRunning) return;
    
    if (type === 'ultimate' && this.ultimateCooldown > 0) {
      return;
    }
    
    // Check Tech Requirement before purchasing unit
    const reqTech = UNIT_TECH_REQUIREMENTS[type];
    if (reqTech && this.playerBase && this.playerBase.techLevel < reqTech) {
      this.entityManager.addEntity(new FloatingText(
        this, `성서 계시 Lv.${reqTech} 필요`, this.playerBase.x, this.playerBase.y - 120, '#b97872', 'emphasis'
      ));
      return;
    }
    
    this.audio.playClick();
    
    if (type === 'income') {
      if (this.economy.spendMinerals(cost)) {
        this.economy.increaseIncome(15);
        this.runStats.incomeRites++;
        for (let i = 0; i < 15; i++) {
          this.entityManager.addEntity(new Particle(
            this, this.playerBase.x, this.playerBase.y, '#f1c40f', 0.8, 60, Math.random() * Math.PI * 2, 4, 'spark'
          ));
        }
      }
    } else if (type === 'tech') {
      if (this.playerBase.techLevel >= MAX_TECH_LEVEL) return;
      
      if (this.economy.spendMinerals(cost)) {
        this.playerBase.upgradeTech();
        this.runStats.techUpgrades++;
        
        if (btnElement) {
          if (this.playerBase.techLevel >= MAX_TECH_LEVEL) {
            btnElement.dataset.cost = Infinity;
            btnElement.querySelector('.cost').innerHTML = `<div class="mineral-icon small"></div> -`;
            btnElement.querySelector('[data-action-label]').textContent = '성서 계시 (MAX)';
            btnElement.style.opacity = 0.5;
          } else {
            const nextCost = getTechUpgradeCost(this.playerBase.techLevel);
            btnElement.dataset.cost = nextCost;
            btnElement.querySelector('.cost').innerHTML = `<div class="mineral-icon small"></div> ${nextCost}`;
            btnElement.querySelector('[data-action-label]').textContent = `성서 계시 (Lv.${this.playerBase.techLevel + 1})`;
          }
        }
      }
    } else if (type === 'ultimate') {
      if (this.economy.spendMinerals(cost)) {
        this.ultimateCooldown = 30;
        this.runStats.ultimates++;
        this.triggerOrbitalStrike();
      }
    } else {
      if (this.waveSystem.spawners.player.length >= MAX_SPAWNERS) {
        this.entityManager.addEntity(new FloatingText(
          this, `교단 편성 한도 도달 (${MAX_SPAWNERS}/${MAX_SPAWNERS})`, this.playerBase.x, this.playerBase.y - 120, '#b97872', 'emphasis'
        ));
        return;
      }
      
      if (this.economy.spendMinerals(cost)) {
        const added = this.waveSystem.addSpawner('player', type);
        if (added) {
          this.runStats.contractsSigned++;
          for (let i = 0; i < 12; i++) {
            this.entityManager.addEntity(new Particle(
              this, this.playerBase.x, this.playerBase.y, '#f1c40f', 0.5, 50, Math.random() * Math.PI * 2, 3, 'spark'
            ));
          }
        }
      }
    }
  }

  triggerRefundAction(type) {
    if (!this.isRunning) return;
    
    if (!UNIT_COSTS[type]) return;
    
    const removed = this.waveSystem.removeSpawner('player', type);
    if (removed) {
      const refundAmount = Math.floor(UNIT_COSTS[type] * 0.5);
      this.economy.minerals += refundAmount;
      this.audio.playMagic();
      const fieldedUnits = this.entityManager.entities.filter(entity =>
        entity.team === 'player' && entity.spawnerId === removed.id && entity.isAlive
      );
      // Cancelling a contract changes the next wave's roster. A unit already
      // fighting keeps advancing until the current wave ends.
      this.runStats.contractsRefunded++;
      
      this.entityManager.addEntity(new FloatingText(
        this,
        fieldedUnits.length > 0
          ? `계약 해지: ${PLAYER_UNIT_NAMES[type]} · 다음 웨이브부터 제외 (+${refundAmount} 신앙심)`
          : `계약 해지: ${PLAYER_UNIT_NAMES[type]} (+${refundAmount} 신앙심)`,
        this.playerBase.x,
        this.playerBase.y - 100,
        '#d8bf8a',
        'emphasis'
      ));
      
      for (let i = 0; i < 10; i++) {
        this.entityManager.addEntity(new Particle(
          this, this.playerBase.x, this.playerBase.y, '#f1c40f', 0.5, 40, Math.random() * Math.PI * 2, 3, 'spark'
        ));
      }
    } else {
      this.entityManager.addEntity(new FloatingText(
        this, `환속할 ${PLAYER_UNIT_NAMES[type]} 없음`, this.playerBase.x, this.playerBase.y - 100, '#b97872', false
      ));
    }
  }

  launchNextWaveEarly() {
    if (!this.isRunning || this.isPaused) return;
    const wasClearPrep = this.waveSystem.isClearPrepWindow?.() ?? false;
    if (!this.waveSystem.launchNextWaveEarly()) return;

    const earlyBonus = 20;
    this.economy.minerals += earlyBonus;
    this.runStats.earlyStarts++;
    this.runStats.earlyFaith += earlyBonus;
    this.audio.playClick();
    this.entityManager.addEntity(new FloatingText(
      this,
      `${wasClearPrep ? '정비 단축' : '정찰 돌파'} · 웨이브 개시 (+${earlyBonus} 신앙심)`,
      WORLD_WIDTH / 2,
      170,
      '#d8bf8a',
      'emphasis'
    ));
  }

  setupInput() {
    const tooltip = document.getElementById('tooltip');
    const ttTitle = document.getElementById('tooltip-title');
    const ttDesc = document.getElementById('tooltip-desc');
    const ttHp = document.getElementById('tt-hp');
    const ttDmg = document.getElementById('tt-dmg');
    const ttRange = document.getElementById('tt-range');

    const unitStats = {
      melee: { title: '수도승 (근접) [1] | 성서 계시 Lv.1', desc: PLAYER_UNIT_ROLE_INFO.melee.description, hp: 120, dmg: 25, range: '근접' },
      ranged: { title: '엑소시스트 (원거리) [2] | 성서 계시 Lv.1', desc: PLAYER_UNIT_ROLE_INFO.ranged.description, hp: 60, dmg: '35 · 대공 44', range: '원거리' },
      medic: { title: '사제 (치유) [3] | 필요: 성서 계시 Lv.2 (300)', desc: PLAYER_UNIT_ROLE_INFO.medic.description, hp: 100, dmg: '치유+30', range: '장거리' },
      sniper: { title: '이단심판관 (저격) [4] | 필요: 성서 계시 Lv.2 (300)', desc: PLAYER_UNIT_ROLE_INFO.sniper.description, hp: 80, dmg: '90 · 대형 122', range: '초장거리' },
      tank: { title: '대천사 (광역심판) [5] | 필요: 성서 계시 Lv.3', desc: PLAYER_UNIT_ROLE_INFO.tank.description, hp: 300, dmg: '60(AOE)', range: '장거리' },
      crusader: { title: '십자군 (수호탱커) [6] | 필요: 성서 계시 Lv.3', desc: PLAYER_UNIT_ROLE_INFO.crusader.description, hp: 450, dmg: '45(근접)', range: '근접' },
      income: { title: '제단 봉헌 [Q]', desc: '매 웨이브마다 추가 신앙심을 +15 획득.', hp: '-', dmg: '-', range: '-' },
      tech: { title: '성서 계시 [W]', desc: '성당 방어탑 개방 및 상위 성직자 해금.', hp: '-', dmg: '-', range: '-' },
      ultimate: { title: '천벌 [E]', desc: '전장의 모든 악마에게 150 신성 피해를 가하는 천상의 심판.', hp: '-', dmg: '150(부대)', range: '전체' }
    };

    document.querySelectorAll('.build-btn').forEach(btn => {
      btn.addEventListener('mouseenter', (e) => {
        const type = btn.dataset.type;
        const stats = unitStats[type];
        if (stats) {
          ttTitle.textContent = stats.title;
          ttDesc.textContent = stats.desc;
          ttHp.textContent = stats.hp;
          ttDmg.textContent = stats.dmg;
          ttRange.textContent = stats.range;
          
          const rect = btn.getBoundingClientRect();
          tooltip.style.left = (rect.left + rect.width/2) + 'px';
          tooltip.style.top = rect.top + 'px';
          tooltip.classList.remove('hidden');
        }
      });
      btn.addEventListener('mouseleave', () => {
        tooltip.classList.add('hidden');
      });

      btn.addEventListener('click', (e) => {
        const type = btn.dataset.type;
        const cost = parseInt(btn.dataset.cost);
        this.triggerAction(type, cost, btn);
      });

      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const type = btn.dataset.type;
        if (['melee', 'ranged', 'medic', 'sniper', 'tank', 'crusader'].includes(type)) {
          this.triggerRefundAction(type);
        }
      });
    });
    
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.resetGame();
      });
    }

    document.getElementById('pause-btn')?.addEventListener('click', () => this.togglePause());
    document.getElementById('resume-btn')?.addEventListener('click', () => this.togglePause());
    document.getElementById('pause-restart-btn')?.addEventListener('click', () => this.resetGame());
    document.getElementById('launch-wave-btn')?.addEventListener('click', () => this.launchNextWaveEarly());
    document.getElementById('frontline-btn')?.addEventListener('click', () => {
      this.setFrontlineFollow(!this.followFrontline);
    });
    document.querySelectorAll('[data-tactical-order]').forEach(button => {
      button.addEventListener('click', () => this.setTacticalOrder(button.dataset.tacticalOrder));
    });
    
    document.querySelectorAll('.cheat-btn[data-speed]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.cheat-btn[data-speed]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.gameSpeed = parseFloat(btn.dataset.speed);
      });
    });
    
    document.querySelector('.cheat-btn[data-speed="1"]').classList.add('active');
    
    document.getElementById('cheat-money-btn').addEventListener('click', () => {
      this.economy.minerals += 10000;
      this.audio.playMagic();
    });

    const audioButtons = document.querySelectorAll('[data-audio-toggle]');
    audioButtons.forEach(audioBtn => {
      audioBtn.addEventListener('click', () => {
        const isMuted = this.audio.toggleMute();
        audioButtons.forEach(button => {
          const audioIcon = isMuted ? 'volume-off' : 'volume';
          button.innerHTML = button.hasAttribute('data-compact-audio')
            ? iconMarkup(audioIcon)
            : labeledIconMarkup(audioIcon, isMuted ? '사운드 끔' : '사운드 켬');
          button.setAttribute('aria-label', isMuted ? '사운드 켜기' : '사운드 끄기');
          button.classList.toggle('active', !isMuted);
        });
      });
    });

    const autoSpendBtn = document.getElementById('auto-spend-btn');
    if (autoSpendBtn) {
      autoSpendBtn.addEventListener('click', () => {
        this.autoSpend = !this.autoSpend;
        autoSpendBtn.innerHTML = labeledIconMarkup('cycle', this.autoSpend ? '자동 소환: 켬' : '자동 소환: 끔');
        if (this.autoSpend) {
          autoSpendBtn.classList.add('active');
        } else {
          autoSpendBtn.classList.remove('active');
        }
      });
    }
    
    window.addEventListener('keydown', (e) => {
      if (this.isDoctrineChoosing) {
        const choiceIndex = ['1', '2', '3'].indexOf(e.key);
        if (choiceIndex >= 0 && this.pendingDoctrineChoices[choiceIndex]) {
          e.preventDefault();
          this.selectDoctrine(this.pendingDoctrineChoices[choiceIndex]);
        }
        return;
      }

      if (e.key === 'Escape') {
        this.togglePause();
        return;
      }

      if (!this.isRunning || this.isPaused) return;

      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        this.setFrontlineFollow(false);
        this.moveCameraLeft = true;
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        this.setFrontlineFollow(false);
        this.moveCameraRight = true;
      }
      
      const key = e.key.toLowerCase();
      
      if (e.shiftKey) {
        if (key === '!' || key === '1') this.triggerRefundAction('melee');
        else if (key === '@' || key === '2') this.triggerRefundAction('ranged');
        else if (key === '#' || key === '3') this.triggerRefundAction('medic');
        else if (key === '$' || key === '4') this.triggerRefundAction('sniper');
        else if (key === '%' || key === '5') this.triggerRefundAction('tank');
        else if (key === '^' || key === '6') this.triggerRefundAction('crusader');
        return;
      }
      
      if (key === '1') {
        const btn = document.querySelector('.build-btn[data-type="melee"]');
        if (btn) this.triggerAction('melee', parseInt(btn.dataset.cost), btn);
      } else if (key === '2') {
        const btn = document.querySelector('.build-btn[data-type="ranged"]');
        if (btn) this.triggerAction('ranged', parseInt(btn.dataset.cost), btn);
      } else if (key === '3') {
        const btn = document.querySelector('.build-btn[data-type="medic"]');
        if (btn) this.triggerAction('medic', parseInt(btn.dataset.cost), btn);
      } else if (key === '4') {
        const btn = document.querySelector('.build-btn[data-type="sniper"]');
        if (btn) this.triggerAction('sniper', parseInt(btn.dataset.cost), btn);
      } else if (key === '5') {
        const btn = document.querySelector('.build-btn[data-type="tank"]');
        if (btn) this.triggerAction('tank', parseInt(btn.dataset.cost), btn);
      } else if (key === '6') {
        const btn = document.querySelector('.build-btn[data-type="crusader"]');
        if (btn) this.triggerAction('crusader', parseInt(btn.dataset.cost), btn);
      } else if (key === 'q') {
        const btn = document.querySelector('.build-btn[data-type="income"]');
        if (btn) this.triggerAction('income', parseInt(btn.dataset.cost), btn);
      } else if (key === 'w') {
        const btn = document.querySelector('.build-btn[data-type="tech"]');
        if (btn) this.triggerAction('tech', parseInt(btn.dataset.cost), btn);
      } else if (key === 'e') {
        const btn = document.querySelector('.build-btn[data-type="ultimate"]');
        if (btn) this.triggerAction('ultimate', parseInt(btn.dataset.cost), btn);
      } else if (key === 'f') {
        this.launchNextWaveEarly();
      } else if (key === '7') {
        this.setTacticalOrder('balanced');
      } else if (key === '8') {
        this.setTacticalOrder('rear');
      } else if (key === '9') {
        this.setTacticalOrder('boss');
      } else if (key === ' ') {
        e.preventDefault();
        this.setFrontlineFollow(!this.followFrontline);
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (this.isPaused) return;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.moveCameraLeft = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.moveCameraRight = false;
    });
  }
  
  triggerOrbitalStrike() {
    this.audio.playExplosion({ major: true });
    this.addScreenShake(20);

    this.entityManager.addEntity(new FloatingText(
      this, '천벌 집행', WORLD_WIDTH / 2, 180, '#d8bf8a', 'emphasis'
    ));

    const enemies = this.entityManager.getEntitiesByTeam('enemy');
    enemies.forEach(enemy => {
      for (let i = 0; i < 18; i++) {
        this.entityManager.addEntity(new Particle(
          this, enemy.x + (Math.random()-0.5)*30, enemy.y - 80 - Math.random()*200, '#f1c40f', 0.8, 300, Math.PI/2, 5, 'spark'
        ));
      }
      this.entityManager.addEntity(new Particle(
        this, enemy.x, enemy.y, '#f1c40f', 0.4, 0, Math.random() * Math.PI, 35, 'cross_flash'
      ));
      enemy.takeDamage(150, true);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Vite hot reload can re-evaluate this entry while the page is still open.
  // Keep one authoritative game instance so controls never receive duplicate
  // listeners (which is especially destructive for purchases and upgrades).
  if (!window.__exorcismGame) {
    window.__exorcismGame = new Game();
  }
});
