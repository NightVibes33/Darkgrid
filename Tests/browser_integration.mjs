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
img{opacity:.4;filter:grayscale(1)}
</style>
</head>
<body>
<main>
  <div class="card" id="card">
    <h1 id="title">Repositories</h1>
    <a id="link" href="#">Darkgrid</a>
    <button id="button">Star</button>
    <img id="media" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=">
  </div>
  <div id="dynamic">dynamic</div>
</main>
</body>
</html>`);

await page.evaluate(() => {
  const settings = {
    enabled: true,
    accentColor: '#FF1744',
    frostTint: true,
    colorLinks: true,
    colorBorders: true,
    colorAllText: false,
    edgeGlow: false,
    excludedDomains: []
  };

  window.browser = {
    storage: {
      local: {
        get: async keys => Object.fromEntries(keys.map(key => [key, settings[key]])),
        set: async patch => Object.assign(settings, patch)
      },
      onChanged: { addListener: () => {} }
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
  mainBg: getComputedStyle(document.querySelector('main')).backgroundColor,
  cardBg: getComputedStyle(document.querySelector('#card')).backgroundColor,
  title: getComputedStyle(document.querySelector('#title')).color,
  link: getComputedStyle(document.querySelector('#link')).color,
  buttonBg: getComputedStyle(document.querySelector('#button')).backgroundColor,
  buttonBorder: getComputedStyle(document.querySelector('#button')).borderTopColor,
  frostContent: getComputedStyle(document.documentElement, '::before').content,
  frostBackground: getComputedStyle(document.documentElement, '::before').backgroundImage,
  mediaOpacity: getComputedStyle(document.querySelector('#media')).opacity,
  mediaFilter: getComputedStyle(document.querySelector('#media')).filter
}));

assert.equal(result.htmlBg, 'rgb(0, 0, 0)', 'page root must be true black');
assert.equal(result.bodyBg, 'rgb(0, 0, 0)', 'body must be true black');
assert.equal(result.mainBg, 'rgb(0, 0, 0)', 'major surfaces must be true black');
assert.equal(result.cardBg, 'rgba(0, 0, 0, 0)', 'generic containers must stay transparent over black');
assert.equal(result.title, 'rgb(231, 231, 231)', 'normal text must stay neutral white');
assert.equal(result.link, 'rgb(255, 23, 68)', 'links use the selected accent');
assert.equal(result.buttonBg, 'rgb(5, 5, 5)', 'controls stay near-black');
assert.notEqual(result.buttonBorder, 'rgb(53, 53, 53)', 'border coloring must use the accent');
assert.notEqual(result.frostContent, 'none', 'frost overlay must exist');
assert.match(result.frostBackground, /linear-gradient/, 'frost must be the original global gradient');
assert.equal(result.mediaOpacity, '1', 'original renderer normalizes media opacity');
assert.equal(result.mediaFilter, 'none', 'original renderer removes media filters');

await page.evaluate(() => {
  const node = document.createElement('section');
  node.id = 'late';
  node.innerHTML = '<a href="#">late link</a>';
  document.body.append(node);
});
const late = await page.$eval('#late a', e => getComputedStyle(e).color);
assert.equal(late, 'rgb(255, 23, 68)', 'late content must inherit the CSS theme automatically');

await browser.close();
console.log('browser integration passed');
