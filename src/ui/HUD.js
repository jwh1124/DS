import { MAX_SPAWNERS, MAX_TECH_LEVEL, MAX_WAVES, UNIT_TECH_REQUIREMENTS } from '../gameConfig.js';
import { WAVE_PHASES } from '../wavePacing.js';
import { getWaveReadiness } from '../waveReadiness.js';
import { getTacticalPerformanceLiveText } from '../tacticalPerformance.js';
import { getTacticalOrderDefinition } from '../tacticalOrders.js';
import { getExpeditionMandateLiveStatus } from '../expeditionMandates.js';
import { getInfernalHostBossTactics } from '../infernalHosts.js';

export class HUD {
  constructor(game) {
    this.game = game;
    
    // Cache DOM elements
    this.mineralsText = document.getElementById('minerals-text');
    this.incomeText = document.getElementById('income-text');
    this.timerText = document.getElementById('timer-text');
    this.waveLabel = document.getElementById('wave-label');
    this.wavePreview = document.getElementById('wave-preview');
    this.waveReadiness = document.getElementById('wave-readiness');
    this.waveReadinessLabel = document.getElementById('wave-readiness-label');
    this.waveReadinessAction = document.getElementById('wave-readiness-action');
    this.launchWaveButton = document.getElementById('launch-wave-btn');
    this.tacticalOrderStats = document.getElementById('tactical-order-stats');
    this.mandateStatus = document.getElementById('expedition-mandate-status');
    this.mandateStatusText = document.getElementById('expedition-mandate-status-text');
    this.lastMandateStatus = '';
    
    this.pHealthText = document.getElementById('player-health-text');
    this.pHealthBar = document.getElementById('player-health-bar');
    
    this.eHealthText = document.getElementById('enemy-health-text');
    this.eHealthBar = document.getElementById('enemy-health-bar');
    this.eDefenseStatus = document.getElementById('enemy-defense-status');

    this.bossHud = document.getElementById('boss-hud');
    this.bossTier = document.getElementById('boss-tier');
    this.bossName = document.getElementById('boss-name');
    this.bossHealthText = document.getElementById('boss-health-text');
    this.bossHealthFill = document.getElementById('boss-health-fill');
    this.bossCounterHint = document.getElementById('boss-counter-hint');
    this.bossAbility = document.getElementById('boss-ability');
    this.bossAbilityName = document.getElementById('boss-ability-name');
    this.bossAbilityDetail = document.getElementById('boss-ability-detail');
    this.bossAbilityFill = document.getElementById('boss-ability-fill');
    this.bossResponseButton = document.getElementById('boss-response-btn');
    this.bossResponseButton?.addEventListener('click', () => {
      const orderId = this.bossResponseButton.dataset.order;
      if (orderId) this.game.setTacticalOrder(orderId);
    });
    
    this.buildButtons = document.querySelectorAll('.build-btn');
  }

