import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('boss response prompt exposes a real tactical order control', async () => {
  const [html, hudSource, css] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/ui/HUD.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="boss-response-btn"/);
  assert.match(hudSource, /this\.game\.setTacticalOrder\(orderId\)/);
  assert.match(hudSource, /needs-response/);
  assert.match(css, /\.boss-response-btn\.needs-response/);
  assert.doesNotMatch(css, /\.boss-response-btn[^}]*text-shadow/s);
});
