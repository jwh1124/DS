const STORAGE_KEY = 'exorcism-infernal-chronicle-v1';
const HOST_IDS = new Set(['cinderVanguard', 'graveCoven', 'ironLegion']);

function parse(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function loadInfernalChronicle(storage) {
  const raw = storage?.getItem ? parse(storage.getItem(STORAGE_KEY)) : {};
  return Object.fromEntries(Object.entries(raw)
    .filter(([id, record]) => HOST_IDS.has(id) && record && typeof record === 'object')
    .map(([id, record]) => [id, {
      clears: Math.max(0, Math.round(Number(record.clears) || 0)),
      bestScore: Math.max(0, Math.round(Number(record.bestScore) || 0))
    }]));
}

export function recordInfernalClear(storage, { host, won, score } = {}) {
  const id = host?.id;
  const chronicle = loadInfernalChronicle(storage);
  const previous = chronicle[id] ?? { clears: 0, bestScore: 0 };
  if (!won || !HOST_IDS.has(id)) return { record: previous, firstClear: false, isBest: false };

  const safeScore = Math.max(0, Math.round(Number(score) || 0));
  const record = { clears: previous.clears + 1, bestScore: Math.max(previous.bestScore, safeScore) };
  try { storage?.setItem?.(STORAGE_KEY, JSON.stringify({ ...chronicle, [id]: record })); } catch { /* optional persistence */ }
  return { record, firstClear: previous.clears === 0, isBest: safeScore > previous.bestScore };
}

export function getInfernalChronicleSummary(storage, host) {
  const record = loadInfernalChronicle(storage)[host?.id];
  return record?.clears
    ? `지역 정화 ${record.clears}회 · 최고 ${record.bestScore}점`
    : '첫 지역 정화 대기';
}
