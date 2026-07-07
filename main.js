import { GameLoop } from './src/engine/GameLoop.js';
import { EntityManager } from './src/engine/EntityManager.js';
import { WaveSystem } from './src/engine/WaveSystem.js';
import { HUD } from './src/ui/HUD.js';
import { Base } from './src/entities/Base.js';
import { Economy } from './src/engine/Economy.js';
import { Particle } from './src/entities/Particle.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Disable anti-aliasing for pixel art
    this.ctx.imageSmoothingEnabled = false;
    
    this.isRunning = false;
    
    this.entityManager = new EntityManager(this);
    this.economy = new Economy(this);
    this.waveSystem = new WaveSystem(this);
    this.hud = new HUD(this);
    this.loop = new GameLoop(this.update.bind(this), this.draw.bind(this));
    
    this.playerBase = new Base(this, 100, this.canvas.height / 2, 'player', 5000);
    this.enemyBase = new Base(this, this.canvas.width - 100, this.canvas.height / 2, 'enemy', 5000);
    this.entityManager.addEntity(this.playerBase);
    this.entityManager.addEntity(this.enemyBase);
    
    // Load background
    this.bgImage = new Image();
    this.bgImage.src = '/bg.png';
    
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
      title.style.color = '#0ff';
    } else {
      title.textContent = 'DEFEAT';
      title.style.color = '#ff3333';
    }
    
    gameOverScreen.classList.remove('hidden');
  }
  
  update(dt) {
    if (!this.isRunning) return;
    this.waveSystem.update(dt);
    this.economy.update(dt);
    this.entityManager.update(dt);
    this.hud.update();
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background
    if (this.bgImage.complete) {
      this.ctx.drawImage(this.bgImage, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.drawFallbackBackground();
    }
    
    this.entityManager.draw(this.ctx);
  }
  
  drawFallbackBackground() {
    this.ctx.fillStyle = '#2c1e16'; // Desert dark brown
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'rgba(255, 150, 0, 0.05)';
    for (let i = 0; i < 100; i++) {
      const x = (Math.sin(i * 123) * 10000 + performance.now() * 0.01) % this.canvas.width;
      const y = Math.cos(i * 321) * this.canvas.height;
      this.ctx.fillRect(Math.abs(x), Math.abs(y), 4, 4);
    }
  }
  
  setupInput() {
    document.querySelectorAll('.build-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = btn.dataset.type;
        const cost = parseInt(btn.dataset.cost);
        
        if (type === 'income') {
          if (this.economy.spendMinerals(cost)) {
            this.economy.increaseIncome(10);
            for (let i = 0; i < 15; i++) {
              this.entityManager.addEntity(new Particle(
                this, this.playerBase.x, this.playerBase.y, '#2ecc71', 1.0, 50, Math.random() * Math.PI * 2, 4
              ));
            }
          }
        } else if (type === 'ultimate') {
          if (this.economy.spendMinerals(cost)) {
            this.triggerOrbitalStrike();
          }
        } else {
          if (this.economy.spendMinerals(cost)) {
            this.waveSystem.addSpawner('player', type);
            for (let i = 0; i < 10; i++) {
              this.entityManager.addEntity(new Particle(
                this, this.playerBase.x, this.playerBase.y, '#0ff', 0.5, 40, Math.random() * Math.PI * 2, 3
              ));
            }
          }
        }
      });
    });
    
    document.getElementById('restart-btn').addEventListener('click', () => {
      location.reload();
    });
  }
  
  triggerOrbitalStrike() {
    // Visual screen flash/shake
    this.canvas.style.transform = "translate(10px, 10px)";
    setTimeout(() => this.canvas.style.transform = "translate(-10px, -10px)", 50);
    setTimeout(() => this.canvas.style.transform = "translate(10px, -10px)", 100);
    setTimeout(() => this.canvas.style.transform = "translate(-10px, 10px)", 150);
    setTimeout(() => this.canvas.style.transform = "none", 200);

    // Damage all enemy units
    const enemies = this.entityManager.getEntitiesByTeam('enemy');
    enemies.forEach(enemy => {
      // Create massive beam particles above them
      for (let i = 0; i < 20; i++) {
        this.entityManager.addEntity(new Particle(
          this, enemy.x + (Math.random()-0.5)*40, enemy.y - 100 - Math.random()*200, '#f1c40f', 0.8, 300, Math.PI/2, 6
        ));
      }
      // Deal massive damage
      enemy.takeDamage(500); 
    });
    
    // Also damage enemy base slightly
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
