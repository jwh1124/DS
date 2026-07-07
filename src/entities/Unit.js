const UNIT_STATS = {
  melee: { hp: 200, damage: 15, range: 30, speed: 80, attackSpeed: 1.0, color: '#f39c12' },
  ranged: { hp: 80, damage: 25, range: 150, speed: 70, attackSpeed: 0.8, color: '#3498db' },
  tank: { hp: 500, damage: 10, range: 40, speed: 50, attackSpeed: 1.5, color: '#9b59b6' }
};

export class Unit {
  constructor(game, x, y, team, type) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.team = team;
    this.type = type;
    
    const stats = UNIT_STATS[type];
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.damage = stats.damage;
    this.range = stats.range;
    this.speed = stats.speed;
    this.attackSpeed = stats.attackSpeed;
    this.color = stats.color;
    
    this.radius = 12;
    this.isAlive = true;
    
    // State machine
    this.state = 'moving'; // 'moving', 'attacking'
    this.target = null;
    this.attackCooldown = 0;
    
    // Direction
    this.dir = team === 'player' ? 1 : -1;
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
    }
  }

  findTarget() {
    // Find closest enemy or base
    const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
    const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
    
    let closestDist = Infinity;
    let closestEnemy = null;
    
    for (const enemy of enemies) {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Subtract radii for actual collision distance
      const actualDist = dist - this.radius - (enemy.radius || 0);
      
      if (actualDist < closestDist) {
        closestDist = actualDist;
        closestEnemy = enemy;
      }
    }
    
    return { target: closestEnemy, distance: closestDist };
  }

  update(dt) {
    if (!this.isAlive) return;
    
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }
    
    const { target, distance } = this.findTarget();
    this.target = target;
    
    if (target) {
      if (distance <= this.range) {
        // In range, attack
        this.state = 'attacking';
        if (this.attackCooldown <= 0) {
          target.takeDamage(this.damage);
          this.attackCooldown = this.attackSpeed;
          
          // Add visual effect (simple laser/projectile can be added here)
        }
      } else {
        // Move towards target
        this.state = 'moving';
        
        // Simple movement logic (mainly x-axis in DS, with slight y-axis seeking)
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const mag = Math.sqrt(dx*dx + dy*dy);
        
        // Check for friendly unit stacking/collision
        const friends = this.game.entityManager.getEntitiesByTeam(this.team);
        let pushX = 0;
        let pushY = 0;
        
        for (const f of friends) {
          if (f !== this) {
            const fdx = this.x - f.x;
            const fdy = this.y - f.y;
            const fdist = Math.sqrt(fdx*fdx + fdy*fdy);
            const minDist = this.radius + f.radius;
            
            if (fdist < minDist && fdist > 0) {
              const overlap = minDist - fdist;
              pushX += (fdx / fdist) * overlap;
              pushY += (fdy / fdist) * overlap;
            }
          }
        }
        
        // Apply movement
        const moveX = (dx / mag) * this.speed * dt;
        const moveY = (dy / mag) * this.speed * dt;
        
        this.x += moveX + (pushX * 5 * dt);
        this.y += moveY + (pushY * 5 * dt);
        
        // Keep in bounds
        if (this.y < 150) this.y = 150;
        if (this.y > this.game.canvas.height - 50) this.y = this.game.canvas.height - 50;
      }
    } else {
      // No targets (shouldn't happen with bases alive), but move forward just in case
      this.state = 'moving';
      this.x += this.speed * this.dir * dt;
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Draw team ring
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = this.team === 'player' ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 51, 51, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw unit shape
    ctx.beginPath();
    
    if (this.type === 'melee') {
      // Triangle
      const angle = this.team === 'player' ? 0 : Math.PI;
      ctx.rotate(angle);
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(-this.radius, this.radius);
      ctx.lineTo(-this.radius, -this.radius);
    } else if (this.type === 'ranged') {
      // Diamond
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius, 0);
      ctx.lineTo(0, -this.radius);
    } else {
      // Square
      ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
    }
    
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.closePath();
    
    // Health bar
    const hpPercent = this.hp / this.maxHp;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.fillRect(-15, -this.radius - 10, 30, 4);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.fillRect(-15, -this.radius - 10, 30 * hpPercent, 4);
    
    ctx.restore();
    
    // Attack visual (simple line) - drawn in global coords
    if (this.state === 'attacking' && this.target && this.attackCooldown > this.attackSpeed - 0.1) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.target.x, this.target.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
