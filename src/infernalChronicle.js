const STORAGE_KEY = 'exorcism-infernal-chronicle-v1';
const HOST_IDS = new Set(['cinderVanguard', 'graveCoven', 'ironLegion']);
const MASTERY_BONUSES = Object.freeze({
  cinderVanguard: Object.freeze({ id: 'cinderScouts', name: '재의 정찰로', short: '시작 신앙심 +25', effect: Object.freeze({ kind: 'startingMinerals', amount: 25 }) }),
  graveCoven: Object.freeze({ id: 'graveMercy', name: '장례의 자비', short: '치유 효율 +4%', effect: Object.freeze({ kind: 'healing', multiplier: 1.04 }) }),
  ironLegion: Object.freeze({ id: 'ironMasonry', name: '흑철 방벽', short: '성당 보호 +180', effect: Object.freeze({ kind: 'baseFortify', amount: 180 }) })
});

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

export function getInfernalMasteryBonus(storage, host) {
  const cleared = (loadInfernalChronicle(storage)[host?.id]?.clears ?? 0) > 0;
  return cleared ? MASTERY_BONUSES[host?.id] ?? null : null;
}
