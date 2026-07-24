import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';
import { FloatingText } from './FloatingText.js';

const UNIT_STATS = {
  melee: { hp: 120, damage: 25, range: 45, speed: 85, attackSpeed: 1.0, color: '#00e5ff' },
  ranged: { hp: 60, damage: 35, range: 250, speed: 70, attackSpeed: 1.2, color: '#3498db' },
  tank: { hp: 300, damage: 60, range: 60, speed: 40, attackSpeed: 1.5, color: '#9b59b6' }
};

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
    
    this.radius = 20;
    this.isAlive = true;
    
    this.state = 'moving';
    this.target = null;
    this.attackCooldown = 0;
    this.hasAura = false;
    this.isBoss = false; 
    this.scale = 1;
    this.tier = 1;
    this.recoil = 0;
    
    this.dir = team === 'player' ? 1 : -1;
    
    // Scale stats based on Tech Level (Player) or Wave Count (Enemy)
    if (this.team === 'player' && this.game.playerBase) {
      const techLevel = Math.min(5, this.game.playerBase.techLevel);
      if (techLevel > 1) {
        this.maxHp *= techLevel;
        this.hp = this.maxHp;
        this.damage *= techLevel;
        this.tier = Math.min(3, Math.ceil(techLevel / 2));
        this.scale = 1 + (this.tier - 1) * 0.35;
      }
    } else if (this.team === 'enemy' && this.game.waveSystem) {
      const difficultyMultiplier = this.game.difficulty || 1.0;
      const enemyTechLevel = Math.min(5, 1 + Math.floor(this.game.waveSystem.aiWaveCount / 5));
      
      this.maxHp *= difficultyMultiplier;
      this.hp = this.maxHp;
      this.damage *= difficultyMultiplier;
      
      if (enemyTechLevel > 1) {
        this.maxHp *= enemyTechLevel;
        this.hp = this.maxHp;
        this.damage *= enemyTechLevel;
        this.tier = Math.min(3, Math.ceil(enemyTechLevel / 2));
        this.scale = 1 + (this.tier - 1) * 0.35;
      }
    }
  }
  
  makeBoss() {
    this.isBoss = true;
    this.scale = 2.4;
    this.maxHp *= 8;
    this.hp = this.maxHp;
    this.damage *= 2.5;
    this.radius *= 2.2;
    this.color = '#ff0055';
  }

  takeDamage(amount, isCritical = false) {
    if (!this.isAlive) return;
    this.hp -= amount;
    
    const textStr = isCritical ? `CRIT! -${Math.floor(amount)}` : `-${Math.floor(amount)}`;
    const textColor = isCritical ? '#f1c40f' : (this.team === 'player' ? '#ff4d4d' : '#00e5ff');
    this.game.entityManager.addEntity(new FloatingText(this.game, textStr, this.x, this.y - 35 * this.scale, textColor, isCritical));
    
    // Spark particles on damage
    for (let i = 0; i < (isCritical ? 8 : 3); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 60 + 20;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, this.color, 0.25, speed, angle, 3, 'spark'
      ));
    }
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      this.explode();
    }
  }

  explode() {
    if (this.game.audio) {
      this.game.audio.playExplosion();
    }
    
    // Impact Screen Shake for Boss or Tank
    if ((this.isBoss || this.type === 'tank') && this.game.addScreenShake) {
      this.game.addScreenShake(this.isBoss ? 12 : 5);
    }
    
    // Shockwave
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y, this.color, 0.45, 0, 0, 20 * this.scale, 'shockwave'
    ));

    const particleCount = this.isBoss ? 40 : 18;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 40;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, this.color, 0.6, speed, angle, Math.random() * 4 + 2, 'spark'
      ));
    }
    
    // Core white flash particle
    this.game.entityManager.addEntity(new Particle(this.game, this.x, this.y, '#ffffff', 0.2, 0, 0, 25 * this.scale));
  }

  findTarget() {
    const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
    const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
    
    let closestDist = Infinity;
    let closestEnemy = null;
    
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      
      if (Math.abs(dx) > closestDist || Math.abs(dy) > closestDist) continue;
      
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
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - dt * 10);
    }
    
    const currentSpeed = this.hasAura ? this.speed * 1.4 : this.speed;
    const currentAttackSpeed = this.hasAura ? this.attackSpeed * 0.7 : this.attackSpeed;
    
    const { target, distance } = this.findTarget();
    this.target = target;
    
    if (target) {
      if (distance <= this.range) {
        this.state = 'attacking';
        if (this.attackCooldown <= 0) {
          this.performAttack(target);
          this.attackCooldown = currentAttackSpeed;
          this.recoil = 1.0;
        }
      } else {
        this.state = 'moving';
        this.moveTowards(target.x, target.y, dt, currentSpeed);
      }
    } else {
      this.state = 'moving';
      this.x += currentSpeed * this.dir * dt;
    }
    
    // Dust & Energy Engine trails
    if (this.state === 'moving' && Math.random() > 0.5) {
      const trailAngle = this.dir === 1 ? Math.PI + (Math.random()-0.5)*0.5 : (Math.random()-0.5)*0.5;
      this.game.entityManager.addEntity(new Particle(
        this.game, 
        this.x - this.dir * (this.radius - 2), 
        this.y + (Math.random() - 0.5) * 10, 
        this.color, 
        0.35, 
        35, 
        trailAngle, 
        2.5,
        'spark'
      ));
    }
    
    this.hasAura = false;
  }
  
  performAttack(target) {
    const currentDamage = this.hasAura ? this.damage * 1.4 : this.damage;
    
    if (this.game.audio) {
      this.game.audio.playShoot();
    }
    
    if (this.type === 'ranged') {
      this.game.entityManager.addEntity(new Projectile(
        this.game, 
        this.x + (this.dir * 18 * this.scale), 
        this.y - 5 * this.scale, 
        target, 
        currentDamage, 
        this.color, 
        this.team,
        false
      ));
      // Muzzle flash particle
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x + (this.dir * 22 * this.scale), this.y - 5 * this.scale, '#fff', 0.12, 0, 0, 10, 'spark'
      ));
    } else if (this.type === 'tank') {
      this.game.entityManager.addEntity(new Projectile(
        this.game, 
        this.x + (this.dir * 20 * this.scale), 
        this.y - 8 * this.scale, 
        target, 
        currentDamage, 
        '#f1c40f', 
        this.team,
        true
      ));
    } else {
      // Melee attack
      const isCrit = Math.random() < 0.15;
      const finalDmg = isCrit ? currentDamage * 1.5 : currentDamage;
      target.takeDamage(finalDmg, isCrit);
      
      // Melee Spark burst
      for (let i = 0; i < 4; i++) {
        this.game.entityManager.addEntity(new Particle(
          this.game, target.x, target.y, this.color, 0.2, 50, Math.random() * Math.PI * 2, 3, 'spark'
        ));
      }
    }
  }

  moveTowards(tx, ty, dt, currentSpeed) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const mag = Math.sqrt(dx*dx + dy*dy);
    
    if (mag < 0.1) return;
    
    const friends = this.game.entityManager.getEntitiesByTeam(this.team);
    let pushX = 0;
    let pushY = 0;
    let checks = 0;
    
    for (let i = friends.length - 1; i >= 0; i--) {
      const f = friends[i];
      if (f !== this && f.radius) {
        const fdx = this.x - f.x;
        const fdy = this.y - f.y;
        
        const minDist = this.radius + f.radius + 6;
        if (Math.abs(fdx) > minDist || Math.abs(fdy) > minDist) continue;
        
        const fdist = Math.sqrt(fdx*fdx + fdy*fdy);
        
        if (fdist < minDist && fdist > 0) {
          const overlap = minDist - fdist;
          pushX += (fdx / fdist) * overlap;
          pushY += (fdy / fdist) * overlap;
          checks++;
          if (checks > 5) break;
        }
      }
    }
    
    const moveX = (dx / mag) * currentSpeed * dt;
    const moveY = (dy / mag) * currentSpeed * dt;
    
    this.x += moveX + (pushX * 4 * dt);
    this.y += moveY + (pushY * 4 * dt);
    
    if (this.y < 250) this.y = 250;
    if (this.y > this.game.canvas.height - 150) this.y = this.game.canvas.height - 150;
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    
    // 1. Draw Drop Shadow on Ground
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + (this.radius * this.scale * 0.8), this.radius * this.scale * 0.9, 6 * this.scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();
    
    ctx.translate(this.x - (this.recoil * 5 * this.dir), this.y);
    
    // 2. Boss Pulse Aura
    if (this.isBoss) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 12 + Math.sin(Date.now() * 0.008) * 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff0055';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    // 3. Aura Buff Glow
    if (this.hasAura) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(241, 196, 15, 0.35)';
      ctx.fill();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#f1c40f';
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    if (this.dir === -1) {
      ctx.scale(-1, 1);
    }
    
    ctx.scale(this.scale, this.scale);
    
    // 4. Render Pixel Art Sprite
    const sprite = PIXEL_ART[this.team][this.type];
    const pixelSize = 3;
    const w = sprite[0].length * pixelSize;
    const h = sprite.length * pixelSize;
    
    ctx.translate(-w/2, -h/2);
    
    for (let r = 0; r < sprite.length; r++) {
      for (let c = 0; c < sprite[r].length; c++) {
        const char = sprite[r][c];
        if (char !== '-') {
          if (char === 'k') ctx.fillStyle = '#111';
          else if (char === 'w') ctx.fillStyle = '#fff';
          else if (char === 'g') {
            if (this.tier === 1) ctx.fillStyle = '#7f8c8d'; 
            else if (this.tier === 2) ctx.fillStyle = '#bdc3c7'; 
            else ctx.fillStyle = '#2c3e50'; 
          }
          else if (char === 'y') {
            if (this.tier === 1) ctx.fillStyle = '#f1c40f'; 
            else if (this.tier === 2) ctx.fillStyle = '#e67e22'; 
            else ctx.fillStyle = '#00ff00'; 
          }
          else if (char === 'c') {
            if (this.tier === 1) ctx.fillStyle = this.team === 'player' ? '#00e5ff' : '#ff3333'; 
            else if (this.tier === 2) ctx.fillStyle = this.team === 'player' ? '#0984e3' : '#d63031'; 
            else ctx.fillStyle = this.team === 'player' ? '#6c5ce7' : '#8e44ad'; 
          }
          else if (char === 'd') {
            if (this.tier === 1) ctx.fillStyle = this.team === 'player' ? '#0083b0' : '#b00000';
            else if (this.tier === 2) ctx.fillStyle = this.team === 'player' ? '#005f73' : '#c0392b';
            else ctx.fillStyle = this.team === 'player' ? '#4a69bd' : '#5f27cd';
          }
          else if (char === 'r') {
            if (this.tier === 1) ctx.fillStyle = '#e74c3c';
            else if (this.tier === 2) ctx.fillStyle = '#d63031';
            else ctx.fillStyle = '#8e44ad';
          }
          
          ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    ctx.restore();
    
    // 5. Render Health Bar & Tier Badges
    ctx.save();
    const hpPercent = Math.max(0, this.hp / this.maxHp);
    const barW = Math.max(30, 30 * this.scale);
    const barH = this.isBoss ? 6 : 4;
    const barX = this.x - barW / 2;
    const barY = this.y - (this.radius * this.scale) - 16;
    
    // Health bar container with dark border
    ctx.fillStyle = 'rgba(10, 15, 20, 0.8)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    
    // Red background fill
    ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
    ctx.fillRect(barX, barY, barW, barH);
    
    // Health fill gradient
    ctx.fillStyle = this.team === 'player' ? '#00e5ff' : '#2ecc71';
    ctx.shadowBlur = 6;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillRect(barX, barY, barW * hpPercent, barH);
    ctx.shadowBlur = 0;
    
    // Tier stars
    if (this.tier > 1) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = '10px Orbitron';
      ctx.textAlign = 'center';
      const stars = this.tier === 2 ? '★' : '★★';
      ctx.fillText(stars, this.x, barY - 3);
    }
    
    // 6. Enhanced Melee Laser Arc
    if (this.state === 'attacking' && this.target && this.type === 'melee' && this.attackCooldown > this.attackSpeed - 0.18) {
      ctx.beginPath();
      ctx.moveTo(this.x + (this.dir * 15 * this.scale), this.y);
      ctx.lineTo(this.target.x, this.target.y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(this.x + (this.dir * 15 * this.scale), this.y);
      ctx.lineTo(this.target.x, this.target.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 5;
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    ctx.restore();
  }
}
