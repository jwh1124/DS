import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPEDITION_MANDATES,
  evaluateExpeditionMandate,
  getExpeditionMandateLiveStatus
} from '../src/expeditionMandates.js';

test('mandates reward their authored win conditions only', () => {
  assert.equal(evaluateExpeditionMandate('bastionPledge', { winner: 'player', playerIntegrity: 81 }).fulfilled, true);
  assert.equal(evaluateExpeditionMandate('vanguardPledge', { winner: 'player', earlyStarts: 1 }).fulfilled, false);
  assert.equal(evaluateExpeditionMandate('vanguardPledge', { winner: 'player', earlyStarts: 2 }).scoreBonus, 22);
  assert.equal(evaluateExpeditionMandate('flawlessRite', { winner: 'player', bossPatternPerformance: { started: 3, failed: 0 } }).fulfilled, true);
  assert.equal(evaluateExpeditionMandate('flawlessRite', { winner: 'player', bossPatternPerformance: { started: 0, failed: 0 } }).fulfilled, false);
});

test('mandate live status tells the player what remains during a run', () => {
  assert.match(
    getExpeditionMandateLiveStatus(EXPEDITION_MANDATES.bastionPledge, { playerIntegrity: 79 }).text,
    /79%.*80%/
  );
  assert.equal(
    getExpeditionMandateLiveStatus(EXPEDITION_MANDATES.vanguardPledge, { earlyStarts: 2 }).tone,
    'complete'
  );
  const failedRite = getExpeditionMandateLiveStatus(EXPEDITION_MANDATES.flawlessRite, {
    bossPatternPerformance: { started: 1, interrupted: 0, failed: 1 }
  });
  assert.equal(failedRite.tone, 'failed');
  assert.match(failedRite.text, /미달/);
});
