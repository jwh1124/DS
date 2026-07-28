# Balance playtest — 2026-07-28

## Test conditions

- Public GitHub Pages build at commit `3c51117`
- Real UI input at 1x speed
- No developer money, auto-spend, or speed controls
- Six independent runs
- Early launch used once in the HARD run as a normal player action

## Baseline results

| Difficulty | Strategy | Outcome | Cathedral integrity | Contracts | Early launches | Tech upgrades |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| EASY | Economy into mixed army | Win | 45% | 14 | 0 | 2 |
| NORMAL | Balanced wide roster | Win | 24% | 16 | 0 | 2 |
| NORMAL | Tech rush | Loss, wave 12 | 0% | 14 | 0 | 2 |
| NORMAL | Economy into tech | Win | 37% | 16 | 0 | 2 |
| HARD | Mixed roster, one tactical early launch | Win by final judgement | 14% | 16 | 1 | 2 |
| INFERNO | Melee-heavy wide roster | Loss, wave 6 | 0% | 15 | 0 | 0 |

## Observations

- Every demon received the same 2x base-damage multiplier as holy units even though the enemy
  gate also had a twelve-wave seal. The cathedral had no equivalent protection.
- HARD lost 41% cathedral health in wave 1 with six contracts.
- INFERNO lost 33% in wave 1 with seven contracts, then fell from 65% to 8% during the wave-6
  miniboss despite fifteen contracts.
- Emergency payouts became the main route to affording base upgrades. Taking catastrophic damage
  was economically more important than defending cleanly.
- Delaying base tech was usually fatal because each upgrade healed 3,000 HP in addition to
  unlocking units and artillery.
- The tooltip still advertised obsolete five-level requirements despite the live three-level tree.

## Changes derived from the runs

- Demon damage against the cathedral: `2.0x → 1.0x`
- Holy exorcism damage against the sealed gate remains `2.0x`
- Base health gained per tech level: `3,000 → 2,000`
- Tooltip requirements aligned with the live three-level tech tree

## Post-change verification

All verification runs used the local corrected build through the same visible UI at 1x speed.
No developer controls were used.

| Difficulty | Strategy | Outcome | Cathedral integrity | Key result |
| --- | --- | --- | ---: | --- |
| NORMAL | Economy first, tech delayed to wave 7 | Loss by final judgement | 39% | Survived all waves but failed to damage the gate enough |
| INFERNO | Same melee-heavy opening as baseline | Loss during final wave | 0% | Survived the wave-6 boss at 49%, reaching the finale instead of dying at wave 6 |
| NORMAL | Tech level 2 by wave 4, then mixed roster | Win | 57% | Gate destroyed, 16 contracts, no early launch |

The corrected NORMAL build therefore has both a verified winning route and a meaningful strategic
loss. INFERNO remains punishing, but its miniboss no longer removes the run before the player can
make a response.
