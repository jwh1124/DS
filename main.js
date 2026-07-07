import { GameLoop } from './src/engine/GameLoop.js';
import { EntityManager } from './src/engine/EntityManager.js';
import { WaveSystem } from './src/engine/WaveSystem.js';
import { HUD } from './src/ui/HUD.js';
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
    
    this.audio = new AudioEngine();
    
    this.entityManager = new EntityManager(this);
    this.economy = new Economy(this);
    this.waveSystem = new WaveSystem(this);
    this.hud = new HUD(this);
    this.loop = new GameLoop(this.update.bind(this), this.draw.bind(this));
    
    this.playerBase = new Base(this, 150, this.canvas.height / 2, 'player', 5000);
    this.enemyBase = new Base(this, WORLD_WIDTH - 150, this.canvas.height / 2, 'enemy', 5000);
    this.entityManager.addEntity(this.playerBase);
    this.entityManager.addEntity(this.enemyBase);
    
    this.bgImage = new Image();
    this.bgImage.src = '/bg.png';
    
    this.cameraX = 0;
    this.cameraSpeed = 600; // pixels per second
    this.moveCameraLeft = false;
    this.moveCameraRight = false;
    
    this.gameSpeed = 1;
    
    this.setupInput();
    this.start();
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
      title.textContent = 'VICTORY';
      title.style.color = '#00e5ff';
    } else {
      title.textContent = 'DEFEAT';
      title.style.color = '#ff3333';
    }
    
    gameOverScreen.classList.remove('hidden');
  }
  
  update(dt) {
    if (!this.isRunning) return;
    
    const scaledDt = dt * this.gameSpeed;
    
    this.waveSystem.update(scaledDt);
    this.economy.update(scaledDt);
    this.entityManager.update(scaledDt);
    this.hud.update();
    
    // Free Camera Movement (uses real dt for smooth movement)
    if (this.moveCameraLeft) {
      this.cameraX -= this.cameraSpeed * dt;
    }
    if (this.moveCameraRight) {
      this.cameraX += this.cameraSpeed * dt;
    }
    
    // Clamp camera
    if (this.cameraX < 0) this.cameraX = 0;
    if (this.cameraX > WORLD_WIDTH - this.canvas.width) this.cameraX = WORLD_WIDTH - this.canvas.width;
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    // Apply Camera Translation
    this.ctx.translate(-Math.floor(this.cameraX), 0);
    
    // Draw background (parallax or tiled)
    if (this.bgImage.complete) {
      // Tile background twice to cover 3000px roughly
      this.ctx.drawImage(this.bgImage, 0, 0, 1500, this.canvas.height);
      this.ctx.drawImage(this.bgImage, 1500, 0, 1500, this.canvas.height);
    } else {
      this.drawFallbackBackground();
    }
    
    // Draw ground line
    this.ctx.fillStyle = '#221100';
    this.ctx.fillRect(0, this.canvas.height - 150, WORLD_WIDTH, 150);
    this.ctx.fillStyle = '#ff8800';
    this.ctx.fillRect(0, this.canvas.height - 150, WORLD_WIDTH, 5);
    
    this.entityManager.draw(this.ctx);
    
    this.ctx.restore();
  }
  
  drawFallbackBackground() {
    this.ctx.fillStyle = '#2c1e16';
    this.ctx.fillRect(0, 0, WORLD_WIDTH, this.canvas.height);
  }
  
  setupInput() {
    document.querySelectorAll('.build-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = btn.dataset.type;
        const cost = parseInt(btn.dataset.cost);
        
        this.audio.playClick();
        
        if (type === 'income') {
          if (this.economy.spendMinerals(cost)) {
            this.economy.increaseIncome(10);
            for (let i = 0; i < 15; i++) {
              this.entityManager.addEntity(new Particle(
                this, this.playerBase.x, this.playerBase.y, '#2ecc71', 1.0, 50, Math.random() * Math.PI * 2, 4
              ));
            }
          }
        } else if (type === 'tech') {
          if (this.playerBase.techLevel >= 5) {
            // Reached max level
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
              // Increase cost dynamically for next tech
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
            // Cap player spawners to prevent extreme lag
            // Optionally could add a visual floating text saying "MAX UNITS REACHED"
            return;
          }
          if (this.economy.spendMinerals(cost)) {
            this.waveSystem.addSpawner('player', type);
            for (let i = 0; i < 10; i++) {
              this.entityManager.addEntity(new Particle(
                this, this.playerBase.x, this.playerBase.y, '#00e5ff', 0.5, 40, Math.random() * Math.PI * 2, 3
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
    
    // Initial active state for 1x speed
    document.querySelector('.cheat-btn[data-speed="1"]').classList.add('active');
    
    document.getElementById('cheat-money-btn').addEventListener('click', () => {
      this.economy.minerals += 10000;
      this.audio.playMagic();
    });
    
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
    
    this.canvas.style.transform = "translate(15px, 15px)";
    setTimeout(() => this.canvas.style.transform = "translate(-15px, -15px)", 50);
    setTimeout(() => this.canvas.style.transform = "translate(15px, -15px)", 100);
    setTimeout(() => this.canvas.style.transform = "translate(-15px, 15px)", 150);
    setTimeout(() => this.canvas.style.transform = "none", 200);

    const enemies = this.entityManager.getEntitiesByTeam('enemy');
    enemies.forEach(enemy => {
      for (let i = 0; i < 20; i++) {
        this.entityManager.addEntity(new Particle(
          this, enemy.x + (Math.random()-0.5)*40, enemy.y - 100 - Math.random()*200, '#f1c40f', 0.8, 300, Math.PI/2, 6
        ));
      }
      enemy.takeDamage(500); 
    });
    
    if (this.enemyBase && this.enemyBase.isAlive) {
      this.enemyBase.takeDamage(100);
      for (let i = 0; i < 50; i++) {
        this.entityManager.addEntity(new Particle(
          this, this.enemyBase.x + (Math.random()-0.5)*100, this.enemyBase.y - Math.random()*300, '#f1c40f', 1.0, 400, Math.PI/2, 8
        ));
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
