import { Particle } from './Particle.js';

export class Projectile {
  constructor(game, x, y, target, damage, color, team, isHeavy = false, combatProfile = {}) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.color = color;
    this.team = team;
    this.isHeavy = isHeavy;
    this.canCrit = combatProfile.canCrit ?? true;
    this.splashRadius = combatProfile.splashRadius ?? 90;
    this.splashRatio = combatProfile.splashRatio ?? 0.5;
    
    this.targetLastX = target ? target.x : x;
    this.targetLastY = target ? target.y : y;
    
    this.speed = isHeavy ? 520 : 420;
    this.radius = isHeavy ? 10 : 6;
    this.isAlive = true;
    this.animTime = 0;
  }

  update(dt) {
    if (!this.isAlive) return;
    this.animTime += dt * 12;

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
    
    // Trail particles
    if (Math.random() > 0.25) {
      this.game.entityManager.addEntity(new Particle(
        this.game, 
        this.x - (dx / Math.max(1, dist)) * 8, 
        this.y - (dy / Math.max(1, dist)) * 8, 
        this.color, 
        0.25, 
        30, 
        Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 0.4, 
        this.isHeavy ? 4 : 2.5,
        'spark'
      ));
    }
  }
  
  explode() {
    this.isAlive = false;
    
    if (this.game.audio) {
      this.game.audio.playHit();
    }
    
    // Direct damage
    if (this.target && this.target.isAlive) {
      const isCrit = this.canCrit && Math.random() < 0.15;
      const finalDmg = isCrit ? this.damage * 1.5 : this.damage;
      this.target.takeDamage(finalDmg, isCrit);
    }
    
    const shockColor = this.team === 'player' ? '#f1c40f' : '#ff2d55';
    
    // A direct hit is a quick cue. The larger arc is reserved for heavy projectiles.
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y, shockColor, this.isHeavy ? 0.22 : 0.16, 0, Math.random() * Math.PI, this.isHeavy ? 28 : 14, 'cross_flash'
    ));
    
    if (this.isHeavy) {
      const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
      const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
      const splashDmg = this.damage * this.splashRatio;
      
      if (splashDmg > 0 && this.splashRadius > 0) {
        enemies.forEach(enemy => {
          if (enemy !== this.target && enemy.isAlive) {
            const edx = enemy.x - this.x;
            const edy = enemy.y - this.y;
            const edist = Math.sqrt(edx*edx + edy*edy);
            if (edist <= this.splashRadius) {
              enemy.takeDamage(splashDmg, false);
            }
          }
        });
      }
      
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, shockColor, 0.24, 0, Math.random() * Math.PI, 26, 'slash_arc'
      ));

      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 140 + 40;
        this.game.entityManager.addEntity(new Particle(
          this.game, this.x, this.y, shockColor, 0.45, speed, angle, Math.random() * 4 + 2, 'spark'
        ));
      }
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    ctx.shadowBlur = 14;
    ctx.shadowColor = this.color;
    
    if (this.team === 'player') {
      if (this.isHeavy) {
        // Archangel Holy Fire Star Cannon
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.color === '#ff4500') {
        // Inquisitor Silver Spear
        ctx.fillStyle = '#ff4500';
        ctx.fillRect(-8, -2, 16, 4);
      } else {
        // Exorcist Holy Flask
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      if (this.isHeavy) {
        // Balrog Magma Meteor
        ctx.fillStyle = '#ff2d55';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.color === '#8b00ff') {
        // Banshee Wraith Beam
        ctx.fillStyle = '#8b00ff';
        ctx.fillRect(-8, -2.5, 16, 5);
      } else {
        // Succubus Demon Flame Orb
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
