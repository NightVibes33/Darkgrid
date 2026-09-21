# NeonGrid: Dark Mode for Safari

NeonGrid is an iOS/iPadOS Safari Web Extension that transforms compatible web UI into true-black OLED surfaces with cyber-neon accents, optional frost, borders, text styling, and edge glow.

## Brand

- **App Store name:** NeonGrid: Dark Mode for Safari
- **Home-screen name:** NeonGrid
- **Visual direction:** true black, cyan → purple neon, glassy cards, cyber-grid / wireframe globe icon
- **Bundle IDs remain:** \`com.nightvibes33.Darkgrid\` and \`com.nightvibes33.Darkgrid.Extension\` to preserve signing and existing App ID continuity.

The app shell now uses a five-part product map matching the NeonGrid design:

1. Home
2. Appearance
3. Sites
4. Preview
5. Settings

The Safari extension popup carries the same NeonGrid visual language while retaining the existing real runtime controls.

## Rendering guarantees

- Frost is applied to CSS surfaces, never as a full-screen overlay above content.
- Existing surface alpha is preserved, so translucent panels remain translucent.
- Raster images, video, canvas, embedded media, and raster CSS backgrounds are never placed in NeonGrid's frost/surface system.
- NeonGrid does not override site-owned media filters, opacity, or blend modes.
- Open Shadow DOM, pseudo-elements, pseudo gradients/shadows, dynamic text, class/style changes, arbitrary attribute-driven CSS, and subframes are handled.
- Simple monochrome SVG UI icons are repaired for dark backgrounds; complex/color SVG artwork is preserved.
- Site exclusions use the exact current hostname.
- Custom accent colors that are too dark for true black are automatically lifted to readable contrast.
- Color Links, Color Borders, and Color All Text remain independent controls.

## Build / QA

CI validates rendering logic, runs a WebKit integration suite, generates the NeonGrid app icon, builds with the current iOS SDK on \`macos-26\`, validates the compiled Safari app extension, assigns a unique build number from the Actions run, validates the app icon, and packages an unsigned **NeonGrid-unsigned.ipa**.

Minimum iOS/iPadOS: 15.0.
