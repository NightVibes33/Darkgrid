import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const res = path.resolve(here, '../SafariExtension/Resources');
const browser = await webkit.launch({ headless: true });
const page = await browser.newPage();

await page.setContent(`<!doctype html><html class="mode-light"><head><style>
#solid{background:#fff;color:#000}.alpha{background:rgba(255,255,255,.1)}
.pseudo::before{content:"x";background:#fff;color:#000}.mode-light #rootcard{background:#fff}.mode-dark #rootcard{background:#191919}
</style></head><body><div id=solid>solid</div><div id=alpha class=alpha>alpha</div><div id=pseudo class=pseudo></div><div id=rootcard>root</div><div id=dynamic style="background:#fff">dyn</div><div id=shadow></div><svg id=icon><path d="M0 0h10v10H0z" fill="#000"/></svg></body></html>`);

await page.evaluate(() => {
  const listeners = [];
  const settings = { enabled:true, accentColor:'#00FF66', frostTint:true, colorLinks:false, colorBorders:true, colorAllText:true, edgeGlow:true, excludedDomains:[] };
  window.browser = {
    storage: {
      local: { get: async keys => Object.fromEntries(keys.map(k => [k, settings[k]])), set: async () => {} },
      onChanged: { addListener: fn => listeners.push(fn) }
    },
    runtime: { onMessage: { addListener: () => {} } }
  };
  const host = document.querySelector('#shadow');
  host.attachShadow({mode:'open'}).innerHTML = '<style>.card{background:#fff;color:#000}</style><div class=card>shadow text</div>';
});

await page.addStyleTag({ path: path.join(res, 'theme.css') });
await page.addScriptTag({ path: path.join(res, 'surface-engine.js') });
await page.addScriptTag({ path: path.join(res, 'content.js') });
await page.waitForTimeout(180);

const result = await page.evaluate(() => ({
  solid: getComputedStyle(document.querySelector('#solid')).backgroundColor,
  alpha: getComputedStyle(document.querySelector('#alpha')).backgroundColor,
  pseudo: getComputedStyle(document.querySelector('#pseudo'),'::before').backgroundColor,
  shadow: getComputedStyle(document.querySelector('#shadow').shadowRoot.querySelector('.card')).backgroundColor,
  svg: getComputedStyle(document.querySelector('#icon path')).fill,
  glow: getComputedStyle(document.documentElement,'::after').content
}));

assert.notEqual(result.solid, 'rgb(255, 255, 255)');
assert.match(result.alpha, /rgba\([^)]*,\s*0\.1\)/);
assert.notEqual(result.pseudo, 'rgb(255, 255, 255)');
assert.notEqual(result.shadow, 'rgb(255, 255, 255)');
assert.notEqual(result.svg, 'rgb(0, 0, 0)');
assert.ok(result.glow === 'none' || result.glow === 'normal');

await page.evaluate(() => document.querySelector('#dynamic').style.backgroundColor = 'rgb(255,0,0)');
await page.waitForTimeout(120);
assert.notEqual(await page.$eval('#dynamic', e => getComputedStyle(e).backgroundColor), 'rgb(255, 0, 0)');

await page.evaluate(() => {
  document.documentElement.classList.remove('mode-light');
  document.documentElement.classList.add('mode-dark');
});
await page.waitForTimeout(120);
assert.notEqual(await page.$eval('#rootcard', e => getComputedStyle(e).backgroundColor), 'rgb(25, 25, 25)');

await browser.close();
console.log('browser integration passed');
