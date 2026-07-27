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
    this.radius = isHeavy ? 8 : 5;
    this.isAlive = true;
    this.animTime = 0;
  }

  update(dt) {
    if (!this.isAlive) return;
    this.animTime += dt * 10;

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
      this.explode();
      return;
    }
    
    const moveDist = this.speed * dt;
    if (dist > 0) {
      this.x += (dx / dist) * Math.min(moveDist, dist);
      this.y += (dy / dist) * Math.min(moveDist, dist);
    }
    
    // Holy Sparkle / Demon Flame trail particles
    if (Math.random() > 0.2) {
      const trailType = this.team === 'player' ? 'spark' : 'spark';
      this.game.entityManager.addEntity(new Particle(
        this.game, 
        this.x - (dx / Math.max(1, dist)) * 6, 
        this.y - (dy / Math.max(1, dist)) * 6, 
        this.color, 
        0.3, 
        20, 
        Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 0.5, 
        this.isHeavy ? 5 : 3,
        trailType
      ));
    }
  }
  
  explode() {
    this.isAlive = false;
    
    if (this.game.audio) {
      this.game.audio.playHit();
    }
    
    // Apply direct damage
    if (this.target && this.target.isAlive) {
      const isCrit = Math.random() < 0.15;
      const finalDmg = isCrit ? this.damage * 1.5 : this.damage;
      this.target.takeDamage(finalDmg, isCrit);
    }
    
    // Heavy AOE Splash (Archangel Holy Cleave Wave / Balrog Magma Shockwave)
    if (this.isHeavy) {
      const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
      const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
      const splashRadius = 80;
      const splashDmg = this.damage * 0.5;
      
      enemies.forEach(enemy => {
        if (enemy !== this.target && enemy.isAlive) {
          const edx = enemy.x - this.x;
          const edy = enemy.y - this.y;
          const edist = Math.sqrt(edx*edx + edy*edy);
          if (edist <= splashRadius) {
            enemy.takeDamage(splashDmg, false);
          }
        }
      });
      
      // Holy Shockwave explosion
      const shockColor = this.team === 'player' ? '#f1c40f' : '#ff2d55';
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, shockColor, 0.45, 0, 0, splashRadius, 'shockwave'
      ));

      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 120 + 30;
        this.game.entityManager.addEntity(new Particle(
          this.game, this.x, this.y, shockColor, 0.5, speed, angle, Math.random() * 4 + 2, 'spark'
        ));
      }
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    
    if (this.team === 'player') {
      if (this.isHeavy) {
        // Archangel Flaming Holy Firewave
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.color === '#ff4500') {
        // Inquisitor Piercing Holy Fire Spear
        ctx.fillStyle = '#ff4500';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 4, Math.sin(this.animTime), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Exorcist Holy Water Flask
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -8, 4, 3); // Flask stopper
      }
    } else {
      if (this.isHeavy) {
        // Balrog Magma Shell
        ctx.fillStyle = '#ff2d55';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.color === '#8b00ff') {
        // Banshee Phantom Beam
        ctx.fillStyle = '#8b00ff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 5, Math.sin(this.animTime), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Succubus Hellfire Orb
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
