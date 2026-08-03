import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExpeditionMandate } from '../src/expeditionMandates.js';

test('mandates reward their authored win conditions only', () => {
  assert.equal(evaluateExpeditionMandate('bastionPledge', { winner: 'player', playerIntegrity: 81 }).fulfilled, true);
  assert.equal(evaluateExpeditionMandate('vanguardPledge', { winner: 'player', earlyStarts: 1 }).fulfilled, false);
  assert.equal(evaluateExpeditionMandate('vanguardPledge', { winner: 'player', earlyStarts: 2 }).scoreBonus, 22);
  assert.equal(evaluateExpeditionMandate('flawlessRite', { winner: 'player', bossPatternPerformance: { started: 3, failed: 0 } }).fulfilled, true);
  assert.equal(evaluateExpeditionMandate('flawlessRite', { winner: 'player', bossPatternPerformance: { started: 0, failed: 0 } }).fulfilled, false);
});
