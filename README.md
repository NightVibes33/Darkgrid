# Darkgrid

Darkgrid is a native iOS/iPadOS Safari Web Extension that turns Safari pages into a true-black OLED theme with configurable neon accents.

## Features

- True-black webpage theme
- Cyan, red, green, and purple neon presets
- Custom color picker and hex entry
- Edge-glow mode
- Master theme toggle
- Per-site exclusions
- Instant setting changes without a page reload
- Local-only `browser.storage.local` settings
- No account, backend, analytics, or tracking

## Permission model

Darkgrid does **not** show its own permission popup on every website. Safari controls website access. After installing the app, enable the extension and grant it access to all websites once in Safari settings. Darkgrid then runs automatically on allowed pages until the user disables it or excludes a domain.

## Architecture

```text
Darkgrid iOS app
└── Darkgrid Safari Web Extension
    ├── manifest.json
    ├── background.js
    ├── content.js
    ├── theme.css
    ├── popup.html
    ├── popup.css
    └── popup.js
```

The native app is intentionally small. It reports whether the Safari extension is enabled and explains the one-time Safari setup. Theme controls live in the Safari extension popup.

## Build

The repository uses [XcodeGen](https://github.com/yonaskolb/XcodeGen) so the project file is reproducible.

```bash
brew install xcodegen
xcodegen generate
xcodebuild \
  -project Darkgrid.xcodeproj \
  -scheme Darkgrid \
  -configuration Release \
  -sdk iphoneos \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  -derivedDataPath build
```

GitHub Actions performs extension validation, generates the Xcode project, builds the iOS application, and packages an unsigned IPA artifact.

## Bundle identifiers

- App: `com.nightvibes33.Darkgrid`
- Safari extension: `com.nightvibes33.Darkgrid.Extension`

## Minimum OS

- iOS 15.0+
- iPadOS 15.0+
