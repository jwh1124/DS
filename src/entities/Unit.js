import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';
import { FloatingText } from './FloatingText.js';

const UNIT_STATS = {
  melee: { hp: 120, damage: 25, range: 45, speed: 85, attackSpeed: 1.0, color: '#f1c40f' },     // Monk / Imp
  ranged: { hp: 60, damage: 35, range: 250, speed: 70, attackSpeed: 1.2, color: '#dfe6e9' },     // Exorcist / Succubus
  medic: { hp: 100, damage: 0, range: 180, speed: 65, attackSpeed: 1.5, color: '#f1c40f' },      // Priest / Lich
  sniper: { hp: 80, damage: 75, range: 450, speed: 55, attackSpeed: 2.0, color: '#e74c3c' },     // Inquisitor / Banshee
  tank: { hp: 300, damage: 60, range: 360, speed: 40, attackSpeed: 1.5, color: '#f1c40f' },      // Archangel / Balrog
  crusader: { hp: 450, damage: 45, range: 55, speed: 60, attackSpeed: 1.2, color: '#f1c40f' }   // Crusader / Pit Lord
};

// Corner-Sampling & Color-Distance Flood Fill Background Removal (100% 완벽 누끼 따기)
const processedCanvasMap = new Map();

function removeBackground(img) {
  if (processedCanvasMap.has(img.src)) {
    return processedCanvasMap.get(img.src);
  }
  
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width || 64;
  const h = img.naturalHeight || img.height || 64;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    
    // Sample the 4 corners to detect the image background color palette
    const corners = [
      [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]
    ];
    let bgR = 0, bgG = 0, bgB = 0;
    corners.forEach(([cx, cy]) => {
      const idx = (cy * w + cx) * 4;
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
    });
    bgR = Math.round(bgR / 4);
    bgG = Math.round(bgG / 4);
    bgB = Math.round(bgB / 4);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate color distance to sampled background color
      const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
      const colorDiff = Math.max(r, g, b) - Math.min(r, g, b);

      // Cut out matching background color OR dark/black compression artifacts
      if (dist < 75 || (brightness < 60 && colorDiff < 40)) {
        if (dist < 50 || brightness < 35) {
          data[i + 3] = 0; // 100% Transparent
        } else {
          // Feathered transparent edge
          data[i + 3] = Math.floor(((dist - 50) / 25) * 255);
        }
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
    processedCanvasMap.set(img.src, canvas);
    return canvas;
  } catch (e) {
    return img;
  }
}

// Preload AI Sprite Images
const SPRITE_IMAGES = {
  player: {
    melee: new Image(),
    ranged: new Image(),
    medic: new Image(),
    sniper: new Image(),
    tank: new Image(),
    crusader: new Image()
  },
  enemy: {
    melee: new Image(),
    ranged: new Image()
  }
};

