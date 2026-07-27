import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';
import { FloatingText } from './FloatingText.js';

const UNIT_STATS = {
  melee: { hp: 120, damage: 25, range: 45, speed: 85, attackSpeed: 1.0, color: '#f1c40f' },   // Monk / Imp
  ranged: { hp: 60, damage: 35, range: 250, speed: 70, attackSpeed: 1.2, color: '#dfe6e9' },   // Exorcist / Succubus
  medic: { hp: 100, damage: 0, range: 180, speed: 65, attackSpeed: 1.5, color: '#f1c40f' },    // Priest / Lich
  sniper: { hp: 80, damage: 75, range: 450, speed: 55, attackSpeed: 2.0, color: '#e74c3c' },   // Inquisitor / Banshee
  tank: { hp: 300, damage: 60, range: 360, speed: 40, attackSpeed: 1.5, color: '#f1c40f' }     // Archangel / Balrog
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
    this.color = team === 'player' ? (stats.color || '#f1c40f') : '#8b00ff';
    
    this.radius = type === 'tank' ? 28 : 20;
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
    
    // Tech Level stat scaling
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
    const textColor = isCritical ? '#f1c40f' : (this.team === 'player' ? '#ff4d4d' : '#9b59b6');
    this.game.entityManager.addEntity(new FloatingText(this.game, textStr, this.x, this.y - 38 * this.scale, textColor, isCritical));
    
    const sparkColor = this.team === 'player' ? '#f1c40f' : '#8b00ff';
    for (let i = 0; i < (isCritical ? 8 : 3); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 60 + 20;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, sparkColor, 0.25, speed, angle, 3, 'spark'
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
        this.game.entityManager.addEntity(new FloatingText(this.game, `+${bounty} ✝️`, this.x, this.y - 55 * this.scale, '#f1c40f', true));
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
    
    const expColor = this.team === 'player' ? '#f1c40f' : '#8b00ff';
    
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y, expColor, 0.45, 0, 0, 22 * this.scale, 'shockwave'
    ));

    const particleCount = this.isBoss ? 45 : 20;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 140 + 40;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, expColor, 0.65, speed, angle, Math.random() * 4 + 2, 'spark'
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
      const pColor = this.team === 'player' ? '#f1c40f' : '#8b00ff';
      this.game.entityManager.addEntity(new Particle(
        this.game, 
        this.x - this.dir * (this.radius - 2), 
        this.y + (Math.random() - 0.5) * 10, 
        pColor, 
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
      // Priest (Player) / Lich (Enemy) Healing / Curse Pulse
      if (target && target.isAlive && target.type !== undefined) {
        const healAmt = 30 * this.tier;
        target.hp = Math.min(target.maxHp, target.hp + healAmt);
        
        if (this.game.audio) this.game.audio.playMagic();
        
        const healColor = this.team === 'player' ? '#f1c40f' : '#a29bfe';
        const healText = this.team === 'player' ? `+${healAmt} HP (은총)` : `+${healAmt} HP (마기)`;
        
        this.game.entityManager.addEntity(new FloatingText(this.game, healText, target.x, target.y - 40, healColor, false));
        
        // Holy Cross / Dark Soul Ring shockwave
        this.game.entityManager.addEntity(new Particle(
          this.game, target.x, target.y, healColor, 0.4, 0, 0, 32, 'shockwave'
        ));
        for (let i = 0; i < 8; i++) {
          this.game.entityManager.addEntity(new Particle(
            this.game, target.x, target.y, healColor, 0.5, 40, Math.random() * Math.PI * 2, 3, 'spark'
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
      // Inquisitor (Player): Purifying Holy Fire Spear / Banshee (Enemy): Phantom Screamer Beam
      const projColor = this.team === 'player' ? '#ff4500' : '#8b00ff';
      this.game.entityManager.addEntity(new Projectile(
        this.game, 
        this.x + (this.dir * 24 * this.scale), 
        this.y - 8 * this.scale, 
        target, 
        currentDamage * 1.2, 
        projColor, 
        this.team,
        false
      ));
      
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x + (this.dir * 24 * this.scale), this.y - 8 * this.scale, projColor, 0.3, 0, 0, 18, 'spark'
      ));

    } else if (this.type === 'ranged') {
      // Exorcist (Player): Holy Water Flask / Succubus (Enemy): Hellfire Energy Orb
      const projColor = this.team === 'player' ? '#f1c40f' : '#9b59b6';
      this.game.entityManager.addEntity(new Projectile(
        this.game, 
        this.x + (this.dir * 22 * this.scale), 
        this.y - 6 * this.scale, 
        target, 
        currentDamage, 
        projColor, 
        this.team,
        false
      ));
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x + (this.dir * 26 * this.scale), this.y - 6 * this.scale, projColor, 0.2, 0, 0, 12, 'spark'
      ));
    } else if (this.type === 'tank') {
      // Archangel (Player): Divine Judgement Holy Cleave / Balrog (Enemy): Magma Smash
      const projColor = this.team === 'player' ? '#f1c40f' : '#ff2d55';
      this.game.entityManager.addEntity(new Projectile(
        this.game, 
        this.x + (this.dir * 25 * this.scale), 
        this.y - 12 * this.scale, 
        target, 
        currentDamage, 
        projColor, 
        this.team,
        true
      ));
    } else {
      // Monk (Player): Holy Fist / Imp (Enemy): Hellfire Claw
      const isCrit = Math.random() < 0.18;
      const finalDmg = isCrit ? currentDamage * 1.5 : currentDamage;
      target.takeDamage(finalDmg, isCrit);
      
      const hitColor = this.team === 'player' ? '#f1c40f' : '#c0392b';
      for (let i = 0; i < 5; i++) {
        this.game.entityManager.addEntity(new Particle(
          this.game, target.x, target.y, hitColor, 0.25, 60, Math.random() * Math.PI * 2, 3, 'spark'
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

  // Visual Sprite Drawing Overhaul: Exorcism Clergy vs Demon Legion
  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    
    // Ground Shadow
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + (16 * this.scale), 18 * this.scale, 7 * this.scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    
    const recoilX = this.recoil * 6 * this.dir;
    ctx.translate(this.x - recoilX, this.y);
    
    const bobY = this.state === 'moving' ? Math.sin(this.animTime) * 2.5 : 0;
    ctx.translate(0, bobY);
    
    // Boss Demon Aura
    if (this.isBoss) {
      ctx.beginPath();
      ctx.arc(0, 0, 32 + Math.sin(Date.now() * 0.008) * 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(139, 0, 255, 0.2)';
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
    
    if (this.team === 'player') {
      // =====================================
      // ⛪ CLERGY (PLAYER) OCCULT SPRITES
      // =====================================
      if (this.type === 'melee') {
        // 🙏 수도승 (Monk): Hooded robe, rosary cross staff, holy aura
        ctx.fillStyle = '#6e4726'; // Brown robe legs
        ctx.fillRect(-8, 6, 6, 10);
        ctx.fillRect(2, 6, 6, 10);
        
        // Brown Robe Body
        ctx.fillStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.moveTo(-11, -12);
        ctx.lineTo(11, -12);
        ctx.lineTo(8, 8);
        ctx.lineTo(-8, 8);
        ctx.closePath();
        ctx.fill();
        
        // Golden Belt
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-8, -2, 16, 4);
        
        // Hood & Head
        ctx.fillStyle = '#6e4726';
        ctx.beginPath();
        ctx.arc(0, -18, 9, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing Holy Face Under Hood
        ctx.fillStyle = '#f1c40f';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f1c40f';
        ctx.beginPath();
        ctx.arc(2, -18, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Holy Rosary Cross Staff in Hand
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(8, -26, 3, 32);
        ctx.fillRect(4, -22, 11, 3); // Crossbar
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#f1c40f';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(5, -21, 9, 1);
        ctx.shadowBlur = 0;

      } else if (this.type === 'ranged') {
        // ✝️ 엑소시스트 (Exorcist): Black coat, clerical collar, wide brim hat, silver cross pistol
        ctx.fillStyle = '#111'; // Black pants
        ctx.fillRect(-8, 6, 5, 11);
        ctx.fillRect(2, 6, 5, 11);
        
        // Black Priest Coat
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(-10, -12, 20, 18);
        
        // White Clerical Collar
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -13, 6, 3);
        
        // Head & Priest Hat
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(0, -20, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(-12, -23, 24, 3); // Hat brim
        ctx.fillRect(-6, -29, 12, 6);  // Hat crown
        
        // Silver Holy Pistol / Flask
        ctx.fillStyle = '#dfe6e9';
        ctx.fillRect(4, -8, 16, 5);
        ctx.fillStyle = '#f1c40f';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#f1c40f';
        ctx.fillRect(10, -10, 4, 3); // Holy flask glowing top
        ctx.shadowBlur = 0;

      } else if (this.type === 'medic') {
        // ⛪ 사제 (Priest): White & Gold cassock, glowing golden halo above head, holy book
        ctx.fillStyle = '#dcdde1'; // White robe legs
        ctx.fillRect(-8, 6, 6, 10);
        ctx.fillRect(2, 6, 6, 10);
        
        // White & Gold Ceremonial Robe
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-12, -14, 24, 20);
        ctx.fillStyle = '#f1c40f'; // Golden stole
        ctx.fillRect(-4, -14, 8, 20);
        
        // Head
        ctx.fillStyle = '#f5f6fa';
        ctx.beginPath();
        ctx.arc(0, -20, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing Golden Halo above head
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#f1c40f';
        ctx.beginPath();
        ctx.ellipse(0, -32, 10, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Holy Bible in Hand
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(6, -6, 10, 12);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(10, -4, 2, 8); // Golden cross on book

      } else if (this.type === 'sniper') {
        // 🔥 이단심판관 (Inquisitor): Crimson coat, executioner mask, flaming holy musket
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-8, 6, 5, 11);
        ctx.fillRect(2, 6, 5, 11);
        
        // Crimson Coat
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-10, -14, 20, 20);
        ctx.fillStyle = '#900c3f';
        ctx.fillRect(-6, -14, 12, 20);
        
        // Masked Head
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(0, -21, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing Red Visor
        ctx.fillStyle = '#e74c3c';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#e74c3c';
        ctx.fillRect(-2, -22, 8, 3);
        ctx.shadowBlur = 0;
        
        // Long Holy Musket with Flaming Tip
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(2, -9, 32, 4);
        ctx.fillStyle = '#ff4500';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#ff4500';
        ctx.beginPath();
        ctx.arc(34, -7, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

      } else if (this.type === 'tank') {
        // 👼 대천사 (Archangel): Giant golden holy wings, golden armor, flaming holy sword
        // Holy Wings Behind
        const wingFlicker = Math.sin(Date.now() * 0.006) * 3;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#f1c40f';
        // Left Wing
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(-32 - wingFlicker, -32);
        ctx.lineTo(-24, 4);
        ctx.closePath();
        ctx.fill();
        // Right Wing
        ctx.beginPath();
        ctx.moveTo(10, -10);
        ctx.lineTo(32 + wingFlicker, -32);
        ctx.lineTo(24, 4);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Golden Armor Body
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(-14, -14, 28, 22);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-10, -12, 20, 18);
        
        // Head & Golden Crown Helmet
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, -22, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.fillRect(-4, -24, 8, 4); // Glowing eyes
        ctx.shadowBlur = 0;
        
        // Flaming Greatsword
        ctx.fillStyle = '#ffaa00';
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(10, 6);
        ctx.lineTo(28, -26);
        ctx.lineTo(34, -20);
        ctx.lineTo(16, 12);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else {
      // =====================================
      // ☠️ DEMONS (ENEMY) OCCULT SPRITES
      // =====================================
      if (this.type === 'melee') {
        // 👿 임프 (Imp): Small red horned demon, bat wings, pitchfork
        ctx.fillStyle = '#4a0080';
        ctx.fillRect(-7, 6, 5, 9);
        ctx.fillRect(2, 6, 5, 9);
        
        // Red Demon Body
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(0, -6, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Curved Horns
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.moveTo(-6, -14);
        ctx.lineTo(-10, -22);
        ctx.lineTo(-3, -16);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(6, -14);
        ctx.lineTo(10, -22);
        ctx.lineTo(3, -16);
        ctx.closePath();
        ctx.fill();
        
        // Pitchfork
        ctx.fillStyle = '#8b0000';
        ctx.fillRect(6, -20, 2, 28);
        ctx.fillRect(3, -20, 8, 2);
        ctx.fillRect(3, -24, 2, 5);
        ctx.fillRect(9, -24, 2, 5);

      } else if (this.type === 'ranged') {
        // 💃 서큐버스 (Succubus): Purple demonic dress, wings, horns, shadow orb
        // Bat Wings
        ctx.fillStyle = '#4a0080';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(-24, -20);
        ctx.lineTo(-16, 2);
        ctx.closePath();
        ctx.fill();
        
        // Dark Purple Body
        ctx.fillStyle = '#8b00ff';
        ctx.fillRect(-9, -12, 18, 20);
        
        // Head & Horns
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.arc(0, -18, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing Crimson Eyes
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0055';
        ctx.fillRect(0, -19, 5, 2);
        ctx.shadowBlur = 0;

      } else if (this.type === 'medic') {
        // 💀 리치 (Lich): Skeletal floating sorcerer, skull staff
        // Floating Dark Robe
        ctx.fillStyle = '#2c003e';
        ctx.beginPath();
        ctx.moveTo(-11, -12);
        ctx.lineTo(11, -12);
        ctx.lineTo(14, 14);
        ctx.lineTo(-14, 14);
        ctx.closePath();
        ctx.fill();
        
        // Skeletal Skull Head
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.arc(0, -20, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Green Eye Sockets
        ctx.fillStyle = '#00ff88';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ff88';
        ctx.fillRect(-3, -21, 3, 3);
        ctx.fillRect(2, -21, 3, 3);
        ctx.shadowBlur = 0;
        
        // Skull Staff
        ctx.fillStyle = '#4a0080';
        ctx.fillRect(8, -24, 3, 30);
        ctx.fillStyle = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff88';
        ctx.beginPath();
        ctx.arc(9, -26, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

      } else if (this.type === 'sniper') {
        // 👻 밴시 (Banshee): Floating ghost shadow veil, red glowing eyes
        const ghostFloat = Math.sin(Date.now() * 0.008) * 3;
        ctx.fillStyle = 'rgba(139, 0, 255, 0.6)';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#8b00ff';
        ctx.beginPath();
        ctx.moveTo(0, -24 + ghostFloat);
        ctx.lineTo(-16, 12 + ghostFloat);
        ctx.lineTo(0, 4 + ghostFloat);
        ctx.lineTo(16, 12 + ghostFloat);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Glowing Red Eyes
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff0055';
        ctx.fillRect(-4, -20 + ghostFloat, 3, 3);
        ctx.fillRect(2, -20 + ghostFloat, 3, 3);
        ctx.shadowBlur = 0;

      } else if (this.type === 'tank') {
        // 🔥 발록 (Balrog): Magma demon lord, huge horns, flaming whip
        ctx.fillStyle = '#4a0000';
        ctx.fillRect(-16, 6, 10, 14);
        ctx.fillRect(4, 6, 10, 14);
        
        // Magma Body
        ctx.fillStyle = '#800000';
        ctx.fillRect(-18, -16, 36, 24);
        ctx.fillStyle = '#ff4500'; // Magma cracks
        ctx.fillRect(-10, -12, 6, 16);
        ctx.fillRect(4, -8, 6, 12);
        
        // Giant Horns
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.moveTo(-10, -20);
        ctx.lineTo(-20, -34);
        ctx.lineTo(-4, -24);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(10, -20);
        ctx.lineTo(20, -34);
        ctx.lineTo(4, -24);
        ctx.closePath();
        ctx.fill();
        
        // Flaming Whip
        ctx.fillStyle = '#ff2d55';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#ff2d55';
        ctx.beginPath();
        ctx.moveTo(12, -4);
        ctx.lineTo(34, -18);
        ctx.lineTo(28, 8);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    
    ctx.restore();
    
    // HP Bar Overlay
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
    
    ctx.fillStyle = this.team === 'player' ? '#f1c40f' : '#8b00ff';
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
