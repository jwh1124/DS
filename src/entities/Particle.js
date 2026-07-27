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
    this.friction = (type === 'cross_flash' || type === 'slash_arc') ? 0.82 : 0.93;
    this.type = type; // 'cross_flash', 'slash_arc', 'spark', 'blood_splash', 'smoke_puff'
    
    if (type === 'blood_splash') {
      this.gravity = 180;
    } else {
      this.gravity = 0;
    }
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
    
    if (this.type === 'cross_flash') {
      this.size = this.maxSize * (1 + (1 - this.life / this.maxLife) * 1.5);
    } else if (this.type === 'slash_arc') {
      this.size = this.maxSize * (1 + (1 - this.life / this.maxLife) * 2.0);
    } else if (this.type === 'spark') {
      this.size = Math.max(0.5, this.maxSize * (this.life / this.maxLife));
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
      // ✝️ Stylized 4-Pointed Radiant Cross Impact (Replaces cheap expanding circles!)
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      
      const s = this.size;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      
      ctx.beginPath();
      ctx.moveTo(0, -s * 2.2);
      ctx.lineTo(s * 0.35, -s * 0.35);
      ctx.lineTo(s * 2.2, 0);
      ctx.lineTo(s * 0.35, s * 0.35);
      ctx.lineTo(0, s * 2.2);
      ctx.lineTo(-s * 0.35, s * 0.35);
      ctx.lineTo(-s * 2.2, 0);
      ctx.lineTo(-s * 0.35, -s * 0.35);
      ctx.closePath();
      ctx.fill();
      
    } else if (this.type === 'slash_arc') {
      // ⚔️ Stylized Curved Blade Slash Crescent Arc
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(2, 5 * alpha);
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 1.4, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
      
    } else if (this.type === 'spark') {
      // 💥 Directional Motion-Blurred Speed Streak Spark
      const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy) * 0.08;
      const angle = Math.atan2(this.vy, this.vx);
      
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);
      
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      
      ctx.fillRect(-len / 2, -this.size / 2, len + this.size, this.size);
      
    } else if (this.type === 'blood_splash') {
      // 🩸 Fluid Splatter Droplet
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.size * 1.3, this.size * 0.8, this.angle, 0, Math.PI * 2);
      ctx.fill();
      
    } else {
      // General Glowing Ember
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
