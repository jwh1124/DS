import { FloatingText } from './FloatingText.js';
import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';

const BASE_ART = {
  player: `${import.meta.env.BASE_URL}bases/holy-cathedral-v2.png`,
  enemy: `${import.meta.env.BASE_URL}bases/infernal-gate-v2.png`,
};

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
    this.emergencyPhase1 = false;
    this.emergencyPhase2 = false;
    this.animTime = Math.random() * 10;
    this.artReady = false;

    if (typeof Image !== 'undefined') {
      this.art = new Image();
      this.art.onload = () => { this.artReady = true; };
      this.art.onerror = () => { this.artReady = false; };
      this.art.src = BASE_ART[team];
    }
  }

  upgradeTech() {
    this.techLevel++;
    this.maxHp += 5000;
    this.hp += 5000;
    this.turretAttackSpeed *= 0.7;
    this.turretDamage += 100;

    if (this.game.audio) this.game.audio.playMagic();

    const upgradeText = this.team === 'player'
      ? `Holy citadel upgraded to Lv.${this.techLevel}!`
      : `Infernal gate upgraded to Lv.${this.techLevel}!`;
    const upgradeColor = this.team === 'player' ? '#f1c40f' : '#ff0055';
    this.game.entityManager.addEntity(new FloatingText(this.game, upgradeText, this.x, this.y - 140, upgradeColor, true));
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y - 70, upgradeColor, 0.3, 0, Math.random() * Math.PI, 42, 'cross_flash'
    ));
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y - 45, upgradeColor, 0.65, speed, angle, 3.5, 'spark'
      ));
    }
  }

  takeDamage(amount) {
    if (!this.isAlive) return;

    this.hp -= amount;
    this.shieldHitTimer = 0.4;
    if (this.game.addScreenShake) this.game.addScreenShake(3);

    const hpRatio = this.hp / this.maxHp;
    if (!this.emergencyPhase1 && hpRatio <= 0.6) {
      this.emergencyPhase1 = true;
      if (this.team === 'player' && this.game.economy) {
        this.game.economy.minerals += 300;
        this.game.entityManager.addEntity(new FloatingText(this.game, 'Emergency supply +300', this.x, this.y - 100, '#f1c40f', true));
      } else if (this.team === 'enemy' && this.game.waveSystem) {
        this.game.waveSystem.aiMinerals += 300;
      }
      if (this.game.audio) this.game.audio.playMagic();
    }

    if (!this.emergencyPhase2 && hpRatio <= 0.3) {
      this.emergencyPhase2 = true;
      if (this.team === 'player' && this.game.economy) {
        this.game.economy.minerals += 500;
        this.game.entityManager.addEntity(new FloatingText(this.game, 'Last stand supply +500', this.x, this.y - 120, '#ff0055', true));
      } else if (this.team === 'enemy' && this.game.waveSystem) {
        this.game.waveSystem.aiMinerals += 500;
      }
      if (this.game.audio) this.game.audio.playBossAlarm();
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      if (this.game.addScreenShake) this.game.addScreenShake(20);
      const expColor = this.team === 'player' ? '#f1c40f' : '#ff0055';
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 250 + 50;
        this.game.entityManager.addEntity(new Particle(
          this.game, this.x, this.y, expColor, 1.2, speed, angle, 5, 'spark'
        ));
      }
      this.game.stop(this.team === 'player' ? 'enemy' : 'player');
    }
  }

  update(dt) {
    if (!this.isAlive) return;
    this.animTime += dt * 4;
    if (this.shieldHitTimer > 0) this.shieldHitTimer -= dt;

    if (this.techLevel > 1 || this.emergencyPhase2) {
      if (this.turretCooldown > 0) this.turretCooldown -= dt;
      const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
      const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
      let closestEnemy = null;
      let closestDist = this.turretRange;

      for (const enemy of enemies) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = Math.hypot(dx, dy);
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

  drawFallback(ctx, shieldColor) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.team === 'player' ? '#273849' : '#260d27';
    ctx.fillRect(-74, -48, 148, 96);
    ctx.fillStyle = shieldColor;
    ctx.shadowBlur = 12;
    ctx.shadowColor = shieldColor;
    ctx.fillRect(-10, -92, 20, 70);
    ctx.fillRect(-36, -56, 72, 12);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  draw(ctx) {
    if (!this.isAlive) return;

    const level = Math.min(5, this.techLevel);
    const shieldColor = this.team === 'player' ? '#f1c40f' : '#ff0055';
    const shieldAlpha = this.shieldHitTimer > 0
      ? 0.36
      : 0.07 + Math.sin(this.animTime * 1.2) * 0.025;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 53, 142, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();

    // The shield stays quiet at rest and only reads strongly when the base takes a hit.
    ctx.beginPath();
    ctx.arc(this.x, this.y + 18, 132, Math.PI, 0, false);
    ctx.fillStyle = this.team === 'player'
      ? `rgba(241, 196, 15, ${shieldAlpha})`
      : `rgba(255, 0, 85, ${shieldAlpha})`;
    ctx.fill();
    ctx.strokeStyle = shieldColor;
    ctx.lineWidth = this.shieldHitTimer > 0 ? 3 : 1.25;
    ctx.shadowBlur = this.shieldHitTimer > 0 ? 18 : 5;
    ctx.shadowColor = shieldColor;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (this.artReady) {
      const scale = 1 + (level - 1) * 0.035;
      const width = 290 * scale;
      const height = 193 * scale;
      ctx.drawImage(this.art, this.x - width / 2, this.y + 30 - height, width, height);
    } else {
      this.drawFallback(ctx, shieldColor);
    }

    if (this.techLevel > 1 || this.emergencyPhase2) {
      ctx.save();
      ctx.translate(this.x, this.y - 70);
      ctx.rotate(this.turretAngle);
      ctx.fillStyle = this.team === 'player' ? '#253746' : '#200d24';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shieldColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = shieldColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = shieldColor;
      ctx.fillRect(4, -3.5, 26, 7);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    ctx.restore();
  }
}
