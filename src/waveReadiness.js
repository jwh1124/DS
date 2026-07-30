import { getTechUpgradeCost, MAX_WAVES } from './gameConfig.js';

const EMPTY_COUNTS = Object.freeze({
  melee: 0,
  ranged: 0,
  medic: 0,
  sniper: 0,
  tank: 0,
  crusader: 0
});

export const WAVE_READINESS_REQUIREMENTS = Object.freeze({
  opening: Object.freeze({ minRoster: 6, minFrontline: 4, minRanged: 2, techLevel: 1 }),
  support: Object.freeze({
    minRoster: 8,
    minFrontline: 4,
    minRanged: 2,
    minMedic: 1,
    minSniper: 1,
    techLevel: 2
  }),
  late: Object.freeze({
    minRoster: 11,
    minFrontline: 4,
    minRanged: 2,
    minMedic: 2,
    minSniper: 2,
    techLevel: 2
  }),
  finale: Object.freeze({
    minRoster: 13,
    minFrontline: 4,
    minRanged: 2,
    minMedic: 2,
    minSniper: 2,
    techLevel: 3
  })
});

function getRequirement(wave) {
  if (wave >= 10) return WAVE_READINESS_REQUIREMENTS.finale;
  if (wave >= 7) return WAVE_READINESS_REQUIREMENTS.late;
  if (wave >= 4) return WAVE_READINESS_REQUIREMENTS.support;
  return WAVE_READINESS_REQUIREMENTS.opening;
}

function normalizeCounts(counts) {
  return Object.fromEntries(
    Object.keys(EMPTY_COUNTS).map(type => [type, Math.max(0, Number(counts?.[type]) || 0)])
  );
}

export function getWaveReadiness({ wave, techLevel, minerals, counts }) {
  const targetWave = Math.max(1, Math.min(MAX_WAVES, Math.floor(Number(wave) || 1)));
  const currentTech = Math.max(1, Math.floor(Number(techLevel) || 1));
  const currentMinerals = Math.max(0, Math.floor(Number(minerals) || 0));
  const roster = normalizeCounts(counts);
  const requirement = getRequirement(targetWave);
  const rosterSize = Object.values(roster).reduce((sum, count) => sum + count, 0);
  const frontline = roster.melee + roster.crusader;

  const checks = [
    {
      id: 'frontline',
      met: frontline >= requirement.minFrontline,
      action: `전열 ${requirement.minFrontline - frontline}명 보강`
    },
    {
      id: 'ranged',
      met: roster.ranged >= requirement.minRanged,
      action: `엑소시스트 ${requirement.minRanged - roster.ranged}명 보강`
    },
    {
      id: 'roster',
      met: rosterSize >= requirement.minRoster,
      action: `계약 ${requirement.minRoster - rosterSize}명 보강`
    }
  ];

  if (requirement.minMedic) {
    checks.push({
      id: 'medic',
      met: roster.medic >= requirement.minMedic,
      action: `사제 ${requirement.minMedic - roster.medic}명 보강`
    });
  }
  if (requirement.minSniper) {
    checks.push({
      id: 'sniper',
      met: roster.sniper >= requirement.minSniper,
      action: `심판관 ${requirement.minSniper - roster.sniper}명 보강`
    });
  }
  checks.push({
    id: 'tech',
    met: currentTech >= requirement.techLevel,
    action: ''
  });

  const missing = checks.filter(check => !check.met);
  const techGap = missing.find(check => check.id === 'tech');
  const supportGap = missing.find(check => check.id === 'medic' || check.id === 'sniper');
  const nextTechCost = getTechUpgradeCost(currentTech);
  if (techGap) {
    techGap.action = currentMinerals >= nextTechCost
      ? `Lv.${currentTech + 1} 계시 실행`
      : `Lv.${currentTech + 1} 계시 자금 ${nextTechCost} 비축`;
  }

  const critical = Boolean(techGap || (targetWave === 6 && supportGap));
  const level = missing.length === 0 ? 'ready' : critical ? 'critical' : 'caution';
  const label = missing.length === 0
    ? '준비 완료'
    : critical
      ? '핵심 대응 부족'
      : '보강 권장';
  const action = techGap?.action
    ?? supportGap?.action
    ?? missing[0]?.action
    ?? '현재 편성 유지';

  return {
    wave: targetWave,
    level,
    label,
    action,
    met: checks.length - missing.length,
    total: checks.length,
    missing: missing.map(check => check.id)
  };
}
