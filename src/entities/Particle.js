export class Particle {
  constructor(game, x, y, color, life, speed, angle, size = 3, type = 'circle') {
    this.game = game;
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = life; // Time in seconds
    this.maxLife = life;
    
    // Velocity based on angle and speed
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    this.size = size;
    this.maxSize = size;
    this.isAlive = true;
    this.friction = type === 'shockwave' ? 1.0 : 0.94; // Slow down over time
    this.type = type; // 'circle', 'shockwave', 'spark', 'ring'
  }

  update(dt) {
    if (!this.isAlive) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.isAlive = false;
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    if (this.type === 'shockwave') {
      this.size += (this.maxSize * 4) * dt;
    } else if (this.type === 'spark') {
      this.size = Math.max(0.5, this.maxSize * (this.life / this.maxLife));
    }
    
    // Apply friction
    this.vx *= this.friction;
    this.vy *= this.friction;
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    
    if (this.type === 'shockwave') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, 4 * alpha);
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.stroke();
    } else if (this.type === 'spark') {
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.fill();
    }
    
    ctx.restore();
  }
}
