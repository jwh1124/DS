import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.Image = class {
  constructor() { this.src = ''; }
};
globalThis.window = globalThis.window ?? { addEventListener() {} };

const { WaveSystem } = await import('../src/engine/WaveSystem.js');
const { WAVE_ASSAULT_TIME, WAVE_PREP_TIME } = await import('../src/gameConfig.js');
const { WAVE_PHASES } = await import('../src/wavePacing.js');

function createFlowGame() {
  const entities = [];
  const economy = {
    minerals: 400,
    income: 90,
    triggerIncome() { this.minerals += this.income; }
  };
  return {
    canvas: { height: 720 },
    difficulty: 1,
    economy,
    entityManager: {
      entities,
      addEntity(entity) { entities.push(entity); },
      getEntitiesByTeam(team) {
        return entities.filter(entity => entity.team === team && entity.isAlive !== false);
      }
    },
    playerBase: { team: 'player', x: 100, y: 360, radius: 70, hp: 10000, maxHp: 10000, isAlive: true },
    enemyBase: { team: 'enemy', x: 1900, y: 360, radius: 70, hp: 10000, maxHp: 10000, isAlive: true },
    addScreenShake() {}
  };
}

test('an unopposed demon army gets one timed breach, then withdraws before income', () => {
  const game = createFlowGame();
  let beganWithdrawal = false;
  const demon = {
    team: 'enemy', type: 'ranged', damage: 35, range: 250,
    x: 340, y: 360, radius: 20,
    isWaveFighter: true, isAlive: true,
    beginWithdrawal() { beganWithdrawal = true; return true; }
  };
  game.entityManager.entities.push(demon);
  const wave = new WaveSystem(game);
  wave.isActive = true;
  wave.aiWaveCount = 1;
  wave.phase = WAVE_PHASES.COMBAT;

  wave.update(0.1);
  assert.equal(wave.phase, WAVE_PHASES.BREACH);
  assert.equal(wave.timeUntilWave, WAVE_ASSAULT_TIME);
  assert.equal(game.economy.minerals, 400);

  wave.update(0.1);
  assert.equal(wave.siegeEngaged, true);
  assert.ok(wave.timeUntilWave < WAVE_ASSAULT_TIME);

  const inFlight = { team: 'enemy', isProjectile: true, isAlive: true };
  game.entityManager.entities.push(inFlight);
  wave.timeUntilWave = 0.01;
  wave.update(0.02);
  assert.equal(wave.phase, WAVE_PHASES.WITHDRAWAL);
  assert.equal(beganWithdrawal, true);
  assert.equal(inFlight.isAlive, false);
  assert.equal(game.economy.minerals, 400);

  demon.isAlive = false;
  wave.update(0.1);
  assert.equal(wave.phase, WAVE_PHASES.PREPARE);
  assert.equal(wave.timeUntilWave, WAVE_PREP_TIME);
  assert.equal(game.economy.minerals, 490);
});

test('the siege clock waits until the surviving army reaches the fortress', () => {
  const game = createFlowGame();
  const holy = {
    team: 'player', type: 'melee', damage: 25, range: 45,
    x: 700, y: 360, radius: 20,
    isWaveFighter: true, isAlive: true,
    beginWithdrawal() { return true; }
  };
  game.entityManager.entities.push(holy);
  const wave = new WaveSystem(game);
  wave.isActive = true;
  wave.aiWaveCount = 1;
  wave.phase = WAVE_PHASES.COMBAT;

  wave.update(0.1);
  assert.equal(wave.phase, WAVE_PHASES.ASSAULT);
  wave.update(3);
  assert.equal(wave.timeUntilWave, WAVE_ASSAULT_TIME);
  assert.equal(wave.siegeEngaged, false);

  holy.x = 1800;
  wave.update(0.5);
  assert.equal(wave.siegeEngaged, true);
  assert.equal(wave.timeUntilWave, WAVE_ASSAULT_TIME - 0.5);
});
