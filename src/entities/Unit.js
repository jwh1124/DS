import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';
import { FloatingText } from './FloatingText.js';
import {
  getUnitVsBaseDamageMultiplier,
  UNIT_MOVEMENT_SPEED_MULTIPLIER
} from '../gameConfig.js';
import { getAttackRangeAgainst, getCombatDistance, isBaseTarget } from '../combatMath.js';
import { getCounterProfile, getTargetPriorityBonus } from '../unitRoles.js';
import { getDoctrineUnitMultipliers } from '../doctrines.js';
import { getBossProfile } from '../bosses.js';
import {
  createBossAbilityState,
  getBossAbilityHudState,
  getBossAbilityProfile,
  getBossDamageTakenMultiplier,
  recordBossFocusedDamage,
  tryBeginBossAbility,
  updateBossAbilityState
} from '../bossAbilities.js';
import {
  getTacticalOrderHitLabel,
  getTacticalOrderTargetBonus
} from '../tacticalOrders.js';
import {
  isValidMedicTarget,
  MEDIC_HEAL_RANGE,
  selectCombatTarget
} from '../targeting.js';

const UNIT_STATS = {
  melee: { hp: 120, damage: 25, range: 45, speed: 85, attackSpeed: 1.0, color: '#f1c40f' },     // Monk / Imp
  ranged: { hp: 60, damage: 35, range: 250, speed: 70, attackSpeed: 1.2, color: '#dfe6e9' },     // Exorcist / Succubus
  medic: { hp: 100, damage: 0, range: MEDIC_HEAL_RANGE, speed: 65, attackSpeed: 1.5, color: '#f1c40f' }, // Priest / Lich
  sniper: { hp: 80, damage: 75, range: 450, speed: 55, attackSpeed: 2.0, color: '#e74c3c' },     // Inquisitor / Banshee
  tank: { hp: 300, damage: 60, range: 360, speed: 40, attackSpeed: 1.5, color: '#f1c40f' },      // Archangel / Balrog
  crusader: { hp: 450, damage: 45, range: 55, speed: 60, attackSpeed: 1.2, color: '#f1c40f' }   // Crusader / Pit Lord
};

// Corner-Sampling & Color-Distance Flood Fill Background Removal (100% 완벽 누끼 따기)
const processedCanvasMap = new Map();

function removeBackground(img) {
  if (processedCanvasMap.has(img.src)) return processedCanvasMap.get(img.src);

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
    const samples = [];
    const step = Math.max(1, Math.floor(Math.min(w, h) / 64));
    for (let x = 0; x < w; x += step) samples.push([x, 0], [x, h - 1]);
    for (let y = step; y < h - 1; y += step) samples.push([0, y], [w - 1, y]);

    let bgR = 0;
    let bgG = 0;
    let bgB = 0;
    samples.forEach(([x, y]) => {
      const index = (y * w + x) * 4;
      bgR += data[index];
      bgG += data[index + 1];
      bgB += data[index + 2];
    });
    bgR /= samples.length;
    bgG /= samples.length;
    bgB /= samples.length;

    const backgroundDistance = (pixel) => {
      const index = pixel * 4;
      return Math.hypot(data[index] - bgR, data[index + 1] - bgG, data[index + 2] - bgB);
    };
    const visited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    const threshold = 52;
    let head = 0;
    let tail = 0;
    const queuePixel = (pixel) => {
      if (visited[pixel] || backgroundDistance(pixel) > threshold) return;
      visited[pixel] = 1;
      queue[tail++] = pixel;
    };

    for (let x = 0; x < w; x++) {
      queuePixel(x);
      queuePixel((h - 1) * w + x);
    }
    for (let y = 1; y < h - 1; y++) {
      queuePixel(y * w);
      queuePixel(y * w + w - 1);
    }
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % w;
      const y = Math.floor(pixel / w);
      if (x > 0) queuePixel(pixel - 1);
      if (x < w - 1) queuePixel(pixel + 1);
      if (y > 0) queuePixel(pixel - w);
      if (y < h - 1) queuePixel(pixel + w);
    }

    for (let pixel = 0; pixel < visited.length; pixel++) {
      if (visited[pixel]) data[pixel * 4 + 3] = 0;
    }
    ctx.putImageData(imgData, 0, 0);
    processedCanvasMap.set(img.src, canvas);
    return canvas;
  } catch {
    return img;
  }
}

