const STORAGE_KEY = 'exorcism-run-records-v1';

const DIFFICULTY_LABELS = Object.freeze({
  '0.7': '은총',
  '1': '시련',
  '1.25': '연옥',
  '1.5': '지옥'
});

function difficultyKey(difficulty) {
  return String(Number(difficulty) || 1);
}

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getDifficultyLabel(difficulty) {
  return DIFFICULTY_LABELS[difficultyKey(difficulty)] ?? '시련';
}

export function loadRunRecords(storage) {
  if (!storage?.getItem) return {};
  return safeParse(storage.getItem(STORAGE_KEY));
}

export function getRunRecord(storage, difficulty) {
  return loadRunRecords(storage)[difficultyKey(difficulty)] ?? null;
}

export function recordRunResult(storage, { difficulty, report }) {
  const key = difficultyKey(difficulty);
  const records = loadRunRecords(storage);
  const previous = records[key] ?? null;
  const didWin = report?.grade != null;
  const score = Math.max(0, Math.round(Number(report?.score) || 0));
  const isPersonalBest = didWin && (!previous || score > previous.score);

  if (isPersonalBest && storage?.setItem) {
    const next = {
      ...records,
      [key]: {
        score,
        grade: report.grade,
        playerIntegrity: Math.max(0, Math.min(100, Math.round(Number(report.playerIntegrity) || 0))),
        clearedAt: new Date().toISOString()
      }
    };
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing may block storage; the result screen still works.
    }
  }

  return {
    difficultyLabel: getDifficultyLabel(difficulty),
    record: isPersonalBest
      ? { score, grade: report.grade, playerIntegrity: Math.max(0, Math.min(100, Math.round(Number(report.playerIntegrity) || 0))) }
      : previous,
    isPersonalBest
  };
}

export function getRunRecordSummary(storage, difficulty) {
  const label = getDifficultyLabel(difficulty);
  const record = getRunRecord(storage, difficulty);
  if (!record) return `${label} 최고 기록 없음 · 첫 정화를 시작하십시오.`;
  return `${label} 최고 ${record.grade} · ${record.score}점 · 성당 ${record.playerIntegrity}%`;
}
