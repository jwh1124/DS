export class Building {
  constructor(game, x, y, team, type) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.team = team;
    this.type = type; // 'melee', 'ranged', 'tank'
    
    this.radius = 20;
    this.hp = 200;
    this.maxHp = 200;
    this.isAlive = true;
    
    // Spawn animation timer
    this.spawnTimer = 0;
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      // Building destroyed, maybe notify WaveSystem to remove from spawners list
      this.game.waveSystem.removeSpawner(this);
    }
  }

  update(dt) {
    if (this.spawnTimer > 0) {
      this.spawnTimer -= dt;
    }
  }

  triggerSpawn() {
    this.spawnTimer = 1.0; // 1 second animation
    // Visual effect at spawn
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Base platform
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
    ctx.strokeStyle = this.team === 'player' ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 51, 51, 0.4)';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    
    // Type indicator
    ctx.fillStyle = this.type === 'melee' ? '#f39c12' : this.type === 'ranged' ? '#3498db' : '#9b59b6';
    ctx.fillRect(-10, -10, 20, 20);
    
    // Spawn animation glow
    if (this.spawnTimer > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + (this.spawnTimer) + ')';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    
    // Health bar
    if (this.hp < this.maxHp) {
      const hpPercent = this.hp / this.maxHp;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.fillRect(-15, -this.radius - 10, 30, 4);
      ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.fillRect(-15, -this.radius - 10, 30 * hpPercent, 4);
    }
    
    ctx.restore();
  }
}
