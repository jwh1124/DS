import assert from 'node:assert/strict';
import test from 'node:test';

import { getWaveFormationSlot } from '../src/combatMath.js';
import { applyDoctrineToBonuses, createDoctrineBonuses } from '../src/doctrines.js';
import {
  createTacticalPerformance,
  recordTacticalDamage
} from '../src/tacticalPerformance.js';

globalThis.Image = class {
  constructor() {
    this.src = '';
    this.width = 64;
    this.height = 64;
    this.naturalWidth = 64;
    this.naturalHeight = 64;
  }
};

const { Unit } = await import('../src/entities/Unit.js');

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

class TestEntityManager {
  constructor() {
    this.entities = [];
  }

  addEntity(entity) {
    this.entities.push(entity);
  }

  getEntitiesByTeam(team) {
    return this.entities.filter(entity =>
      entity.team === team
      && entity.isAlive !== false
      && entity.isTargetable !== false
      && typeof entity.takeDamage === 'function'
    );
  }

  update(dt) {
    for (let index = this.entities.length - 1; index >= 0; index--) {
      const entity = this.entities[index];
      if (entity.isAlive === false) {
        this.entities.splice(index, 1);
      } else {
        entity.update?.(dt);
      }
    }
  }
}

function createTestBase(team, x) {
  return {
    team,
    x,
    y: 360,
    radius: 70,
    techLevel: 2,
    maxHp: 12000,
    hp: 12000,
    isAlive: true,
    update() {},
    takeDamage(amount) {
      this.hp = Math.max(0, this.hp - amount);
      this.isAlive = this.hp > 0;
    }
  };
}

function runMidBossBattle(seed) {
  const previousRandom = Math.random;
  Math.random = seededRandom(seed);

  try {
    const entityManager = new TestEntityManager();
    const playerBase = createTestBase('player', 100);
    const enemyBase = createTestBase('enemy', 1900);
    const doctrineBonuses = applyDoctrineToBonuses(
      applyDoctrineToBonuses(createDoctrineBonuses(), 'faithfulTithe'),
      'mercyHymn'
    );
    const game = {
      canvas: { height: 720 },
      difficulty: 1,
      entityManager,
      playerBase,
      enemyBase,
      doctrineBonuses,
      tacticalOrder: 'boss',
      economy: { minerals: 0 },
      waveSystem: { aiMinerals: 0, aiWaveCount: 6 },
      audio: {
        playBossAlarm() {},
        playExplosion() {},
        playHit() {},
        playMagic() {},
        playShoot() {}
      },
      addScreenShake() {},
      stop() {}
    };

    entityManager.addEntity(playerBase);
    entityManager.addEntity(enemyBase);

    const playerRoster = ['melee', 'melee', 'melee', 'melee', 'ranged', 'ranged', 'medic', 'sniper'];
    playerRoster.forEach((type, index) => {
      const slot = getWaveFormationSlot(150, 360, index, 'player');
      const unit = new Unit(game, slot.x, slot.y, 'player', type);
      unit.formationRow = slot.row;
      unit.isWaveFighter = true;
      entityManager.addEntity(unit);
    });

    const boss = new Unit(game, 1650, 520, 'enemy', 'tank');
    boss.makeBoss('executioner');
    boss.isWaveFighter = true;
    entityManager.addEntity(boss);

    const enemyRoster = ['melee', 'melee', 'ranged', 'medic'];
    enemyRoster.forEach((type, index) => {
      const slot = getWaveFormationSlot(1800, 360, index, 'enemy');
      const unit = new Unit(game, slot.x, slot.y, 'enemy', type);
      unit.formationRow = slot.row;
      unit.isWaveFighter = true;
      entityManager.addEntity(unit);
    });

    let elapsed = 0;
    while (elapsed < 75 && boss.isAlive && playerBase.isAlive) {
      entityManager.update(1 / 60);
      elapsed += 1 / 60;
    }

    return {
      bossAlive: boss.isAlive,
      bossHp: Math.max(0, Math.round(boss.hp)),
      cathedralHp: Math.round(playerBase.hp),
      elapsed,
      holySurvivors: entityManager.getEntitiesByTeam('player')
        .filter(entity => entity.type !== undefined).length
    };
  } finally {
    Math.random = previousRandom;
  }
}

test('recommended normal roster defeats the wave-six mini-boss without base artillery', () => {
  const outcomes = [11, 29, 47, 83, 131].map(runMidBossBattle);

  for (const outcome of outcomes) {
    assert.equal(outcome.bossAlive, false, JSON.stringify(outcome));
    assert.equal(outcome.cathedralHp, 12000, JSON.stringify(outcome));
    assert.ok(outcome.holySurvivors >= 2, JSON.stringify(outcome));
    assert.ok(outcome.elapsed < 55, JSON.stringify(outcome));
  }
});

