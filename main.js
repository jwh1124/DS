import { GameLoop } from './src/engine/GameLoop.js';
import { EntityManager } from './src/engine/EntityManager.js';
import { WaveSystem } from './src/engine/WaveSystem.js';
import { HUD } from './src/ui/HUD.js';
import { Minimap } from './src/ui/Minimap.js';
import { Base } from './src/entities/Base.js';
import { Economy } from './src/engine/Economy.js';
import { Particle } from './src/entities/Particle.js';
import { AudioEngine } from './src/engine/AudioEngine.js';

export const WORLD_WIDTH = 2000;

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    
    this.isRunning = false;
    this.screenShake = 0;
    this.ultimateCooldown = 0; // Cooldown for Ultimate Ability
    
    this.audio = new AudioEngine();
    
    this.entityManager = new EntityManager(this);
    this.economy = new Economy(this);
    this.waveSystem = new WaveSystem(this);
    this.hud = new HUD(this);
    this.minimap = new Minimap(this);
    this.loop = new GameLoop(this.update.bind(this), this.draw.bind(this));
    
    this.playerBase = new Base(this, 150, this.canvas.height / 2, 'player', 5000);
    this.enemyBase = new Base(this, WORLD_WIDTH - 150, this.canvas.height / 2, 'enemy', 5000);
    this.entityManager.addEntity(this.playerBase);
    this.entityManager.addEntity(this.enemyBase);
    
    this.bgImage = new Image();
    this.bgImage.src = import.meta.env.BASE_URL + 'bg.png';
    
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
    this.screenShake = Math.max(this.screenShake, intensity);
  }
  
  start() {
    this.isRunning = true;
    document.getElementById('game-over-screen').classList.add('hidden');
    this.loop.start();
    this.waveSystem.start();
    this.economy.start();
  }
  
  stop(winner) {
    this.isRunning = false;
    this.loop.stop();
    this.waveSystem.stop();
    this.economy.stop();
    
    const gameOverScreen = document.getElementById('game-over-screen');
    const title = document.getElementById('game-over-title');
    
    if (winner === 'player') {
      title.textContent = 'VICTORY!';
      title.style.color = '#00e5ff';
      title.style.textShadow = '0 0 30px #00e5ff';
    } else {
      title.textContent = 'DEFEAT...';
      title.style.color = '#ff3333';
      title.style.textShadow = '0 0 30px #ff3333';
    }
    
    gameOverScreen.classList.remove('hidden');
  }
  
  update(dt) {
    if (!this.isRunning) return;
    
    const scaledDt = dt * this.gameSpeed;
    
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }
    
    // Ultimate Cooldown Update
    if (this.ultimateCooldown > 0) {
      this.ultimateCooldown = Math.max(0, this.ultimateCooldown - scaledDt);
    }
    
    // Update Ultimate Button UI
    const ultBtn = document.querySelector('.build-btn[data-type="ultimate"]');
    if (ultBtn) {
      const nameSpan = ultBtn.querySelector('.name');
      if (this.ultimateCooldown > 0) {
        ultBtn.disabled = true;
        if (nameSpan) nameSpan.textContent = `궤도 폭격 (${Math.ceil(this.ultimateCooldown)}s)`;
      } else {
        ultBtn.disabled = false;
        if (nameSpan) nameSpan.textContent = `궤도 폭격 (광역기)`;
      }
    }
    
    this.waveSystem.update(scaledDt);
    this.economy.update(scaledDt);
    this.entityManager.update(scaledDt);
    this.hud.update();
    
    // Update Build Queue Badges
    const playerSpawners = this.waveSystem.spawners.player;
    const meleeCount = playerSpawners.filter(t => t === 'melee').length;
    const rangedCount = playerSpawners.filter(t => t === 'ranged').length;
    const tankCount = playerSpawners.filter(t => t === 'tank').length;
    
    const qMelee = document.getElementById('queue-melee');
    const qRanged = document.getElementById('queue-ranged');
    const qTank = document.getElementById('queue-tank');
    
    if (qMelee) qMelee.textContent = `x${meleeCount}`;
    if (qRanged) qRanged.textContent = `x${rangedCount}`;
    if (qTank) qTank.textContent = `x${tankCount}`;
    
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
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
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
      
      this.ctx.fillStyle = `rgba(241, 196, 15, ${p.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    
    this.ctx.fillStyle = '#1a100a';
    this.ctx.fillRect(0, this.canvas.height - 150, WORLD_WIDTH, 150);
    
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#ff8800';
    this.ctx.fillStyle = '#ff8800';
    this.ctx.fillRect(0, this.canvas.height - 150, WORLD_WIDTH, 4);
    this.ctx.shadowBlur = 0;
    
    this.entityManager.draw(this.ctx);
    
    this.ctx.restore();
    
    if (this.minimap) {
      this.minimap.draw();
    }
  }
  
  drawFallbackBackground() {
    this.ctx.fillStyle = '#1c1510';
    this.ctx.fillRect(0, 0, WORLD_WIDTH, this.canvas.height);
  }
  
  triggerAction(type, cost, btnElement) {
    if (!this.isRunning) return;
    
    if (type === 'ultimate' && this.ultimateCooldown > 0) {
      return; // On Cooldown
    }
    
    this.audio.playClick();
    
    if (type === 'income') {
      if (this.economy.spendMinerals(cost)) {
        this.economy.increaseIncome(10);
        for (let i = 0; i < 15; i++) {
          this.entityManager.addEntity(new Particle(
            this, this.playerBase.x, this.playerBase.y, '#2ecc71', 0.8, 60, Math.random() * Math.PI * 2, 4, 'spark'
          ));
        }
      }
    } else if (type === 'tech') {
      if (this.playerBase.techLevel >= 5) return;
      
      if (this.economy.spendMinerals(cost)) {
        this.playerBase.upgradeTech();
        
        if (btnElement) {
          if (this.playerBase.techLevel >= 5) {
            btnElement.dataset.cost = Infinity;
            btnElement.querySelector('.cost').innerHTML = `<div class="mineral-icon small"></div> -`;
            btnElement.querySelector('.name').innerHTML = `시대 발전 (MAX)`;
            btnElement.style.opacity = 0.5;
          } else {
            const nextCost = cost * 2;
            btnElement.dataset.cost = nextCost;
            btnElement.querySelector('.cost').innerHTML = `<div class="mineral-icon small"></div> ${nextCost}`;
            btnElement.querySelector('.name').innerHTML = `시대 발전 (Lv.${this.playerBase.techLevel + 1})`;
          }
        }
      }
    } else if (type === 'ultimate') {
      if (this.economy.spendMinerals(cost)) {
        this.ultimateCooldown = 30; // 30 seconds cooldown
        this.triggerOrbitalStrike();
      }
    } else {
      if (this.waveSystem.spawners.player.length >= 50) return;
      
      if (this.economy.spendMinerals(cost)) {
        this.waveSystem.addSpawner('player', type);
        for (let i = 0; i < 12; i++) {
          this.entityManager.addEntity(new Particle(
            this, this.playerBase.x, this.playerBase.y, '#00e5ff', 0.5, 50, Math.random() * Math.PI * 2, 3, 'spark'
          ));
        }
      }
    }
  }

  setupInput() {
    const tooltip = document.getElementById('tooltip');
    const ttTitle = document.getElementById('tooltip-title');
    const ttDesc = document.getElementById('tooltip-desc');
    const ttHp = document.getElementById('tt-hp');
    const ttDmg = document.getElementById('tt-dmg');
    const ttRange = document.getElementById('tt-range');

    const unitStats = {
      melee: { title: '질럿 (근접) [단축키 1]', desc: '체력이 높고 저렴한 최전방 방패 역할.', hp: 120, dmg: 25, range: '근접' },
      ranged: { title: '마린 (원거리) [단축키 2]', desc: '사거리가 길지만 체력이 약한 딜러.', hp: 60, dmg: 35, range: '원거리' },
      tank: { title: '골리앗 (헤비탱크) [단축키 3]', desc: '단단한 장갑과 강력한 한방 공격력.', hp: 300, dmg: 60, range: '중거리' },
      income: { title: '가스 채취기 [단축키 Q]', desc: '매 웨이브마다 추가 미네랄을 +10 획득.', hp: '-', dmg: '-', range: '-' },
      tech: { title: '시대 발전 [단축키 W]', desc: '본진 타워 개방 및 유닛 스탯/비주얼 티어 업그레이드.', hp: '-', dmg: '-', range: '-' },
      ultimate: { title: '궤도 폭격 [단축키 E]', desc: '전장의 모든 적에게 150 피해 지원 사격 (쿨타임 30초).', hp: '-', dmg: '150', range: '전체' }
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
    });
    
    document.getElementById('restart-btn').addEventListener('click', () => {
      location.reload();
    });
    
    // Cheat Controls
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

    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isMuted = this.audio.toggleMute();
        audioBtn.textContent = isMuted ? '🔇 사운드 끔' : '🔊 사운드 켬';
        if (isMuted) {
          audioBtn.classList.remove('active');
        } else {
          audioBtn.classList.add('active');
        }
      });
    }
    
    window.addEventListener('keydown', (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.moveCameraLeft = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.moveCameraRight = true;
      
      if (!this.isRunning) return;
      
      const key = e.key.toLowerCase();
      if (key === '1') {
        const btn = document.querySelector('.build-btn[data-type="melee"]');
        if (btn) this.triggerAction('melee', parseInt(btn.dataset.cost), btn);
      } else if (key === '2') {
        const btn = document.querySelector('.build-btn[data-type="ranged"]');
        if (btn) this.triggerAction('ranged', parseInt(btn.dataset.cost), btn);
      } else if (key === '3') {
        const btn = document.querySelector('.build-btn[data-type="tank"]');
        if (btn) this.triggerAction('tank', parseInt(btn.dataset.cost), btn);
      } else if (key === 'q') {
        const btn = document.querySelector('.build-btn[data-type="income"]');
        if (btn) this.triggerAction('income', parseInt(btn.dataset.cost), btn);
      } else if (key === 'w') {
        const btn = document.querySelector('.build-btn[data-type="tech"]');
        if (btn) this.triggerAction('tech', parseInt(btn.dataset.cost), btn);
      } else if (key === 'e') {
        const btn = document.querySelector('.build-btn[data-type="ultimate"]');
        if (btn) this.triggerAction('ultimate', parseInt(btn.dataset.cost), btn);
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.moveCameraLeft = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.moveCameraRight = false;
    });
  }
  
  triggerOrbitalStrike() {
    this.audio.playExplosion();
    this.addScreenShake(20);

    const enemies = this.entityManager.getEntitiesByTeam('enemy');
    enemies.forEach(enemy => {
      for (let i = 0; i < 18; i++) {
        this.entityManager.addEntity(new Particle(
          this, enemy.x + (Math.random()-0.5)*30, enemy.y - 80 - Math.random()*200, '#f1c40f', 0.8, 300, Math.PI/2, 5, 'spark'
        ));
      }
      this.entityManager.addEntity(new Particle(
        this, enemy.x, enemy.y, '#f1c40f', 0.4, 0, 0, 30, 'shockwave'
      ));
      enemy.takeDamage(150, true); // Rebalanced damage: 150
    });
    
    if (this.enemyBase && this.enemyBase.isAlive) {
      this.enemyBase.takeDamage(25); // Rebalanced base damage: 25
      for (let i = 0; i < 30; i++) {
        this.entityManager.addEntity(new Particle(
          this.game || this, this.enemyBase.x + (Math.random()-0.5)*100, this.enemyBase.y - Math.random()*250, '#f1c40f', 0.9, 350, Math.PI/2, 6, 'spark'
        ));
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
