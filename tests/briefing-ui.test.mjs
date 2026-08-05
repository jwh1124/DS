import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('infernal scouting separates advice, chronicle, mastery, and bounty information', async () => {
  const [html, source, css] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../main.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8')
  ]);
  for (const id of ['infernal-host-detail', 'infernal-host-chronicle', 'infernal-host-mastery', 'infernal-host-bounty']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(source, /숙련 활성/);
  assert.match(css, /\.infernal-host-meta/);
  assert.match(source, /mandate-bounty-label/);
  assert.match(css, /\.mandate-choice\.is-bounty/);
  assert.match(html, /<details class="result-log">/);
  assert.match(html, /<details class="mission-details">/);
  assert.match(html, /<details class="expedition-options">/);
  assert.match(html, /id="developer-mode-btn"/);
  assert.match(html, /편성 → 교전 → 공성 → 귀환·헌금 → 준비/);
  assert.match(html, /헌금 \(귀환 후\)/);
  assert.match(css, /\.result-log summary/);
  assert.match(css, /\.developer-mode-toggle/);
  assert.match(html, /role="group" aria-label="원정 난이도"/);
  assert.match(html, /id="commander-choices"/);
  assert.match(html, /id="campaign-region-map"/);
  assert.match(source, /selectCampaignCommander/);
  assert.match(source, /selectCampaignRegion/);
  assert.match(css, /\.campaign-planning/);
  assert.match(source, /b\.setAttribute\('aria-pressed', 'false'\)/);
  assert.match(source, /aria-label="\$\{mandate\.name\}/);
  assert.match(source, /e\.key === 'F10'/);
  assert.match(source, /exorcism-developer-mode/);
});
