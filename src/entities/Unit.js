import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';
import { FloatingText } from './FloatingText.js';

const UNIT_STATS = {
  melee: { hp: 120, damage: 25, range: 45, speed: 85, attackSpeed: 1.0, color: '#00e5ff' },
  ranged: { hp: 60, damage: 35, range: 250, speed: 70, attackSpeed: 1.2, color: '#3498db' },
  medic: { hp: 100, damage: 0, range: 180, speed: 65, attackSpeed: 1.5, color: '#2ecc71' },
  sniper: { hp: 80, damage: 75, range: 450, speed: 55, attackSpeed: 2.0, color: '#e74c3c' },
  tank: { hp: 300, damage: 60, range: 360, speed: 40, attackSpeed: 1.5, color: '#9b59b6' } // FIXED: Long Range Siege Cannon (360px)
};

export class Unit {
  constructor(game, x, y, team, type) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.team = team;
    this.type = type;
    
    const stats = UNIT_STATS[type] || UNIT_STATS.melee;
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.damage = stats.damage;
    this.range = stats.range;
    this.speed = stats.speed;
    this.attackSpeed = stats.attackSpeed;
    this.color = team === 'player' ? (stats.color || '#00e5ff') : '#ff3333';
    
    this.radius = type === 'tank' ? 26 : 20;
    this.isAlive = true;
    
    this.state = 'moving';
    this.target = null;
    this.attackCooldown = 0;
    this.hasAura = false;
    this.isBoss = false; 
    this.scale = 1;
    this.tier = 1;
    this.recoil = 0;
    this.animTime = Math.random() * 10;
    
    this.dir = team === 'player' ? 1 : -1;
    
    // 100% SYMMETRIC STAT SCALING
    const base = this.team === 'player' ? this.game.playerBase : this.game.enemyBase;
    if (base && base.techLevel > 1) {
      const techLevel = Math.min(5, base.techLevel);
      this.maxHp *= techLevel;
      this.hp = this.maxHp;
      if (this.damage > 0) this.damage *= techLevel;
      this.tier = Math.min(3, Math.ceil(techLevel / 2));
      this.scale = 1 + (this.tier - 1) * 0.35;
    }
    
