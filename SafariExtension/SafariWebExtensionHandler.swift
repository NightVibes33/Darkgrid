import Foundation
import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private let suiteName = "group.com.nightvibes33.Darkgrid"

    private var sharedDefaults: UserDefaults {
        UserDefaults(suiteName: suiteName) ?? .standard
    }

    func beginRequest(with context: NSExtensionContext) {
        let response = NSExtensionItem()

        guard
            let item = context.inputItems.first as? NSExtensionItem,
            let message = item.userInfo?[SFExtensionMessageKey] as? [String: Any],
            let action = message["action"] as? String
        else {
            context.completeRequest(returningItems: [response], completionHandler: nil)
            return
        }

        if action == "dequeueSettingPatch" {
            let defaults = sharedDefaults
            let keys = defaults.stringArray(forKey: "pendingSettingKeys") ?? []
            var patch: [String: Any] = [:]

            for key in keys {
                switch key {
                case "enabled", "frostTint", "colorLinks", "colorBorders", "colorAllText", "edgeGlow":
                    patch[key] = defaults.bool(forKey: key)
                case "accentColor":
                    if let value = defaults.string(forKey: key) {
                        patch[key] = value
                    }
                case "excludedDomains":
                    let csv = defaults.string(forKey: "excludedDomainsCSV") ?? ""
                    patch[key] = csv
                        .split(separator: ",")
                        .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
                        .filter { !$0.isEmpty }
                default:
                    break
                }
            }

            defaults.removeObject(forKey: "pendingSettingKeys")
            response.userInfo = [
                SFExtensionMessageKey: [
                    "ok": true,
                    "settings": patch
                ]
            ]
        } else {
            response.userInfo = [SFExtensionMessageKey: message]
        }

        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
