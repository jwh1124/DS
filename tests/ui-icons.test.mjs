import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getDoctrineChoices } from '../src/doctrines.js';
import { getTechUpgradeCost } from '../src/gameConfig.js';
import { iconMarkup } from '../src/ui/icons.js';

const STRUCTURAL_EMOJI = /[✝☠🕊🔥⛪💰🔊🔇🤖💎🕯📖⚡🙏👼⚔🔒⚠🛡]/u;

test('structural UI uses the shared SVG icon set', async () => {
  const [indexHtml, sprite] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/icons.svg', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(indexHtml, STRUCTURAL_EMOJI);

  const doctrineIcons = [3, 6, 9]
    .flatMap(wave => getDoctrineChoices(wave))
    .map(doctrine => doctrine.icon);

  for (const icon of doctrineIcons) {
    assert.match(sprite, new RegExp(`id="ui-${icon}"`));
    assert.match(iconMarkup(icon), new RegExp(`icons\\.svg#ui-${icon}`));
  }
});

test('unknown icon names safely fall back to the holy cross', () => {
  const markup = iconMarkup('"><script>alert(1)</script>');
  assert.match(markup, /icons\.svg#ui-cross/);
  assert.doesNotMatch(markup, /script/);
});

test('initial level-two tech button matches the live economy rule', async () => {
  const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const levelTwoCost = getTechUpgradeCost(1);

  assert.match(indexHtml, new RegExp(`data-type="tech" data-cost="${levelTwoCost}"`));
  assert.match(indexHtml, new RegExp(`mineral-icon small"></div> ${levelTwoCost}</span>`));
});

test('contract cancellation messaging keeps deployed units in the current wave', async () => {
  const [indexHtml, mainJs] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../main.js', import.meta.url), 'utf8')
  ]);

  assert.match(indexHtml, /출전 중인 분대는 이번 웨이브까지 전투/);
  assert.match(mainJs, /다음 웨이브부터 제외/);
  assert.doesNotMatch(mainJs, /recalledUnits\.forEach\(unit => \{ unit\.isAlive = false; \}\)/);
});
