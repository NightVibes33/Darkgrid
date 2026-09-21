import Foundation
import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private let suiteName = "group.com.nightvibes33.Darkgrid"

    private var sharedDefaults: UserDefaults {
        UserDefaults(suiteName: suiteName) ?? .standard
    }

    private let defaultSettings: [String: Any] = [
        "enabled": true,
        "accentColor": "#00F5FF",
        "frostTint": true,
        "colorLinks": true,
        "colorBorders": true,
        "colorAllText": false,
        "edgeGlow": false,
        "accentIntensity": 1.0,
        "glowStrength": 1.0,
        "excludedDomains": [String]()
    ]

    func beginRequest(with context: NSExtensionContext) {
        let responseItem = NSExtensionItem()

        guard
            let item = context.inputItems.first as? NSExtensionItem,
            let message = item.userInfo?[SFExtensionMessageKey] as? [String: Any],
            let action = message["action"] as? String
        else {
            responseItem.userInfo = [
                SFExtensionMessageKey: [
                    "ok": false,
                    "error": "Invalid NeonGrid native message."
                ]
            ]
            context.completeRequest(returningItems: [responseItem], completionHandler: nil)
            return
        }

        let response: [String: Any]
        switch action {
        case "getSharedSettings":
            response = [
                "ok": true,
                "settings": readSettings()
            ]

        case "setSharedSettings":
            let patch = message["settings"] as? [String: Any] ?? [:]
            writeSettings(patch)
            response = [
                "ok": true,
                "settings": readSettings()
            ]

        default:
            response = [
                "ok": false,
                "error": "Unknown NeonGrid native action."
            ]
        }

        responseItem.userInfo = [SFExtensionMessageKey: response]
        context.completeRequest(returningItems: [responseItem], completionHandler: nil)
    }

    private func readSettings() -> [String: Any] {
        let defaults = sharedDefaults
        migrateLegacyRendererDefaults(defaults)
        var settings = defaultSettings

        for key in [
            "enabled",
            "frostTint",
            "colorLinks",
            "colorBorders",
            "colorAllText",
            "edgeGlow"
        ] {
            if defaults.object(forKey: key) != nil {
                settings[key] = defaults.bool(forKey: key)
            }
        }

        if let accent = defaults.string(forKey: "accentColor"), isValidHex(accent) {
            settings["accentColor"] = accent.uppercased()
        }

        if defaults.object(forKey: "accentIntensity") != nil {
            settings["accentIntensity"] = clamp(defaults.double(forKey: "accentIntensity"))
        }

        if defaults.object(forKey: "glowStrength") != nil {
            settings["glowStrength"] = clamp(defaults.double(forKey: "glowStrength"))
        }

        if let domains = defaults.array(forKey: "excludedDomains") as? [String] {
            settings["excludedDomains"] = normalizeDomains(domains)
        } else if let csv = defaults.string(forKey: "excludedDomainsCSV") {
            settings["excludedDomains"] = normalizeDomains(
                csv.split(separator: ",").map(String.init)
            )
        }

        return settings
    }

    private func writeSettings(_ patch: [String: Any]) {
        let defaults = sharedDefaults
        migrateLegacyRendererDefaults(defaults)

        for key in [
            "enabled",
            "frostTint",
            "colorLinks",
            "colorBorders",
            "colorAllText",
            "edgeGlow"
        ] {
            if let value = patch[key] as? Bool {
                defaults.set(value, forKey: key)
            } else if let number = patch[key] as? NSNumber {
                defaults.set(number.boolValue, forKey: key)
            }
        }

        if let accent = patch["accentColor"] as? String, isValidHex(accent) {
            let normalized = accent.uppercased()
            defaults.set(normalized, forKey: "accentColor")
            defaults.set(themeID(for: normalized), forKey: "themeID")
        }

        if let value = numericValue(patch["accentIntensity"]) {
            defaults.set(clamp(value), forKey: "accentIntensity")
        }

        if let value = numericValue(patch["glowStrength"]) {
            defaults.set(clamp(value), forKey: "glowStrength")
        }

        if let domains = patch["excludedDomains"] as? [String] {
            let normalized = normalizeDomains(domains)
            defaults.set(normalized, forKey: "excludedDomains")
            defaults.set(normalized.joined(separator: ","), forKey: "excludedDomainsCSV")
        } else if let domains = patch["excludedDomains"] as? [Any] {
            let normalized = normalizeDomains(domains.compactMap { $0 as? String })
            defaults.set(normalized, forKey: "excludedDomains")
            defaults.set(normalized.joined(separator: ","), forKey: "excludedDomainsCSV")
        }
    }

    private func migrateLegacyRendererDefaults(_ defaults: UserDefaults) {
        if defaults.integer(forKey: "rendererBaselineVersion") < 2 {
            defaults.set(1.0, forKey: "accentIntensity")
            defaults.set(1.0, forKey: "glowStrength")
            defaults.set(2, forKey: "rendererBaselineVersion")
        }
    }

    private func numericValue(_ value: Any?) -> Double? {
        if let number = value as? NSNumber { return number.doubleValue }
        if let value = value as? Double { return value }
        if let value = value as? Int { return Double(value) }
        return nil
    }

    private func clamp(_ value: Double) -> Double {
        min(1, max(0, value))
    }

    private func isValidHex(_ value: String) -> Bool {
        value.range(
            of: #"^#[0-9A-Fa-f]{6}$"#,
            options: .regularExpression
        ) != nil
    }

    private func normalizeDomains(_ values: [String]) -> [String] {
        var seen = Set<String>()
        return values.compactMap { raw in
            let normalized = raw
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .lowercased()
                .trimmingCharacters(in: CharacterSet(charactersIn: "."))
            guard !normalized.isEmpty, seen.insert(normalized).inserted else { return nil }
            return normalized
        }
    }

    private func themeID(for accent: String) -> String {
        switch accent.uppercased() {
        case "#00F5FF": return "cyan"
        case "#B026FF": return "purple"
        case "#00FF66": return "green"
        case "#FF1744": return "red"
        default: return "custom"
        }
    }
}
