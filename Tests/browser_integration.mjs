import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const resources = path.resolve(here, '../SafariExtension/Resources');
const browser = await webkit.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 600, height: 800 } });

await page.setContent(`<!doctype html><html class="mode-light" style="background:#fff"><head><style>
html::before{content:"";position:fixed;inset:0;background:rgba(255,255,255,.08);pointer-events:none}
body{margin:0;background:rgba(255,255,255,.04);color:#000}
body::before{content:"";position:absolute;width:12px;height:12px;background:#fff}
#solid{background:#fff;color:#000}
.alpha{background:rgba(255,255,255,.1)}
.pseudo::before{content:"x";background:#fff;color:#000;box-shadow:0 0 8px rgba(255,255,255,.8)}
.pseudoGradient::before{content:"";display:block;width:10px;height:10px;background:linear-gradient(rgb(255,255,255),rgb(170,170,170))}
.linkPseudo::before{content:"p"}
.mode-light #rootcard{background:#fff}.mode-dark #rootcard{background:#191919}
#attrHost[data-state="light"] #attrcard{background:#fff}
#attrHost[data-state="dark"] #attrcard{background:#242424}
#hoverable{background:#fff}#hoverable:hover{background:rgb(255,0,0)}
#focusable{background:#fff}#focusable:focus{background:rgb(255,0,0)}
#mq{background:#fff}@media(min-width:700px){#mq{background:rgb(255,0,0)}}
#gradient{background-image:linear-gradient(rgb(255,255,255),rgb(170,170,170));background-blend-mode:screen}
#sprite{width:24px;height:24px;background-color:#fff;background-repeat:no-repeat;background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')}
</style></head><body>
<div id="solid">solid</div>
<div id="alpha" class="alpha">alpha</div>
<div id="pseudo" class="pseudo"></div>
<div id="pseudoGradient" class="pseudoGradient"></div>
<div id="rootcard">root</div>
<div id="attrHost" data-state="light"><div id="attrcard">attribute driven</div></div>
<div id="dynamic" style="background:#fff">dyn</div>
<div id="sheetcard">stylesheet driven</div>
<div id="adopted">adopted stylesheet</div>
<div id="hoverable">hover</div>
<input id="focusable" value="focus">
<div id="mq">responsive</div>
<div id="gradient">gradient</div>
<div id="sprite">sprite</div>
<div id="transparentBorder" style="border:1px solid transparent">border</div>
<div id="photo" style="background-image:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');background-color:#fff">photo</div>
<img id="media" alt="pixel" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" style="opacity:.4;filter:grayscale(1);mix-blend-mode:multiply">
<div id="newtext"></div>
<a id="link" href="#">link</a>
<a id="nestedLink" href="#"><span id="nestedLinkText">nested link</span></a>
<a id="linkPseudo" class="linkPseudo" href="#">pseudo link</a>
<div id="shadow"></div>
<svg id="icon" width="24" height="24" role="img"><symbol id="sym"><path d="M0 0h10v10H0z" fill="#000"/></symbol><use href="#sym"></use><text x="12" y="18" fill="#000">A</text></svg>
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

  document.querySelector('#shadow').attachShadow({ mode: 'open' }).innerHTML = `
    <style>.card{background:#fff;color:#000}.card::before{content:"s";background:#fff}</style>
    <div class="card">shadow text</div>
    <a id="shadowLink" href="#"><span id="shadowLinkText">shadow nested link</span></a>`;
});

await page.addStyleTag({ path: path.join(resources, 'theme.css') });
await page.addScriptTag({ path: path.join(resources, 'surface-engine.js') });
await page.addScriptTag({ path: path.join(resources, 'content.js') });

await page.waitForFunction(() =>
  document.documentElement.classList.contains('darkgrid-on')
  && document.documentElement.hasAttribute('data-darkgrid-surface')
  && document.body.hasAttribute('data-darkgrid-surface')
  && document.querySelector('#solid').hasAttribute('data-darkgrid-surface')
  && document.querySelector('#shadow').shadowRoot.querySelector('.card').hasAttribute('data-darkgrid-surface')
  && document.querySelector('#darkgrid-edge-glow')
);

const initial = await page.evaluate(() => ({
  html: getComputedStyle(document.documentElement).backgroundColor,
  body: getComputedStyle(document.body).backgroundColor,
  htmlPseudo: getComputedStyle(document.documentElement, '::before').backgroundColor,
  bodyPseudo: getComputedStyle(document.body, '::before').backgroundColor,
  solid: getComputedStyle(document.querySelector('#solid')).backgroundColor,
  solidText: getComputedStyle(document.querySelector('#solid')).color,
  alpha: getComputedStyle(document.querySelector('#alpha')).backgroundColor,
  pseudo: getComputedStyle(document.querySelector('#pseudo'), '::before').backgroundColor,
  pseudoShadow: getComputedStyle(document.querySelector('#pseudo'), '::before').boxShadow,
  pseudoGradient: getComputedStyle(document.querySelector('#pseudoGradient'), '::before').backgroundImage,
  shadow: getComputedStyle(document.querySelector('#shadow').shadowRoot.querySelector('.card')).backgroundColor,
  shadowPseudo: getComputedStyle(document.querySelector('#shadow').shadowRoot.querySelector('.card'), '::before').backgroundColor,
  shadowNestedLink: getComputedStyle(document.querySelector('#shadow').shadowRoot.querySelector('#shadowLinkText')).color,
  link: getComputedStyle(document.querySelector('#link')).color,
  nestedLink: getComputedStyle(document.querySelector('#nestedLinkText')).color,
  linkPseudo: getComputedStyle(document.querySelector('#linkPseudo'), '::before').color,
  photoImage: getComputedStyle(document.querySelector('#photo')).backgroundImage,
  spriteImage: getComputedStyle(document.querySelector('#sprite')).backgroundImage,
  transparentBorderMapped: document.querySelector('#transparentBorder').hasAttribute('data-darkgrid-border'),
  mediaOpacity: getComputedStyle(document.querySelector('#media')).opacity,
  mediaFilter: getComputedStyle(document.querySelector('#media')).filter,
  mediaBlend: getComputedStyle(document.querySelector('#media')).mixBlendMode,
  gradientBlend: getComputedStyle(document.querySelector('#gradient')).backgroundBlendMode,
  gradientImage: getComputedStyle(document.querySelector('#gradient')).backgroundImage,
  iconUse: getComputedStyle(document.querySelector('#icon use')).fill,
  iconText: getComputedStyle(document.querySelector('#icon text')).fill,
  glowPosition: getComputedStyle(document.querySelector('#darkgrid-edge-glow')).position,
  glowPointer: getComputedStyle(document.querySelector('#darkgrid-edge-glow')).pointerEvents,
  dynamic: getComputedStyle(document.querySelector('#dynamic')).backgroundColor,
  rootcard: getComputedStyle(document.querySelector('#rootcard')).backgroundColor,
  attrcard: getComputedStyle(document.querySelector('#attrcard')).backgroundColor,
  mq: getComputedStyle(document.querySelector('#mq')).backgroundColor,
  hover: getComputedStyle(document.querySelector('#hoverable')).backgroundColor,
  focus: getComputedStyle(document.querySelector('#focusable')).backgroundColor
}));

assert.notEqual(initial.html, 'rgb(255, 255, 255)', 'html surface must be mapped');
assert.notEqual(initial.body, 'rgb(255, 255, 255)', 'body surface must be mapped');
assert.notEqual(initial.htmlPseudo, 'rgba(255, 255, 255, 0.08)', 'html pseudo surface must be mapped');
assert.notEqual(initial.bodyPseudo, 'rgb(255, 255, 255)', 'body pseudo surface must be mapped');
assert.notEqual(initial.solid, 'rgb(255, 255, 255)');
assert.equal(initial.solidText, 'rgb(0, 255, 102)', 'Color All Text must include direct div text');
assert.match(initial.alpha, /rgba\([^)]*,\s*0\.1\)/, 'semi-transparent surfaces must preserve alpha');
assert.notEqual(initial.pseudo, 'rgb(255, 255, 255)', 'pseudo-element backgrounds must be mapped');
assert.notEqual(initial.pseudoShadow, 'rgb(255, 255, 255) 0px 0px 8px 0px', 'bright pseudo shadows must be rewritten');
assert.ok(initial.pseudoGradient.includes('gradient'), 'pseudo gradients must remain gradients');
assert.notEqual(initial.shadow, 'rgb(255, 255, 255)', 'open Shadow DOM surfaces must be mapped');
assert.notEqual(initial.shadowPseudo, 'rgb(255, 255, 255)', 'Shadow DOM pseudo-elements must be mapped');
assert.notEqual(initial.link, 'rgb(0, 255, 102)', 'Color Links OFF must override Color All Text ON');
assert.notEqual(initial.nestedLink, 'rgb(0, 255, 102)', 'nested link text must respect Color Links OFF');
assert.notEqual(initial.linkPseudo, 'rgb(0, 255, 102)', 'link pseudo text must respect Color Links OFF');
assert.notEqual(initial.shadowNestedLink, 'rgb(0, 255, 102)', 'Shadow DOM nested link text must respect Color Links OFF');
assert.match(initial.photoImage, /url\(/, 'raster background pixels must remain intact');
assert.match(initial.spriteImage, /url\(/, 'CSS sprite pixels must remain intact');
assert.equal(initial.transparentBorderMapped, false, 'transparent borders must remain invisible');
assert.equal(initial.mediaOpacity, '0.4', 'Darkgrid must preserve media opacity');
assert.equal(initial.mediaFilter, 'grayscale(1)', 'Darkgrid must preserve site-owned media filters');
assert.equal(initial.mediaBlend, 'multiply', 'Darkgrid must preserve site-owned media blend mode');
assert.equal(initial.gradientBlend, 'screen', 'site gradient blend semantics must not be overwritten');
assert.ok(initial.gradientImage.includes('gradient'), 'gradients must remain gradients');
assert.notEqual(initial.iconUse, 'rgb(0, 0, 0)', 'complex SVG use icons must remain visible');
assert.notEqual(initial.iconText, 'rgb(0, 0, 0)', 'SVG text must remain visible');
assert.equal(initial.glowPosition, 'fixed', 'edge glow must be viewport anchored');
assert.equal(initial.glowPointer, 'none', 'edge glow must never intercept input');

await page.evaluate(() => { document.querySelector('#dynamic').style.backgroundColor = 'rgb(255,0,0)'; });
await page.waitForFunction(previous => getComputedStyle(document.querySelector('#dynamic')).backgroundColor !== previous, initial.dynamic);
assert.notEqual(await page.$eval('#dynamic', e => getComputedStyle(e).backgroundColor), 'rgb(255, 0, 0)');

await page.evaluate(() => {
  document.documentElement.classList.remove('mode-light');
  document.documentElement.classList.add('mode-dark');
});
await page.waitForFunction(previous => getComputedStyle(document.querySelector('#rootcard')).backgroundColor !== previous, initial.rootcard);

await page.evaluate(() => { document.querySelector('#attrHost').setAttribute('data-state', 'dark'); });
await page.waitForFunction(previous => getComputedStyle(document.querySelector('#attrcard')).backgroundColor !== previous, initial.attrcard);

await page.hover('#hoverable');
await page.waitForFunction(previous => getComputedStyle(document.querySelector('#hoverable')).backgroundColor !== previous, initial.hover);
assert.notEqual(await page.$eval('#hoverable', e => getComputedStyle(e).backgroundColor), 'rgb(255, 0, 0)', 'hover color must be remapped');

await page.focus('#focusable');
await page.waitForFunction(previous => getComputedStyle(document.querySelector('#focusable')).backgroundColor !== previous, initial.focus);
assert.notEqual(await page.$eval('#focusable', e => getComputedStyle(e).backgroundColor), 'rgb(255, 0, 0)', 'focus color must be remapped');

await page.setViewportSize({ width: 800, height: 800 });
await page.waitForFunction(previous => getComputedStyle(document.querySelector('#mq')).backgroundColor !== previous, initial.mq);
assert.notEqual(await page.$eval('#mq', e => getComputedStyle(e).backgroundColor), 'rgb(255, 0, 0)', 'responsive breakpoint color must be remapped');

await page.evaluate(() => {
  const style = document.createElement('style');
  style.id = 'runtimeStyles';
  style.textContent = '#sheetcard{background:#fff}';
  document.head.append(style);
});
await page.waitForFunction(() => document.querySelector('#sheetcard').hasAttribute('data-darkgrid-surface'));
const firstSheetColor = await page.$eval('#sheetcard', e => getComputedStyle(e).backgroundColor);
await page.evaluate(() => { document.querySelector('#runtimeStyles').textContent = '#sheetcard{background:#444}'; });
await page.waitForFunction(previous => getComputedStyle(document.querySelector('#sheetcard')).backgroundColor !== previous, firstSheetColor);

const adoptedSupported = await page.evaluate(() => 'adoptedStyleSheets' in document && typeof CSSStyleSheet === 'function');
if (adoptedSupported) {
  await page.evaluate(() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('#adopted{background:#fff}');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    window.__darkgridAdopted = sheet;
  });
  await page.waitForFunction(() => document.querySelector('#adopted').hasAttribute('data-darkgrid-surface'), null, { timeout: 5000 });
  const before = await page.$eval('#adopted', e => getComputedStyle(e).backgroundColor);
  await page.evaluate(() => window.__darkgridAdopted.replaceSync('#adopted{background:rgb(255,0,0)}'));
  await page.waitForFunction(previous => getComputedStyle(document.querySelector('#adopted')).backgroundColor !== previous, before, { timeout: 5000 });
  assert.notEqual(await page.$eval('#adopted', e => getComputedStyle(e).backgroundColor), 'rgb(255, 0, 0)', 'adopted stylesheet changes must remap');
}

await page.evaluate(() => {
  document.querySelector('#shadow').shadowRoot.querySelector('style[data-darkgrid-shadow-style]').remove();
});
await page.waitForFunction(() => Boolean(document.querySelector('#shadow').shadowRoot.querySelector('style[data-darkgrid-shadow-style]')));

await page.evaluate(() => { document.querySelector('#newtext').append(document.createTextNode('added later')); });
await page.waitForFunction(() => document.querySelector('#newtext').hasAttribute('data-darkgrid-text'));

await browser.close();
console.log('browser integration passed');
