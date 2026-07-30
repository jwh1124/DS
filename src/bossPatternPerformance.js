export function createBossPatternPerformance() {
  return {
    started: 0,
    interrupted: 0,
    failed: 0
  };
}

export function recordBossPatternEvent(performance, eventType) {
  if (!performance) return;
  if (eventType === 'started') performance.started += 1;
  if (eventType === 'interrupted') performance.interrupted += 1;
  if (eventType === 'failed') performance.failed += 1;
}

export function getBossPatternSummary(performance) {
  const started = Math.max(0, Number(performance?.started) || 0);
  const interrupted = Math.max(0, Number(performance?.interrupted) || 0);
  const failed = Math.max(0, Number(performance?.failed) || 0);
  if (started === 0) return '패턴 조우 없음';
  return `패턴 저지 ${interrupted}/${started} · 실패 ${failed}회`;
}
