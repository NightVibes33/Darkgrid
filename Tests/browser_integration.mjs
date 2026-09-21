import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const resources = path.resolve(here, '../SafariExtension/Resources');
const browser = await webkit.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 600, height: 800 } });

await page.setContent(`<!doctype html>
<html>
<head>
<style>
html,body{margin:0;background:#fff;color:#111}
main{background:#fff;padding:20px}
.card{background:#f5f5f5;border:1px solid #ccc;padding:14px}
a{color:#0969da}
button{background:#fff;color:#111;border:1px solid #aaa}
</style>
</head>
<body>
<main id="main">
  <div class="card" id="card">
    <h1 id="title">Repositories</h1>
    <a id="link" href="#">Darkgrid</a>
    <button id="button">Star</button>
  </div>
</main>
</body>
</html>`);

await page.evaluate(() => {
  const settings = {
    enabled: true,
    accentColor: '#FF1744',
    frostTint: false,
    colorLinks: true,
    colorBorders: true,
    colorAllText: false,
    edgeGlow: false,
    excludedDomains: []
  };

  window.__settings = settings;
  window.__storageListener = null;
  window.browser = {
    storage: {
      local: {
        get: async keys => Object.fromEntries(keys.map(key => [key, settings[key]])),
        set: async patch => Object.assign(settings, patch)
      },
      onChanged: {
        addListener: listener => { window.__storageListener = listener; }
      }
    },
    runtime: { onMessage: { addListener: () => {} } }
  };
});

await page.addStyleTag({ path: path.join(resources, 'theme.css') });
await page.addScriptTag({ path: path.join(resources, 'content.js') });
await page.waitForFunction(() => document.documentElement.classList.contains('darkgrid-on'));

const result = await page.evaluate(() => ({
  htmlBg: getComputedStyle(document.documentElement).backgroundColor,
  bodyBg: getComputedStyle(document.body).backgroundColor,
  mainBg: getComputedStyle(document.querySelector('#main')).backgroundColor,
  cardBg: getComputedStyle(document.querySelector('#card')).backgroundColor,
  title: getComputedStyle(document.querySelector('#title')).color,
  link: getComputedStyle(document.querySelector('#link')).color,
  buttonBg: getComputedStyle(document.querySelector('#button')).backgroundColor,
  buttonBorder: getComputedStyle(document.querySelector('#button')).borderTopColor,
  frost: getComputedStyle(document.documentElement, '::before').content
}));

assert.equal(result.htmlBg, 'rgb(0, 0, 0)', 'selected accent must not tint the page root');
assert.equal(result.bodyBg, 'rgb(0, 0, 0)', 'selected accent must not tint the body');
assert.equal(result.mainBg, 'rgba(0, 0, 0, 0)', 'major surfaces remain transparent over the true-black body');
assert.equal(result.cardBg, 'rgba(0, 0, 0, 0)', 'generic containers remain transparent over black');
assert.equal(result.title, 'rgb(231, 231, 231)', 'normal text stays neutral when Color All Text is off');
assert.equal(result.link, 'rgb(255, 23, 68)', 'selected red applies to links');
assert.equal(result.buttonBg, 'rgb(5, 5, 5)', 'controls remain neutral black');
assert.notEqual(result.buttonBorder, 'rgb(53, 53, 53)', 'selected red applies to borders');
assert.equal(result.frost, 'none', 'Frost Tint off must mean no page-wide tint layer');

// Frost is still available as an explicit independent option.
await page.evaluate(() => {
  window.__settings.frostTint = true;
  window.__storageListener?.(
    { frostTint: { oldValue: false, newValue: true } },
    'local'
  );
});
await page.waitForFunction(() => document.documentElement.classList.contains('darkgrid-frost'));
const frost = await page.evaluate(() => ({
  content: getComputedStyle(document.documentElement, '::before').content,
  background: getComputedStyle(document.documentElement, '::before').backgroundImage
}));
assert.notEqual(frost.content, 'none');
assert.match(frost.background, /linear-gradient/);

await browser.close();
console.log('browser integration passed');
