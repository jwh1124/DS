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
    
    // Parallax Dust Particles with dynamic glowing depth
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
    
    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }
    
    this.waveSystem.update(scaledDt);
    this.economy.update(scaledDt);
    this.entityManager.update(scaledDt);
    this.hud.update();
    
    // Camera Navigation
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
    
    // Apply Camera Translation with Screen Shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
    }
    
    this.ctx.translate(-Math.floor(this.cameraX) + shakeX, shakeY);
    
    // Draw background (parallax or tiled)
    if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      this.ctx.drawImage(this.bgImage, 0, 0, 1500, this.canvas.height);
      this.ctx.drawImage(this.bgImage, 1500, 0, 1500, this.canvas.height);
    } else {
      this.drawFallbackBackground();
    }
    
    // Draw Parallax Dust & Ambient Embers
    this.dustParticles.forEach(p => {
      p.x -= p.speed;
      if (p.x < 0) p.x = WORLD_WIDTH;
      
      this.ctx.fillStyle = `rgba(241, 196, 15, ${p.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    
    // Draw Ground & Cyber Grid Line
    this.ctx.fillStyle = '#1a100a';
    this.ctx.fillRect(0, this.canvas.height - 150, WORLD_WIDTH, 150);
    
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#ff8800';
    this.ctx.fillStyle = '#ff8800';
    this.ctx.fillRect(0, this.canvas.height - 150, WORLD_WIDTH, 4);
    this.ctx.shadowBlur = 0;
    
    // Draw Entities (Bases, Units, Projectiles, Particles)
    this.entityManager.draw(this.ctx);
    
    this.ctx.restore();
    
    // Render Minimap Radar Overlay
    if (this.minimap) {
      this.minimap.draw();
    }
  }
  
  drawFallbackBackground() {
    this.ctx.fillStyle = '#1c1510';
    this.ctx.fillRect(0, 0, WORLD_WIDTH, this.canvas.height);
  }
  
  setupInput() {
    const tooltip = document.getElementById('tooltip');
    const ttTitle = document.getElementById('tooltip-title');
    const ttDesc = document.getElementById('tooltip-desc');
    const ttHp = document.getElementById('tt-hp');
    const ttDmg = document.getElementById('tt-dmg');
    const ttRange = document.getElementById('tt-range');

    const unitStats = {
      melee: { title: '질럿 (근접)', desc: '체력이 높고 저렴한 최전방 방패 역할.', hp: 120, dmg: 25, range: '근접' },
      ranged: { title: '마린 (원거리)', desc: '사거리가 길지만 체력이 약한 딜러.', hp: 60, dmg: 35, range: '원거리' },
      tank: { title: '골리앗 (헤비 탱크)', desc: '단단한 장갑과 강력한 한방 공격력.', hp: 300, dmg: 60, range: '중거리' },
      income: { title: '가스 채취기', desc: '매 웨이브마다 추가 미네랄을 +10 획득.', hp: '-', dmg: '-', range: '-' },
      tech: { title: '시대 발전', desc: '본진 타워 개방 및 유닛 최대체력/공격력 티어 업그레이드.', hp: '-', dmg: '-', range: '-' },
      ultimate: { title: '궤도 폭격', desc: '화면 내 모든 적에게 500 고정 피해 및 본진 타격.', hp: '-', dmg: '500', range: '전체' }
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
          if (this.playerBase.techLevel >= 5) {
            return;
          }
          
          if (this.economy.spendMinerals(cost)) {
            this.playerBase.upgradeTech();
            
            if (this.playerBase.techLevel >= 5) {
              btn.dataset.cost = Infinity;
              btn.querySelector('.cost').innerHTML = `<div class="mineral-icon small"></div> -`;
              btn.querySelector('.name').innerHTML = `시대 발전 (MAX)`;
              btn.style.opacity = 0.5;
            } else {
              const nextCost = cost * 2;
              btn.dataset.cost = nextCost;
              btn.querySelector('.cost').innerHTML = `<div class="mineral-icon small"></div> ${nextCost}`;
              btn.querySelector('.name').innerHTML = `시대 발전 (Lv.${this.playerBase.techLevel + 1})`;
            }
          }
        } else if (type === 'ultimate') {
          if (this.economy.spendMinerals(cost)) {
            this.triggerOrbitalStrike();
          }
        } else {
          if (this.waveSystem.spawners.player.length >= 50) {
            return;
          }
          if (this.economy.spendMinerals(cost)) {
            this.waveSystem.addSpawner('player', type);
            for (let i = 0; i < 12; i++) {
              this.entityManager.addEntity(new Particle(
                this, this.playerBase.x, this.playerBase.y, '#00e5ff', 0.5, 50, Math.random() * Math.PI * 2, 3, 'spark'
              ));
            }
          }
        }
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

    // Audio Toggle
    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isMuted = this.audio.toggleMute();
        audioBtn.textContent = isMuted ? '🔇 음소거' : '🔊 소리 켬';
        if (isMuted) {
          audioBtn.classList.remove('active');
        } else {
          audioBtn.classList.add('active');
        }
      });
    }
    
    // Free Camera Controls
    window.addEventListener('keydown', (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.moveCameraLeft = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.moveCameraRight = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.moveCameraLeft = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.moveCameraRight = false;
    });
  }
  
  triggerOrbitalStrike() {
    this.audio.playExplosion();
    this.addScreenShake(25);

    const enemies = this.entityManager.getEntitiesByTeam('enemy');
    enemies.forEach(enemy => {
      // Beam burst particles
      for (let i = 0; i < 25; i++) {
        this.entityManager.addEntity(new Particle(
          this, enemy.x + (Math.random()-0.5)*40, enemy.y - 100 - Math.random()*250, '#f1c40f', 0.9, 350, Math.PI/2, 6, 'spark'
        ));
      }
      this.entityManager.addEntity(new Particle(
        this, enemy.x, enemy.y, '#f1c40f', 0.5, 0, 0, 40, 'shockwave'
      ));
      enemy.takeDamage(500, true); 
    });
    
    if (this.enemyBase && this.enemyBase.isAlive) {
      this.enemyBase.takeDamage(100);
      for (let i = 0; i < 50; i++) {
        this.entityManager.addEntity(new Particle(
          this, this.enemyBase.x + (Math.random()-0.5)*120, this.enemyBase.y - Math.random()*300, '#f1c40f', 1.1, 450, Math.PI/2, 8, 'spark'
        ));
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
