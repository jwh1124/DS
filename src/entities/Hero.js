import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';
import { FloatingText } from './FloatingText.js';

// A giant, epic Paladin-like Mecha or Commander Hero
const HERO_SPRITE = [
  "--------------------",
  "--------kkkk--------",
  "------kkwwwwkk------",
  "-----kwyyyyyywk-----",
  "----kwyykkyykyywk---",
  "----kwyykkyykyywk---",
  "----kwyyyyyyyywk----",
  "-----kwyyyyyywk-----",
  "------kkyyyykk------",
  "------kcyyyyck------",
  "----kkcccccccckk----",
  "---kccccyccycccck---",
  "---kcggccccccggck---",
  "--kggcgccccccgcggk--",
  "--kgcggccccccggcgk--",
  "-kggcccckcckccccggk-",
  "-kcgccckkcckkcccgck-",
  "-kcccck--kk--kcccck-",
  "-kkkkk--------kkkkk-",
  "--------------------"
];

export class Hero {
  constructor(game, x, y, team) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.team = team;
    this.hp = 1500;
    this.maxHp = 1500;
    this.radius = 30;
    this.isAlive = true;
    
    // Aura properties
    this.auraRadius = 250;
    
    // Attack properties
    this.damage = 50;
    this.range = 250; // Ranged magic attacks
    this.attackSpeed = 1.0;
    this.attackCooldown = 0;
    
    // Movement
    this.speed = 120;
    
    // Inputs (from main)
    this.moveLeft = false;
    this.moveRight = false;
  }
  
  takeDamage(amount) {
    if (!this.isAlive) return;
    this.hp -= amount;
    this.game.entityManager.addEntity(new FloatingText(this.game, `-${amount}`, this.x, this.y - 40, '#ff3333'));
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      this.explode();
      // Wait some time to respawn? For now just die.
    }
  }

  explode() {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, '#f1c40f', 1.0, speed, angle, 6
      ));
    }
  }

  update(dt) {
    if (!this.isAlive) return;
    
    // Movement
    if (this.moveLeft) {
      this.x -= this.speed * dt;
    } else if (this.moveRight) {
      this.x += this.speed * dt;
    }
    
    // Bounds keeping
    const minX = 150;
    const maxX = this.game.canvas.width - 150;
    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;
    
    // Attack logic
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    
    const { target, distance } = this.findTarget();
    if (target && distance <= this.range && this.attackCooldown <= 0) {
      this.performAttack(target);
      this.attackCooldown = this.attackSpeed;
    }
    
    // Aura Effect: buff friendly units within auraRadius
    const friends = this.game.entityManager.getEntitiesByTeam(this.team);
    friends.forEach(f => {
      if (f !== this && f.radius && Math.abs(f.x - this.x) <= this.auraRadius) {
        f.hasAura = true;
      }
    });
  }
  
  findTarget() {
    const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
    const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
    
    let closestDist = Infinity;
    let closestEnemy = null;
    
    for (const enemy of enemies) {
      const dist = Math.abs(enemy.x - this.x);
      if (dist < closestDist) {
        closestDist = dist;
        closestEnemy = enemy;
      }
    }
    
    return { target: closestEnemy, distance: closestDist };
  }
  
  performAttack(target) {
    // Shoot magical orb
    this.game.entityManager.addEntity(new Projectile(
      this.game, this.x, this.y, target, this.damage, '#f1c40f', this.team
    ));
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    // Draw Aura circle on ground
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius, this.auraRadius, this.auraRadius * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(241, 196, 15, 0.15)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
    ctx.stroke();
    ctx.restore();
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const pixelSize = 4;
    const w = HERO_SPRITE[0].length * pixelSize;
    const h = HERO_SPRITE.length * pixelSize;
    ctx.translate(-w/2, -h/2);
    
    for (let r = 0; r < HERO_SPRITE.length; r++) {
      for (let c = 0; c < HERO_SPRITE[r].length; c++) {
        const char = HERO_SPRITE[r][c];
        if (char !== '-') {
          if (char === 'k') ctx.fillStyle = '#111';
          else if (char === 'c') ctx.fillStyle = '#f1c40f'; // Gold armor
          else if (char === 'g') ctx.fillStyle = '#d35400'; // Dark gold/orange
          else if (char === 'y') ctx.fillStyle = '#00e5ff'; // Cyan visor/energy
          else if (char === 'w') ctx.fillStyle = '#fff';
          
          ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    ctx.restore();
    
    // Health bar
    const hpPercent = this.hp / this.maxHp;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.fillRect(this.x - 20, this.y - this.radius - 20, 40, 5);
    ctx.fillStyle = 'rgba(241, 196, 15, 0.8)'; // Golden HP
    ctx.fillRect(this.x - 20, this.y - this.radius - 20, 40 * hpPercent, 5);
  }
}
