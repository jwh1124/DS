import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';
import { FloatingText } from './FloatingText.js';

const UNIT_STATS = {
  melee: { hp: 200, damage: 15, range: 40, speed: 80, attackSpeed: 1.0, color: '#f39c12' },
  ranged: { hp: 80, damage: 25, range: 200, speed: 70, attackSpeed: 1.2, color: '#3498db' },
  tank: { hp: 500, damage: 10, range: 50, speed: 45, attackSpeed: 1.5, color: '#9b59b6' }
};

// Simple Pixel Art definitions using strings (c=color, w=white, k=black, -=transparent)
const PIXEL_ART = {
  player: {
    melee: [
      "---kk---",
      "--kwck--",
      "-kcck---",
      "kkcckk--",
      "-kcck---",
      "--kk----"
    ],
    ranged: [
      "---k----",
      "--kwk---",
      "-kccckk-",
      "kcccccww",
      "-kccckk-",
      "--kwk---"
    ],
    tank: [
      "-kkkk---",
      "kcccckk-",
      "kcccccww",
      "kcccckk-",
      "-kkkk---"
    ]
  },
  enemy: {
    melee: [
      "---kk---",
      "--kcww--",
      "-kcck---",
      "kkcckk--",
      "-kcck---",
      "--kk----"
    ],
    ranged: [
      "---k----",
      "--kwk---",
      "kkccck--",
      "wwccccck",
      "kkccck--",
      "--kwk---"
    ],
    tank: [
      "---kkkk-",
      "-kkcccck",
      "wwccccck",
      "-kkcccck",
      "---kkkk-"
    ]
  }
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
    
    this.radius = 16;
    this.isAlive = true;
    
    this.state = 'moving';
    this.target = null;
    this.attackCooldown = 0;
    
    this.dir = team === 'player' ? 1 : -1;
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    this.hp -= amount;
    
    this.game.entityManager.addEntity(new FloatingText(this.game, `-${amount}`, this.x, this.y - 20, '#ff3333'));
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      this.explode();
    }
  }

  explode() {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 80 + 20;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, this.color, 0.5, speed, angle, 4
      ));
    }
  }

  findTarget() {
    const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
    const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
    
    let closestDist = Infinity;
    let closestEnemy = null;
    
    for (const enemy of enemies) {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
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
        this.state = 'attacking';
        if (this.attackCooldown <= 0) {
          this.performAttack(target);
          this.attackCooldown = this.attackSpeed;
        }
      } else {
        this.state = 'moving';
        this.moveTowards(target.x, target.y, dt);
      }
    } else {
      this.state = 'moving';
      this.x += this.speed * this.dir * dt;
    }
    
    if (this.state === 'moving' && Math.random() > 0.7) {
      const trailAngle = this.dir === 1 ? Math.PI : 0;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x - this.dir * this.radius, this.y, '#fff', 0.2, 20, trailAngle, 2
      ));
    }
  }
  
  performAttack(target) {
    if (this.type === 'ranged') {
      this.game.entityManager.addEntity(new Projectile(
        this.game, this.x, this.y, target, this.damage, this.color, this.team
      ));
    } else {
      target.takeDamage(this.damage);
      this.game.entityManager.addEntity(new Particle(
        this.game, target.x, target.y, '#fff', 0.1, 0, 0, 10
      ));
    }
  }

  moveTowards(tx, ty, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const mag = Math.sqrt(dx*dx + dy*dy);
    
    const friends = this.game.entityManager.getEntitiesByTeam(this.team);
    let pushX = 0;
    let pushY = 0;
    
    for (const f of friends) {
      if (f !== this && f.radius) {
        const fdx = this.x - f.x;
        const fdy = this.y - f.y;
        const fdist = Math.sqrt(fdx*fdx + fdy*fdy);
        const minDist = this.radius + f.radius + 5;
        
        if (fdist < minDist && fdist > 0) {
          const overlap = minDist - fdist;
          pushX += (fdx / fdist) * overlap;
          pushY += (fdy / fdist) * overlap;
        }
      }
    }
    
    const moveX = (dx / mag) * this.speed * dt;
    const moveY = (dy / mag) * this.speed * dt;
    
    this.x += moveX + (pushX * 5 * dt);
    this.y += moveY + (pushY * 5 * dt);
    
    if (this.y < 150) this.y = 150;
    if (this.y > this.game.canvas.height - 50) this.y = this.game.canvas.height - 50;
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Draw pixel art
    const sprite = PIXEL_ART[this.team][this.type];
    const pixelSize = 4;
    const w = sprite[0].length * pixelSize;
    const h = sprite.length * pixelSize;
    
    ctx.translate(-w/2, -h/2); // Center
    
    for (let r = 0; r < sprite.length; r++) {
      for (let c = 0; c < sprite[r].length; c++) {
        const char = sprite[r][c];
        if (char !== '-') {
          if (char === 'k') ctx.fillStyle = '#111'; // Outline
          else if (char === 'c') ctx.fillStyle = this.team === 'player' ? '#0ff' : '#ff3333'; // Main color
          else if (char === 'w') ctx.fillStyle = '#fff'; // Highlight/Eye/Gun
          
          ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    ctx.restore();
    
    // Health bar
    const hpPercent = this.hp / this.maxHp;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.fillRect(this.x - 15, this.y - this.radius - 12, 30, 4);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.fillRect(this.x - 15, this.y - this.radius - 12, 30 * hpPercent, 4);
    
    if (this.state === 'attacking' && this.target && this.type !== 'ranged' && this.attackCooldown > this.attackSpeed - 0.1) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.target.x, this.target.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}
