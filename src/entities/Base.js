export class Base {
  constructor(game, x, y, team, maxHp) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.team = team;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.radius = 60; // For collision/targeting
    this.isAlive = true;
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      
      // Game Over logic
      const winner = this.team === 'player' ? 'enemy' : 'player';
      this.game.stop(winner);
    }
  }

  update(dt) {
    // Base doesn't do much on its own
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Draw Base structure
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.team === 'player' ? 'rgba(0, 180, 219, 0.2)' : 'rgba(255, 51, 51, 0.2)';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.team === 'player' ? '#0ff' : '#ff3333';
    ctx.stroke();
    
    // Inner core
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fillStyle = this.team === 'player' ? '#0ff' : '#ff3333';
    ctx.shadowBlur = 20;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fill();
    
    ctx.restore();
  }
}
