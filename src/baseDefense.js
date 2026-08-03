export function resolveInfernalGateDamage({
  hp,
  maxHp,
  amount,
  wave,
  bossGateLocked = false
}) {
  const safeHp = Math.max(0, Number(hp) || 0);
  const safeMaxHp = Math.max(1, Number(maxHp) || 1);
  const safeDamage = Math.max(0, Number(amount) || 0);

  if (bossGateLocked) {
    return {
      nextHp: safeHp,
      blockedByBoss: true,
      heldBySeal: false
    };
  }

  // The campaign seal prevents an early ending, but it should not erase siege
  // damage behind a misleading 12% health floor. Leave only the seal core.
  const sealFloor = 1;
  const rawNextHp = safeHp - safeDamage;
  const heldBySeal = Number(wave) < 12 && rawNextHp <= sealFloor;

  return {
    nextHp: Number(wave) < 12 ? Math.max(sealFloor, rawNextHp) : rawNextHp,
    blockedByBoss: false,
    heldBySeal
  };
}
