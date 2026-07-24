import { Particle } from './Particle.js';

export class Projectile {
  constructor(game, x, y, target, damage, color, team, isHeavy = false) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.color = color;
    this.team = team;
    this.isHeavy = isHeavy;
    
    this.targetLastX = target ? target.x : x;
    this.targetLastY = target ? target.y : y;
    
    this.speed = isHeavy ? 480 : 400;
    this.radius = isHeavy ? 6 : 4;
    this.isAlive = true;
  }

  update(dt) {
    if (!this.isAlive) return;

    if (this.target) {
      if (this.target.x !== undefined) this.targetLastX = this.target.x;
      if (this.target.y !== undefined) this.targetLastY = this.target.y;
    }

    const targetX = (this.target && this.target.isAlive) ? this.target.x : this.targetLastX;
    const targetY = (this.target && this.target.isAlive) ? this.target.y : this.targetLastY;
    const targetRadius = (this.target && this.target.radius) ? this.target.radius : 10;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < this.radius + targetRadius || dist < 12) {
      if (this.target && this.target.isAlive) {
        const isCrit = Math.random() < 0.15;
        const finalDmg = isCrit ? this.damage * 1.5 : this.damage;
        this.target.takeDamage(finalDmg, isCrit);
      }
      this.explode();
      return;
    }
    
    const moveDist = this.speed * dt;
    if (dist > 0) {
      this.x += (dx / dist) * Math.min(moveDist, dist);
      this.y += (dy / dist) * Math.min(moveDist, dist);
    }
    
    // Dynamic trail particles
    if (Math.random() > 0.3) {
      this.game.entityManager.addEntity(new Particle(
        this.game, 
        this.x - (dx / Math.max(1, dist)) * 6, 
        this.y - (dy / Math.max(1, dist)) * 6, 
        this.color, 
        0.25, 
        15, 
        Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 0.5, 
        this.isHeavy ? 4 : 2,
        'spark'
      ));
    }
  }
  
  explode() {
    this.isAlive = false;
    
    // Play impact audio
    if (this.game.audio) {
      this.game.audio.playHit();
    }
    
    // Shockwave on impact
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y, this.color, 0.3, 0, 0, 15, 'shockwave'
    ));
    
    // Spark particles
    const particleCount = this.isHeavy ? 12 : 6;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 80 + 30;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, this.color, 0.35, speed, angle, Math.random() * 3 + 2, 'spark'
      ));
    }
    
    // Slight screen shake for heavy shots
    if (this.isHeavy && this.game.addScreenShake) {
      this.game.addScreenShake(3);
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    
    // Draw projectile energy glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; // White core
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }
}
