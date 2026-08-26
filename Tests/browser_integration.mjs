import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const resources = path.resolve(here, '../SafariExtension/Resources');
const browser = await webkit.launch({ headless: true });
const page = await browser.newPage();

await page.setContent(`<!doctype html><html class="mode-light"><head><style>
#solid{background:#fff;color:#000}.alpha{background:rgba(255,255,255,.1)}
.pseudo::before{content:"x";background:#fff;color:#000}
.mode-light #rootcard{background:#fff}.mode-dark #rootcard{background:#191919}
</style></head><body>
<div id="solid">solid</div>
<div id="alpha" class="alpha">alpha</div>
<div id="pseudo" class="pseudo"></div>
<div id="rootcard">root</div>
<div id="dynamic" style="background:#fff">dyn</div>
<div id="transparentBorder" style="border:1px solid transparent">border</div>
<div id="photo" style="background-image:url('data:image/png;base64,iVBORw0KGgo=');background-color:#fff">photo</div>
<div id="newtext"></div>
<a id="link" href="#">link</a>
<div id="shadow"></div>
<svg id="icon"><path d="M0 0h10v10H0z" fill="#000"/></svg>
</body></html>`);

await page.evaluate(() => {
  const settings = {
    enabled:true, accentColor:'#00FF66', frostTint:true, colorLinks:false,
    colorBorders:true, colorAllText:true, edgeGlow:true, excludedDomains:[]
  };
  window.browser = {
    storage: {
      local: { get: async keys => Object.fromEntries(keys.map(key => [key, settings[key]])), set: async () => {} },
      onChanged: { addListener: () => {} }
    },
    runtime: { onMessage: { addListener: () => {} } }
  };
  document.querySelector('#shadow').attachShadow({mode:'open'}).innerHTML =
    '<style>.card{background:#fff;color:#000}</style><div class="card">shadow text</div>';
});

await page.addStyleTag({ path: path.join(resources, 'theme.css') });
await page.addScriptTag({ path: path.join(resources, 'surface-engine.js') });
await page.addScriptTag({ path: path.join(resources, 'content.js') });
await page.waitForTimeout(220);

const initial = await page.evaluate(() => ({
  solid: getComputedStyle(document.querySelector('#solid')).backgroundColor,
  solidText: getComputedStyle(document.querySelector('#solid')).color,
  alpha: getComputedStyle(document.querySelector('#alpha')).backgroundColor,
  pseudo: getComputedStyle(document.querySelector('#pseudo'),'::before').backgroundColor,
  shadow: getComputedStyle(document.querySelector('#shadow').shadowRoot.querySelector('.card')).backgroundColor,
  shadowStyle: Boolean(document.querySelector('#shadow').shadowRoot.querySelector('style[data-darkgrid-shadow-style]')),
  svg: getComputedStyle(document.querySelector('#icon path')).fill,
  svgManaged: document.querySelector('#icon path').hasAttribute('data-darkgrid-svg-fill'),
  link: getComputedStyle(document.querySelector('#link')).color,
  photoMapped: document.querySelector('#photo').hasAttribute('data-darkgrid-surface'),
  transparentBorderMapped: document.querySelector('#transparentBorder').hasAttribute('data-darkgrid-border'),
  glowPseudo: getComputedStyle(document.documentElement,'::after').content,
  dynamic: getComputedStyle(document.querySelector('#dynamic')).backgroundColor,
  rootcard: getComputedStyle(document.querySelector('#rootcard')).backgroundColor
}));

assert.notEqual(initial.solid, 'rgb(255, 255, 255)');
assert.equal(initial.solidText, 'rgb(0, 255, 102)', 'Color All Text must include direct div text');
assert.match(initial.alpha, /rgba\([^)]*,\s*0\.1\)/, 'semi-transparent surfaces must preserve alpha');
assert.notEqual(initial.pseudo, 'rgb(255, 255, 255)');
assert.notEqual(initial.shadow, 'rgb(255, 255, 255)');
assert.equal(initial.shadowStyle, true);
assert.notEqual(initial.svg, 'rgb(0, 0, 0)');
assert.equal(initial.svgManaged, true, 'SVG paint repair must survive the full tree scan');
assert.notEqual(initial.link, 'rgb(0, 255, 102)', 'Color Links OFF must override Color All Text ON');
assert.equal(initial.photoMapped, false, 'raster background pixels must not be frosted');
assert.equal(initial.transparentBorderMapped, false, 'transparent borders must remain invisible');
assert.ok(initial.glowPseudo === 'none' || initial.glowPseudo === 'normal', 'edge glow must not be a viewport overlay');

await page.evaluate(() => { document.querySelector('#dynamic').style.backgroundColor = 'rgb(255,0,0)'; });
await page.waitForTimeout(140);
const dynamicAfter = await page.$eval('#dynamic', element => getComputedStyle(element).backgroundColor);
assert.notEqual(dynamicAfter, 'rgb(255, 0, 0)');
assert.notEqual(dynamicAfter, initial.dynamic, 'inline style mutation must recalculate its mapped surface');

await page.evaluate(() => {
  document.documentElement.classList.remove('mode-light');
  document.documentElement.classList.add('mode-dark');
});
await page.waitForTimeout(140);
const rootAfter = await page.$eval('#rootcard', element => getComputedStyle(element).backgroundColor);
assert.notEqual(rootAfter, initial.rootcard, 'root theme class changes must remap the document');

await page.evaluate(() => document.querySelector('#newtext').append(document.createTextNode('added later')));
await page.waitForTimeout(120);
assert.equal(await page.$eval('#newtext', element => element.hasAttribute('data-darkgrid-text')), true, 'new text nodes must be classified');

await browser.close();
console.log('browser integration passed');
