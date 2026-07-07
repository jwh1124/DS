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
    
    this.buildMode = null; // 'melee', 'ranged', 'tank'
    this.buildCost = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    
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
    
    // Draw fancy space background
    this.drawBackground();
    this.drawGrid();
    
    this.entityManager.draw(this.ctx);
    
    // Draw build preview
    if (this.buildMode) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.5;
      this.ctx.beginPath();
      this.ctx.arc(this.mouseX, this.mouseY, 20, 0, Math.PI * 2);
      
      let canBuild = false;
      // Only build in player's half (left half, behind x = 500)
      if (this.mouseX > 50 && this.mouseX < 500 && this.mouseY > 150 && this.mouseY < this.canvas.height - 50) {
        canBuild = true;
      }
      
      this.ctx.fillStyle = canBuild ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
      this.ctx.fill();
      this.ctx.restore();
    }
  }
  
  drawBackground() {
    // Parallax stars could go here
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 100; i++) {
      const x = (Math.sin(i * 123) * 10000 + performance.now() * 0.01) % this.canvas.width;
      const y = Math.cos(i * 321) * this.canvas.height;
      this.ctx.fillRect(Math.abs(x), Math.abs(y), 2, 2);
    }
  }
  
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    const gridSize = 50;
    
    this.ctx.beginPath();
    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }
    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }
    this.ctx.stroke();
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    
    // Draw buildable area line
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(500, 150);
    this.ctx.lineTo(500, this.canvas.height - 50);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }
  
  setupInput() {
    document.querySelectorAll('.build-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = btn.dataset.type;
        const cost = parseInt(btn.dataset.cost);
        
        if (type === 'income') {
          if (this.economy.spendMinerals(cost)) {
            this.economy.increaseIncome(10);
            
            // Effect around player base
            for (let i = 0; i < 10; i++) {
              this.entityManager.addEntity(new Particle(
                this, this.playerBase.x, this.playerBase.y, '#2ecc71', 1.0, 50, Math.random() * Math.PI * 2, 4
              ));
            }
          }
        } else {
          // Enter build mode
          if (this.economy.minerals >= cost) {
            this.buildMode = type;
            this.buildCost = cost;
          }
        }
      });
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    });
    
    this.canvas.addEventListener('click', (e) => {
      if (this.buildMode) {
        // Check bounds
        if (this.mouseX > 50 && this.mouseX < 500 && this.mouseY > 150 && this.mouseY < this.canvas.height - 50) {
          if (this.economy.spendMinerals(this.buildCost)) {
            this.waveSystem.addSpawner('player', this.buildMode, this.mouseX, this.mouseY);
            
            // Build effect
            for (let i = 0; i < 20; i++) {
              this.entityManager.addEntity(new Particle(
                this, this.mouseX, this.mouseY, '#0ff', 0.5, 60, Math.random() * Math.PI * 2, 3
              ));
            }
          }
        }
        this.buildMode = null; // Exit build mode
      }
    });
    
    // Right click to cancel build mode
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.buildMode = null;
    });
    
    document.getElementById('restart-btn').addEventListener('click', () => {
      location.reload();
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