    // Difficulty multiplier for Enemy units
    if (this.team === 'enemy') {
      const diff = this.game.difficulty || 1.0;
      const diffMultiplier = diff === 1.0 ? 1.0 : (1 + (diff - 1) * 0.5);
      this.maxHp *= diffMultiplier;
      this.hp = this.maxHp;
      if (this.damage > 0) this.damage *= diffMultiplier;
    }
  }
  
  makeBoss() {
    this.isBoss = true;
    this.scale = 2.5;
    this.maxHp *= 5;
    this.hp = this.maxHp;
    this.damage *= 1.8;
    this.radius *= 2.2;
    this.color = '#ff0055';
  }

  takeDamage(amount, isCritical = false) {
    if (!this.isAlive) return;
    this.hp -= amount;
    
    const textStr = isCritical ? `CRIT! -${Math.floor(amount)}` : `-${Math.floor(amount)}`;
    const textColor = isCritical ? '#f1c40f' : (this.team === 'player' ? '#ff4d4d' : '#00e5ff');
    this.game.entityManager.addEntity(new FloatingText(this.game, textStr, this.x, this.y - 38 * this.scale, textColor, isCritical));
    
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
      
      // Award Kill Bounty to opposing team
      const bountyMap = { melee: 5, ranged: 10, medic: 12, sniper: 15, tank: 20 };
      const bounty = this.isBoss ? 100 : (bountyMap[this.type] || 10);
      if (this.team === 'enemy' && this.game.economy) {
        this.game.economy.minerals += bounty;
        this.game.entityManager.addEntity(new FloatingText(this.game, `+${bounty} 💎`, this.x, this.y - 55 * this.scale, '#f1c40f', true));
      } else if (this.team === 'player' && this.game.waveSystem) {
        this.game.waveSystem.aiMinerals += bounty;
      }
      
      this.explode();
    }
  }

  explode() {
    if (this.game.audio) {
      this.game.audio.playExplosion();
    }
    
    if ((this.isBoss || this.type === 'tank') && this.game.addScreenShake) {
      this.game.addScreenShake(this.isBoss ? 14 : 6);
    }
    
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y, this.color, 0.45, 0, 0, 22 * this.scale, 'shockwave'
    ));

    const particleCount = this.isBoss ? 45 : 20;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 140 + 40;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, this.color, 0.65, speed, angle, Math.random() * 4 + 2, 'spark'
      ));
    }
    
    this.game.entityManager.addEntity(new Particle(this.game, this.x, this.y, '#ffffff', 0.2, 0, 0, 28 * this.scale));
  }

  findTarget() {
    if (this.type === 'medic') {
      const friends = this.game.entityManager.getEntitiesByTeam(this.team);
      let injuredFriend = null;
      let lowestHpRatio = 1.0;
      
      for (let i = 0; i < friends.length; i++) {
        const f = friends[i];
        if (f !== this && f.isAlive && f.hp < f.maxHp && f.type !== undefined && f !== this.game.playerBase && f !== this.game.enemyBase) {
          const ratio = f.hp / f.maxHp;
          if (ratio < lowestHpRatio) {
            lowestHpRatio = ratio;
            injuredFriend = f;
          }
        }
      }
      
      if (injuredFriend) {
        const dx = injuredFriend.x - this.x;
        const dy = injuredFriend.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        return { target: injuredFriend, distance: dist };
      }
    }

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
    
    this.animTime += dt * 8;
    
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
    if (this.type === 'medic') {
      if (target && target.isAlive && target.type !== undefined) {
        const healAmt = 30 * this.tier;
        target.hp = Math.min(target.maxHp, target.hp + healAmt);
        
        if (this.game.audio) this.game.audio.playMagic();
        this.game.entityManager.addEntity(new FloatingText(this.game, `+${healAmt} HP`, target.x, target.y - 40, '#2ecc71', false));
        
        this.game.entityManager.addEntity(new Particle(
          this.game, target.x, target.y, '#2ecc71', 0.4, 0, 0, 30, 'shockwave'
        ));
        for (let i = 0; i < 8; i++) {
          this.game.entityManager.addEntity(new Particle(
            this.game, target.x, target.y, '#2ecc71', 0.5, 40, Math.random() * Math.PI * 2, 3, 'spark'
          ));
        }
      }
      return;
    }

    let currentDamage = this.hasAura ? this.damage * 1.4 : this.damage;
    
    // 2x Siege Damage Multiplier when attacking Base structures!
    if (target.maxHp && target.techLevel !== undefined) {
      currentDamage *= 2.0;
    }
    
    if (this.game.audio) {
      this.game.audio.playShoot();
    }
    
    if (this.type === 'sniper') {
      this.game.entityManager.addEntity(new Projectile(
        this.game, 
        this.x + (this.dir * 24 * this.scale), 
        this.y - 8 * this.scale, 
        target, 
        currentDamage * 1.2, 
        '#e74c3c', 
        this.team,
        false
      ));
      
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x + (this.dir * 24 * this.scale), this.y - 8 * this.scale, '#e74c3c', 0.2, 0, 0, 16, 'spark'
      ));

    } else if (this.type === 'ranged') {
      this.game.entityManager.addEntity(new Projectile(
        this.game, 
        this.x + (this.dir * 22 * this.scale), 
        this.y - 6 * this.scale, 
        target, 
        currentDamage, 
        this.color, 
        this.team,
        false
      ));
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x + (this.dir * 26 * this.scale), this.y - 6 * this.scale, '#fff', 0.12, 0, 0, 12, 'spark'
      ));
    } else if (this.type === 'tank') {
      this.game.entityManager.addEntity(new Projectile(
        this.game, 
        this.x + (this.dir * 25 * this.scale), 
        this.y - 12 * this.scale, 
        target, 
        currentDamage, 
        '#f1c40f', 
        this.team,
        true
      ));
    } else {
      const isCrit = Math.random() < 0.18;
      const finalDmg = isCrit ? currentDamage * 1.5 : currentDamage;
      target.takeDamage(finalDmg, isCrit);
      
      for (let i = 0; i < 5; i++) {
        this.game.entityManager.addEntity(new Particle(
          this.game, target.x, target.y, this.color, 0.25, 60, Math.random() * Math.PI * 2, 3, 'spark'
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
    
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + (16 * this.scale), 18 * this.scale, 7 * this.scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    
    const recoilX = this.recoil * 6 * this.dir;
    ctx.translate(this.x - recoilX, this.y);
    
    const bobY = this.state === 'moving' ? Math.sin(this.animTime) * 2.5 : 0;
    ctx.translate(0, bobY);
    
    if (this.isBoss) {
      ctx.beginPath();
      ctx.arc(0, 0, 32 + Math.sin(Date.now() * 0.008) * 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff0055';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    if (this.dir === -1) {
      ctx.scale(-1, 1);
    }
    
    ctx.scale(this.scale, this.scale);
    
    const mainColor = this.team === 'player' ? 
      (this.type === 'medic' ? '#2ecc71' : (this.type === 'sniper' ? '#e74c3c' : (this.tier === 1 ? '#00e5ff' : (this.tier === 2 ? '#0984e3' : '#6c5ce7')))) : 
      (this.tier === 1 ? '#ff3333' : (this.tier === 2 ? '#d63031' : '#8e44ad'));
    
    const darkColor = this.team === 'player' ? 
      (this.type === 'medic' ? '#27ae60' : (this.type === 'sniper' ? '#c0392b' : (this.tier === 1 ? '#0083b0' : (this.tier === 2 ? '#005f73' : '#4a69bd')))) : 
      (this.tier === 1 ? '#b00000' : (this.tier === 2 ? '#c0392b' : '#5f27cd'));
    
    const goldColor = this.tier === 1 ? '#f1c40f' : (this.tier === 2 ? '#e67e22' : '#00ff00');
    
    if (this.type === 'medic') {
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-8, 6, 6, 10);
      ctx.fillRect(2, 6, 6, 10);
      
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(-10, -10, 20, 16);
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -7, 6, 10);
      ctx.fillRect(-6, -4, 12, 4);
      
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(-5, -20, 10, 10);
      ctx.fillStyle = '#2ecc71';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#2ecc71';
      ctx.fillRect(-2, -17, 8, 4);
      ctx.shadowBlur = 0;

    } else if (this.type === 'sniper') {
      ctx.fillStyle = '#111';
      ctx.fillRect(-7, 6, 5, 12);
      ctx.fillRect(2, 6, 5, 12);
      
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(10, -12);
      ctx.lineTo(6, 6);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(-5, -22, 10, 10);
      ctx.fillStyle = '#e74c3c';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#e74c3c';
      ctx.fillRect(-2, -19, 7, 3);
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(2, -8, 30, 4);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(14, -11, 4, 3);

    } else if (this.type === 'melee') {
      ctx.fillStyle = darkColor;
      ctx.fillRect(-10, 4, 6, 12);
      ctx.fillRect(2, 4, 6, 12);
      
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.moveTo(-12, -8);
      ctx.lineTo(12, -8);
      ctx.lineTo(8, 6);
      ctx.lineTo(-8, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      ctx.fillStyle = goldColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = goldColor;
      ctx.beginPath();
      ctx.arc(0, -2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = darkColor;
      ctx.fillRect(-7, -20, 14, 11);
      ctx.fillStyle = mainColor;
      ctx.shadowBlur = 8;
      ctx.shadowColor = mainColor;
      ctx.fillRect(-4, -17, 11, 4);
      ctx.shadowBlur = 0;
      
      const bladeFlicker = Math.sin(Date.now() * 0.02) * 2;
      ctx.shadowBlur = 18;
      ctx.shadowColor = mainColor;
      ctx.fillStyle = mainColor;
      
      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.lineTo(26 + bladeFlicker, -8);
      ctx.lineTo(14, 4);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(9, -2);
      ctx.lineTo(22 + bladeFlicker, -7);
      ctx.lineTo(13, 2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

    } else if (this.type === 'ranged') {
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-11, 6, 7, 12);
      ctx.fillRect(2, 6, 7, 12);
      
      ctx.fillStyle = mainColor;
      ctx.fillRect(-13, -10, 22, 16);
      ctx.fillStyle = darkColor;
      ctx.fillRect(-11, -8, 18, 12);
      
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.arc(-11, -8, 6, 0, Math.PI * 2);
      ctx.arc(9, -8, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(-6, -22, 12, 11);
      ctx.fillStyle = goldColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = goldColor;
      ctx.fillRect(-2, -19, 9, 4);
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#485460';
      ctx.fillRect(2, -4, 20, 6);
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(18, -6, 6, 10);

    } else if (this.type === 'tank') {
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-16, 8, 10, 14);
      ctx.fillRect(4, 8, 10, 14);
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(-18, 18, 13, 5);
      ctx.fillRect(2, 18, 13, 5);
      
      ctx.fillStyle = darkColor;
      ctx.fillRect(-18, -14, 34, 22);
      ctx.fillStyle = mainColor;
      ctx.fillRect(-14, -12, 26, 18);
      
      ctx.fillStyle = goldColor;
      ctx.shadowBlur = 12;
      ctx.shadowColor = goldColor;
      ctx.fillRect(-4, -10, 14, 8);
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#34495e';
      ctx.fillRect(-16, -26, 12, 12);
      ctx.fillRect(4, -26, 12, 12);
      
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(-14, -24, 4, 4);
      ctx.fillRect(-8, -24, 4, 4);
      ctx.fillRect(6, -24, 4, 4);
      ctx.fillRect(12, -24, 4, 4);
      
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(8, -2, 18, 5);
    }
    
    ctx.restore();
    
    ctx.save();
    const hpPercent = Math.max(0, this.hp / this.maxHp);
    const barW = Math.max(34, 34 * this.scale);
    const barH = this.isBoss ? 7 : 5;
    const barX = this.x - barW / 2;
    const barY = this.y - (this.radius * this.scale) - 18;
    
    ctx.fillStyle = 'rgba(10, 15, 20, 0.85)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    
    ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
    ctx.fillRect(barX, barY, barW, barH);
    
    ctx.fillStyle = this.team === 'player' ? '#00e5ff' : '#2ecc71';
    ctx.shadowBlur = 8;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillRect(barX, barY, barW * hpPercent, barH);
    ctx.shadowBlur = 0;
    
    if (this.tier > 1) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = '700 11px Orbitron';
      ctx.textAlign = 'center';
      const stars = this.tier === 2 ? '★' : '★★';
      ctx.fillText(stars, this.x, barY - 4);
    }
    
    ctx.restore();
  }
}
