import { Particle } from './Particle.js';

export class Projectile {
  constructor(game, x, y, target, damage, color, team) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.color = color;
    this.team = team;
    
    this.speed = 300; // pixels per second
    this.radius = 4;
    this.isAlive = true;
  }

  update(dt) {
    if (!this.isAlive) return;

    // Target tracking (homing) or go to last known pos
    if (this.target && this.target.isAlive) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < this.radius + (this.target.radius || 10)) {
        // Hit
        this.target.takeDamage(this.damage);
        this.explode();
        return;
      }
      
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
      
      // Trail particles
      if (Math.random() > 0.5) {
        this.game.entityManager.addEntity(new Particle(
          this.game, this.x, this.y, this.color, 0.2, 0, 0, 2
        ));
      }
    } else {
      // Target died before hit
      this.isAlive = false;
    }
  }
  
  explode() {
    this.isAlive = false;
    // Explode particles
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 50 + 20;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, this.color, 0.3, speed, angle, 3
      ));
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.restore();
  }
}
