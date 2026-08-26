import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../SafariExtension/Resources/surface-engine.js', import.meta.url), 'utf8');
const sandbox = { Node: { TEXT_NODE: 3 } };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const e = sandbox.DarkgridSurfaceEngine;
assert.ok(e);

assert.deepEqual(
  JSON.parse(JSON.stringify(e.parseCssColor('rgba(10,20,30,.1)'))),
  { r: 10, g: 20, b: 30, a: .1 }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(e.parseCssColor('rgb(100% 50% 0% / 25%)'))),
  { r: 255, g: 128, b: 0, a: .25 }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(e.parseCssColor('color(display-p3 1 .5 0 / .8)'))),
  { r: 255, g: 128, b: 0, a: .8 }
);
assert.equal(e.parseCssColor('transparent'), null);

const green = { r: 0, g: 255, b: 102 };
const mapped = e.buildSurfaceColors({ r: 255, g: 255, b: 255, a: .1 }, green);
assert.match(mapped.normal, /^rgba\(/);
assert.match(mapped.frost, /^rgba\(/);
assert.equal(mapped.alpha, .1, 'surface alpha must be preserved exactly');

const dark = e.buildSurfaceColors({ r: 10, g: 10, b: 10, a: 1 }, green);
const medium = e.buildSurfaceColors({ r: 90, g: 90, b: 90, a: 1 }, green);
const light = e.buildSurfaceColors({ r: 240, g: 240, b: 240, a: 1 }, green);
assert.notEqual(dark.normal, medium.normal, 'dark and medium surfaces must remain distinct');
assert.notEqual(medium.normal, light.normal, 'medium and light surfaces must remain distinct');

const safeBlack = e.ensureReadableAccent({ r: 0, g: 0, b: 0 });
assert.ok(e.relativeLuminance(safeBlack) >= .174, 'unreadable custom accents must be lifted');

const purple = { r: 176, g: 38, b: 255 };
assert.deepEqual(
  JSON.parse(JSON.stringify(e.ensureReadableAccent(purple))),
  purple,
  'the built-in purple preset must not be silently changed'
);

assert.equal(e.isMediaElement({ tagName: 'VIDEO' }), true);
assert.equal(e.isMediaElement({ tagName: 'IMG' }), true);
assert.equal(e.isMediaElement({ tagName: 'SVG' }), false);
assert.equal(e.hasRasterBackground('url("x.jpg")'), true);
assert.equal(e.hasGradientBackground('linear-gradient(red,blue)'), true);

const transparentBorder = {
  borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'transparent',
  borderRightWidth: '0px', borderRightStyle: 'none', borderRightColor: 'transparent',
  borderBottomWidth: '0px', borderBottomStyle: 'none', borderBottomColor: 'transparent',
  borderLeftWidth: '0px', borderLeftStyle: 'none', borderLeftColor: 'transparent'
};
assert.equal(e.hasVisibleBorder(transparentBorder), false, 'transparent borders must stay invisible');
assert.equal(
  e.hasVisibleBorder({ ...transparentBorder, borderTopColor: 'rgb(255,255,255)' }),
  true
);

assert.equal(
  e.pseudoIsRenderable({ content: '""', display: 'block', visibility: 'visible', opacity: '1' }),
  true
);
assert.equal(
  e.pseudoIsRenderable({ content: '""', display: 'none', visibility: 'visible', opacity: '1' }),
  false
);

console.log('surface-engine tests passed');
