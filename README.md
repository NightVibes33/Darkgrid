# Darkgrid

Darkgrid is an iOS/iPadOS Safari Web Extension that converts web UI to true-black OLED surfaces with optional neon frost, accents, borders, text, and edge glow.

## Rendering guarantees
- Frost is applied to CSS surfaces, never as a full-screen overlay above media.
- Existing surface alpha is preserved.
- Raster images, video, canvas, embedded media, and raster CSS backgrounds are not recolored.
- Open Shadow DOM, pseudo-elements, dynamic style/class changes, and subframes are handled.
- Simple monochrome SVG UI icons are repaired for dark backgrounds; complex/color artwork is preserved.
- Site exclusions are exact-host by default; wildcard entries such as `*.example.com` remain supported internally.
- Custom accent colors are automatically lifted when too dark to remain readable.

## Controls
Master enable, Cyan/Red/Green/Purple/custom accent, Frost Tint, Color Links, Color Borders, Color All Text, Edge Glow, and exact current-site exclusion. Settings stay local in `browser.storage.local`.

## Build / QA
CI validates pure rendering logic, runs a real WebKit browser integration suite, builds with the current iOS SDK on `macos-26`, validates the compiled Safari extension, assigns a unique build number from the Actions run, and packages an unsigned IPA.

Bundle IDs: `com.nightvibes33.Darkgrid` and `com.nightvibes33.Darkgrid.Extension`. Minimum iOS/iPadOS: 15.0.
