import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../SafariExtension/Resources/surface-engine.js', import.meta.url), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const e = sandbox.DarkgridSurfaceEngine;
assert.ok(e);

assert.deepEqual(JSON.parse(JSON.stringify(e.parseCssColor('rgba(10,20,30,.1)'))), { r:10, g:20, b:30, a:.1 });
assert.deepEqual(JSON.parse(JSON.stringify(e.parseCssColor('color(display-p3 1 .5 0 / .8)'))), { r:255, g:128, b:0, a:.8 });

const mapped = e.buildSurfaceColors({ r:255, g:255, b:255, a:.1 }, { r:0, g:255, b:102 });
assert.match(mapped.normal, /^rgba\(/);
assert.match(mapped.frost, /^rgba\(/);
assert.equal(mapped.alpha, .1);

const dark = e.buildSurfaceColors({ r:10, g:10, b:10, a:1 }, { r:0, g:255, b:102 });
const light = e.buildSurfaceColors({ r:240, g:240, b:240, a:1 }, { r:0, g:255, b:102 });
assert.notEqual(dark.normal, light.normal, 'surface hierarchy must survive mapping');

const safe = e.ensureReadableAccent({ r:0, g:0, b:0 });
assert.ok(e.relativeLuminance(safe) >= .219, 'too-dark custom accents must be lifted');

assert.equal(e.isMediaElement({ tagName:'VIDEO' }), true);
assert.equal(e.isMediaElement({ tagName:'SVG' }), false);
assert.equal(e.hasRasterBackground('url("x.jpg")'), true);
assert.equal(e.hasGradientBackground('linear-gradient(red,blue)'), true);

const transparentBorder = {
  borderTopWidth:'1px', borderTopStyle:'solid', borderTopColor:'transparent',
  borderRightWidth:'0px', borderRightStyle:'none', borderRightColor:'transparent',
  borderBottomWidth:'0px', borderBottomStyle:'none', borderBottomColor:'transparent',
  borderLeftWidth:'0px', borderLeftStyle:'none', borderLeftColor:'transparent'
};
assert.equal(e.hasVisibleBorder(transparentBorder), false, 'transparent layout borders must not become visible');

const visibleBorder = { ...transparentBorder, borderTopColor:'rgb(255,255,255)' };
assert.equal(e.hasVisibleBorder(visibleBorder), true);

console.log('surface-engine tests passed');
