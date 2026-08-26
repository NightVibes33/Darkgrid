import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resources = path.join(root, 'SafariExtension', 'Resources');
const manifest = JSON.parse(fs.readFileSync(path.join(resources, 'manifest.json'), 'utf8'));

assert.equal(manifest.manifest_version, 2);
assert.equal(manifest.version, '1.1.0');
assert.equal(manifest.content_scripts.length, 1);
assert.equal(manifest.content_scripts[0].all_frames, true);
assert.equal(manifest.content_scripts[0].match_about_blank, true);
assert.equal(manifest.content_scripts[0].run_at, 'document_start');
assert.deepEqual(manifest.content_scripts[0].matches, ['<all_urls>']);
assert.deepEqual(manifest.content_scripts[0].js, ['surface-engine.js', 'content.js']);
assert.ok(manifest.permissions.includes('<all_urls>'));
assert.ok(manifest.permissions.includes('storage'));

for (const file of [
  'manifest.json', 'background.js', 'surface-engine.js', 'content.js',
  'popup.html', 'popup.css', 'popup.js', 'theme.css'
]) {
  assert.ok(fs.existsSync(path.join(resources, file)), `Missing extension resource: ${file}`);
}

const content = fs.readFileSync(path.join(resources, 'content.js'), 'utf8');
for (const token of [
  'MutationObserver',
  'shadowRoot',
  'data-darkgrid-shadow-style',
  '::before',
  '::after',
  'data-darkgrid-before-gradient',
  'data-darkgrid-before-shadow',
  'characterData',
  'attributes: true',
  'ancestorOrigins',
  'ensureReadableAccent',
  'isSimpleMonochromeSvg',
  'ownerSVGElement',
  'pruneShadowHosts',
  'pageshow'
]) {
  assert.ok(content.includes(token), `Missing renderer behavior: ${token}`);
}
assert.doesNotMatch(content, /attributeFilter\s*:/, 'all site-owned attributes must be observable');
assert.doesNotMatch(content, /startsWith\(["']\*\./, 'site exclusions must be exact-host, not wildcard');
assert.doesNotMatch(content, /\[\.\.\.probe\.style\]/, 'iOS 15 path must not require iterable CSSStyleDeclaration');

const css = fs.readFileSync(path.join(resources, 'theme.css'), 'utf8');
assert.doesNotMatch(css, /darkgrid-(?:frost|glow)::(?:before|after)/);
assert.doesNotMatch(css, /backdrop-filter\s*:/i);
assert.doesNotMatch(css, /mix-blend-mode:\s*screen/i);
assert.doesNotMatch(css, /background-color:\s*transparent\s*!important/i);
assert.doesNotMatch(css, /filter:\s*none\s*!important/i, 'media filters must remain site-owned');
assert.doesNotMatch(css, /mix-blend-mode:\s*normal\s*!important/i, 'media blend mode must remain site-owned');
assert.doesNotMatch(css, /opacity:\s*1\s*!important/i, 'media opacity must remain site-owned');
assert.match(css, /data-darkgrid-before-surface/);
assert.match(css, /data-darkgrid-before-gradient/);
assert.match(css, /data-darkgrid-before-shadow/);
assert.match(css, /data-darkgrid-svg-fill/);
assert.match(css, /darkgrid-color-text:not\(\.darkgrid-color-links\)/);
assert.match(css, /darkgrid-color-text[^\n]*:where\(input, textarea\)::placeholder/);

const popup = fs.readFileSync(path.join(resources, 'popup.js'), 'utf8');
assert.match(popup, /EXCLUDED/);
assert.doesNotMatch(popup, /sendMessage/);
assert.doesNotMatch(popup, /startsWith\(["']\*\./);
assert.match(popup, /setTimeout\([^]*90/);
for (const preset of ['#00F5FF', '#FF1744', '#00FF66', '#B026FF']) {
  assert.ok(popup.includes(preset), `Missing preset ${preset}`);
}

const popupHtml = fs.readFileSync(path.join(resources, 'popup.html'), 'utf8');
assert.ok(popupHtml.indexOf('surface-engine.js') < popupHtml.indexOf('popup.js'));
for (const control of ['enabled', 'frostTint', 'colorLinks', 'colorBorders', 'colorAllText', 'edgeGlow']) {
  assert.ok(popupHtml.includes(`id="${control}"`), `Missing popup control: ${control}`);
}

console.log('extension validation passed');
