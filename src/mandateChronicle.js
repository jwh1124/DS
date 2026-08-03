const STORAGE_KEY = 'exorcism-mandate-chronicle-v1';
const MANDATE_IDS = new Set(['bastionPledge', 'vanguardPledge', 'flawlessRite']);

function parseChronicle(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function loadMandateChronicle(storage) {
  const raw = storage?.getItem ? parseChronicle(storage.getItem(STORAGE_KEY)) : {};
  return Object.fromEntries(Object.entries(raw)
    .filter(([id, record]) => MANDATE_IDS.has(id) && record && typeof record === 'object')
    .map(([id, record]) => [id, {
      clears: Math.max(0, Math.round(Number(record.clears) || 0)),
      bestScore: Math.max(0, Math.round(Number(record.bestScore) || 0))
    }]));
}

export function recordMandateClear(storage, { mandateResult, score } = {}) {
  const id = mandateResult?.mandate?.id;
  const chronicle = loadMandateChronicle(storage);
  const previous = chronicle[id] ?? { clears: 0, bestScore: 0 };
  if (!mandateResult?.fulfilled || !MANDATE_IDS.has(id)) {
    return { record: previous, firstClear: false, isBest: false };
  }

  const safeScore = Math.max(0, Math.round(Number(score) || 0));
  const record = {
    clears: previous.clears + 1,
    bestScore: Math.max(previous.bestScore, safeScore)
  };
  const next = { ...chronicle, [id]: record };
  try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(next)); } catch { /* optional persistence */ }
  return {
    record,
    firstClear: previous.clears === 0,
    isBest: safeScore > previous.bestScore
  };
}

export function getMandateChronicleSummary(storage, mandateId) {
  const record = loadMandateChronicle(storage)[mandateId];
  return record?.clears
    ? `정화 ${record.clears}회 · 최고 ${record.bestScore}점`
    : '첫 서약 달성 대기';
}
