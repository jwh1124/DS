import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('wave progression exposes combat, assault, withdrawal, and preparation as distinct states', async () => {
  const [waveSystem, hud] = await Promise.all([
    readFile(new URL('../src/engine/WaveSystem.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui/HUD.js', import.meta.url), 'utf8')
  ]);

  assert.match(waveSystem, /beginPlayerWithdrawal\(\)/);
  assert.match(waveSystem, /WAVE_PHASES\.ASSAULT/);
  assert.match(waveSystem, /WAVE_PHASES\.PREPARE/);
  assert.match(hud, /공성 기회/);
  assert.match(hud, /전장 정비/);
  assert.match(hud, /공성 진행 중/);
});

test('the final battle ends by fortress destruction and cannot time out into judgement', async () => {
  const [waveSystem, hud] = await Promise.all([
    readFile(new URL('../src/engine/WaveSystem.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui/HUD.js', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(waveSystem, /finalJudgement/);
  assert.doesNotMatch(waveSystem, /FINAL_BATTLE_DURATION/);
  assert.match(waveSystem, /deployFinalReinforcements\(\)/);
  assert.match(hud, /지옥문 파괴 시 승리/);
  assert.doesNotMatch(hud, /최후 심판까지/);
});
