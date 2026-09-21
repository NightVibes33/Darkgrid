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
            "accentIntensity": 1.0,
            "glowStrength": 1.0,
            "surfaceStyle": "frosted",
            "excludedDomainsCSV": ""
        ])

        if defaults.integer(forKey: "rendererBaselineVersion") < 2 {
            defaults.set(1.0, forKey: "accentIntensity")
            defaults.set(1.0, forKey: "glowStrength")
            defaults.set(2, forKey: "rendererBaselineVersion")
        }

        if defaults.integer(forKey: "settingsBridgeVersion") < 5 {
            defaults.set(true, forKey: "frostTint")
            defaults.set(true, forKey: "colorLinks")
            defaults.set(true, forKey: "colorBorders")
            defaults.set(false, forKey: "colorAllText")
            defaults.set(false, forKey: "edgeGlow")
            defaults.removeObject(forKey: "pendingSettingKeys")
            defaults.set(5, forKey: "settingsBridgeVersion")
        }
    }
}
