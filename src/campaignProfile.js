import { getCommander } from './commanders.js';
import { getInfernalHostById } from './infernalHosts.js';

const STORAGE_KEY = 'exorcism-campaign-profile-v1';
const CURRENT_VERSION = 1;
const DEFAULT_PROFILE = Object.freeze({
  version: CURRENT_VERSION,
  commanderId: 'inquisitor',
  regionId: 'cinderVanguard'
});

function parse(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalize(profile) {
  const commander = getCommander(profile?.commanderId);
  const region = getInfernalHostById(profile?.regionId);
  return {
    version: CURRENT_VERSION,
    commanderId: commander.id,
    regionId: region.id
  };
}

export function loadCampaignProfile(storage) {
  if (!storage?.getItem) return { ...DEFAULT_PROFILE };
  const raw = parse(storage.getItem(STORAGE_KEY));
  if (Number(raw.version) > CURRENT_VERSION) return { ...DEFAULT_PROFILE };
  return normalize(raw);
}

function saveCampaignProfile(storage, profile) {
  const next = normalize(profile);
  try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(next)); } catch { /* optional persistence */ }
  return next;
}

export function selectCampaignCommander(storage, commanderId) {
  return saveCampaignProfile(storage, { ...loadCampaignProfile(storage), commanderId });
}

export function selectCampaignRegion(storage, regionId) {
  return saveCampaignProfile(storage, { ...loadCampaignProfile(storage), regionId });
}
