import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const resources = path.resolve(here, '../SafariExtension/Resources');
const browser = await webkit.launch({ headless: true });
const page = await browser.newPage();

await page.setContent(`<!doctype html><html class="mode-light"><head><style>
#solid{background:#fff;color:#000}
.alpha{background:rgba(255,255,255,.1)}
.pseudo::before{content:"x";background:#fff;color:#000;box-shadow:0 0 8px rgba(255,255,255,.8)}
.pseudoGradient::before{content:"";display:block;width:10px;height:10px;background:linear-gradient(#fff,#aaa)}
.mode-light #rootcard{background:#fff}.mode-dark #rootcard{background:#191919}
#attrHost[data-state="light"] #attrcard{background:#fff}
#attrHost[data-state="dark"] #attrcard{background:#242424}
</style></head><body>
<div id="solid">solid</div>
<div id="alpha" class="alpha">alpha</div>
<div id="pseudo" class="pseudo"></div>
<div id="pseudoGradient" class="pseudoGradient"></div>
<div id="rootcard">root</div>
<div id="attrHost" data-state="light"><div id="attrcard">attribute driven</div></div>
<div id="dynamic" style="background:#fff">dyn</div>
<div id="transparentBorder" style="border:1px solid transparent">border</div>
<div id="photo" style="background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');background-color:#fff">photo</div>
<img id="media" alt="pixel" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" style="opacity:.4;filter:grayscale(1);mix-blend-mode:multiply">
<div id="newtext"></div>
<a id="link" href="#">link</a>
<div id="shadow"></div>
<svg id="icon" width="10" height="10"><path d="M0 0h10v10H0z" fill="#000"/></svg>
</body></html>`);

await page.evaluate(() => {
  const settings = {
    enabled: true,
    accentColor: '#00FF66',
    frostTint: true,
    colorLinks: false,
    colorBorders: true,
    colorAllText: true,
    edgeGlow: true,
    excludedDomains: []
  };

  window.browser = {
    storage: {
      local: {
        get: async keys => Object.fromEntries(keys.map(key => [key, settings[key]])),
        set: async () => {}
      },
      onChanged: { addListener: () => {} }
    },
    runtime: { onMessage: { addListener: () => {} } }
  };

  document.querySelector('#shadow').attachShadow({ mode: 'open' }).innerHTML =
    '<style>.card{background:#fff;color:#000}.card::before{content:"s";background:#fff}</style><div class="card">shadow text</div>';
});

await page.addStyleTag({ path: path.join(resources, 'theme.css') });
await page.addScriptTag({ path: path.join(resources, 'surface-engine.js') });
await page.addScriptTag({ path: path.join(resources, 'content.js') });

await page.waitForFunction(() =>
  document.documentElement.classList.contains('darkgrid-on')
  && document.querySelector('#solid').hasAttribute('data-darkgrid-surface')
  && document.querySelector('#shadow').shadowRoot.querySelector('.card').hasAttribute('data-darkgrid-surface')
);

const initial = await page.evaluate(() => ({
  solid: getComputedStyle(document.querySelector('#solid')).backgroundColor,
  solidText: getComputedStyle(document.querySelector('#solid')).color,
  alpha: getComputedStyle(document.querySelector('#alpha')).backgroundColor,
  pseudo: getComputedStyle(document.querySelector('#pseudo'), '::before').backgroundColor,
  pseudoShadow: getComputedStyle(document.querySelector('#pseudo'), '::before').boxShadow,
  pseudoGradientBase: getComputedStyle(document.querySelector('#pseudoGradient'), '::before').backgroundColor,
  shadow: getComputedStyle(document.querySelector('#shadow').shadowRoot.querySelector('.card')).backgroundColor,
  shadowPseudo: getComputedStyle(document.querySelector('#shadow').shadowRoot.querySelector('.card'), '::before').backgroundColor,
  shadowStyle: Boolean(document.querySelector('#shadow').shadowRoot.querySelector('style[data-darkgrid-shadow-style]')),
  svg: getComputedStyle(document.querySelector('#icon path')).fill,
  svgManaged: document.querySelector('#icon path').hasAttribute('data-darkgrid-svg-fill'),
  link: getComputedStyle(document.querySelector('#link')).color,
  photoMapped: document.querySelector('#photo').hasAttribute('data-darkgrid-surface'),
  transparentBorderMapped: document.querySelector('#transparentBorder').hasAttribute('data-darkgrid-border'),
  glowPseudo: getComputedStyle(document.documentElement, '::after').content,
  mediaOpacity: getComputedStyle(document.querySelector('#media')).opacity,
  mediaFilter: getComputedStyle(document.querySelector('#media')).filter,
  mediaBlend: getComputedStyle(document.querySelector('#media')).mixBlendMode,
  dynamic: getComputedStyle(document.querySelector('#dynamic')).backgroundColor,
  rootcard: getComputedStyle(document.querySelector('#rootcard')).backgroundColor,
  attrcard: getComputedStyle(document.querySelector('#attrcard')).backgroundColor
}));

