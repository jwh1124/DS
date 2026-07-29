# Tactical orders playtest — 2026-07-29

## Player-agency gap

- Once a roster was purchased, combat targeting was fully automatic.
- Every attacker ranked targets only by distance and its built-in role bonus.
- The player could not respond when support demons stayed behind a frontline or
  when a boss escort distracted the intended boss counters.

## Orders added

- `[7] 균형 전투`: unchanged distance and role-counter behaviour.
- `[8] 후열 처단`: holy attackers with at least 150 range receive a target
  score bonus against ranged, healer, and sniper demons.
- `[9] 대악마 집중`: all holy attackers receive a larger score bonus against
  bosses and a smaller bonus against heavy demons.
- Orders never increase damage, health, range, or attack speed.
- Enemy AI, healer targeting, and base targeting receive no order bonus.

## Visible verification

- Local NORMAL run through the real UI.
- Formation: five Monks and four Exorcists, which produces a nine-unit formation
  with a rear row.
- The initial order showed `균형` with `aria-pressed="true"`.
- Clicking `후열` changed the hint to ranged/support priority and recorded the
  order in the developer battle log.
- Pressing the real `9` key changed `aria-pressed` to `대형`, updated the hint,
  and recorded `대악마 집중` in the battle log.
- The compact command panel remained readable without covering the battlefield,
  minimap, or bottom roster at the 1280×720 reference layout.

## Automated coverage

- Stable order IDs and safe fallback to balanced.
- Rear order excludes melee holy units, heavy demons, bases, and enemy AI.
- Boss order distinguishes bosses from ordinary heavy units.
- Both focused orders can overturn a nearer default target without changing
  combat stats.
