import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';
import { FloatingText } from './FloatingText.js';

const UNIT_STATS = {
  melee: { hp: 200, damage: 15, range: 45, speed: 85, attackSpeed: 1.0, color: '#00e5ff' }, // Player: Cyan, Enemy: Red
  ranged: { hp: 80, damage: 25, range: 250, speed: 70, attackSpeed: 1.2, color: '#3498db' },
  tank: { hp: 500, damage: 10, range: 60, speed: 40, attackSpeed: 1.5, color: '#9b59b6' }
};

// 16x16 Pixel Art Matrices
// Colors: k=black(outline), c=main(team color), d=dark main, w=white/glass, g=gray(metal), y=yellow(lights/fire)
const PIXEL_ART = {
  player: {
    melee: [
      "----------------",
      "------kkk-------",
      "-----kwgck------",
      "----kcgccck-----",
      "----kgcgcck-----",
      "-----kccck------",
      "----kgccckg-----",
      "---kggcccggk----",
      "---kgckkkcgk----",
      "--kcck---kcck---",
      "--kcck---kcck---",
      "-kgggk---kgggk--",
      "-kcccgkkkgcccgk-",
      "kkccck---kccckk-",
      "-kkkk-----kkkk--",
      "----------------"
    ],
    ranged: [
      "----------------",
      "------kkk-------",
      "-----kwcwk------",
      "-----kccck------",
      "---kkkgcckk-----",
      "--kcgkgcckk-----",
      "-kcggkgccckkk---",
      "kkccgkgcccccgkk-",
      "-kcccgkkkkkkk---",
      "--kcck---kcck---",
      "--kcck---kcck---",
      "--kgck---kgck---",
      "--kcck---kcck---",
      "-kkcckk-kkcckk--",
      "-kkkkk---kkkkk--",
      "----------------"
    ],
    tank: [
      "----------------",
      "-----kkkkk------",
      "---kkcwgwckk----",
      "--kcccgcgccck---",
      "--kccccccccck---",
      "--kggccgcccgk---",
      "kkkcccgcgcccckkk",
      "kggccccgccccggck",
      "kggcccccccccggck",
      "kkkccccccccckkkk",
      "---kkkkkkkkk----",
      "---kkcgggcck----",
      "--kcccgggccck---",
      "-kggcgggggcggk--",
      "-kkkkkkkkkkkkk--",
      "----------------"
    ]
  },
  enemy: {
    melee: [
      "----------------",
      "------kkk-------",
      "-----kwyrk------",
      "----kryrrrk-----",
      "----kyryrrk-----",
      "-----krrrk------",
      "----kyrrrkd-----",
      "---kddrrrddk----",
      "---kdrkkkrdk----",
      "--krrk---krrk---",
      "--krrk---krrk---",
      "-kdddk---kdddk--",
      "-krrrdkkkdrrrdk-",
      "kkrrrk---krrrkk-",
      "-kkkk-----kkkk--",
      "----------------"
    ],
    ranged: [
      "----------------",
      "------kkk-------",
      "-----kwywk------",
      "-----krrrk------",
      "---kkkdrrkk-----",
      "--krykdrrkk-----",
      "-kddykdrrrkkk---",
      "kkrrykdrrrrrdkk-",
      "-krrrdkkkkkkk---",
      "--krrk---krrk---",
      "--krrk---krrk---",
      "--kdrk---kdrk---",
      "--krrk---krrk---",
      "-kkrrkk-kkrrkk--",
      "-kkkkk---kkkkk--",
      "----------------"
    ],
    tank: [
      "----------------",
      "-----kkkkk------",
      "---kkyrdrdykk---",
      "--krrrdrdrrrk---",
      "--krrrrrrrrrk---",
      "--kddrrdrrrdk---",
      "kkkrrdrdrrrrkkkk",
      "kddrrrrdrrrrddrk",
      "kddrrrrrrrrrddrk",
      "kkkrrrrrrrrrkkkk",
      "---kkkkkkkkk----",
      "---kkrdddrrk----",
      "--krrrdddrrrk---",
      "-kddrdddddrddk--",
      "-kkkkkkkkkkkkk--",
      "----------------"
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
    this.color = team === 'player' ? '#00e5ff' : '#ff3333';
    
    this.radius = 20; // Slightly larger for better collision visually
    this.isAlive = true;
    
    this.state = 'moving';
    this.target = null;
    this.attackCooldown = 0;
    this.hasAura = false;
    
    this.dir = team === 'player' ? 1 : -1;
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    this.hp -= amount;
    
    this.game.entityManager.addEntity(new FloatingText(this.game, `-${amount}`, this.x, this.y - 30, '#ff3333'));
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      this.explode();
    }
  }

  explode() {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 100 + 30;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, this.color, 0.5, speed, angle, 4
      ));
    }
    // Explosion core
    this.game.entityManager.addEntity(new Particle(this.game, this.x, this.y, '#fff', 0.2, 0, 0, 15));
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
    
    // Apply Aura Buffs
    const currentSpeed = this.hasAura ? this.speed * 1.5 : this.speed;
    const currentAttackSpeed = this.hasAura ? this.attackSpeed * 0.7 : this.attackSpeed;
    
    const { target, distance } = this.findTarget();
    this.target = target;
    
    if (target) {
      if (distance <= this.range) {
        this.state = 'attacking';
        if (this.attackCooldown <= 0) {
          this.performAttack(target);
          this.attackCooldown = currentAttackSpeed;
        }
      } else {
        this.state = 'moving';
        this.moveTowards(target.x, target.y, dt, currentSpeed);
      }
    } else {
      this.state = 'moving';
      this.x += currentSpeed * this.dir * dt;
    }
    
    // Engine trails when moving
    if (this.state === 'moving' && Math.random() > 0.6) {
      const trailAngle = this.dir === 1 ? Math.PI + (Math.random()-0.5)*0.5 : (Math.random()-0.5)*0.5;
      const engineY = this.type === 'tank' ? this.y + 10 : this.y;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x - this.dir * (this.radius - 5), engineY, this.color, 0.3, 30, trailAngle, 3
      ));
    }
    
    // Reset aura for next frame
    this.hasAura = false;
  }
  
  performAttack(target) {
    const currentDamage = this.hasAura ? this.damage * 1.5 : this.damage;
    if (this.type === 'ranged') {
      this.game.entityManager.addEntity(new Projectile(
        this.game, this.x + (this.dir * 15), this.y - 5, target, currentDamage, this.color, this.team
      ));
      // Muzzle flash
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x + (this.dir * 20), this.y - 5, '#fff', 0.1, 0, 0, 8
      ));
    } else {
      target.takeDamage(currentDamage);
      this.game.entityManager.addEntity(new Particle(
        this.game, target.x, target.y, '#fff', 0.15, 0, 0, 12
      ));
    }
  }

  moveTowards(tx, ty, dt, currentSpeed) {
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
        const minDist = this.radius + f.radius + 8; // spacing
        
        if (fdist < minDist && fdist > 0) {
          const overlap = minDist - fdist;
          pushX += (fdx / fdist) * overlap;
          pushY += (fdy / fdist) * overlap;
        }
      }
    }
    
    const moveX = (dx / mag) * currentSpeed * dt;
    const moveY = (dy / mag) * currentSpeed * dt;
    
    this.x += moveX + (pushX * 5 * dt);
    this.y += moveY + (pushY * 5 * dt);
    
    // Bounds keeping
    if (this.y < 250) this.y = 250;
    if (this.y > this.game.canvas.height - 150) this.y = this.game.canvas.height - 150;
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Draw Aura Glow
    if (this.hasAura) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(241, 196, 15, 0.4)';
      ctx.fill();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#f1c40f';
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    // Face direction
    if (this.dir === -1) {
      ctx.scale(-1, 1);
    }
    
    // Draw pixel art
    const sprite = PIXEL_ART[this.team][this.type];
    const pixelSize = 3; // Scale up 16x16 -> 48x48 roughly
    const w = sprite[0].length * pixelSize;
    const h = sprite.length * pixelSize;
    
    ctx.translate(-w/2, -h/2); // Center
    
    for (let r = 0; r < sprite.length; r++) {
      for (let c = 0; c < sprite[r].length; c++) {
        const char = sprite[r][c];
        if (char !== '-') {
          if (char === 'k') ctx.fillStyle = '#111'; // Outline
          else if (char === 'w') ctx.fillStyle = '#fff'; // White/Glass
          else if (char === 'g') ctx.fillStyle = '#7f8c8d'; // Metal gray
          else if (char === 'y') ctx.fillStyle = '#f1c40f'; // Yellow lights
          else if (char === 'c') ctx.fillStyle = this.team === 'player' ? '#00e5ff' : '#ff3333'; // Main color
          else if (char === 'd') ctx.fillStyle = this.team === 'player' ? '#0083b0' : '#b00000'; // Dark color
          else if (char === 'r') ctx.fillStyle = '#e74c3c'; // Red for enemy
          
          ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    ctx.restore();
    
    // Health bar
    const hpPercent = this.hp / this.maxHp;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.fillRect(this.x - 15, this.y - this.radius - 15, 30, 4);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.fillRect(this.x - 15, this.y - this.radius - 15, 30 * hpPercent, 4);
    
    // Attack laser (Melee)
    if (this.state === 'attacking' && this.target && this.type === 'melee' && this.attackCooldown > this.attackSpeed - 0.15) {
      ctx.beginPath();
      ctx.moveTo(this.x + (this.dir * 15), this.y);
      ctx.lineTo(this.target.x, this.target.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}
