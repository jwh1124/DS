export class Minimap {
  constructor(game) {
    this.game = game;
    this.container = document.getElementById('minimap-container');
    this.canvas = document.getElementById('minimapCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.setupInput();
  }
  
  setupInput() {
    if (!this.canvas) return;
    
    const handleMapClick = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const scaleX = 2000 / this.canvas.width; // 2000 is WORLD_WIDTH
      const targetCamX = (clickX * scaleX) - (this.game.canvas.width / 2);
      this.game.cameraX = Math.max(0, Math.min(2000 - this.game.canvas.width, targetCamX));
    };
    
    let isDragging = false;
    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      handleMapClick(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (isDragging) handleMapClick(e);
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
  
  draw() {
    if (!this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const worldW = 2000;
    
    this.ctx.clearRect(0, 0, w, h);
    
    // Background
    this.ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
    this.ctx.fillRect(0, 0, w, h);
    
    // Ground line
    this.ctx.fillStyle = '#ff8800';
    this.ctx.fillRect(0, h - 6, w, 2);
    
    const scale = w / worldW;
    
    // Draw bases
    if (this.game.playerBase && this.game.playerBase.isAlive) {
      this.ctx.fillStyle = '#00e5ff';
      this.ctx.fillRect(this.game.playerBase.x * scale - 4, h/2 - 6, 8, 12);
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = '#00e5ff';
      this.ctx.fillRect(this.game.playerBase.x * scale - 4, h/2 - 6, 8, 12);
      this.ctx.shadowBlur = 0;
    }
    
    if (this.game.enemyBase && this.game.enemyBase.isAlive) {
      this.ctx.fillStyle = '#ff3333';
      this.ctx.fillRect(this.game.enemyBase.x * scale - 4, h/2 - 6, 8, 12);
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = '#ff3333';
      this.ctx.fillRect(this.game.enemyBase.x * scale - 4, h/2 - 6, 8, 12);
      this.ctx.shadowBlur = 0;
    }
    
    // Draw entities
    const entities = this.game.entityManager.entities;
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (!e.isAlive || !e.team) continue;
      
      const mx = e.x * scale;
      const my = (e.y / this.game.canvas.height) * h;
      
      if (e.isBoss) {
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.beginPath();
        this.ctx.arc(mx, my, 4, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = e.team === 'player' ? '#00e5ff' : '#ff3333';
        this.ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
      }
    }
    
    // Camera box
    const camW = this.game.canvas.width * scale;
    const camX = this.game.cameraX * scale;
    this.ctx.strokeStyle = '#f1c40f';
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowBlur = 4;
    this.ctx.shadowColor = '#f1c40f';
    this.ctx.strokeRect(camX, 1, camW, h - 2);
    this.ctx.shadowBlur = 0;
  }
}
