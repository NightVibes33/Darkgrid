import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resources = path.join(root, 'SafariExtension', 'Resources');
const manifest = JSON.parse(fs.readFileSync(path.join(resources, 'manifest.json'), 'utf8'));

function gitBlobSha(text) {
  const size = Buffer.byteLength(text, 'utf8');
  return createHash('sha1').update(`blob ${size}\0`).update(text).digest('hex');
}

assert.equal(manifest.manifest_version, 2);
assert.equal(manifest.version, '1.2.0');
assert.equal(manifest.content_scripts.length, 1);
assert.equal(manifest.content_scripts[0].all_frames, true);
assert.equal(manifest.content_scripts[0].match_about_blank, true);
assert.equal(manifest.content_scripts[0].run_at, 'document_start');
assert.deepEqual(manifest.content_scripts[0].matches, ['<all_urls>']);
assert.deepEqual(manifest.content_scripts[0].js, ['surface-engine.js', 'content.js']);
assert.ok(manifest.permissions.includes('<all_urls>'));
assert.ok(manifest.permissions.includes('storage'));
assert.ok(manifest.permissions.includes('nativeMessaging'));

for (const file of [
  'manifest.json', 'background.js', 'surface-engine.js', 'content.js',
  'popup.html', 'popup.css', 'popup.js', 'theme.css'
]) {
  assert.ok(fs.existsSync(path.join(resources, file)), `Missing extension resource: ${file}`);
}

const content = fs.readFileSync(path.join(resources, 'content.js'), 'utf8');
assert.equal(
  gitBlobSha(content),
  '0ad85b32b6ac1f7e31693e8430e63409b3ecdf2d',
  'content.js must stay byte-for-byte identical to the original simple color renderer'
);
for (const token of [
  'darkgrid-on', 'darkgrid-frost', 'darkgrid-color-links',
  'darkgrid-color-borders', 'darkgrid-color-text', 'darkgrid-glow',
  '--darkgrid-accent', '--darkgrid-accent-rgb', 'storage.onChanged'
]) {
  assert.ok(content.includes(token), `Missing original renderer behavior: ${token}`);
}

const css = fs.readFileSync(path.join(resources, 'theme.css'), 'utf8');
assert.equal(
  gitBlobSha(css),
  'c71bcbb841bfe4db05ccae93939df0ce664eb579',
  'theme.css must stay byte-for-byte identical to the original black + global frost renderer'
);
assert.match(css, /background:\s*#000\s*!important/);
assert.match(css, /background-color:\s*transparent\s*!important/);
assert.match(css, /darkgrid-color-links/);
assert.match(css, /darkgrid-color-borders/);
assert.match(css, /darkgrid-color-text/);
assert.match(css, /darkgrid-frost::before/);
assert.match(css, /mix-blend-mode:\s*screen/);
assert.match(css, /backdrop-filter:\s*saturate\(0\.94\)\s+contrast\(1\.02\)/);
assert.match(css, /rgba\(var\(--darkgrid-accent-rgb\),\s*0\.070\)/);
assert.match(css, /rgba\(var\(--darkgrid-accent-rgb\),\s*0\.045\)/);
assert.match(css, /rgba\(var\(--darkgrid-accent-rgb\),\s*0\.072\)/);

const background = fs.readFileSync(path.join(resources, 'background.js'), 'utf8');
assert.match(background, /sendNativeMessage/);
assert.match(background, /darkgrid:sync-shared/);

const popup = fs.readFileSync(path.join(resources, 'popup.js'), 'utf8');
assert.match(popup, /EXCLUDED/);
assert.match(popup, /storage\.onChanged/);
assert.match(popup, /sendNativeMessage/);
for (const preset of ['#00F5FF', '#FF1744', '#00FF66', '#B026FF']) {
  assert.ok(popup.includes(preset), `Missing preset ${preset}`);
}

const host = fs.readFileSync(path.join(root, 'App', 'ContentView.swift'), 'utf8');
assert.match(host, /NeonGrid/);
assert.match(host, /NeonGridSharedSettings/);
assert.match(host, /runtimeEnabled/);
assert.match(host, /accentColor/);

const nativeHandler = fs.readFileSync(path.join(root, 'SafariExtension', 'SafariWebExtensionHandler.swift'), 'utf8');
assert.match(nativeHandler, /group\.com\.nightvibes33\.Darkgrid/);
assert.match(nativeHandler, /getSharedSettings/);
assert.match(nativeHandler, /setSharedSettings/);

for (const entitlement of [
  path.join(root, 'App', 'NeonGrid.entitlements'),
  path.join(root, 'SafariExtension', 'NeonGridExtension.entitlements')
]) {
  const text = fs.readFileSync(entitlement, 'utf8');
  assert.match(text, /group\.com\.nightvibes33\.Darkgrid/);
}

const project = fs.readFileSync(path.join(root, 'project.yml'), 'utf8');
assert.match(project, /MARKETING_VERSION:\s*1\.2\.0/);
assert.match(project, /CODE_SIGN_ENTITLEMENTS:\s*App\/NeonGrid\.entitlements/);
assert.match(project, /CODE_SIGN_ENTITLEMENTS:\s*SafariExtension\/NeonGridExtension\.entitlements/);

console.log('extension validation passed');
