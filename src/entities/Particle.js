export class Particle {
  constructor(game, x, y, color, life, speed, angle, size = 3, type = 'spark') {
    this.game = game;
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = size;
    this.maxSize = size;
    this.angle = angle;
    this.isAlive = true;
    this.type = type;
    this.friction = (type === 'cross_flash' || type === 'slash_arc') ? 0.78 : 0.93;
    this.gravity = type === 'blood_splash' ? 180 : 0;
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
    this.vy += this.gravity * dt;

    const progress = 1 - this.life / this.maxLife;
    if (this.type === 'cross_flash') {
      this.size = this.maxSize * (0.6 + progress * 0.65);
    } else if (this.type === 'slash_arc') {
      this.size = this.maxSize * (0.72 + progress * 0.5);
    } else if (this.type === 'spark') {
      this.size = Math.max(0.5, this.maxSize * (1 - progress * 0.45));
    }

    this.vx *= this.friction;
    this.vy *= this.friction;
  }

  draw(ctx) {
    if (!this.isAlive) return;

    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.type === 'cross_flash') {
      // A compact three-ray impact: readable for a fraction of a second, never a giant UI-shaped star.
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;

      const rayLength = Math.max(7, this.size * 0.7);
      const rayWidth = Math.max(1.5, this.size * 0.08);
      for (let ray = 0; ray < 3; ray++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.fillRect(this.size * 0.12, -rayWidth / 2, rayLength, rayWidth);
      }

      const core = Math.max(2.5, this.size * 0.16);
      ctx.fillStyle = '#fff7d6';
      ctx.beginPath();
      ctx.arc(0, 0, core, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'slash_arc') {
      // Heavy hits get one narrow moving blade arc, rather than a full-screen crescent.
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(2, this.size * 0.09);
      ctx.lineCap = 'round';
      ctx.shadowBlur = 9;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(8, this.size * 0.62), -0.8, 0.8);
      ctx.stroke();
    } else if (this.type === 'spark') {
      const speed = Math.hypot(this.vx, this.vy);
      const length = Math.min(16, Math.max(this.size * 1.5, speed * 0.025));
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.atan2(this.vy, this.vx));
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = this.color;
      ctx.fillRect(-length * 0.15, -this.size / 2, length, this.size);
    } else if (this.type === 'blood_splash') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.size * 1.3, this.size * 0.8, this.angle, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'shockwave') {
      const progress = 1 - this.life / this.maxLife;
      const radius = this.maxSize * (0.45 + progress * 0.55);
      ctx.globalAlpha = alpha * 0.62;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1.5, this.maxSize * 0.045 * (1 - progress * 0.35));
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, radius, radius * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
