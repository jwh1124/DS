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
    
    this.speed = isHeavy ? 450 : 360;
    this.radius = isHeavy ? 6 : 4;
    this.isAlive = true;
  }

  update(dt) {
    if (!this.isAlive) return;

    if (this.target && this.target.isAlive) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < this.radius + (this.target.radius || 10)) {
        // Critical hit calculation (15% chance for 1.5x damage)
        const isCrit = Math.random() < 0.15;
        const finalDmg = isCrit ? this.damage * 1.5 : this.damage;
        
        this.target.takeDamage(finalDmg, isCrit);
        this.explode();
        return;
      }
      
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
      
      // Dynamic trail particles
      if (Math.random() > 0.3) {
        this.game.entityManager.addEntity(new Particle(
          this.game, 
          this.x - (dx / dist) * 6, 
          this.y - (dy / dist) * 6, 
          this.color, 
          0.25, 
          15, 
          Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 0.5, 
          this.isHeavy ? 4 : 2,
          'spark'
        ));
      }
    } else {
      this.isAlive = false;
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
