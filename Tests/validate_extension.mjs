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
assert.equal(manifest.content_scripts[0].all_frames, false);
assert.equal(manifest.content_scripts[0].run_at, 'document_start');
assert.deepEqual(manifest.content_scripts[0].matches, ['<all_urls>']);
assert.deepEqual(
  manifest.content_scripts[0].js,
  ['content.js'],
  'website renderer must use the original CSS-first path, not the surface mapper'
);
assert.ok(manifest.permissions.includes('<all_urls>'));
assert.ok(manifest.permissions.includes('storage'));
assert.ok(manifest.permissions.includes('nativeMessaging'));

for (const file of [
  'manifest.json', 'background.js', 'content.js',
  'popup.html', 'popup.css', 'popup.js', 'theme.css'
]) {
  assert.ok(fs.existsSync(path.join(resources, file)), `Missing extension resource: ${file}`);
}

const content = fs.readFileSync(path.join(resources, 'content.js'), 'utf8');
assert.equal(
  gitBlobSha(content),
  '0ad85b32b6ac1f7e31693e8430e63409b3ecdf2d',
  'content.js must remain byte-for-byte identical to the original black-first color renderer'
);
assert.doesNotMatch(content, /DarkgridSurfaceEngine|data-darkgrid-surface|buildSurfaceColors/);
for (const token of [
  'frostTint', 'colorLinks', 'colorBorders', 'colorAllText', 'edgeGlow',
  'darkgrid-frost', 'darkgrid-color-links', 'darkgrid-color-borders',
  'darkgrid-color-text', 'darkgrid-glow'
]) {
  assert.ok(content.includes(token), `Missing original renderer behavior: ${token}`);
}

const css = fs.readFileSync(path.join(resources, 'theme.css'), 'utf8');
assert.equal(
  gitBlobSha(css),
  'c71bcbb841bfe4db05ccae93939df0ce664eb579',
  'theme.css must remain byte-for-byte identical to the original black-first renderer'
);
assert.match(css, /background:\s*#000\s*!important/);
assert.match(css, /background-color:\s*transparent\s*!important/);
assert.match(css, /darkgrid-color-links/);
assert.match(css, /darkgrid-color-borders/);
assert.match(css, /darkgrid-color-text/);
assert.match(css, /darkgrid-frost::before/);
assert.match(css, /mix-blend-mode:\s*screen/);
assert.doesNotMatch(css, /data-darkgrid-surface/);

const background = fs.readFileSync(path.join(resources, 'background.js'), 'utf8');
assert.match(background, /LEGACY_VISUAL_RESET_VERSION\s*=\s*3/);
assert.match(background, /patch\.frostTint\s*=\s*false/);
assert.match(background, /patch\.colorLinks\s*=\s*true/);
assert.match(background, /patch\.colorBorders\s*=\s*true/);
assert.match(background, /patch\.colorAllText\s*=\s*false/);
assert.match(background, /preserving the[\s\S]*selected accent color/i);
assert.match(background, /syncExplicitAppChanges/);

const popup = fs.readFileSync(path.join(resources, 'popup.js'), 'utf8');
assert.match(popup, /frostTint:\s*false/);
for (const preset of ['#00F5FF', '#FF1744', '#00FF66', '#B026FF']) {
  assert.ok(popup.includes(preset), `Missing preset ${preset}`);
}

const host = fs.readFileSync(path.join(root, 'App', 'ContentView.swift'), 'utf8');
assert.match(host, /NeonGrid/);
assert.match(host, /private var frostTint = false/);
assert.match(host, /queueSharedSettingChange\("accentColor"\)/);

const shared = fs.readFileSync(path.join(root, 'App', 'NeonGridSharedSettings.swift'), 'utf8');
assert.match(shared, /settingsBridgeVersion/);
assert.match(shared, /defaults\.set\(false, forKey: "frostTint"\)/);
assert.match(shared, /removeObject\(forKey: "pendingSettingKeys"\)/);

const handler = fs.readFileSync(path.join(root, 'SafariExtension', 'SafariWebExtensionHandler.swift'), 'utf8');
assert.match(handler, /migrateBrokenBridgeState/);
assert.match(handler, /settingsBridgeVersion/);
assert.match(handler, /removeObject\(forKey: "pendingSettingKeys"\)/);

console.log('extension validation passed');