  update() {
    // Update economy
    this.mineralsText.textContent = Math.floor(this.game.economy.minerals);
    this.incomeText.textContent = `+${Math.floor(this.game.economy.income)} / 귀환`;
    
    // Update timer
    const waveSystem = this.game.waveSystem;
    const phase = waveSystem.phase;
    const isFinale = phase === WAVE_PHASES.FINAL;
    const isAssault = phase === WAVE_PHASES.ASSAULT;
    const isBreach = phase === WAVE_PHASES.BREACH;
    const isWithdrawal = phase === WAVE_PHASES.WITHDRAWAL;
    const isScout = phase === WAVE_PHASES.SCOUT;
    const isPrepare = phase === WAVE_PHASES.PREPARE || isScout;
    const activeBoss = waveSystem.getActiveBoss?.();
    const bossGateLocked = waveSystem.isBossGateLocked?.() ?? false;
    const activeEnemyWave = waveSystem.hasActiveEnemyWave?.() ?? false;
    this.timerText.textContent = isFinale
      ? (activeBoss ? '결전' : activeEnemyWave ? '잔당' : '공성')
      : bossGateLocked || phase === WAVE_PHASES.COMBAT
        ? '교전'
        : isAssault || isBreach
          ? waveSystem.siegeEngaged
            ? `${isAssault ? '공성' : '방어'} ${Math.ceil(waveSystem.timeUntilWave)}`
            : '진군'
          : isWithdrawal
            ? '귀환'
          : Math.max(0, waveSystem.timeUntilWave).toFixed(1);
    if (this.waveLabel) {
      this.waveLabel.textContent = isFinale
        ? activeBoss
          ? 'FINAL WAVE · 지옥 군주 결전'
          : activeEnemyWave
            ? 'FINAL WAVE · 잔존 악마 격퇴'
            : 'FINAL WAVE · 지옥문 최종 공성'
        : bossGateLocked
          ? `WAVE ${waveSystem.aiWaveCount}/${MAX_WAVES} · 보스 교전`
          : phase === WAVE_PHASES.COMBAT
            ? `WAVE ${waveSystem.aiWaveCount}/${MAX_WAVES} · 악마 교전`
            : isAssault
              ? `WAVE ${waveSystem.aiWaveCount}/${MAX_WAVES} · 공성 기회`
              : isBreach
                ? `WAVE ${waveSystem.aiWaveCount}/${MAX_WAVES} · 성당 방어`
                : isWithdrawal
                  ? `WAVE ${waveSystem.aiWaveCount}/${MAX_WAVES} · 부대 귀환`
              : isScout
                ? `WAVE 1/${MAX_WAVES} · 출정 준비`
                : `WAVE ${waveSystem.aiWaveCount + 1}/${MAX_WAVES} · 전장 정비`;
    }
    if (this.wavePreview) {
      this.wavePreview.textContent = isFinale
        ? activeBoss
          ? `${activeBoss.bossName}과 호위대를 모두 격퇴하십시오`
          : activeEnemyWave
            ? '잔존 악마를 격퇴하면 승리합니다'
            : '최후의 정화 완료'
        : bossGateLocked && activeBoss
          ? `${activeBoss.bossName} 격퇴 후 공성 · ${activeBoss.bossCounterHint}`
          : phase === WAVE_PHASES.COMBAT
            ? `현재 악마 부대를 격퇴하십시오 · 다음 ${waveSystem.getUpcomingWavePreview()}`
            : isAssault
              ? waveSystem.siegeEngaged
                ? `지옥문 공격 · ${Math.ceil(waveSystem.timeUntilWave)}초`
                : '지옥문으로 진군 중 · 타격 후 12초 공성'
              : isBreach
                ? waveSystem.siegeEngaged
                  ? `성당 방어 · ${Math.ceil(waveSystem.timeUntilWave)}초`
                  : '악마가 성당으로 접근 중'
                : isWithdrawal
                  ? '부대 귀환 후 헌금이 지급됩니다'
              : isScout
                ? `첫 편성 시간 · ${waveSystem.getUpcomingWavePreview()}`
                : `편성·강화 시간 · ${waveSystem.getUpcomingWavePreview()}`;
    }
    this.updateWaveReadiness(isFinale);
    if (this.launchWaveButton) {
      const canLaunchEarly = waveSystem.canLaunchNextWaveEarly?.() ?? false;
      this.launchWaveButton.disabled = isFinale || !canLaunchEarly;
      this.launchWaveButton.textContent = isFinale
        ? '지옥 군단 전멸 시 승리'
        : bossGateLocked
          ? '대악마 격퇴 필요'
          : phase === WAVE_PHASES.COMBAT
            ? '악마 교전 중'
            : isAssault
              ? '공성 진행 중'
              : isBreach
                ? '성당 방어 중'
                : isWithdrawal
                  ? '부대 귀환 중'
              : isPrepare
                ? '[F] 즉시 진군 · +20'
                : '[F] 조기 개시 · +20';
    }
    
    // Update Base Health
    const pBase = this.game.playerBase;
    const eBase = this.game.enemyBase;
    
    if (pBase) {
      this.pHealthText.textContent = `${Math.ceil(pBase.hp)} / ${pBase.maxHp}`;
      this.pHealthBar.style.width = `${(pBase.hp / pBase.maxHp) * 100}%`;
    }
    
    if (eBase) {
      this.eHealthText.textContent = `${Math.ceil(eBase.hp)} / ${eBase.maxHp}`;
      this.eHealthBar.style.width = `${(eBase.hp / eBase.maxHp) * 100}%`;
      if (this.eDefenseStatus) {
        const sealWavesLeft = Math.max(0, MAX_WAVES - waveSystem.aiWaveCount);
        const heldAtSealCore = sealWavesLeft > 0 && eBase.hp <= 1;
        this.eDefenseStatus.textContent = heldAtSealCore
          ? `봉인핵 1HP · ${sealWavesLeft}W`
          : sealWavesLeft > 0
            ? `봉인 ${sealWavesLeft}W · 포탑 Lv.${eBase.techLevel}`
          : `봉인 해제 · 포탑 Lv.${eBase.techLevel}`;
        this.eDefenseStatus.classList.toggle('unsealed', sealWavesLeft === 0);
      }
    }

    this.updateBossHud();
    this.updateExpeditionMandateStatus();
    if (this.tacticalOrderStats) {
      this.tacticalOrderStats.textContent = getTacticalPerformanceLiveText(
        this.game.runStats?.tacticalPerformance,
        this.game.tacticalOrder
      );
    }
    
    // Keep affordability and rule locks in one place so a locked card can never look purchasable.
    const currentMinerals = this.game.economy.minerals;
    const currentTech = this.game.playerBase?.techLevel ?? 1;
    const queueIsFull = this.game.waveSystem.spawners.player.length >= MAX_SPAWNERS;
    this.buildButtons.forEach(btn => {
      const type = btn.dataset.type;
      const cost = Number(btn.dataset.cost);
      const requiredTech = UNIT_TECH_REQUIREMENTS[type] ?? 1;
      const isLocked = requiredTech > currentTech;
      const isMaxTech = type === 'tech' && currentTech >= MAX_TECH_LEVEL;
      const isUnit = Object.hasOwn(UNIT_TECH_REQUIREMENTS, type);
      const isCoolingDown = type === 'ultimate' && this.game.ultimateCooldown > 0;

      btn.classList.toggle('locked-unit', isLocked);
      btn.disabled = isLocked || isMaxTech || isCoolingDown || currentMinerals < cost || (isUnit && queueIsFull);
    });
  }

