# Frontline camera playtest — 2026-07-29

## Defect reproduced

- A developer-mode NORMAL run used 3x speed, one resource grant, auto-spend, and an early launch.
- By wave 2, the minimap showed both armies fighting near the infernal side while the main view
  remained on the empty cathedral approach.
- Combat feedback, counter matchups, and unit deaths were therefore occurring outside the
  player's view unless the player held the manual camera key.

## Camera rules applied

- Automatic frontline tracking is enabled by default.
- Before engagement, the camera follows the holy advance with 180 world units of look-ahead.
- Once opposing fronts are within 900 world units, the camera frames their midpoint.
- A single advancing army receives 120 world units of look-ahead.
- A 90 px deadzone prevents small formation changes from moving the camera.
- Frame-rate-independent exponential smoothing moves toward the target and world bounds remain
  clamped.
- Manual A/D or arrow input disables automatic tracking. Space or the target button restores it.
- Screen shake remains an additive visual offset and does not change the camera follow target.

## Visible verification

- The same NORMAL 3x setup reached wave 2 with both formations visible around the center of the
  main view instead of only on the minimap.
- The camera control reported `aria-pressed="true"` while following.
- A real `D` key press changed it to `false`; a real `Space` key press restored `true`.
- Automated tests cover opposing fronts, single-army look-ahead, non-unit exclusion, deadzone,
  bounds, and frame-rate-independent smoothing.
