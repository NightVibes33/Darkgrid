import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(
  path.join(root, "SafariExtension", "Resources", "surface-engine.js"),
  "utf8"
);

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "surface-engine.js" });

const engine = sandbox.DarkgridSurfaceEngine;
assert.ok(engine, "Surface engine must publish DarkgridSurfaceEngine");

assert.deepEqual(
  JSON.parse(JSON.stringify(engine.parseCssColor("rgb(255, 255, 255)"))),
  { r: 255, g: 255, b: 255, a: 1 }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(engine.parseCssColor("rgba(10, 20, 30, 0.5)"))),
  { r: 10, g: 20, b: 30, a: 0.5 }
);
assert.equal(engine.parseCssColor("transparent"), null);

const green = { r: 0, g: 255, b: 102 };
const whiteSurface = engine.buildSurfaceColors({ r: 255, g: 255, b: 255 }, green);
assert.match(whiteSurface.normal, /^rgb\(/, "Normal mapped surface must be opaque RGB");
assert.match(whiteSurface.frost, /^rgb\(/, "Frost mapped surface must be opaque RGB");
assert.doesNotMatch(whiteSurface.normal, /rgba/i);
assert.doesNotMatch(whiteSurface.frost, /rgba/i);
assert.notEqual(whiteSurface.normal, whiteSurface.frost, "Frost must tint the mapped surface");

const darkSurface = engine.buildSurfaceColors({ r: 12, g: 12, b: 12 }, green);
assert.match(darkSurface.normal, /^rgb\(/);
assert.match(darkSurface.frost, /^rgb\(/);

const pageFrost = engine.buildPageFrostColor({ r: 176, g: 38, b: 255 });
assert.match(pageFrost, /^rgb\(/, "Page frost base must remain opaque");
assert.doesNotMatch(pageFrost, /rgba/i);

assert.equal(engine.isMediaElement({ tagName: "IMG" }), true);
assert.equal(engine.isMediaElement({ tagName: "VIDEO" }), true);
assert.equal(engine.isMediaElement({ tagName: "DIV" }), false);
assert.equal(engine.hasRasterBackground('url("hero.jpg")'), true);
assert.equal(engine.hasRasterBackground("linear-gradient(red, blue)"), false);
assert.equal(engine.hasGradientBackground("linear-gradient(red, blue)"), true);

assert.equal(
  engine.hasVisibleBorder({
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "rgb(255, 255, 255)",
    borderRightWidth: "0px",
    borderRightStyle: "none",
    borderRightColor: "rgb(0, 0, 0)",
    borderBottomWidth: "0px",
    borderBottomStyle: "none",
    borderBottomColor: "rgb(0, 0, 0)",
    borderLeftWidth: "0px",
    borderLeftStyle: "none",
    borderLeftColor: "rgb(0, 0, 0)"
  }),
  true
);

console.log("Darkgrid surface engine tests passed.");
