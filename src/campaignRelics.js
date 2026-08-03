const STORAGE_KEY = 'exorcism-campaign-relics-v1';

export const CAMPAIGN_RELICS = Object.freeze({
  vanguardSeal: Object.freeze({
    id: 'vanguardSeal',
    unlockDifficulty: 1,
    name: '성 미카엘의 인장',
    short: '전열 체력 +6%',
    effect: Object.freeze({ kind: 'frontlineHp', multiplier: 1.06 })
  }),
  titheCenser: Object.freeze({
    id: 'titheCenser',
    unlockDifficulty: 1.25,
    name: '십일조 향로',
    short: '시작 신앙심 +40',
    effect: Object.freeze({ kind: 'startingMinerals', amount: 40 })
  }),
  mercyReliquary: Object.freeze({
    id: 'mercyReliquary',
    unlockDifficulty: 1.5,
    name: '자비의 성유함',
    short: '사제 치유 +8%',
    effect: Object.freeze({ kind: 'healing', multiplier: 1.08 })
  })
});

const RELIC_LIST = Object.freeze(Object.values(CAMPAIGN_RELICS));

function parseProfile(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function loadCampaignRelics(storage) {
  const profile = storage?.getItem ? parseProfile(storage.getItem(STORAGE_KEY)) : {};
  const unlocked = Array.isArray(profile.unlocked)
    ? profile.unlocked.filter(id => CAMPAIGN_RELICS[id])
    : [];
  const selected = unlocked.includes(profile.selected) ? profile.selected : null;
  return { unlocked, selected };
}

export function getSelectedCampaignRelic(storage) {
  const { selected } = loadCampaignRelics(storage);
  return selected ? CAMPAIGN_RELICS[selected] : null;
}

export function selectCampaignRelic(storage, relicId) {
  const current = loadCampaignRelics(storage);
  const selected = current.unlocked.includes(relicId) ? relicId : current.selected;
  const next = { ...current, selected };
  try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(next)); } catch { /* optional persistence */ }
  return next;
}

export function awardCampaignRelic(storage, { difficulty, won }) {
  const current = loadCampaignRelics(storage);
  if (!won) return { ...current, unlockedRelic: null };
  const relic = RELIC_LIST.find(item => Number(item.unlockDifficulty) === Number(difficulty));
  if (!relic || current.unlocked.includes(relic.id)) return { ...current, unlockedRelic: null };

  const next = {
    unlocked: [...current.unlocked, relic.id],
    selected: current.selected ?? relic.id
  };
  try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(next)); } catch { /* optional persistence */ }
  return { ...next, unlockedRelic: relic };
}

export function getCampaignRelicSummary(storage) {
  const { unlocked, selected } = loadCampaignRelics(storage);
  const active = selected ? CAMPAIGN_RELICS[selected] : null;
  return unlocked.length
    ? `성물 ${unlocked.length}/${RELIC_LIST.length} · 장착: ${active?.name ?? '없음'}`
    : `성물 0/${RELIC_LIST.length} · 시련 첫 정화로 첫 성물을 해금하십시오.`;
}