const baseUrl = import.meta.env?.BASE_URL || './';
const HOLY_ROSTER = new Image();
const INFERNAL_ROSTER = new Image();
HOLY_ROSTER.src = baseUrl + 'sprites/holy-roster-v3.png';
INFERNAL_ROSTER.src = baseUrl + 'sprites/infernal-roster-v3.png';
HOLY_ROSTER.hasNativeAlpha = true;
INFERNAL_ROSTER.hasNativeAlpha = true;

const BOSS_IMAGES = {};
['executioner', 'sovereign'].forEach(id => {
  const profile = getBossProfile(id);
  const image = new Image();
  image.src = baseUrl + profile.spritePath;
  image.hasNativeAlpha = true;
  BOSS_IMAGES[id] = image;
});

const SPRITE_IMAGES = {
  player: { melee: HOLY_ROSTER, ranged: HOLY_ROSTER, medic: HOLY_ROSTER, sniper: HOLY_ROSTER, tank: HOLY_ROSTER, crusader: HOLY_ROSTER },
  enemy: { melee: INFERNAL_ROSTER, ranged: INFERNAL_ROSTER, medic: INFERNAL_ROSTER, sniper: INFERNAL_ROSTER, tank: INFERNAL_ROSTER, crusader: INFERNAL_ROSTER }
};

// Atlas layout is fixed: melee/ranged/medic on top, sniper/tank/crusader on the bottom.
const SPRITE_FRAMES = {
  player: {
    melee: { col: 0, row: 0 }, ranged: { col: 1, row: 0 }, medic: { col: 2, row: 0 },
    sniper: { col: 0, row: 1 }, tank: { col: 1, row: 1 }, crusader: { col: 2, row: 1 }
  },
  enemy: {
    melee: { col: 0, row: 0 }, ranged: { col: 1, row: 0 }, medic: { col: 2, row: 0 },
    sniper: { col: 0, row: 1 }, tank: { col: 1, row: 1 }, crusader: { col: 2, row: 1 }
  }
};

