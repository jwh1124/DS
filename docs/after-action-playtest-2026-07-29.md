# After-action report playtest — 2026-07-29

## Defect reproduced

- A final-judgement loss could leave the cathedral standing, but the old result
  screen still said that the cathedral had collapsed.
- The result screen listed purchase counts without explaining the actual
  outcome or giving a useful next-run adjustment.
- Keyboard focus was not deliberately moved into the result dialog.

## Changes

- Base destruction and final judgement now send distinct end reasons.
- The report shows reached wave, both base integrity values, final roster size,
  tech level, miracle use, early launches, composition, and selected doctrines.
- Recommendations are derived from the actual run:
  - early defeat with a thin frontline;
  - boss defeat without Priest/Inquisitor support;
  - late tech;
  - an unused miracle;
  - insufficient gate pressure at final judgement;
  - low-integrity or judgement victories.
- The result is an accessible dialog and focuses the retry button when opened.

## Visible verification

- Local INFERNO run through the real title and gameplay UI.
- No units were purchased, and one early launch was used.
- Cathedral integrity fell from `10,000` to `7,638`, `4,260`, `2,450`, and
  finally `0` during wave 4.
- The rendered report correctly showed:
  - `4 / 12` reached;
  - cathedral `0%`;
  - infernal gate `100%`;
  - final formation `0`;
  - recommendation `초반 전열이 너무 얇았습니다`;
  - concrete advice to begin with at least three Monks.
- The retry button received focus and reset both bases, the roster, economy,
  doctrine summary, and first-wave countdown.

## Automated coverage

- Final-judgement defeat never claims that the cathedral collapsed.
- Early frontline, boss-support, and successful-run recommendations are
  checked independently.
- Victory output includes grade, roster composition, and doctrine record.
