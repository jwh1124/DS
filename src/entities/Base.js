import { FloatingText } from './FloatingText.js';
import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';

export class Base {
  constructor(game, x, y, team, maxHp = 10000) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.team = team;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.radius = 70; 
    this.isAlive = true;
    
    this.techLevel = 1;
    this.turretCooldown = 0;
    this.turretAttackSpeed = 1.0;
    this.turretDamage = 60;
    this.turretRange = 1000;
    
    this.shieldHitTimer = 0;
    this.turretAngle = team === 'player' ? 0 : Math.PI;
    
    this.emergencyPhase1 = false; // 60% HP
    this.emergencyPhase2 = false; // 30% HP
    this.animTime = Math.random() * 10;
  }
  
  upgradeTech() {
    this.techLevel++;
    this.maxHp += 5000;
    this.hp += 5000;
    this.turretAttackSpeed *= 0.7;
    this.turretDamage += 100;
    
    if (this.game.audio) {
      this.game.audio.playMagic();
    }
    
    const upgradeText = this.team === 'player' ? `★ 성당 증축 Lv.${this.techLevel} 진화! ★` : `★ 지옥 강림 Lv.${this.techLevel} 진화! ★`;
    const upgradeColor = this.team === 'player' ? '#f1c40f' : '#ff0055';
    
    this.game.entityManager.addEntity(new FloatingText(this.game, upgradeText, this.x, this.y - 140, upgradeColor, true));
    
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y, upgradeColor, 0.6, 0, Math.random() * Math.PI, 65, 'cross_flash'
    ));
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, upgradeColor, 0.8, speed, angle, 4, 'spark'
      ));
    }
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    
    this.hp -= amount;
    this.shieldHitTimer = 0.4;
    
    if (this.game.addScreenShake) {
      this.game.addScreenShake(3);
    }
    
    const hpRatio = this.hp / this.maxHp;
    
    if (!this.emergencyPhase1 && hpRatio <= 0.6) {
      this.emergencyPhase1 = true;
      if (this.team === 'player' && this.game.economy) {
        this.game.economy.minerals += 300;
        this.game.entityManager.addEntity(new FloatingText(this.game, `🆘 구원 비상 지원 +300 ✝️!`, this.x, this.y - 100, '#f1c40f', true));
      } else if (this.team === 'enemy' && this.game.waveSystem) {
        this.game.waveSystem.aiMinerals += 300;
      }
      if (this.game.audio) this.game.audio.playMagic();
    }
    
    if (!this.emergencyPhase2 && hpRatio <= 0.3) {
      this.emergencyPhase2 = true;
      if (this.team === 'player' && this.game.economy) {
        this.game.economy.minerals += 500;
        this.game.entityManager.addEntity(new FloatingText(this.game, `🚨 역전 성스러운 은총 +500 ✝️!`, this.x, this.y - 120, '#ff0055', true));
      } else if (this.team === 'enemy' && this.game.waveSystem) {
        this.game.waveSystem.aiMinerals += 500;
      }
      if (this.game.audio) this.game.audio.playBossAlarm();
    }
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      
      if (this.game.addScreenShake) {
        this.game.addScreenShake(20);
      }
      const expColor = this.team === 'player' ? '#f1c40f' : '#ff0055';
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 250 + 50;
        this.game.entityManager.addEntity(new Particle(
          this.game, this.x, this.y, expColor, 1.2, speed, angle, 5, 'spark'
        ));
      }
      
      const winner = this.team === 'player' ? 'enemy' : 'player';
      this.game.stop(winner);
    }
  }

  update(dt) {
    if (!this.isAlive) return;
    this.animTime += dt * 4;
    
    if (this.shieldHitTimer > 0) {
      this.shieldHitTimer -= dt;
    }
    
    if (this.techLevel > 1 || this.emergencyPhase2) {
      if (this.turretCooldown > 0) this.turretCooldown -= dt;
      
      const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
      const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
      
      let closestEnemy = null;
      let closestDist = this.turretRange;
      
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist <= closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }
      
      if (closestEnemy) {
        this.turretAngle = Math.atan2(closestEnemy.y - (this.y - 70), closestEnemy.x - this.x);
        
        if (this.turretCooldown <= 0) {
          const turretColor = this.team === 'player' ? '#f1c40f' : '#ff0055';
          this.game.entityManager.addEntity(new Projectile(
            this.game, 
            this.x + Math.cos(this.turretAngle) * 40, 
            (this.y - 70) + Math.sin(this.turretAngle) * 40, 
            closestEnemy, 
            this.turretDamage, 
            turretColor, 
            this.team,
            true
          ));
          this.turretCooldown = this.turretAttackSpeed;
        }
      }
    }
  }

  // Draw Routine with Tech Level Evolution (Cathedral Shrine vs Demonic Gate)
  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    
    // 1. Drop Shadow
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 60, 100, 25, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    
    // 2. Shield / Barrier Aura Dome
    const shieldColor = this.team === 'player' ? '#f1c40f' : '#ff0055';
    const shieldAlpha = this.shieldHitTimer > 0 ? 0.6 : 0.15 + Math.sin(Date.now() * 0.004) * 0.06;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y - 20, 100, Math.PI, 0, false);
    ctx.fillStyle = this.team === 'player' ? `rgba(241, 196, 15, ${shieldAlpha})` : `rgba(255, 0, 85, ${shieldAlpha})`;
    ctx.fill();
    ctx.strokeStyle = shieldColor;
    ctx.lineWidth = this.shieldHitTimer > 0 ? 4 : 2;
    ctx.shadowBlur = this.shieldHitTimer > 0 ? 25 : 12;
    ctx.shadowColor = shieldColor;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Render Base Structure Evolving by Tech Level (Lv 1 ~ 5)
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const lvl = Math.min(5, this.techLevel);
    
    if (this.team === 'player') {
      // =====================================
      // ⛪ PLAYER BASE: GOTHIC CATHEDRAL SHRINE (Lv 1 ~ 5 EVOLUTION)
      // =====================================
      // Base Stone Foundation
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-75, -20, 150, 75);
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(-65, 10, 130, 45);
      
      // Cathedral Pillars
      ctx.fillStyle = '#34495e';
      ctx.fillRect(-70, -60, 24, 90);
      ctx.fillRect(46, -60, 24, 90);
      ctx.fillRect(-40, -95, 80, 125);
      
      // Stained Glass Windows (Glows brighter with Tech Level)
      ctx.fillStyle = '#f1c40f';
      ctx.shadowBlur = 10 + lvl * 5;
      ctx.shadowColor = '#f1c40f';
      ctx.beginPath();
      ctx.arc(0, -55, 16 + lvl * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(-10, -42, 20, 30);
      
      // Tech Lv 2+: Golden Bell Towers
      if (lvl >= 2) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-68, -90, 20, 30);
        ctx.fillRect(48, -90, 20, 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-62, -85, 8, 12);
        ctx.fillRect(54, -85, 8, 12);
      }
      
      // Tech Lv 3+: Sacred Gold Cross Spires & Braziers
      if (lvl >= 3) {
        ctx.fillStyle = '#f1c40f';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#f1c40f';
        ctx.fillRect(-5, -145, 10, 50);
        ctx.fillRect(-20, -125, 40, 10);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(-4, -125, 8, 30);
        ctx.fillRect(-12, -115, 24, 6);
      }
      
      // Tech Lv 4+: Angel Wings Aura behind Cathedral Roof
      if (lvl >= 4) {
        const wingFlap = Math.sin(Date.now() * 0.006) * 4;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#f1c40f';
        ctx.beginPath();
        ctx.moveTo(-20, -60);
        ctx.lineTo(-90 - wingFlap, -110 - wingFlap);
        ctx.lineTo(-60, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(20, -60);
        ctx.lineTo(90 + wingFlap, -110 - wingFlap);
        ctx.lineTo(60, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      // Tech Lv 5 (MAX): Heavenly Halo Crest Above Spire
      if (lvl >= 5) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, -150, 25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

    } else {
      // =====================================
      // ☠️ ENEMY BASE: DEMONIC HELLFIRE GATE (Lv 1 ~ 5 EVOLUTION)
      // =====================================
      // Obsidian Base Foundation
      ctx.fillStyle = '#1a0518';
      ctx.fillRect(-75, -20, 150, 75);
      ctx.fillStyle = '#2d002b';
      ctx.fillRect(-65, 10, 130, 45);
      
      // Horn Spires
      ctx.fillStyle = '#4a0040';
      ctx.beginPath();
      ctx.moveTo(-70, 35);
      ctx.lineTo(-85, -95);
      ctx.lineTo(-45, -20);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(70, 35);
      ctx.lineTo(85, -95);
      ctx.lineTo(45, -20);
      ctx.closePath();
      ctx.fill();
      
      // Swirling Hellfire Portal Core
      const portalPulse = Math.sin(Date.now() * 0.008) * (4 + lvl);
      ctx.fillStyle = '#ff0055';
      ctx.shadowBlur = 20 + lvl * 5;
      ctx.shadowColor = '#ff0055';
      ctx.beginPath();
      ctx.arc(0, -35, 24 + portalPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#8b00ff';
      ctx.beginPath();
      ctx.arc(0, -35, 14 + portalPulse * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Tech Lv 2+: Magma Lava Channels
      if (lvl >= 2) {
        ctx.fillStyle = '#ff4500';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff4500';
        ctx.fillRect(-50, -10, 12, 55);
        ctx.fillRect(38, -10, 12, 55);
        ctx.shadowBlur = 0;
      }
      
      // Tech Lv 3+: Glowing Demon Eye Spires
      if (lvl >= 3) {
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0055';
        ctx.beginPath();
        ctx.arc(-72, -70, 8, 0, Math.PI * 2);
        ctx.arc(72, -70, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      // Tech Lv 4+: Dragon Skull Gate Crown
      if (lvl >= 4) {
        ctx.fillStyle = '#2d002b';
        ctx.beginPath();
        ctx.arc(0, -90, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff0055';
        ctx.fillRect(-8, -94, 5, 5);
        ctx.fillRect(3, -94, 5, 5);
        ctx.shadowBlur = 0;
      }
      
      // Tech Lv 5 (MAX): Giant Balrog Magma Head Core
      if (lvl >= 5) {
        ctx.fillStyle = '#ff2d55';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ff0055';
        ctx.beginPath();
        ctx.arc(0, -135, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    
    ctx.restore();
    
    // 4. Rotating Defense Turret (Holy Cannon vs Demonic Horn Turret)
    if (this.techLevel > 1 || this.emergencyPhase2) {
      ctx.save();
      ctx.translate(this.x, this.y - 70);
      ctx.rotate(this.turretAngle);
      
      ctx.fillStyle = this.team === 'player' ? '#2c3e50' : '#1a0518';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shieldColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      ctx.fillStyle = this.team === 'player' ? '#d4a017' : '#ff0055';
      ctx.fillRect(0, -5, 26, 10);
      
      ctx.fillStyle = shieldColor;
      ctx.shadowBlur = 14;
      ctx.shadowColor = shieldColor;
      ctx.fillRect(20, -4, 8, 8);
      ctx.shadowBlur = 0;
      
      ctx.restore();
    }
    
    ctx.restore();
  }
}