  updateExpeditionMandateStatus() {
    if (!this.mandateStatus || !this.mandateStatusText) return;
    const playerBase = this.game.playerBase;
    const live = getExpeditionMandateLiveStatus(this.game.expeditionMandate, {
      playerIntegrity: playerBase ? (playerBase.hp / playerBase.maxHp) * 100 : 0,
      earlyStarts: this.game.runStats?.earlyStarts,
      bossPatternPerformance: this.game.runStats?.bossPatterns
    });
    const nextStatus = `${this.game.expeditionMandate?.name ?? '원정 서약'}|${live.tone}|${live.text}`;
    if (nextStatus === this.lastMandateStatus) return;
    this.lastMandateStatus = nextStatus;
    this.mandateStatus.dataset.tone = live.tone;
    this.mandateStatusText.textContent = live.text;
  }

  updateWaveReadiness(isFinale) {
    if (!this.waveReadiness) return;
    this.waveReadiness.hidden = isFinale;
    if (isFinale) return;

    const counts = Object.fromEntries(
      Object.keys(UNIT_TECH_REQUIREMENTS)
        .map(type => [type, this.game.waveSystem.countSpawners('player', type)])
    );
    const readiness = getWaveReadiness({
      wave: Math.min(MAX_WAVES, this.game.waveSystem.aiWaveCount + 1),
      techLevel: this.game.playerBase?.techLevel ?? 1,
      minerals: this.game.economy.minerals,
      counts
    });
    this.waveReadiness.dataset.level = readiness.level;
    if (this.waveReadinessLabel) {
      this.waveReadinessLabel.textContent =
        `W${readiness.wave} ${readiness.label} ${readiness.met}/${readiness.total}`;
    }
    if (this.waveReadinessAction) {
      this.waveReadinessAction.textContent = readiness.action;
    }
  }

  updateBossHud() {
    if (!this.bossHud) return;
    const boss = this.game.entityManager.entities
      .find(entity => entity.isBoss && entity.isAlive);

    if (!boss) {
      this.bossHud.classList.add('hidden');
      this.bossHud.setAttribute('aria-hidden', 'true');
      return;
    }

    const hpRatio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
    this.bossTier.textContent = boss.bossTierLabel;
    this.bossName.textContent = boss.bossName;
    this.bossHealthText.textContent = `${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;
    this.bossHealthFill.style.transform = `scaleX(${hpRatio})`;
    const hostTactics = getInfernalHostBossTactics(this.game.infernalHost);
    this.bossCounterHint.textContent = `${boss.bossCounterHint} · ${hostTactics.advice}`;
    const ability = boss.getBossAbilityHud?.() ?? { active: false };
    if (this.bossAbility) {
      this.bossAbility.hidden = !ability.active;
      this.bossAbility.dataset.state = ability.state ?? '';
    }
    if (ability.active) {
      this.bossAbilityName.textContent = ability.name;
      this.bossAbilityDetail.textContent = ability.detail;
      this.bossAbilityFill.style.transform = `scaleX(${ability.progress})`;
      const recommendedOrder = getTacticalOrderDefinition(ability.recommendedOrder);
      const orderApplied = this.game.tacticalOrder === recommendedOrder.id;
      if (this.bossResponseButton) {
        this.bossResponseButton.dataset.order = recommendedOrder.id;
        this.bossResponseButton.disabled = orderApplied;
        this.bossResponseButton.classList.toggle('needs-response', !orderApplied);
        this.bossResponseButton.textContent = orderApplied
          ? `✓ [${ability.shortcut}] ${recommendedOrder.label} 적용 중`
          : `지금 [${ability.shortcut}] ${recommendedOrder.label}으로 전환`;
      }
    }
    this.bossHud.classList.remove('hidden');
    this.bossHud.setAttribute('aria-hidden', 'false');
  }
}
