import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const resources = path.join(root, "SafariExtension", "Resources");
const manifest = JSON.parse(fs.readFileSync(path.join(resources, "manifest.json"), "utf8"));

assert.equal(manifest.manifest_version, 2, "iOS 15 compatibility requires the MV2 manifest used by this project");
assert.ok(manifest.permissions.includes("<all_urls>"), "Darkgrid must request all-site Safari access once");
assert.ok(manifest.permissions.includes("storage"), "Local settings require storage permission");
assert.equal(manifest.browser_action.default_popup, "popup.html");
assert.equal(manifest.content_scripts.length, 1);
assert.deepEqual(manifest.content_scripts[0].matches, ["<all_urls>"]);
assert.equal(manifest.content_scripts[0].run_at, "document_start");

const referenced = new Set([
  ...manifest.background.scripts,
  manifest.browser_action.default_popup,
  ...manifest.content_scripts.flatMap(item => [...(item.css || []), ...(item.js || [])])
]);

for (const relative of referenced) {
  assert.ok(fs.existsSync(path.join(resources, relative)), `Missing extension resource: ${relative}`);
}

const content = fs.readFileSync(path.join(resources, "content.js"), "utf8");
assert.match(content, /browser\.storage\.local/, "Content script must load local settings");
assert.match(content, /excludedDomains/, "Content script must honor per-site exclusions");
assert.match(content, /darkgrid-glow/, "Content script must support edge glow");
for (const feature of ["frostTint", "colorLinks", "colorBorders", "colorAllText"]) {
  assert.ok(content.includes(feature), `Content script must support ${feature}`);
}
for (const className of ["darkgrid-frost", "darkgrid-color-links", "darkgrid-color-borders", "darkgrid-color-text"]) {
  assert.ok(content.includes(className), `Content script must toggle ${className}`);
}

const theme = fs.readFileSync(path.join(resources, "theme.css"), "utf8");
assert.match(theme, /darkgrid-frost::before/, "Theme must render the full-page frost tint");
assert.match(theme, /mix-blend-mode:\s*screen/, "Frost tint must blend over the rendered webpage");
assert.match(theme, /darkgrid-color-links/, "Theme must gate link accenting");
assert.match(theme, /darkgrid-color-borders/, "Theme must gate border accenting");
assert.match(theme, /darkgrid-color-text/, "Theme must gate all-text accenting");

const popupScript = fs.readFileSync(path.join(resources, "popup.js"), "utf8");
for (const color of ["#00F5FF", "#FF1744", "#00FF66", "#B026FF"]) {
  assert.ok(popupScript.includes(color), `Missing required neon preset ${color}`);
}
for (const feature of ["frostTint", "colorLinks", "colorBorders", "colorAllText"]) {
  assert.ok(popupScript.includes(feature), `Popup must persist ${feature}`);
}

const popupHtml = fs.readFileSync(path.join(resources, "popup.html"), "utf8");
for (const control of ["frostTint", "colorLinks", "colorBorders", "colorAllText", "edgeGlow"]) {
  assert.ok(popupHtml.includes(`id="${control}"`), `Popup is missing ${control} toggle`);
}

console.log("Darkgrid extension validation passed.");