assert.notEqual(initial.solid, 'rgb(255, 255, 255)');
assert.equal(initial.solidText, 'rgb(0, 255, 102)', 'Color All Text must include direct div text');
assert.match(initial.alpha, /rgba\([^)]*,\s*0\.1\)/, 'semi-transparent surfaces must preserve alpha');
assert.notEqual(initial.pseudo, 'rgb(255, 255, 255)', 'pseudo-element backgrounds must be mapped');
assert.notEqual(initial.pseudoShadow, 'rgb(255, 255, 255) 0px 0px 8px 0px', 'bright pseudo shadows must be rewritten');
assert.notEqual(initial.pseudoGradientBase, 'rgba(0, 0, 0, 0)', 'gradient-only pseudo-elements need a dark blend base');
assert.notEqual(initial.shadow, 'rgb(255, 255, 255)', 'open Shadow DOM surfaces must be mapped');
assert.notEqual(initial.shadowPseudo, 'rgb(255, 255, 255)', 'Shadow DOM pseudo-elements must be mapped');
assert.equal(initial.shadowStyle, true);
assert.notEqual(initial.svg, 'rgb(0, 0, 0)', 'simple dark SVG UI icons must remain visible');
assert.equal(initial.svgManaged, true, 'SVG paint repair must survive the full tree scan');
assert.notEqual(initial.link, 'rgb(0, 255, 102)', 'Color Links OFF must override Color All Text ON');
assert.equal(initial.photoMapped, false, 'raster background pixels must not be frosted');
assert.equal(initial.transparentBorderMapped, false, 'transparent borders must remain invisible');
assert.ok(initial.glowPseudo === 'none' || initial.glowPseudo === 'normal', 'edge glow must not be a viewport overlay');
assert.equal(initial.mediaOpacity, '0.4', 'Darkgrid must preserve media opacity');
assert.equal(initial.mediaFilter, 'grayscale(1)', 'Darkgrid must preserve site-owned media filters');
assert.equal(initial.mediaBlend, 'multiply', 'Darkgrid must preserve site-owned media blend mode');

await page.evaluate(() => {
  document.querySelector('#dynamic').style.backgroundColor = 'rgb(255,0,0)';
});
await page.waitForFunction(previous =>
  getComputedStyle(document.querySelector('#dynamic')).backgroundColor !== previous,
  initial.dynamic
);
const dynamicAfter = await page.$eval('#dynamic', element => getComputedStyle(element).backgroundColor);
assert.notEqual(dynamicAfter, 'rgb(255, 0, 0)');

await page.evaluate(() => {
  document.documentElement.classList.remove('mode-light');
  document.documentElement.classList.add('mode-dark');
});
await page.waitForFunction(previous =>
  getComputedStyle(document.querySelector('#rootcard')).backgroundColor !== previous,
  initial.rootcard
);

await page.evaluate(() => {
  document.querySelector('#attrHost').setAttribute('data-state', 'dark');
});
await page.waitForFunction(previous =>
  getComputedStyle(document.querySelector('#attrcard')).backgroundColor !== previous,
  initial.attrcard
);

await page.evaluate(() => {
  document.querySelector('#newtext').append(document.createTextNode('added later'));
});
await page.waitForFunction(() => document.querySelector('#newtext').hasAttribute('data-darkgrid-text'));

await browser.close();
console.log('browser integration passed');
