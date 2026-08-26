import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const resources = path.resolve(here, '../SafariExtension/Resources');
const browser = await webkit.launch({ headless: true });
const page = await browser.newPage();

let html = fs.readFileSync(path.join(resources, 'popup.html'), 'utf8');
html = html
  .replace(/<link[^>]+popup\.css[^>]*>/i, '')
  .replace(/<script[^>]+surface-engine\.js[^>]*><\/script>/i, '')
  .replace(/<script[^>]+popup\.js[^>]*><\/script>/i, '');

await page.setContent(html);

await page.evaluate(() => {
  const state = {
    enabled: true,
    accentColor: '#00F5FF',
    frostTint: true,
    colorLinks: true,
    colorBorders: true,
    colorAllText: false,
    edgeGlow: false,
    excludedDomains: []
  };

  window.__state = state;
  window.__writes = [];
  window.__storageListener = null;

  window.browser = {
    tabs: {
      query: async () => [{ url: 'https://example.com/path' }]
    },
    storage: {
      local: {
        get: async keys => Object.fromEntries(keys.map(key => [key, state[key]])),
        set: async patch => {
          const changes = {};
          for (const [key, value] of Object.entries(patch)) {
            changes[key] = { oldValue: state[key], newValue: value };
            state[key] = value;
          }
          window.__writes.push(structuredClone(patch));
          queueMicrotask(() => window.__storageListener?.(changes, 'local'));
        }
      },
      onChanged: {
        addListener: listener => {
          window.__storageListener = listener;
        }
      }
    }
  };
});

await page.addScriptTag({ path: path.join(resources, 'surface-engine.js') });
await page.addScriptTag({ path: path.join(resources, 'popup.js') });

await page.waitForFunction(() =>
  document.querySelector('#domain').textContent === 'example.com'
  && document.querySelector('#statusText').textContent === 'ACTIVE'
);

await page.evaluate(() => {
  const picker = document.querySelector('#colorPicker');
  picker.value = '#010101';
  picker.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('.preset[data-color="#B026FF"]').click();
});

await page.waitForTimeout(180);

const race = await page.evaluate(() => ({
  stateAccent: window.__state.accentColor,
  displayedAccent: document.querySelector('#hexColor').value,
  writes: window.__writes.map(item => item.accentColor).filter(Boolean),
  pressed: document.querySelector('.preset[data-color="#B026FF"]').getAttribute('aria-pressed')
}));

assert.equal(race.stateAccent, '#B026FF', 'preset click must cancel a pending custom-color save');
assert.equal(race.displayedAccent, '#B026FF');
assert.equal(race.writes.at(-1), '#B026FF', 'stale custom-color timer must never overwrite the preset');
assert.equal(race.pressed, 'true');

await page.evaluate(() => {
  window.__state.enabled = false;
  window.__storageListener?.({ enabled: { oldValue: true, newValue: false } }, 'local');
});
await page.waitForFunction(() => document.querySelector('#statusText').textContent === 'OFF');
assert.equal(await page.$eval('#enabled', input => input.checked), false);

await page.fill('#hexColor', 'nothex');
await page.dispatchEvent('#hexColor', 'change');
await page.waitForFunction(() => document.querySelector('#errorText').textContent.includes('six-digit hex color'));
assert.equal(await page.$eval('#hexColor', input => input.value), '#B026FF');

for (const id of ['frostTint', 'colorLinks', 'colorBorders', 'colorAllText', 'edgeGlow']) {
  const labelled = await page.$eval(`#${id}`, input =>
    Boolean(input.getAttribute('aria-labelledby')) && Boolean(input.getAttribute('aria-describedby'))
  );
  assert.equal(labelled, true, `${id} must be labelled and described for assistive technology`);
}

await browser.close();
console.log('popup integration passed');
