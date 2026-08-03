import test from 'node:test';
import assert from 'node:assert/strict';
import {
  awardCampaignRelic,
  getSelectedCampaignRelic,
  loadCampaignRelics,
  selectCampaignRelic
} from '../src/campaignRelics.js';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('each first cleared difficulty unlocks its authored campaign relic once', () => {
  const store = storage();
  const normal = awardCampaignRelic(store, { difficulty: 1, won: true });
  assert.equal(normal.unlockedRelic.id, 'vanguardSeal');
  assert.equal(awardCampaignRelic(store, { difficulty: 1, won: true }).unlockedRelic, null);
  assert.equal(awardCampaignRelic(store, { difficulty: 1.25, won: true }).unlockedRelic.id, 'titheCenser');
  assert.deepEqual(loadCampaignRelics(store).unlocked, ['vanguardSeal', 'titheCenser']);
});

test('only an unlocked relic can be equipped', () => {
  const store = storage();
  awardCampaignRelic(store, { difficulty: 1, won: true });
  selectCampaignRelic(store, 'mercyReliquary');
  assert.equal(getSelectedCampaignRelic(store).id, 'vanguardSeal');
  selectCampaignRelic(store, 'vanguardSeal');
  assert.equal(getSelectedCampaignRelic(store).effect.kind, 'frontlineHp');
});
