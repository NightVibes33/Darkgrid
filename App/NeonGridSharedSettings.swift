import Foundation

enum NeonGridSharedSettings {
    static let suiteName = "group.com.nightvibes33.Darkgrid"
    static let defaults = UserDefaults(suiteName: suiteName) ?? .standard

    static func registerDefaults() {
        defaults.register(defaults: [
            "enabled": true,
            "accentColor": "#00F5FF",
            "themeID": "cyan",
            "frostTint": true,
            "colorLinks": true,
            "colorBorders": true,
            "colorAllText": false,
            "edgeGlow": false,
            "accentIntensity": 0.78,
            "glowStrength": 0.62,
            "surfaceStyle": "frosted",
            "excludedDomainsCSV": ""
        ])
    }
}
