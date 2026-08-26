# Darkgrid

Darkgrid is an iOS/iPadOS Safari Web Extension that converts web UI to true-black OLED surfaces with optional neon frost, accents, borders, text, and edge glow.

## Rendering guarantees

- Frost is applied to CSS surfaces, never as a full-screen overlay above content.
- Existing surface alpha is preserved, so translucent panels remain translucent.
- Raster images, video, canvas, embedded media, and raster CSS backgrounds are never placed in Darkgrid's frost/surface system.
- Darkgrid does not override site-owned media filters, opacity, or blend modes.
- Open Shadow DOM, pseudo-elements, pseudo gradients/shadows, dynamic text, class/style changes, arbitrary attribute-driven CSS, and subframes are handled.
- Simple monochrome SVG UI icons are repaired for dark backgrounds; complex/color SVG artwork is preserved.
- Site exclusions use the exact current hostname.
- Custom accent colors that are too dark for true black are automatically lifted to readable contrast without changing the four built-in presets.
- Color Links, Color Borders, and Color All Text remain independent controls.

## Controls

Master enable, Cyan/Red/Green/Purple/custom accent, Frost Tint, Color Links, Color Borders, Color All Text, Edge Glow, and current-site exclusion. Settings stay local in `browser.storage.local`.

## Build / QA

CI validates rendering logic, runs a real WebKit browser integration suite, builds with the current iOS SDK on `macos-26`, validates the compiled Safari app extension, assigns a unique build number from the Actions run, validates the app icon, and packages an unsigned IPA.

Bundle IDs: `com.nightvibes33.Darkgrid` and `com.nightvibes33.Darkgrid.Extension`.

Minimum iOS/iPadOS: 15.0.
