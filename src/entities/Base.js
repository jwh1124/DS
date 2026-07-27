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
    this.radius = 65; 
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
    
    const upgradeText = this.team === 'player' ? `★ 성서 계시 Lv.${this.techLevel} 달성! ★` : `★ 지옥 각성 Lv.${this.techLevel} 완료! ★`;
    const upgradeColor = this.team === 'player' ? '#f1c40f' : '#8b00ff';
    
    this.game.entityManager.addEntity(new FloatingText(this.game, upgradeText, this.x, this.y - 120, upgradeColor, true));
    
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y, upgradeColor, 0.6, 0, 0, 80, 'shockwave'
    ));
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 140 + 40;
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
        this.game.entityManager.addEntity(new FloatingText(this.game, `🆘 구원 비상 신앙심 +300 ✝️!`, this.x, this.y - 100, '#f1c40f', true));
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
      const expColor = this.team === 'player' ? '#f1c40f' : '#8b00ff';
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
          const turretColor = this.team === 'player' ? '#f1c40f' : '#8b00ff';
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

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    
    // 1. Base Drop Shadow
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 55, 90, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
    
    // 2. Holy Shield / Demonic Barrier Dome
    const shieldColor = this.team === 'player' ? '#f1c40f' : '#8b00ff';
    const shieldAlpha = this.shieldHitTimer > 0 ? 0.55 : 0.15 + Math.sin(Date.now() * 0.004) * 0.06;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y - 15, 90, Math.PI, 0, false);
    ctx.fillStyle = this.team === 'player' ? `rgba(241, 196, 15, ${shieldAlpha})` : `rgba(139, 0, 255, ${shieldAlpha})`;
    ctx.fill();
    ctx.strokeStyle = shieldColor;
    ctx.lineWidth = this.shieldHitTimer > 0 ? 4 : 2;
    ctx.shadowBlur = this.shieldHitTimer > 0 ? 25 : 12;
    ctx.shadowColor = shieldColor;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Custom Canvas Sprite Drawing (Cathedral Shrine vs Demonic Gate)
    ctx.save();
    ctx.translate(this.x, this.y);
    
    if (this.team === 'player') {
      // =====================================
      // ⛪ PLAYER BASE: GOTHIC CATHEDRAL SHRINE
      // =====================================
      // Dark Stone Cathedral Foundation Base
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-70, -20, 140, 75);
      ctx.fillStyle = '#1e272e';
      ctx.fillRect(-60, 10, 120, 45);
      
      // Gothic Stone Arches & Pillars
      ctx.fillStyle = '#34495e';
      ctx.fillRect(-65, -60, 22, 90);
      ctx.fillRect(43, -60, 22, 90);
      ctx.fillRect(-35, -90, 70, 120);
      
      // Stained Glass Windows Glow
      ctx.fillStyle = '#f1c40f';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#f1c40f';
      ctx.beginPath();
      ctx.arc(0, -50, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(-8, -40, 16, 25);
      
      // Top Glowing Holy Cross Spire
      ctx.fillStyle = '#f1c40f';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f1c40f';
      ctx.fillRect(-4, -130, 8, 45);
      ctx.fillRect(-16, -115, 32, 8);
      ctx.shadowBlur = 0;

    } else {
      // =====================================
      // ☠️ ENEMY BASE: DEMONIC HELLFIRE GATE
      // =====================================
      // Obsidian Jagged Foundation
      ctx.fillStyle = '#1a0518';
      ctx.fillRect(-70, -20, 140, 75);
      ctx.fillStyle = '#2d002b';
      ctx.fillRect(-60, 10, 120, 45);
      
      // Jagged Demon Horn Spires
      ctx.fillStyle = '#4a0040';
      // Left Spire
      ctx.beginPath();
      ctx.moveTo(-65, 35);
      ctx.lineTo(-75, -90);
      ctx.lineTo(-45, -20);
      ctx.closePath();
      ctx.fill();
      // Right Spire
      ctx.beginPath();
      ctx.moveTo(65, 35);
      ctx.lineTo(75, -90);
      ctx.lineTo(45, -20);
      ctx.closePath();
      ctx.fill();
      
      // Swirling Crimson Hellfire Portal Core
      const portalPulse = Math.sin(Date.now() * 0.008) * 4;
      ctx.fillStyle = '#ff0055';
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#ff0055';
      ctx.beginPath();
      ctx.arc(0, -35, 24 + portalPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#8b00ff';
      ctx.beginPath();
      ctx.arc(0, -35, 14 + portalPulse * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Demonic Skull Arch Top
      ctx.fillStyle = '#2d002b';
      ctx.beginPath();
      ctx.arc(0, -85, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff0055';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff0055';
      ctx.fillRect(-6, -88, 4, 4);
      ctx.fillRect(2, -88, 4, 4);
      ctx.shadowBlur = 0;
    }
    
    ctx.restore();
    
    // 4. Rotating Defense Turret (Holy Cannon vs Demonic Horn Turret)
    if (this.techLevel > 1 || this.emergencyPhase2) {
      ctx.save();
      ctx.translate(this.x, this.y - 70);
      ctx.rotate(this.turretAngle);
      
      // Turret base
      ctx.fillStyle = this.team === 'player' ? '#2c3e50' : '#1a0518';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shieldColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      // Turret Barrel
      ctx.fillStyle = this.team === 'player' ? '#d4a017' : '#8b00ff';
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