const baseUrl = import.meta.env.BASE_URL || './';
SPRITE_IMAGES.player.melee.src = baseUrl + 'sprites/monk.jpg';
SPRITE_IMAGES.player.ranged.src = baseUrl + 'sprites/exorcist.jpg';
SPRITE_IMAGES.player.medic.src = baseUrl + 'sprites/priest.jpg';
SPRITE_IMAGES.player.sniper.src = baseUrl + 'sprites/inquisitor.jpg';
SPRITE_IMAGES.player.tank.src = baseUrl + 'sprites/archangel.jpg';
SPRITE_IMAGES.player.crusader.src = baseUrl + 'sprites/crusader.jpg';
SPRITE_IMAGES.enemy.melee.src = baseUrl + 'sprites/imp.jpg';
SPRITE_IMAGES.enemy.ranged.src = baseUrl + 'sprites/succubus.jpg';

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
    
    this.radius = (type === 'tank' || type === 'crusader') ? 30 : 20;
    this.isAlive = true;
    
    // Strict Air vs Ground Classification:
    // Air Units (공중): Archangel (tank), Priest (medic), Succubus (enemy ranged), Banshee (enemy sniper), Balrog (enemy tank)
    // Ground Units (지상): Monk (melee), Exorcist (ranged), Inquisitor (sniper), Crusader (crusader), Imp (enemy melee), Lich (enemy medic), Pit Lord (enemy crusader)
    if (team === 'player') {
      this.isAirUnit = (type === 'tank' || type === 'medic');
    } else {
      this.isAirUnit = (type === 'ranged' || type === 'sniper' || type === 'tank');
    }
    
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
    
    const base = this.team === 'player' ? this.game.playerBase : this.game.enemyBase;
    if (base && base.techLevel > 1) {
      const techLevel = Math.min(5, base.techLevel);
      this.maxHp *= techLevel;
      this.hp = this.maxHp;
      if (this.damage > 0) this.damage *= techLevel;
      this.tier = Math.min(3, Math.ceil(techLevel / 2));
      this.scale = 1 + (this.tier - 1) * 0.35;
    }
    
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

      const bountyMap = { melee: 5, ranged: 10, medic: 12, sniper: 15, tank: 20, crusader: 25 };
      const bounty = this.isBoss ? 100 : (bountyMap[this.type] || 10);
      if (this.team === 'enemy' && this.game.economy) {
        this.game.economy.minerals += bounty;
        this.game.entityManager.addEntity(new FloatingText(this.game, `+${bounty} ✝️`, this.x, this.y - 55 * this.scale, '#f1c40f', true));
      } else if (this.team === 'player' && this.game.waveSystem) {
        this.game.waveSystem.aiMinerals += bounty;
      }

      this.explode();
    } else {
      // Hit flash spark impact
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y - 10, sparkColor, 0.16, 0, Math.random() * Math.PI, 13 * this.scale, 'cross_flash'
      ));
    }
  }

  explode() {
    if (this.game.audio) {
      this.game.audio.playExplosion();
    }
    
    if ((this.isBoss || this.type === 'tank' || this.type === 'crusader') && this.game.addScreenShake) {
      this.game.addScreenShake(this.isBoss ? 14 : 6);
    }
    
    const expColor = this.team === 'player' ? '#f1c40f' : '#8b00ff';
    
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y, expColor, 0.45, 0, Math.random() * Math.PI, 35 * this.scale, 'cross_flash'
    ));
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y, expColor, 0.4, 0, Math.random() * Math.PI, 28 * this.scale, 'slash_arc'
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
    
    // Animation Speed
    this.animTime += dt * (this.isAirUnit ? 4 : 9);
    
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - dt * 10);
    }
    
    if (this.type === 'crusader') {
      const friends = this.game.entityManager.getEntitiesByTeam(this.team);
      friends.forEach(f => {
        if (f !== this && f.isAlive && f.radius) {
          const fdx = f.x - this.x;
          const fdy = f.y - this.y;
          if (fdx*fdx + fdy*fdy < 140*140) {
            f.hasAura = true;
          }
        }
      });
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
    
    // Air vs Ground Particles
    if (this.isAirUnit && Math.random() > 0.4) {
      const pColor = this.team === 'player' ? '#f1c40f' : '#8b00ff';
      const floatOffsetY = Math.sin(this.animTime) * 6 - 32;
      this.game.entityManager.addEntity(new Particle(
        this.game, 
        this.x - this.dir * 12, 
        this.y + floatOffsetY + (Math.random() - 0.5) * 8, 
        pColor, 
        0.4, 
        25, 
        Math.PI / 2 + (Math.random() - 0.5) * 0.5, 
        Math.random() * 3 + 1.5,
        'spark'
      ));
    } else if (!this.isAirUnit && this.state === 'moving' && Math.random() > 0.3) {
      // Footstep Ground Dust Particles for Walking Ground Units!
      const pColor = '#5c4033';
      this.game.entityManager.addEntity(new Particle(
        this.game, 
        this.x - this.dir * 8, 
        this.y + 12 * this.scale, 
        pColor, 
        0.3, 
        15, 
        Math.PI + (Math.random() - 0.5) * 0.8, 
        Math.random() * 3 + 2,
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
        
        const healColor = this.team === 'player' ? '#f1c40f' : '#a29bfe';
        const healText = this.team === 'player' ? `+${healAmt} HP (은총)` : `+${healAmt} HP (마기)`;
        
        this.game.entityManager.addEntity(new FloatingText(this.game, healText, target.x, target.y - 40, healColor, false));
        
        this.game.entityManager.addEntity(new Particle(
          this.game, target.x, target.y, healColor, 0.4, 0, 0, 24, 'cross_flash'
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
    
    if (target.maxHp && target.techLevel !== undefined) {
      currentDamage *= 2.0;
    }
    
    if (this.game.audio) {
      this.game.audio.playShoot();
    }
    
    if (this.type === 'sniper') {
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
    } else if (this.type === 'crusader') {
      const isCrit = Math.random() < 0.25;
      const finalDmg = isCrit ? currentDamage * 1.6 : currentDamage;
      target.takeDamage(finalDmg, isCrit);
      
      const shockColor = this.team === 'player' ? '#f1c40f' : '#ff0055';
      this.game.entityManager.addEntity(new Particle(
        this.game, target.x, target.y, shockColor, 0.22, 0, this.dir > 0 ? 0 : Math.PI, 24, 'slash_arc'
      ));
      this.game.entityManager.addEntity(new Particle(
        this.game, target.x, target.y, shockColor, 0.16, 0, 0, 14, 'cross_flash'
      ));
    } else {
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

  // Draw Routine with Ground Walking Cycle vs Air Flying Physics
  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    
    // Altitude calculation: Air Units fly high (-32px), Ground Units walk on terrain
    const airOffsetY = this.isAirUnit ? Math.sin(this.animTime) * 6 - 32 : 0;
    const shadowScale = this.isAirUnit ? 0.6 : 1.0;
    
    // Ground Shadow
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + (16 * this.scale), 18 * this.scale * shadowScale, 7 * this.scale * shadowScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.isAirUnit ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
    
    const recoilX = this.recoil * 6 * this.dir;
    ctx.translate(this.x - recoilX, this.y + airOffsetY);
    
    // Walking stride bob & tilt animation for Ground Units!
    let walkBobY = 0;
    let walkTilt = 0;
    if (!this.isAirUnit && this.state === 'moving') {
      walkBobY = Math.abs(Math.sin(this.animTime * 1.5)) * -4;
      walkTilt = Math.sin(this.animTime * 1.5) * 0.08;
    }
    ctx.translate(0, walkBobY);
    ctx.rotate(walkTilt);
    
    // Boss Aura
    if (this.isBoss) {
      ctx.beginPath();
      ctx.arc(0, 0, 34 + Math.sin(Date.now() * 0.008) * 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff0055';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    if (this.dir === -1) {
      ctx.scale(-1, 1);
    }
    
    ctx.scale(this.scale, this.scale);
    
    const imgGroup = SPRITE_IMAGES[this.team];
    const img = imgGroup ? imgGroup[this.type] : null;
    
    if (img && img.complete && img.naturalWidth > 0) {
      // Guaranteed 100% Transparent Background Removal (누끼 따기)
      const transparentCanvas = removeBackground(img);
      
      const drawW = 58;
      const drawH = 58;
      
      ctx.shadowBlur = 14;
      ctx.shadowColor = this.team === 'player' ? '#f1c40f' : '#8b00ff';
      ctx.drawImage(transparentCanvas, -drawW / 2, -drawH / 2 - 6, drawW, drawH);
      ctx.shadowBlur = 0;

    } else {
      // High-Quality Vector Art for Crusader & Pit Lord
      if (this.type === 'crusader') {
        if (this.team === 'player') {
          // ⚔️ 십자군 (Crusader): Heavy Gold Armor, Tower Shield with Red Cross, Flaming Mace
          const stepLeg = Math.sin(this.animTime * 1.5) * 5;
          ctx.fillStyle = '#1e272e';
          ctx.fillRect(-11 + stepLeg, 4, 7, 12);
          ctx.fillRect(4 - stepLeg, 4, 7, 12);
          
          ctx.fillStyle = '#b8860b';
          ctx.fillRect(-15, -16, 30, 24);
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(-11, -14, 22, 20);
          
          // Red Cross Chest
          ctx.fillStyle = '#c0392b';
          ctx.fillRect(-4, -14, 8, 20);
          ctx.fillRect(-10, -10, 20, 6);
          
          // Giant Shield
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(8, -18, 14, 30);
          ctx.fillStyle = '#c0392b';
          ctx.fillRect(13, -18, 4, 30);
          ctx.fillRect(8, -8, 14, 4);
          
          // Flaming Mace
          ctx.fillStyle = '#ffaa00';
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#ffaa00';
          ctx.beginPath();
          ctx.arc(-16, -10, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // 🐲 핏로드 (Pit Lord): Magma Armor, Double Blades
          const stepLeg = Math.sin(this.animTime * 1.5) * 5;
          ctx.fillStyle = '#4a0000';
          ctx.fillRect(-16 + stepLeg, 4, 8, 14);
          ctx.fillRect(8 - stepLeg, 4, 8, 14);
          ctx.fillStyle = '#800000';
          ctx.fillRect(-18, -16, 36, 24);
          ctx.fillStyle = '#ff0055';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ff0055';
          ctx.fillRect(-10, -12, 6, 16);
          ctx.fillRect(4, -12, 6, 16);
          ctx.shadowBlur = 0;
        }
      } else if (this.team === 'player') {
        if (this.type === 'melee') {
          ctx.fillStyle = '#8b5a2b';
          ctx.beginPath();
          ctx.arc(0, -10, 12, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.type === 'ranged') {
          ctx.fillStyle = '#1e272e';
          ctx.fillRect(-10, -14, 20, 20);
        } else if (this.type === 'medic') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-12, -14, 24, 20);
        } else if (this.type === 'sniper') {
          ctx.fillStyle = '#c0392b';
          ctx.fillRect(-10, -14, 20, 20);
        } else if (this.type === 'tank') {
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(-12, -12, 24, 20);
        }
      } else {
        if (this.type === 'melee') {
          ctx.fillStyle = '#c0392b';
          ctx.beginPath();
          ctx.arc(0, -6, 11, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.type === 'ranged') {
          ctx.fillStyle = '#8b00ff';
          ctx.fillRect(-10, -13, 20, 21);
        } else if (this.type === 'medic') {
          ctx.fillStyle = '#2c003e';
          ctx.fillRect(-12, -13, 24, 25);
        } else if (this.type === 'sniper') {
          ctx.fillStyle = 'rgba(139, 0, 255, 0.7)';
          ctx.beginPath();
          ctx.arc(0, -15, 12, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.type === 'tank') {
          ctx.fillStyle = '#800000';
          ctx.fillRect(-18, -16, 36, 24);
        }
      }
    }
    
    ctx.restore();
    
    const hpPercent = Math.max(0, this.hp / this.maxHp);
    // Healthy regular units do not need a permanent label. This keeps late waves readable.
    if (this.isBoss || hpPercent < 0.995) {
      ctx.save();
      const barW = Math.max(34, 34 * this.scale);
      const barH = this.isBoss ? 7 : 5;
      const barX = this.x - barW / 2;
      const barY = this.y - (this.radius * this.scale) - 18 + airOffsetY;

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
}
