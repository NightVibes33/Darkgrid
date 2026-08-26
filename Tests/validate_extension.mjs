import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resources = path.join(root, 'SafariExtension', 'Resources');
const manifest = JSON.parse(fs.readFileSync(path.join(resources, 'manifest.json'), 'utf8'));

assert.equal(manifest.manifest_version, 2);
assert.equal(manifest.content_scripts.length, 1);
assert.equal(manifest.content_scripts[0].all_frames, true);
assert.equal(manifest.content_scripts[0].match_about_blank, true);
assert.deepEqual(manifest.content_scripts[0].js, ['surface-engine.js', 'content.js']);
assert.ok(manifest.permissions.includes('<all_urls>'));
assert.ok(manifest.permissions.includes('storage'));

for (const file of ['manifest.json','background.js','surface-engine.js','content.js','popup.html','popup.css','popup.js','theme.css']) {
  assert.ok(fs.existsSync(path.join(resources, file)), file);
}

const content = fs.readFileSync(path.join(resources, 'content.js'), 'utf8');
for (const token of [
  'MutationObserver', 'shadowRoot', '::before', '::after', 'characterData',
  'ancestorOrigins', 'ensureReadableAccent', 'isSimpleMonochromeSvg', 'ownerSVGElement'
]) assert.ok(content.includes(token), token);

const css = fs.readFileSync(path.join(resources, 'theme.css'), 'utf8');
assert.doesNotMatch(css, /darkgrid-(?:frost|glow)::(?:before|after)/);
assert.doesNotMatch(css, /backdrop-filter|mix-blend-mode:\s*screen/i);
assert.doesNotMatch(css, /background-color:\s*transparent\s*!important/i);
assert.match(css, /data-darkgrid-before-surface/);
assert.match(css, /data-darkgrid-svg-fill/);
assert.match(css, /darkgrid-color-text:not\(\.darkgrid-color-links\)/);
assert.match(css, /darkgrid-color-text[^\n]*:where\(input, textarea\)::placeholder/);

const popup = fs.readFileSync(path.join(resources, 'popup.js'), 'utf8');
assert.match(popup, /EXCLUDED/);
assert.doesNotMatch(popup, /sendMessage/);
assert.match(popup, /setTimeout\([^]*90/);

const popupHtml = fs.readFileSync(path.join(resources, 'popup.html'), 'utf8');
assert.ok(popupHtml.indexOf('surface-engine.js') < popupHtml.indexOf('popup.js'));

console.log('extension validation passed');
