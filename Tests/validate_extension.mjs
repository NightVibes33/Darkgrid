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
assert.deepEqual(manifest.content_scripts[0].js, ['surface-engine.js', 'content.js']);
assert.ok(manifest.permissions.includes('nativeMessaging'));

const locked = [
  ['content.js', 'dd9eae130539556e881bc9d70d86447c3735c0b6'],
  ['theme.css', '60cb48968f78f5d41cf5287a39f2ef97d1280503'],
  ['surface-engine.js', '4df75cbeedd8666d51a3cdd1b3e9cb627b312cfe'],
  ['popup.css', '46d4ef4d2fe95b4eceb22eab6dc81fc9b0bc4267']
];

for (const [file, sha] of locked) {
  const text = fs.readFileSync(path.join(resources, file), 'utf8');
  assert.equal(
    gitBlobSha(text),
    sha,
    `${file} must remain byte-for-byte identical to the pre-redesign build`
  );
}

const content = fs.readFileSync(path.join(resources, 'content.js'), 'utf8');
for (const token of [
  'MutationObserver', 'shadowRoot', 'darkgrid-measuring', 'adoptedStyleSheets',
  'data-darkgrid-surface', 'data-darkgrid-svg-fill', 'darkgrid-edge-glow'
]) assert.ok(content.includes(token), `Missing old renderer behavior: ${token}`);

const popup = fs.readFileSync(path.join(resources, 'popup.js'), 'utf8');
assert.match(popup, /cancelAccentSave/);
assert.match(popup, /accentSaveGeneration/);
assert.match(popup, /storage\.onChanged/);
assert.doesNotMatch(popup, /sendNativeMessage/);

const background = fs.readFileSync(path.join(resources, 'background.js'), 'utf8');
assert.match(background, /ensureDefaults/);
assert.match(background, /repairOnlyRecentBrokenState/);
assert.match(background, /dequeueSettingPatch/);
assert.match(background, /frostTint:\s*false/);

const handler = fs.readFileSync(path.join(root, 'SafariExtension', 'SafariWebExtensionHandler.swift'), 'utf8');
assert.match(handler, /dequeueSettingPatch/);
assert.doesNotMatch(handler, /migrateBrokenBridgeState/);
assert.doesNotMatch(handler, /rendererBaselineVersion/);

const host = fs.readFileSync(path.join(root, 'App', 'ContentView.swift'), 'utf8');
assert.match(host, /NeonGrid/);
assert.match(host, /queueSharedSettingChange/);
assert.match(host, /private var frostTint = false/);

const shared = fs.readFileSync(path.join(root, 'App', 'NeonGridSharedSettings.swift'), 'utf8');
assert.doesNotMatch(shared, /rendererBaselineVersion/);
assert.doesNotMatch(shared, /settingsBridgeVersion/);
assert.match(shared, /recentBridgeCleanupDone/);

for (const testFile of ['browser_integration.mjs', 'popup_integration.mjs', 'surface_engine_test.mjs']) {
  assert.ok(fs.existsSync(path.join(root, 'Tests', testFile)));
}

console.log('extension validation passed');
