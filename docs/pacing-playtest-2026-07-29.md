# Wave pacing playtest — 2026-07-29

## Defect reproduced

- A visible NORMAL run fielded four Monks and two Exorcists.
- Early enemy waves were defeated with more than 30 seconds left on the fixed
  40-second combat-to-combat timer.
- The battlefield was empty, but the player still had to wait or repeatedly
  press early launch. The countdown therefore felt like dead time instead of a
  tactical preparation phase.

## Rule applied

- The 40-second interval remains the maximum cadence while enemies are alive.
- Once all non-final enemy wave fighters are defeated, any longer remainder is
  clamped to a 12-second preparation window.
- The countdown is never increased if fewer than 12 seconds remain.
- The first-wave preparation, active boss gate, and final wave are not
  accelerated.
- The HUD explicitly changes to `전장 정비`, reports `악마 전멸`, and changes
  the action to `[F] 즉시 진군 · +20`.

## Visible verification

- Local NORMAL run, real UI input, one developer resource grant for repeatable
  formation setup.
- Formation: four Monks and two Exorcists; speed controls were used only to
  shorten observation time.
- After an early wave was cleared, the HUD changed from roughly 30 seconds
  remaining to `WAVE 3/12 · 전장 정비` at 10.5 seconds.
- A later clear reproduced the same state at 10.8 seconds and showed the
  `즉시 진군` action.
- In a five-enemy live wave, both bases took damage: the cathedral reached
  `9,426 / 10,000` and the level-2 gate reached `9,253 / 12,000`. This was a
  pacing regression check, not a replacement for the full no-cheat balance
  runs in `balance-playtest-2026-07-28.md`.

## Automated coverage

- Clear battlefield: 35 seconds contracts to 12.
- Less than 12 seconds remaining: countdown is not increased.
- Active enemies, first wave, boss gate, and final wave: no contraction.