test('final boss rite creates targetable rear anchors and breaks when they fall', () => {
  const entityManager = new TestEntityManager();
  const patternEvents = [];
  const playerBase = createTestBase('player', 100);
  const enemyBase = createTestBase('enemy', 1900);
  const game = {
    canvas: { height: 720 },
    difficulty: 1,
    gameSpeed: 3,
    entityManager,
    playerBase,
    enemyBase,
    doctrineBonuses: createDoctrineBonuses(),
    tacticalOrder: 'rear',
    economy: { minerals: 0 },
    waveSystem: { aiMinerals: 0, aiWaveCount: 12, lastActionLog: '' },
    recordBossPatternEvent(eventType) {
      patternEvents.push(eventType);
    },
    audio: {
      playBossAlarm() {},
      playExplosion() {},
      playHit() {}
    },
    addScreenShake() {},
    stop() {}
  };

  const boss = new Unit(game, 1600, 430, 'enemy', 'tank');
  boss.makeBoss('sovereign');
  boss.hp = boss.maxHp * 0.7;
  entityManager.addEntity(boss);

  boss.update(1 / 60);
  const anchors = boss.getRitualAnchors();
  assert.equal(anchors.length, 2);
  assert.ok(anchors.every(anchor =>
    anchor.isTargetable
    && anchor.type === 'sniper'
    && anchor.damage === 0
    && anchor.speed === 0
  ));

  const remainingBefore = boss.bossAbilityState.remaining;
  boss.update(3);
  assert.equal(
    Number((remainingBefore - boss.bossAbilityState.remaining).toFixed(2)),
    1
  );

  const hpBeforeShieldedHit = boss.hp;
  boss.takeDamage(100, false, '대악마 집중');
  assert.equal(Math.round(hpBeforeShieldedHit - boss.hp), 35);

  anchors.forEach(anchor => { anchor.isAlive = false; });
  boss.update(1 / 60);
  assert.equal(boss.bossAbilityState.status, 'staggered');
  assert.match(game.waveSystem.lastActionLog, /패턴 저지/);
  assert.deepEqual(patternEvents, ['started', 'interrupted']);

  const doomedBoss = new Unit(game, 1600, 430, 'enemy', 'tank');
  doomedBoss.makeBoss('sovereign');
  doomedBoss.hp = doomedBoss.maxHp * 0.7;
  entityManager.addEntity(doomedBoss);
  doomedBoss.update(1 / 60);
  doomedBoss.hp = 1;
  doomedBoss.takeDamage(100, false, '대악마 집중');

  assert.equal(doomedBoss.isAlive, false);
  assert.equal(doomedBoss.getRitualAnchors().length, 0);
  assert.deepEqual(patternEvents, [
    'started',
    'interrupted',
    'started',
    'interrupted'
  ]);
});

test('surviving wave fighters retreat safely instead of vanishing at combat clear', () => {
  const entityManager = new TestEntityManager();
  const playerBase = createTestBase('player', 100);
  const enemyBase = createTestBase('enemy', 1900);
  const game = {
    canvas: { height: 720 },
    difficulty: 1,
    entityManager,
    playerBase,
    enemyBase,
    doctrineBonuses: createDoctrineBonuses(),
    tacticalOrder: 'front',
    economy: { minerals: 0 },
    waveSystem: { aiMinerals: 0, aiWaveCount: 1 },
    audio: {},
    addScreenShake() {},
    stop() {}
  };
  const survivor = new Unit(game, 1200, 360, 'player', 'melee');
  survivor.isWaveFighter = true;
  const hpBeforeRetreat = survivor.hp;

  assert.equal(survivor.beginWithdrawal(), true);
  assert.equal(survivor.isTargetable, false);
  survivor.takeDamage(999);
  assert.equal(survivor.hp, hpBeforeRetreat);

  survivor.update(1);
  assert.ok(survivor.x < 1200);
  assert.equal(survivor.isAlive, true);

  survivor.update(1.6);
  assert.equal(survivor.isAlive, false);
});

test('rear order records focused damage when a real projectile hits a rear target', () => {
  const entityManager = new TestEntityManager();
  const playerBase = createTestBase('player', 100);
  const enemyBase = createTestBase('enemy', 1900);
  const tacticalPerformance = createTacticalPerformance();
  const game = {
    canvas: { height: 720 },
    difficulty: 1,
    entityManager,
    playerBase,
    enemyBase,
    doctrineBonuses: createDoctrineBonuses(),
    tacticalOrder: 'rear',
    economy: { minerals: 0 },
    waveSystem: { aiMinerals: 0, aiWaveCount: 4 },
    recordTacticalDamage(orderId, damage, focused) {
      recordTacticalDamage(tacticalPerformance, { orderId, damage, focused });
    },
    addScreenShake() {},
    stop() {}
  };
  const attacker = new Unit(game, 700, 360, 'player', 'ranged');
  const target = new Unit(game, 920, 360, 'enemy', 'sniper');
  entityManager.addEntity(attacker);
  entityManager.addEntity(target);

  attacker.performAttack(target);
  for (let elapsed = 0; elapsed < 1 && target.hp === target.maxHp; elapsed += 1 / 60) {
    entityManager.update(1 / 60);
  }

  assert.ok(target.hp < target.maxHp);
  assert.equal(tacticalPerformance.focusedHits.rear, 1);
  assert.ok(tacticalPerformance.damage.rear > 0);
  assert.equal(tacticalPerformance.focusedDamage.rear, tacticalPerformance.damage.rear);
});
