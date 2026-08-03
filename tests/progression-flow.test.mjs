import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('wave progression pays income only after a distinct return phase', async () => {
  const [waveSystem, hud] = await Promise.all([
    readFile(new URL('../src/engine/WaveSystem.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui/HUD.js', import.meta.url), 'utf8')
  ]);

  assert.match(waveSystem, /beginTeamWithdrawal\(team\)/);
  assert.match(waveSystem, /WAVE_PHASES\.ASSAULT/);
  assert.match(waveSystem, /WAVE_PHASES\.BREACH/);
  assert.match(waveSystem, /WAVE_PHASES\.WITHDRAWAL/);
  assert.match(waveSystem, /WAVE_PHASES\.PREPARE/);
  assert.match(waveSystem, /enterPreparation\(\)[\s\S]*triggerIncome\(\)/);
  assert.match(waveSystem, /cancelTeamProjectiles\(currentTeam\)/);
  assert.doesNotMatch(waveSystem, /spawnWave\(\)[\s\S]{0,9000}Trigger player income/);
  assert.match(hud, /공성 기회/);
  assert.match(hud, /성당 방어/);
  assert.match(hud, /부대 귀환/);
  assert.match(hud, /전장 정비/);
  assert.match(hud, /공성 진행 중/);
});

test('the final battle is a decisive army fight instead of an endless reinforcement siege', async () => {
  const [waveSystem, hud] = await Promise.all([
    readFile(new URL('../src/engine/WaveSystem.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui/HUD.js', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(waveSystem, /deployFinalReinforcements\(\)/);
  assert.match(waveSystem, /지옥 군주와 잔당 격퇴 · 지옥문 붕괴/);
  assert.match(waveSystem, /finalSquadDefeated/);
  assert.match(hud, /지옥 군단 전멸 시 승리/);
  assert.doesNotMatch(hud, /제한 시간 없음/);
});
