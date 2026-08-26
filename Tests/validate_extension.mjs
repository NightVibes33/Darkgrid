import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resources = path.join(root, 'SafariExtension', 'Resources');
const manifest = JSON.parse(fs.readFileSync(path.join(resources, 'manifest.json'), 'utf8'));

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

for (const file of [
  'manifest.json', 'background.js', 'surface-engine.js', 'content.js',
  'popup.html', 'popup.css', 'popup.js', 'theme.css'
]) {
  assert.ok(fs.existsSync(path.join(resources, file)), `Missing extension resource: ${file}`);
}

const content = fs.readFileSync(path.join(resources, 'content.js'), 'utf8');
for (const token of [
  'MutationObserver', 'shadowRoot', 'data-darkgrid-shadow-style', 'prepareShadowRoot',
  'ensureShadowStyles', 'darkgrid-measuring', 'data-darkgrid-shadow-measuring',
  '::before', '::after', 'data-darkgrid-before-gradient', 'data-darkgrid-before-shadow',
  'characterData', 'attributes: true', 'isSiteStylesheetElement', 'mutationAffectsStylesheet',
  'stylesheetContext', 'ancestorOrigins', 'ensureReadableAccent', 'adoptedStyleSheets',
  'pollStylesheets', 'refreshMediaQueryListeners', 'orientationchange', 'visualViewport',
  'animationstart', 'transitionrun', 'pumpAnimatedTargets', 'discoverOpenShadowRoots',
  'data-darkgrid-svg-fill', 'text,tspan,use', 'darkgrid-edge-glow', 'pageshow'
]) {
  assert.ok(content.includes(token), `Missing renderer behavior: ${token}`);
}
assert.doesNotMatch(content, /attributeFilter\s*:/, 'all site-owned attributes must be observable');
assert.doesNotMatch(content, /startsWith\(["']\*\./, 'site exclusions must be exact-host, not wildcard');
assert.doesNotMatch(content, /\[\.\.\.probe\.style\]/, 'iOS 15 path must not require iterable CSSStyleDeclaration');
assert.doesNotMatch(
  content,
  /element === document\.documentElement\s*\|\|\s*element === document\.body\)\s*return/,
  'root and body must be measured instead of skipped'
);

const engine = fs.readFileSync(path.join(resources, 'surface-engine.js'), 'utf8');
for (const token of ['oklch', 'oklab', 'labToRgb', 'contrastRatio', 'ensureContrast', 'rewriteGradientColors', 'repeating-']) {
  assert.ok(engine.includes(token), `Missing surface-engine behavior: ${token}`);
}

const css = fs.readFileSync(path.join(resources, 'theme.css'), 'utf8');
assert.match(css, /darkgrid-measuring/);
assert.match(css, /--darkgrid-accent-readable/);
assert.match(css, /--darkgrid-gradient-normal/);
assert.match(css, /#darkgrid-edge-glow/);
assert.match(css, /position:\s*fixed\s*!important/);
assert.match(css, /pointer-events:\s*none\s*!important/);
assert.doesNotMatch(css, /backdrop-filter\s*:/i);
assert.doesNotMatch(css, /mix-blend-mode\s*:/i);
assert.doesNotMatch(css, /background-blend-mode:\s*multiply/i);
assert.doesNotMatch(
  css,
  /:where\(button,\s*input,\s*textarea,\s*select,\s*option,\s*\[role="button"\]\)\s*\{[^}]*background-color/si,
  'form controls must not be flattened by a blanket background'
);
assert.doesNotMatch(
  css,
  /:where\(img,\s*video,\s*canvas,\s*picture,\s*iframe,\s*object,\s*embed\)[\s\S]*?\}/i,
  'Darkgrid must not impose a presentation block on media elements'
);
assert.match(css, /data-darkgrid-before-surface/);
assert.match(css, /data-darkgrid-before-gradient/);
assert.match(css, /data-darkgrid-svg-fill/);
assert.match(css, /darkgrid-color-text:not\(\.darkgrid-color-links\)/);

const popup = fs.readFileSync(path.join(resources, 'popup.js'), 'utf8');
assert.match(popup, /EXCLUDED/);
assert.match(popup, /cancelAccentSave/);
assert.match(popup, /accentSaveGeneration/);
assert.match(popup, /Promise\.allSettled/);
assert.match(popup, /storage\.onChanged/);
assert.match(popup, /aria-pressed/);
assert.doesNotMatch(popup, /sendMessage/);
assert.doesNotMatch(popup, /startsWith\(["']\*\./);
assert.match(popup, /setTimeout\([^]*90/);
for (const preset of ['#00F5FF', '#FF1744', '#00FF66', '#B026FF']) {
  assert.ok(popup.includes(preset), `Missing preset ${preset}`);
}

const popupHtml = fs.readFileSync(path.join(resources, 'popup.html'), 'utf8');
assert.ok(popupHtml.indexOf('surface-engine.js') < popupHtml.indexOf('popup.js'));
assert.match(popupHtml, /aria-live="polite"/);
assert.match(popupHtml, /id="errorText"/);
for (const control of ['enabled', 'frostTint', 'colorLinks', 'colorBorders', 'colorAllText', 'edgeGlow']) {
  assert.ok(popupHtml.includes(`id="${control}"`), `Missing popup control: ${control}`);
}
for (const label of ['frostTintLabel', 'colorLinksLabel', 'colorBordersLabel', 'colorAllTextLabel', 'edgeGlowLabel']) {
  assert.ok(popupHtml.includes(`id="${label}"`), `Missing accessible label: ${label}`);
  assert.ok(popupHtml.includes(`aria-labelledby="${label}"`), `Control not linked to label: ${label}`);
}

const popupCss = fs.readFileSync(path.join(resources, 'popup.css'), 'utf8');
assert.match(popupCss, /\.switch:focus-within \.slider/);
assert.match(popupCss, /prefers-reduced-motion/);
assert.match(popupCss, /--accent-readable/);

const host = fs.readFileSync(path.join(root, 'App', 'ContentView.swift'), 'utf8');
assert.match(host, /SFSafariExtensionManager\.getStateOfExtension/);
assert.match(host, /isEnabled/);
assert.match(host, /REFRESH EXTENSION STATUS/);

const project = fs.readFileSync(path.join(root, 'project.yml'), 'utf8');
assert.match(project, /CURRENT_PROJECT_VERSION:\s*63/);
assert.match(project, /MARKETING_VERSION:\s*1\.2\.0/);

for (const testFile of ['browser_integration.mjs', 'popup_integration.mjs']) {
  assert.ok(fs.existsSync(path.join(root, 'Tests', testFile)), `Missing integration test: ${testFile}`);
}

console.log('extension validation passed');
