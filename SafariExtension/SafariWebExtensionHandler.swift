import Foundation
import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private let suiteName = "group.com.nightvibes33.Darkgrid"

    private var sharedDefaults: UserDefaults {
        UserDefaults(suiteName: suiteName) ?? .standard
    }

    private let supportedKeys: Set<String> = [
        "enabled",
        "accentColor",
        "frostTint",
        "colorLinks",
        "colorBorders",
        "colorAllText",
        "edgeGlow",
        "excludedDomains"
    ]

    func beginRequest(with context: NSExtensionContext) {
        let responseItem = NSExtensionItem()

        guard
            let item = context.inputItems.first as? NSExtensionItem,
            let message = item.userInfo?[SFExtensionMessageKey] as? [String: Any],
            let action = message["action"] as? String
        else {
            finish(
                context,
                responseItem,
                payload: ["ok": false, "error": "Invalid NeonGrid native message."]
            )
            return
        }

        switch action {
        case "getSharedSettings":
            let defaults = sharedDefaults
            migrateBrokenBridgeState(defaults)
            finish(
                context,
                responseItem,
                payload: [
                    "ok": true,
                    "revision": defaults.integer(forKey: "settingsRevision"),
                    "settings": readPendingSettings(defaults)
                ]
            )

        case "ackSharedSettings":
            let requestedRevision = (message["revision"] as? NSNumber)?.intValue
                ?? (message["revision"] as? Int)
                ?? -1
            let defaults = sharedDefaults
            if requestedRevision == defaults.integer(forKey: "settingsRevision") {
                defaults.removeObject(forKey: "pendingSettingKeys")
            }
            finish(context, responseItem, payload: ["ok": true])

        case "setSharedSettings":
            // Compatibility path only. Safari's popup remains authoritative in
            // browser.storage.local; this never marks unrelated app defaults dirty.
            if let patch = message["settings"] as? [String: Any] {
                writeSettings(patch, defaults: sharedDefaults)
            }
            finish(context, responseItem, payload: ["ok": true])

        default:
            finish(
                context,
                responseItem,
                payload: ["ok": false, "error": "Unknown NeonGrid native action."]
            )
        }
    }

    private func finish(
        _ context: NSExtensionContext,
        _ item: NSExtensionItem,
        payload: [String: Any]
    ) {
        item.userInfo = [SFExtensionMessageKey: payload]
        context.completeRequest(returningItems: [item], completionHandler: nil)
    }

    private func migrateBrokenBridgeState(_ defaults: UserDefaults) {
        if defaults.integer(forKey: "settingsBridgeVersion") < 4 {
            defaults.set(false, forKey: "frostTint")
            defaults.set(true, forKey: "colorLinks")
            defaults.set(true, forKey: "colorBorders")
            defaults.set(false, forKey: "colorAllText")
            defaults.set(false, forKey: "edgeGlow")
            defaults.removeObject(forKey: "pendingSettingKeys")
            defaults.set(4, forKey: "settingsBridgeVersion")
        }
    }

    private func readPendingSettings(_ defaults: UserDefaults) -> [String: Any] {
        let pending = Set(defaults.stringArray(forKey: "pendingSettingKeys") ?? [])
            .intersection(supportedKeys)
        guard !pending.isEmpty else { return [:] }

        var patch: [String: Any] = [:]

        for key in ["enabled", "frostTint", "colorLinks", "colorBorders", "colorAllText", "edgeGlow"]
        where pending.contains(key) {
            patch[key] = defaults.bool(forKey: key)
        }

        if pending.contains("accentColor"),
           let accent = defaults.string(forKey: "accentColor"),
           isValidHex(accent) {
            patch["accentColor"] = accent.uppercased()
        }

        if pending.contains("excludedDomains") {
            let csv = defaults.string(forKey: "excludedDomainsCSV") ?? ""
            patch["excludedDomains"] = normalizeDomains(
                csv.split(separator: ",").map(String.init)
            )
        }

        return patch
    }

    private func writeSettings(_ patch: [String: Any], defaults: UserDefaults) {
        for key in ["enabled", "frostTint", "colorLinks", "colorBorders", "colorAllText", "edgeGlow"] {
            if let value = patch[key] as? Bool {
                defaults.set(value, forKey: key)
            } else if let number = patch[key] as? NSNumber {
                defaults.set(number.boolValue, forKey: key)
            }
        }

        if let accent = patch["accentColor"] as? String, isValidHex(accent) {
            defaults.set(accent.uppercased(), forKey: "accentColor")
        }

        if let domains = patch["excludedDomains"] as? [String] {
            let normalized = normalizeDomains(domains)
            defaults.set(normalized.joined(separator: ","), forKey: "excludedDomainsCSV")
        }
    }

    private func isValidHex(_ value: String) -> Bool {
        value.range(of: #"^#[0-9A-Fa-f]{6}$"#, options: .regularExpression) != nil
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
}
