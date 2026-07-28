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
  UNIT_COSTS,
  UNIT_TECH_REQUIREMENTS
} from './src/gameConfig.js';

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
    this.screenShake = 0;
    this.shakeTime = 0;
    this.ultimateCooldown = 0;
    this.autoSpend = false;
    this.isDeveloperMode = new URLSearchParams(window.location.search).has('dev');
    
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
  
  start() {
    this.isRunning = true;
    this.isPaused = false;
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    document.getElementById('pause-screen')?.classList.add('hidden');
    this.loop.start();
    this.waveSystem.start();
    this.economy.start();
  }
  
  resetGame() {
    this.isRunning = false;
    this.isPaused = false;
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
    this.gameSpeed = 1;
    this.autoSpend = false;
    
    // Reset Tech button UI
    const techBtn = document.querySelector('.build-btn[data-type="tech"]');
    if (techBtn) {
      techBtn.dataset.cost = getTechUpgradeCost(1);
      techBtn.querySelector('.cost').innerHTML = `<div class="mineral-icon small"></div> ${getTechUpgradeCost(1)}`;
      techBtn.querySelector('.name').innerHTML = `📖 성서 계시 (Lv.2)`;
      techBtn.style.opacity = '1';
    }

    document.querySelectorAll('.cheat-btn[data-speed]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.speed === '1');
    });
    const autoSpendBtn = document.getElementById('auto-spend-btn');
    if (autoSpendBtn) {
      autoSpendBtn.textContent = '🤖 자동 소환: 끔';
      autoSpendBtn.classList.remove('active');
    }
    
    // Hide game over screen & show UI
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    document.getElementById('pause-screen')?.classList.add('hidden');
    
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'block';
    
    this.start();
  }

  stop(winner) {
    this.isRunning = false;
    this.isPaused = false;
    this.loop.stop();
    this.waveSystem.stop();
    this.economy.stop();
    
    const gameOverScreen = document.getElementById('game-over-screen');
    const title = document.getElementById('game-over-title');
    const summary = document.getElementById('game-over-summary');
    
    if (winner === 'player') {
      title.textContent = '✝️ 승리!';
      title.style.color = '#c7ad77';
      title.style.textShadow = '0 5px 18px rgba(0, 0, 0, 0.72)';
    } else {
      title.textContent = '☠️ 패배...';
      title.style.color = '#b66c68';
      title.style.textShadow = '0 5px 18px rgba(0, 0, 0, 0.72)';
    }
    
    if (gameOverScreen) gameOverScreen.classList.remove('hidden');
    if (summary) {
      const wave = Math.max(1, this.waveSystem.aiWaveCount);
      summary.textContent = winner === 'player'
        ? `${wave} 웨이브 만에 지옥문을 정화했습니다.`
        : `${wave} 웨이브에서 성당이 무너졌습니다. 조합을 바꿔 다시 도전하세요.`;
    }
  }

  togglePause() {
    if (!this.isRunning) return;
    this.isPaused = !this.isPaused;
    document.getElementById('pause-screen')?.classList.toggle('hidden', !this.isPaused);
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
    const ultName = ultBtn?.querySelector('.name');
    if (ultName) ultName.textContent = this.ultimateCooldown > 0
      ? `⚡ 천벌 (${Math.ceil(this.ultimateCooldown)}s)`
      : '⚡ 천벌 (부대 타격)';
    
    this.waveSystem.update(scaledDt);
    this.economy.update(scaledDt);
    this.entityManager.update(scaledDt);
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
    const dbgLastAction = document.getElementById('debug-last-action');
    
    if (dbgAiMinerals) dbgAiMinerals.textContent = `${Math.floor(this.waveSystem.aiMinerals)} 🔥`;
    if (dbgAiIncome) dbgAiIncome.textContent = `+${this.waveSystem.aiIncome} 🔥`;
    if (dbgAiUnits) dbgAiUnits.textContent = `임프${aiMelee} 서큐${aiRanged} 리치${aiMedic} 밴시${aiSniper} 발록${aiTank} 핏로드${aiCrusader} (${enemySpawners.length}/50)`;
    if (dbgPlayerUnits) dbgPlayerUnits.textContent = `수도승${pMelee} 퇴마${pRanged} 사제${pMedic} 심판${pSniper} 천사${pTank} 십자군${pCrusader} (${playerSpawners.length}/50)`;
    if (dbgLastAction && this.waveSystem.lastActionLog) dbgLastAction.textContent = this.waveSystem.lastActionLog;
    
    if (this.moveCameraLeft) {
      this.cameraX -= this.cameraSpeed * dt;
    }
    if (this.moveCameraRight) {
      this.cameraX += this.cameraSpeed * dt;
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
        this, `🔒 필요: 성서 계시 Lv.${reqTech}!`, this.playerBase.x, this.playerBase.y - 120, '#ff0055', true
      ));
      return;
    }
    
    this.audio.playClick();
    
    if (type === 'income') {
      if (this.economy.spendMinerals(cost)) {
        this.economy.increaseIncome(15);
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
        
        if (btnElement) {
          if (this.playerBase.techLevel >= MAX_TECH_LEVEL) {
            btnElement.dataset.cost = Infinity;
            btnElement.querySelector('.cost').innerHTML = `<div class="mineral-icon small"></div> -`;
            btnElement.querySelector('.name').innerHTML = `📖 성서 계시 (MAX)`;
            btnElement.style.opacity = 0.5;
          } else {
            const nextCost = getTechUpgradeCost(this.playerBase.techLevel);
            btnElement.dataset.cost = nextCost;
            btnElement.querySelector('.cost').innerHTML = `<div class="mineral-icon small"></div> ${nextCost}`;
            btnElement.querySelector('.name').innerHTML = `📖 성서 계시 (Lv.${this.playerBase.techLevel + 1})`;
          }
        }
      }
    } else if (type === 'ultimate') {
      if (this.economy.spendMinerals(cost)) {
        this.ultimateCooldown = 30;
        this.triggerOrbitalStrike();
      }
    } else {
      if (this.waveSystem.spawners.player.length >= MAX_SPAWNERS) {
        this.entityManager.addEntity(new FloatingText(
          this, `⚠️ 교단 소환 한도 (50/50 MAX)!`, this.playerBase.x, this.playerBase.y - 120, '#ff0055', true
        ));
        return;
      }
      
      if (this.economy.spendMinerals(cost)) {
        const added = this.waveSystem.addSpawner('player', type);
        if (added) {
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
      const recalledUnits = this.entityManager.entities.filter(entity =>
        entity.team === 'player' && entity.spawnerId === removed.id && entity.isAlive
      );
      recalledUnits.forEach(unit => { unit.isAlive = false; });
      
      this.entityManager.addEntity(new FloatingText(
        this, `계약 해지: ${PLAYER_UNIT_NAMES[type]} ${recalledUnits.length}명 귀환 (+${refundAmount} 신앙석)`, this.playerBase.x, this.playerBase.y - 100, '#f1c40f', true
      ));
      
      for (let i = 0; i < 10; i++) {
        this.entityManager.addEntity(new Particle(
          this, this.playerBase.x, this.playerBase.y, '#f1c40f', 0.5, 40, Math.random() * Math.PI * 2, 3, 'spark'
        ));
      }
    } else {
      this.entityManager.addEntity(new FloatingText(
        this, `⚠️ 환속할 ${PLAYER_UNIT_NAMES[type]} 없음!`, this.playerBase.x, this.playerBase.y - 100, '#ff0055', false
      ));
    }
  }

  launchNextWaveEarly() {
    if (!this.isRunning || this.isPaused) return;
    if (!this.waveSystem.launchNextWaveEarly()) return;

    const earlyBonus = 20;
    this.economy.minerals += earlyBonus;
    this.audio.playClick();
    this.entityManager.addEntity(new FloatingText(
      this, `정찰 돌파 · 웨이브 개시 (+${earlyBonus} 신앙심)`, WORLD_WIDTH / 2, 170, '#e7c56f', true
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
      melee: { title: '🙏 수도승 (근접) [1] | 성서 계시 Lv.1', desc: '성수 주먹으로 악마를 때려잡는 최전방 전위.', hp: 120, dmg: 25, range: '근접' },
      ranged: { title: '✝️ 엑소시스트 (원거리) [2] | 성서 계시 Lv.1', desc: '성수탄을 발사하여 원거리에서 악마를 퇴마.', hp: 60, dmg: 35, range: '원거리' },
      medic: { title: '⛪ 사제 (치유) [3] | 🔒 필요: 성서 계시 Lv.2', desc: '신성한 기도로 부상당한 아군의 상처를 치유.', hp: 100, dmg: '치유+30', range: '중거리' },
      sniper: { title: '🔥 이단심판관 (저격) [4] | 🔒 필요: 성서 계시 Lv.3', desc: '은탄환으로 초장거리에서 악마를 처형하는 심판자.', hp: 80, dmg: 75, range: '초장거리' },
      tank: { title: '👼 대천사 (광역심판) [5] | 🔒 필요: 성서 계시 Lv.4', desc: '신성한 불꽃으로 광역 심판을 내리는 천상의 존재.', hp: 300, dmg: '60(AOE)', range: '장거리' },
      crusader: { title: '⚔️ 십자군 (수호탱커) [6] | 🔒 필요: 성서 계시 Lv.5', desc: '거대한 수호방패와 신성 방어 아우라로 아군을 보호.', hp: 450, dmg: '45(근접)', range: '근접' },
      income: { title: '🕯️ 제단 봉헌 [Q]', desc: '매 웨이브마다 추가 신앙심을 +15 획득.', hp: '-', dmg: '-', range: '-' },
      tech: { title: '📖 성서 계시 [W]', desc: '성당 방어탑 개방 및 상위 성직자 해금.', hp: '-', dmg: '-', range: '-' },
      ultimate: { title: '⚡ 천벌 [E]', desc: '전장의 모든 악마에게 150 신성 피해를 가하는 천상의 심판.', hp: '-', dmg: '150(부대)', range: '전체' }
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
          button.textContent = button.hasAttribute('data-compact-audio')
            ? (isMuted ? '🔇' : '🔊')
            : (isMuted ? '🔇 사운드 끔' : '🔊 사운드 켬');
          button.setAttribute('aria-label', isMuted ? '사운드 켜기' : '사운드 끄기');
          button.classList.toggle('active', !isMuted);
        });
      });
    });

    const autoSpendBtn = document.getElementById('auto-spend-btn');
    if (autoSpendBtn) {
      autoSpendBtn.addEventListener('click', () => {
        this.autoSpend = !this.autoSpend;
        autoSpendBtn.textContent = this.autoSpend ? '🤖 자동 소환: 켬' : '🤖 자동 소환: 끔';
        if (this.autoSpend) {
          autoSpendBtn.classList.add('active');
        } else {
          autoSpendBtn.classList.remove('active');
        }
      });
    }
    
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.togglePause();
        return;
      }

      if (!this.isRunning || this.isPaused) return;

      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.moveCameraLeft = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.moveCameraRight = true;
      
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
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (this.isPaused) return;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.moveCameraLeft = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.moveCameraRight = false;
    });
  }
  
  triggerOrbitalStrike() {
    this.audio.playExplosion();
    this.addScreenShake(20);

    this.entityManager.addEntity(new FloatingText(this, `⚡ 천벌이 내려옵니다! ⚡`, WORLD_WIDTH/2, 180, '#f1c40f', true));

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
  new Game();
});
