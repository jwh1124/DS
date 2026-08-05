import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadCampaignProfile,
  selectCampaignCommander,
  selectCampaignRegion
} from '../src/campaignProfile.js';

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('campaign profile persists selected commander and infernal region with a schema version', () => {
  const store = storage();
  selectCampaignCommander(store, 'archbishop');
  selectCampaignRegion(store, 'graveCoven');
  assert.deepEqual(loadCampaignProfile(store), {
    version: 1,
    commanderId: 'archbishop',
    regionId: 'graveCoven'
  });
});

test('campaign profile rejects malformed and newer unsupported selections', () => {
  const malformed = storage({ 'exorcism-campaign-profile-v1': '{bad' });
  assert.equal(loadCampaignProfile(malformed).commanderId, 'inquisitor');

  const newer = storage({
    'exorcism-campaign-profile-v1': JSON.stringify({ version: 99, commanderId: 'marshal', regionId: 'ironLegion' })
  });
  assert.deepEqual(loadCampaignProfile(newer), {
    version: 1,
    commanderId: 'inquisitor',
    regionId: 'cinderVanguard'
  });
});
