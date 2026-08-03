import { FloatingText } from './FloatingText.js';
import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';
import { BASE_TECH_HP_GAIN, BASE_TURRET_BALANCE, getBaseTurretStats } from '../gameConfig.js';
import { getPointToTargetDistance } from '../combatMath.js';
import { selectCombatTarget } from '../targeting.js';
import { resolveInfernalGateDamage } from '../baseDefense.js';

const baseUrl = import.meta.env?.BASE_URL || './';
const BASE_ART = {
  player: `${baseUrl}bases/holy-cathedral-v2.png`,
  enemy: `${baseUrl}bases/infernal-gate-v2.png`,
};
const HOLY_TURRET_ART = `${baseUrl}sprites/holy-reliquary-cannon-v1.png`;
const INFERNAL_TURRET_ART = `${baseUrl}sprites/infernal-gate-cannon-v1.png`;

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
    const turretStats = getBaseTurretStats(this.techLevel);
    this.turretAttackSpeed = turretStats.interval;
    this.turretDamage = turretStats.damage;
    this.turretRange = turretStats.range;
    this.shieldHitTimer = 0;
    this.turretAngle = team === 'player' ? 0 : Math.PI;
    this.turretRecoil = 0;
    this.emergencyPhase1 = false;
    this.emergencyPhase2 = false;
    this.animTime = Math.random() * 10;
    this.artReady = false;
    this.turretArtReady = false;

    if (typeof Image !== 'undefined') {
      this.art = new Image();
      this.art.onload = () => { this.artReady = true; };
      this.art.onerror = () => { this.artReady = false; };
      this.art.src = BASE_ART[team];

      this.turretArt = new Image();
      this.turretArt.onload = () => { this.turretArtReady = true; };
      this.turretArt.onerror = () => { this.turretArtReady = false; };
      this.turretArt.src = team === 'player' ? HOLY_TURRET_ART : INFERNAL_TURRET_ART;
    }
  }

  upgradeTech() {
    this.techLevel++;
    this.maxHp += BASE_TECH_HP_GAIN;
    this.hp += BASE_TECH_HP_GAIN;
    const turretStats = getBaseTurretStats(this.techLevel);
    this.turretAttackSpeed = turretStats.interval;
    this.turretDamage = turretStats.damage;
    this.turretRange = turretStats.range;

    if (this.game.audio) this.game.audio.playMagic();

    const upgradeText = this.team === 'player'
      ? `성당 강화 · Lv.${this.techLevel}`
      : `지옥문 각성 · Lv.${this.techLevel}`;
    const upgradeColor = this.team === 'player' ? '#d8bf8a' : '#9c5d5b';
    this.game.entityManager.addEntity(new FloatingText(
      this.game, upgradeText, this.x, this.y - 140, upgradeColor, 'emphasis'
    ));
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

    const wave = this.game.waveSystem?.aiWaveCount ?? 0;
    const damageResult = this.team === 'enemy'
      ? resolveInfernalGateDamage({
          hp: this.hp,
          maxHp: this.maxHp,
          amount,
          wave,
          bossGateLocked: this.game.waveSystem?.isBossGateLocked?.() ?? false
        })
      : {
          nextHp: this.hp - amount,
          blockedByBoss: false,
          heldBySeal: false
        };

    this.hp = damageResult.nextHp;
    this.shieldHitTimer = 0.4;
    if (this.game.addScreenShake) this.game.addScreenShake(3);

    if (damageResult.blockedByBoss) {
      if (this.bossSealWarningWave !== wave) {
        this.bossSealWarningWave = wave;
        this.game.entityManager.addEntity(new FloatingText(
          this.game,
          '왕좌의 봉인 · 대악마를 먼저 격퇴하십시오',
          this.x,
          this.y - 125,
          '#b66c68',
          'emphasis'
        ));
      }
      return;
    }

    // Earlier waves wear down the gate, but only the twelfth wave can end the
    // run. This protects the intended campaign arc from a lucky early snowball
    // while preserving all damage already dealt.
    if (damageResult.heldBySeal) {
      if (!this.sealWarningShown) {
        this.sealWarningShown = true;
        this.game.entityManager.addEntity(new FloatingText(
          this.game, '지옥문 봉인: 최후의 정화까지 버텨냅니다', this.x, this.y - 125, '#b66c68', 'emphasis'
        ));
      }
      return;
    }

    const hpRatio = this.hp / this.maxHp;
    if (!this.emergencyPhase1 && hpRatio <= 0.6) {
      this.emergencyPhase1 = true;
      if (this.team === 'player' && this.game.economy) {
        this.game.economy.minerals += 300;
        this.game.entityManager.addEntity(new FloatingText(
          this.game, '긴급 지원 +300', this.x, this.y - 100, '#d8bf8a', 'emphasis'
        ));
      } else if (this.team === 'enemy' && this.game.waveSystem) {
        this.game.waveSystem.aiMinerals += 300;
      }
      if (this.game.audio) this.game.audio.playMagic();
    }

    if (!this.emergencyPhase2 && hpRatio <= 0.3) {
      this.emergencyPhase2 = true;
      if (this.team === 'player' && this.game.economy) {
        this.game.economy.minerals += 500;
        this.game.entityManager.addEntity(new FloatingText(
          this.game, '최후 저항 지원 +500', this.x, this.y - 120, '#b97872', 'emphasis'
        ));
      } else if (this.team === 'enemy' && this.game.waveSystem) {
        this.game.waveSystem.aiMinerals += 500;
      }
      if (this.game.audio) this.game.audio.playBossAlarm();
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      if (this.game.audio) this.game.audio.playExplosion({ major: true });
      if (this.game.addScreenShake) this.game.addScreenShake(20);
      const expColor = this.team === 'player' ? '#f1c40f' : '#ff0055';
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 250 + 50;
        this.game.entityManager.addEntity(new Particle(
          this.game, this.x, this.y, expColor, 1.2, speed, angle, 5, 'spark'
        ));
      }
      this.game.stop(this.team === 'player' ? 'enemy' : 'player', 'baseDestroyed');
    }
  }

  getTurretMount() {
    // Keep the artillery bolted to a side tower instead of hovering in front of the base art.
    const side = this.team === 'player' ? 1 : -1;
    return { x: this.x + side * 84, y: this.y - 82 };
  }

  drawTurret(ctx, level) {
    const mount = this.getTurretMount();
    const isHoly = this.team === 'player';

    if (this.turretArtReady) {
      // Full sprites keep both level-up artillery pieces legible against dense base artwork.
      const size = isHoly ? 160 : 150;
      ctx.save();
      ctx.translate(mount.x + (isHoly ? -1 : 1) * this.turretRecoil * 4, mount.y);
      ctx.drawImage(this.turretArt, -size / 2, -size / 2, size, size);
      ctx.restore();
      return;
    }

    const stone = isHoly ? '#393a3e' : '#321b2f';
    const stoneLight = isHoly ? '#73706a' : '#6e405d';
    const iron = isHoly ? '#1a2026' : '#25101f';
    const ironLight = isHoly ? '#4a5258' : '#65354f';
    const metal = isHoly ? '#b79a67' : '#a96865';

    ctx.save();
    ctx.translate(mount.x, mount.y);

    // Fixed stone socket: it makes the gun feel built into the cathedral, not pasted over it.
    ctx.fillStyle = stone;
    ctx.beginPath();
    ctx.moveTo(-20, 12);
    ctx.lineTo(-14, -3);
    ctx.lineTo(14, -3);
    ctx.lineTo(20, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stoneLight;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#111217';
    ctx.fillRect(-22, 11, 44, 6);

    ctx.rotate(this.turretAngle);
    ctx.translate(-this.turretRecoil * 6, 0);

    // Armoured swivel and recoil housing.
    ctx.fillStyle = iron;
    ctx.fillRect(-12, -9, 21, 18);
    ctx.strokeStyle = ironLight;
    ctx.lineWidth = 1.25;
    ctx.strokeRect(-12, -9, 21, 18);
    ctx.fillStyle = '#0c0d11';
    ctx.beginPath();
    ctx.arc(-4, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = metal;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Reliquary cannon: dark iron barrel, warm brass bands, no permanent light or range marker.
    ctx.fillStyle = iron;
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(37, -6);
    ctx.lineTo(44, -9);
    ctx.lineTo(50, -9);
    ctx.lineTo(50, 9);
    ctx.lineTo(44, 9);
    ctx.lineTo(37, 6);
    ctx.lineTo(2, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ironLight;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.fillStyle = metal;
    ctx.fillRect(11, -8, 3, 16);
    ctx.fillRect(33, -7, 3, 14);
    ctx.fillStyle = '#090a0d';
    ctx.fillRect(45, -6, 6, 12);

    // A small sight and counterweight keep the silhouette readable at the game's scale.
    ctx.fillStyle = metal;
    ctx.fillRect(18, -11, 2, 5);
    ctx.fillRect(-18, -3, 8, 6);
    if (level >= 4) {
      ctx.fillRect(21, -10, 2, 4);
      ctx.fillRect(21, 6, 2, 4);
    }
    ctx.restore();
  }

  update(dt) {
    if (!this.isAlive) return;
    this.animTime += dt * 4;
    if (this.shieldHitTimer > 0) this.shieldHitTimer -= dt;
    this.turretRecoil = Math.max(0, this.turretRecoil - dt * 8);

    if (this.techLevel > 1 || this.emergencyPhase2) {
      if (this.turretCooldown > 0) this.turretCooldown -= dt;
      const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
      const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
      const mount = this.getTurretMount();
      const reachableEnemies = enemies.filter(
        enemy => getPointToTargetDistance(mount, enemy) <= this.turretRange
      );
      const { target: closestEnemy } = selectCombatTarget(
        reachableEnemies,
        enemy => getPointToTargetDistance(mount, enemy),
        (_enemy, distance) => distance
      );

      if (closestEnemy) {
        this.turretAngle = Math.atan2(closestEnemy.y - mount.y, closestEnemy.x - mount.x);
        if (this.turretCooldown <= 0) {
          const turretColor = this.team === 'player' ? '#f1c40f' : '#ff0055';
          this.game.entityManager.addEntity(new Projectile(
            this.game,
            mount.x + Math.cos(this.turretAngle) * 44,
            mount.y + Math.sin(this.turretAngle) * 44,
            closestEnemy,
            this.turretDamage,
            turretColor,
            this.team,
            true,
            {
              canCrit: false,
              splashRadius: BASE_TURRET_BALANCE.splashRadius,
              splashRatio: BASE_TURRET_BALANCE.splashRatio
            }
          ));
          this.turretCooldown = this.turretAttackSpeed;
          this.turretRecoil = 1;
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
      : 0.025 + Math.sin(this.animTime * 1.2) * 0.01;

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
    ctx.strokeStyle = this.shieldHitTimer > 0
      ? shieldColor
      : (this.team === 'player' ? 'rgba(183, 154, 103, 0.28)' : 'rgba(169, 104, 101, 0.28)');
    ctx.lineWidth = this.shieldHitTimer > 0 ? 3 : 1.25;
    ctx.shadowBlur = this.shieldHitTimer > 0 ? 18 : 0;
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
      this.drawTurret(ctx, level);
    }

    ctx.restore();
  }
}
