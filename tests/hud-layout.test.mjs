import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('top HUD keeps utility controls in the center stack', async () => {
  const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../style.css', import.meta.url), 'utf8');

  assert.match(indexHtml, /class="center-hud-stack"[\s\S]*class="wave-timer"[\s\S]*class="utility-controls"/);
  assert.match(styles, /\.center-hud-stack\s*\{[\s\S]*flex-direction:\s*column/);
  assert.doesNotMatch(styles, /\.utility-controls\s*\{[^}]*position:\s*absolute/);
});

test('combat diagnostics require an explicit dev query body class', async () => {
  const [indexHtml, mainSource, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../main.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8')
  ]);

  assert.match(indexHtml, /id="debug-monitor" class="debug-panel url-developer-only"/);
  assert.match(mainSource, /hasDeveloperQuery\s*=\s*searchParams\.has\('dev'\)/);
  assert.match(mainSource, /classList\.toggle\('url-developer-mode', this\.hasDeveloperQuery\)/);
  assert.match(styles, /body\.url-developer-mode \.url-developer-only/);
});
