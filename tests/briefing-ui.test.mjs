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
  assert.match(css, /\.result-log summary/);
  assert.match(html, /role="group" aria-label="원정 난이도"/);
  assert.match(source, /b\.setAttribute\('aria-pressed', 'false'\)/);
  assert.match(source, /aria-label="\$\{mandate\.name\}/);
});
