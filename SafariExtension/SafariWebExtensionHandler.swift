import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let response = NSExtensionItem()

        if let item = context.inputItems.first as? NSExtensionItem,
           let message = item.userInfo?[SFExtensionMessageKey] {
            response.userInfo = [SFExtensionMessageKey: message]
        }

        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