const SPRITE_FACING = {
  player: { melee: 1, ranged: 1, medic: 1, sniper: 1, tank: 1, crusader: 1 },
  enemy: { melee: -1, ranged: -1, medic: -1, sniper: -1, tank: -1, crusader: -1 }
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
    this.speed = stats.speed * UNIT_MOVEMENT_SPEED_MULTIPLIER;
    this.attackSpeed = stats.attackSpeed;
    this.color = team === 'player' ? (stats.color || '#f1c40f') : '#8b00ff';
    
    this.radius = (type === 'tank' || type === 'crusader') ? 30 : 20;
    this.isAlive = true;
    this.isTargetable = true;
    this.isWithdrawing = false;
    this.withdrawalElapsed = 0;
    
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
    this.counterCueCooldown = 0;
    this.formationRow = 0;
    this.hasAura = false;
    this.isBoss = false;
    this.bossVariant = null;
    this.bossName = '';
    this.bossTierLabel = '';
    this.bossCounterHint = '';
    this.bossDrawHeight = 0;
    this.bossSplashRadius = 90;
    this.bossSplashRatio = 0.5;
    this.bossCanCrit = true;
    this.bossAbilityState = null;
    this.isRitualAnchor = false;
    this.ritualOwner = null;
    this.scale = 1;
    this.tier = 1;
    this.recoil = 0;
    this.animTime = Math.random() * 10;
    
    this.dir = team === 'player' ? 1 : -1;
    
    const base = this.team === 'player' ? this.game.playerBase : this.game.enemyBase;
    if (base && base.techLevel > 1) {
      const techLevel = Math.min(3, base.techLevel);
      // Tech rewards a composition decision instead of multiplying an entire
      // army into an instant win before its distinct roles can matter.
      const techMultiplier = 1 + (techLevel - 1) * 0.18;
      this.maxHp = Math.round(this.maxHp * techMultiplier);
      this.hp = this.maxHp;
      if (this.damage > 0) this.damage = Math.round(this.damage * techMultiplier);
      this.tier = techLevel;
      this.scale = 1 + (this.tier - 1) * 0.1;
    }

    if (this.team === 'player' && this.game.doctrineBonuses) {
      const doctrine = getDoctrineUnitMultipliers(this.game.doctrineBonuses, this.type);
      this.maxHp = Math.round(this.maxHp * doctrine.hp);
      this.hp = this.maxHp;
      if (this.damage > 0) this.damage = Math.round(this.damage * doctrine.damage);
    }
    
    if (this.team === 'enemy') {
      const diff = this.game.difficulty || 1.0;
      const diffMultiplier = diff === 1.0 ? 1.0 : (1 + (diff - 1) * 0.5);
      this.maxHp *= diffMultiplier;
      this.hp = this.maxHp;
      if (this.damage > 0) this.damage *= diffMultiplier;
    }
  }
  
  makeBoss(profileId = 'executioner') {
    const profile = getBossProfile(profileId) ?? getBossProfile('executioner');
    this.isBoss = true;
    this.isAirUnit = false;
    this.bossVariant = profile.id;
    this.bossName = profile.name;
    this.bossTierLabel = profile.tierLabel;
    this.bossCounterHint = profile.counterHint;
    this.bossDrawHeight = profile.drawHeight;
    this.bossSplashRadius = profile.splashRadius;
    this.bossSplashRatio = profile.splashRatio;
    this.bossCanCrit = profile.canCrit;
    this.bossAbilityState = createBossAbilityState(profile.id);
    this.scale = profile.worldScale;
    this.maxHp *= profile.hpMultiplier;
    this.hp = this.maxHp;
    this.damage *= profile.damageMultiplier;
    this.radius *= profile.radiusMultiplier;
    this.color = '#8e3f3b';
    return this;
  }

  beginWithdrawal() {
    if (!this.isAlive || this.isBoss) return false;
    this.isWithdrawing = true;
    this.isTargetable = false;
    this.withdrawalElapsed = 0;
    this.target = null;
    this.state = 'withdrawing';
    this.dir = this.team === 'player' ? -1 : 1;
    return true;
  }

  takeDamage(amount, isCritical = false, counterLabel = '') {
    if (!this.isAlive || !this.isTargetable) return;
    const damageMultiplier = this.isBoss
      ? getBossDamageTakenMultiplier(this.bossAbilityState)
      : 1;
    const appliedAmount = Math.max(0, amount * damageMultiplier);
    const hpBefore = this.hp;
    this.hp -= appliedAmount;
    const actualDamage = Math.max(0, Math.min(hpBefore, appliedAmount));

    if (this.isBoss) {
      recordBossFocusedDamage(this.bossAbilityState, actualDamage, counterLabel);
    }

    if (counterLabel && this.counterCueCooldown <= 0) {
      this.counterCueCooldown = 1.8;
      this.game.entityManager.addEntity(new FloatingText(
        this.game,
        counterLabel,
        this.x,
        this.y - 62 * this.scale,
        '#d8bf8a',
        false
      ));
    }
    
    const textStr = isCritical ? `CRIT! -${Math.floor(appliedAmount)}` : `-${Math.floor(appliedAmount)}`;
    const textColor = isCritical ? '#e0b75f' : '#efe4d3';
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
      if (this.isBoss) {
        if (this.bossAbilityState?.status === 'casting') {
          this.game.recordBossPatternEvent?.('interrupted');
          this.bossAbilityState.status = 'idle';
          this.bossAbilityState.lastResult = 'interrupted';
        }
        this.getRitualAnchors().forEach(anchor => { anchor.isAlive = false; });
      }

      const bountyMap = { melee: 5, ranged: 10, medic: 12, sniper: 15, tank: 20, crusader: 25 };
      const bounty = this.isBoss ? 100 : (bountyMap[this.type] || 10);
      if (this.team === 'enemy' && this.game.economy) {
        this.game.economy.minerals += bounty;
        const bountyLabel = this.isBoss && this.bossName
          ? `${this.bossName} 격퇴 · 신앙심 +${bounty}`
          : `신앙심 +${bounty}`;
        this.game.entityManager.addEntity(new FloatingText(
          this.game,
          bountyLabel,
          this.x,
          this.y - 55 * this.scale,
          this.isBoss ? '#d8bf8a' : '#f1c40f',
          'emphasis'
        ));
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

  getRitualAnchors() {
    if (!this.isBoss) return [];
    return this.game.entityManager.entities.filter(entity =>
      entity.isRitualAnchor
      && entity.ritualOwner === this
      && entity.isAlive
    );
  }

  getBossAbilityHud() {
    return getBossAbilityHudState(this.bossAbilityState, {
      anchorsAlive: this.getRitualAnchors().length
    });
  }

  announceBossAbility(text, color = '#b97872') {
    this.game.entityManager.addEntity(new FloatingText(
      this.game,
      text,
      this.x,
      this.y - 92 * this.scale,
      color,
      'emphasis'
    ));
    if (this.game.waveSystem) {
      this.game.waveSystem.lastActionLog = `[보스 패턴]: ${text}`;
    }
  }

  spawnRitualAnchors() {
    const profile = getBossAbilityProfile('sovereign');
    const offsets = [
      { x: 105, y: -72 },
      { x: 150, y: 68 }
    ];

    offsets.slice(0, profile.anchorCount).forEach((offset, index) => {
      const anchor = new Unit(
        this.game,
        this.x + offset.x,
        Math.max(250, Math.min(this.game.canvas.height - 150, this.y + offset.y)),
        'enemy',
        'sniper'
      );
      anchor.maxHp = Math.round(anchor.maxHp * 0.75);
      anchor.hp = anchor.maxHp;
      anchor.speed = 0;
      anchor.damage = 0;
      anchor.scale = 0.82;
      anchor.isAirUnit = false;
      anchor.isRitualAnchor = true;
      anchor.ritualOwner = this;
      anchor.isWaveFighter = true;
      anchor.state = 'channeling';
      anchor.formationRow = 2 + index;
      this.game.entityManager.addEntity(anchor);
    });
  }

  beginBossAbility() {
    if (this.bossVariant === 'sovereign') {
      this.spawnRitualAnchors();
    }
    const profile = getBossAbilityProfile(this.bossVariant);
    this.game.recordBossPatternEvent?.('started');
    this.target = null;
    this.state = 'casting';
    this.announceBossAbility(`${profile.name} · ${profile.instruction}`);
    this.game.audio?.playBossAlarm?.();
    this.game.addScreenShake?.(5);
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y + 18, '#8d4f42', 0.7, 0, 0, 64, 'shockwave'
    ));
  }

  interruptBossAbility() {
    this.game.recordBossPatternEvent?.('interrupted');
    this.target = null;
    this.state = 'staggered';
    this.announceBossAbility('패턴 저지 · 대악마 무력화', '#d8bf8a');
    this.game.audio?.playHit?.();
    this.game.addScreenShake?.(7);
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y, '#d8bf8a', 0.5, 0, 0, 42, 'cross_flash'
    ));
  }

  executeBossAbility() {
    this.game.recordBossPatternEvent?.('failed');
    if (this.bossVariant === 'executioner') {
      const targets = this.game.entityManager.getEntitiesByTeam('player')
        .filter(entity => entity.type !== undefined && !entity.isRitualAnchor)
        .sort((a, b) => {
          const medicOrder = Number(a.type === 'medic') - Number(b.type === 'medic');
          if (medicOrder !== 0) return medicOrder;
          return Math.hypot(a.x - this.x, a.y - this.y)
            - Math.hypot(b.x - this.x, b.y - this.y);
        })
        .slice(0, getBossAbilityProfile('executioner').executionTargetCount);
      const executionDamage = Math.max(55, this.damage * 1.7);
      targets.forEach(target => {
        target.takeDamage(executionDamage, false);
        this.game.entityManager.addEntity(new Particle(
          this.game, target.x, target.y, '#8d4f42', 0.35, 0, 0, 30, 'slash_arc'
        ));
      });
      this.announceBossAbility(`처형 집행 · 성직자 ${targets.length}명 피격`);
    } else {
      const targets = this.game.entityManager.getEntitiesByTeam('player')
        .filter(entity => entity.type !== undefined && !entity.isRitualAnchor);
      targets.forEach(target => {
        target.takeDamage(Math.max(8, target.maxHp * 0.14), false);
      });
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.05);
      this.getRitualAnchors().forEach(anchor => { anchor.isAlive = false; });
      this.announceBossAbility(`왕좌 의식 완성 · 전군 ${targets.length}명 쇠약`);
    }
    this.game.audio?.playExplosion?.({ major: true });
    this.game.addScreenShake?.(10);
  }

  updateBossAbility(dt) {
    if (!this.isBoss || !this.bossAbilityState) return false;

    if (tryBeginBossAbility(this.bossAbilityState, this.hp, this.maxHp)) {
      this.beginBossAbility();
      return true;
    }

    if (
      this.bossAbilityState.status !== 'casting'
      && this.bossAbilityState.status !== 'staggered'
    ) {
      return false;
    }

    // Boss reaction windows use real time so 2x/3x remains a strategic speed
    // choice instead of silently reducing a four-second prompt to one second.
    const abilityDt = dt / Math.max(1, Number(this.game.gameSpeed) || 1);
    const event = updateBossAbilityState(this.bossAbilityState, abilityDt, {
      anchorsAlive: this.getRitualAnchors().length
    });
    if (event?.type === 'interrupted') {
      this.interruptBossAbility();
    } else if (event?.type === 'executed') {
      this.executeBossAbility();
    }
    return true;
  }

  explode() {
    if (this.game.audio) {
      this.game.audio.playExplosion({ major: this.isBoss });
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
        if (isValidMedicTarget(this, f)) {
          const ratio = f.hp / f.maxHp;
          if (ratio < lowestHpRatio) {
            lowestHpRatio = ratio;
            injuredFriend = f;
          }
        }
      }
      
      if (injuredFriend) {
        return {
          target: injuredFriend,
          distance: getCombatDistance(this, injuredFriend)
        };
      }

      // A healer must never fall through to enemy targeting. That used to
      // turn an unneeded medic into an enemy healer.
      return { target: null, distance: Infinity };
    }

    const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
    const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
    
    return selectCombatTarget(
      enemies,
      enemy => getCombatDistance(this, enemy),
      (enemy, actualDist) => {
        const tacticalBonus = getTacticalOrderTargetBonus(
          this.game.tacticalOrder,
          this,
          enemy
        );
        return actualDist - getTargetPriorityBonus(this, enemy) - tacticalBonus;
      }
    );
  }

  update(dt) {
    if (!this.isAlive) return;
    
    // Animation Speed
    this.animTime += dt * (this.isAirUnit ? 4 : 9);

    if (this.isWithdrawing) {
      this.withdrawalElapsed += dt;
      const homeBase = this.team === 'player' ? this.game.playerBase : this.game.enemyBase;
      const homeX = homeBase?.x ?? (this.team === 'player' ? 100 : 1900);
      const direction = Math.sign(homeX - this.x);
      this.dir = direction || this.dir;
      this.x += direction * this.speed * 1.8 * dt;
      if (homeBase) {
        this.y += (homeBase.y - this.y) * Math.min(1, dt * 1.8);
      }
      if (Math.abs(homeX - this.x) <= 105 || this.withdrawalElapsed >= 2.5) {
        this.isAlive = false;
      }
      return;
    }
    
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }
    if (this.counterCueCooldown > 0) {
      this.counterCueCooldown -= dt;
    }
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - dt * 10);
    }

    if (this.isRitualAnchor) {
      this.state = 'channeling';
      this.target = null;
      return;
    }

    if (this.updateBossAbility(dt)) {
      return;
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
      const attackRange = getAttackRangeAgainst(this, target);
      if (distance <= attackRange) {
        this.state = 'attacking';
        if (this.attackCooldown <= 0) {
          this.performAttack(target);
          this.attackCooldown = currentAttackSpeed;
          this.recoil = 1.0;
        }
      } else {
        this.state = 'moving';
        const moveTargetY = isBaseTarget(target) ? this.y : target.y;
        this.moveTowards(target.x, moveTargetY, dt, currentSpeed);
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
        const healMultiplier = this.team === 'player'
          ? (this.game.doctrineBonuses?.healingMultiplier ?? 1)
          : 1;
        const healAmt = Math.round(30 * this.tier * healMultiplier);
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

    const counterProfile = getCounterProfile(this, target);
    let currentDamage = (this.hasAura ? this.damage * 1.4 : this.damage) * counterProfile.multiplier;
    const tacticalHitLabel = getTacticalOrderHitLabel(this.game.tacticalOrder, this, target);
    const isTacticalFocus = Boolean(tacticalHitLabel);
    const hitTag = tacticalHitLabel || counterProfile.label;
    const projectileProfile = {
      hitTag,
      orderId: this.team === 'player' ? this.game.tacticalOrder : '',
      focused: isTacticalFocus
    };
    
    if (target.maxHp && target.techLevel !== undefined) {
      currentDamage *= getUnitVsBaseDamageMultiplier(this.team);
      if (this.team === 'player') {
        currentDamage *= this.game.doctrineBonuses?.baseDamageMultiplier ?? 1;
      }
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
        false,
        projectileProfile
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
        false,
        projectileProfile
      ));
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x + (this.dir * 26 * this.scale), this.y - 6 * this.scale, projColor, 0.2, 0, 0, 12, 'spark'
      ));
    } else if (this.type === 'tank') {
      const projColor = this.team === 'player' ? '#f1c40f' : '#ff2d55';
      const heavyProfile = this.isBoss
        ? {
            ...projectileProfile,
            canCrit: this.bossCanCrit,
            splashRadius: this.bossSplashRadius,
            splashRatio: this.bossSplashRatio
          }
        : projectileProfile;
      this.game.entityManager.addEntity(new Projectile(
        this.game, 
        this.x + (this.dir * 25 * this.scale), 
        this.y - 12 * this.scale, 
        target, 
        currentDamage, 
        projColor, 
        this.team,
        true,
        heavyProfile
      ));
    } else if (this.type === 'crusader') {
      const isCrit = Math.random() < 0.25;
      const finalDmg = isCrit ? currentDamage * 1.6 : currentDamage;
      const hpBefore = target.hp;
      target.takeDamage(finalDmg, isCrit, hitTag);
      if (this.team === 'player') {
        this.game.recordTacticalDamage?.(
          this.game.tacticalOrder,
          Math.max(0, hpBefore - target.hp),
          isTacticalFocus
        );
      }
      
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
      const hpBefore = target.hp;
      target.takeDamage(finalDmg, isCrit, hitTag);
      if (this.team === 'player') {
        this.game.recordTacticalDamage?.(
          this.game.tacticalOrder,
          Math.max(0, hpBefore - target.hp),
          isTacticalFocus
        );
      }
      
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
    if (this.isWithdrawing) {
      ctx.globalAlpha = Math.max(0.15, 1 - this.withdrawalElapsed / 2.5);
    }
    
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
    
    // Boss ground seal: restrained iron-and-blood markings instead of a neon halo.
    if (this.isBoss) {
      const sealPulse = 1 + Math.sin(this.animTime * 0.8) * 0.04;
      ctx.save();
      ctx.scale(sealPulse, sealPulse * 0.44);
      ctx.beginPath();
      ctx.arc(0, 34, 48, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(73, 28, 26, 0.24)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(169, 102, 76, 0.72)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        ctx.moveTo(Math.cos(angle) * 29, 34 + Math.sin(angle) * 29);
        ctx.lineTo(Math.cos(angle) * 43, 34 + Math.sin(angle) * 43);
      }
      ctx.strokeStyle = 'rgba(120, 75, 58, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    if (this.isRitualAnchor) {
      const ritualPulse = 1 + Math.sin(this.animTime * 1.4) * 0.06;
      ctx.save();
      ctx.scale(ritualPulse, ritualPulse * 0.45);
      ctx.beginPath();
      ctx.arc(0, 30, 29, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(73, 28, 26, 0.2)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(181, 117, 89, 0.78)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    
    const nativeFacing = SPRITE_FACING[this.team]?.[this.type] ?? this.dir;
    if (this.dir !== nativeFacing) {
      ctx.scale(-1, 1);
    }
    
    ctx.scale(this.scale, this.scale);
    
    const imgGroup = SPRITE_IMAGES[this.team];
    const img = this.isBoss
      ? BOSS_IMAGES[this.bossVariant]
      : (imgGroup ? imgGroup[this.type] : null);
    const frame = this.isBoss ? null : SPRITE_FRAMES[this.team]?.[this.type];
    
    if (img && img.complete && img.naturalWidth > 0) {
      const transparentCanvas = img.hasNativeAlpha ? img : removeBackground(img);
      const sourceW = frame ? img.naturalWidth / 3 : img.naturalWidth;
      const sourceH = frame ? img.naturalHeight / 2 : img.naturalHeight;
      const drawH = this.isBoss ? this.bossDrawHeight : 58;
      const drawW = drawH * (sourceW / sourceH);
      const drawY = this.isBoss ? -drawH + 18 : -drawH / 2 - 6;
      
      ctx.drawImage(
        transparentCanvas,
        frame ? frame.col * sourceW : 0,
        frame ? frame.row * sourceH : 0,
        sourceW,
        sourceH,
        -drawW / 2,
        drawY,
        drawW,
        drawH
      );

    } else {
      // High-Quality Vector Art for Crusader & Pit Lord
      if (this.type === 'crusader') {
        if (this.team === 'player') {
          // Crusader: Heavy Gold Armor, Tower Shield with Red Cross, Flaming Mace
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
    // Boss health lives in a dedicated HUD; only injured regulars need a world-space bar.
    if (!this.isBoss && hpPercent < 0.995) {
      ctx.save();
      const barW = Math.max(34, 34 * this.scale);
      const barH = 5;
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
