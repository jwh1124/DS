import { GameLoop } from './src/engine/GameLoop.js';
import { EntityManager } from './src/engine/EntityManager.js';
import { WaveSystem } from './src/engine/WaveSystem.js';
import { HUD } from './src/ui/HUD.js';
import { Base } from './src/entities/Base.js';
import { Economy } from './src/engine/Economy.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Game state
    this.isRunning = false;
    
    // Systems
    this.entityManager = new EntityManager(this);
    this.economy = new Economy(this);
    this.waveSystem = new WaveSystem(this);
    this.hud = new HUD(this);
    this.loop = new GameLoop(this.update.bind(this), this.draw.bind(this));
    
    // Setup bases
    this.playerBase = new Base(this, 150, this.canvas.height / 2, 'player', 5000);
    this.enemyBase = new Base(this, this.canvas.width - 150, this.canvas.height / 2, 'enemy', 5000);
    this.entityManager.addEntity(this.playerBase);
    this.entityManager.addEntity(this.enemyBase);
    
    // Input handling
    this.setupInput();
    
    // Start game
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
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background grid (optional, for aesthetics)
    this.drawGrid();
    
    this.entityManager.draw(this.ctx);
  }
  
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    const gridSize = 40;
    
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
    
    // Center line
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
  }
  
  setupInput() {
    // Building buttons
    document.querySelectorAll('.build-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = btn.dataset.type;
        const cost = parseInt(btn.dataset.cost);
        
        if (this.economy.spendMinerals(cost)) {
          if (type === 'income') {
            this.economy.increaseIncome(10);
          } else {
            // Add spawner building near player base
            // For MVP, just add it to a list and it visually appears behind base
            this.waveSystem.addSpawner('player', type);
          }
        }
      });
    });
    
    // Restart button
    document.getElementById('restart-btn').addEventListener('click', () => {
      location.reload(); // Simple restart for MVP
    });
  }
}

// Wait for DOM
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
