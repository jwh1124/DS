export class Particle {
  constructor(game, x, y, color, life, speed, angle, size = 3) {
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
    this.isAlive = true;
    this.friction = 0.95; // Slow down over time
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
    
    // Apply friction
    this.vx *= this.friction;
    this.vy *= this.friction;
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    
    // Draw glowing circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fill();
    
    ctx.restore();
  }
}
