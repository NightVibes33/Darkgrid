import Combine
import SafariServices

final class ExtensionStateModel: ObservableObject {
    static let extensionIdentifier = "com.nightvibes33.Darkgrid.Extension"

    @Published var isEnabled: Bool?
    @Published var errorMessage: String?

    func refresh() {
        errorMessage = nil

        SFSafariExtensionManager.getStateOfSafariExtension(
            withIdentifier: Self.extensionIdentifier
        ) { [weak self] state, error in
            DispatchQueue.main.async {
                guard let self else { return }

                if let error {
                    self.isEnabled = nil
                    self.errorMessage = error.localizedDescription
                    return
                }

                self.isEnabled = state?.isEnabled
            }
        }
    }
}
