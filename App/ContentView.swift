import SafariServices
import SwiftUI

struct ContentView: View {
    private enum ExtensionStatus: Equatable {
        case checking
        case enabled
        case disabled
        case unavailable(String)

        var title: String {
            switch self {
            case .checking: return "CHECKING SAFARI STATUS"
            case .enabled: return "SAFARI EXTENSION ENABLED"
            case .disabled: return "SAFARI EXTENSION DISABLED"
            case .unavailable: return "STATUS UNAVAILABLE"
            }
        }

        var detail: String {
            switch self {
            case .checking:
                return "Darkgrid is asking Safari whether the embedded web extension is enabled."
            case .enabled:
                return "Darkgrid is enabled in Safari. Website access is still controlled by Safari and should be set to Every Website / Always Allow."
            case .disabled:
                return "Darkgrid is installed but disabled in Safari. Enable it in Safari Extensions before expecting pages to change."
            case .unavailable(let message):
                return message
            }
        }
    }

    @Environment(\.scenePhase) private var scenePhase
    @State private var extensionStatus: ExtensionStatus = .checking

    private let neon = Color(red: 0.0, green: 0.96, blue: 1.0)
    private let extensionBundleIdentifier = "com.nightvibes33.Darkgrid.Extension"

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    header
                    extensionCard
                    setupCard
                    footer
                }
                .padding(.horizontal, 22)
                .padding(.vertical, 28)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear(perform: refreshExtensionStatus)
        .onChange(of: scenePhase) { phase in
            if phase == .active {
                refreshExtensionStatus()
            }
        }
    }

    private var header: some View {
        VStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(Color.black)
                    .frame(width: 92, height: 92)
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(neon.opacity(0.9), lineWidth: 1.5)
                    )
                    .shadow(color: neon.opacity(0.5), radius: 18)

                Image(systemName: "square.grid.3x3.fill")
                    .font(.system(size: 44, weight: .black))
                    .foregroundColor(neon)
                    .accessibilityHidden(true)
            }

            Text("DARKGRID")
                .font(.system(size: 30, weight: .black, design: .monospaced))
                .tracking(5)
                .foregroundColor(.white)

            Text("TRUE BLACK. NEON WEB.")
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .tracking(2)
                .foregroundColor(neon.opacity(0.86))
        }
    }

    private var extensionCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 10, height: 10)
                    .shadow(color: statusColor.opacity(0.8), radius: 8)
                    .accessibilityHidden(true)

                Text(extensionStatus.title)
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)

                Spacer()
            }

            Text(extensionStatus.detail)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Button(action: refreshExtensionStatus) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("REFRESH EXTENSION STATUS")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 11)
            }
            .buttonStyle(.plain)
            .foregroundColor(neon)
            .background(neon.opacity(0.08))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(neon.opacity(0.45), lineWidth: 1)
            )
            .cornerRadius(10)
            .accessibilityHint("Checks whether Safari currently has the Darkgrid extension enabled when supported by this iOS version.")
        }
        .padding(18)
        .background(Color.white.opacity(0.045))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.white.opacity(0.10), lineWidth: 1)
        )
        .cornerRadius(18)
    }

    private var setupCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("ONE-TIME SETUP")
                .font(.system(size: 13, weight: .black, design: .monospaced))
                .tracking(1.5)
                .foregroundColor(neon)

            setupRow(number: "01", text: "Open Settings → Apps → Safari → Extensions → Darkgrid. On older iOS versions, open Settings → Safari → Extensions.")
            setupRow(number: "02", text: "Turn Darkgrid on.")
            setupRow(number: "03", text: "Set website access to Allow on Every Website / Always Allow once.")
            setupRow(number: "04", text: "In Safari, open Darkgrid from the Extensions menu to change colors, frost, glow, or exclude the current site.")

            Divider().background(Color.white.opacity(0.12))

            Text("Darkgrid does not create a permission prompt for every website. Safari owns website-access permission. After all-site access is granted, Darkgrid runs automatically on allowed pages.")
                .font(.system(size: 13))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Text("On iOS 26.2 and later, the status card above can confirm whether the extension itself is enabled. On older iOS versions, use Safari's Extensions settings. Safari does not expose per-website access state to this host screen.")
                .font(.system(size: 13))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(18)
        .background(Color.white.opacity(0.035))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(neon.opacity(0.22), lineWidth: 1)
        )
        .cornerRadius(18)
    }

    private func setupRow(number: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Text(number)
                .font(.system(size: 12, weight: .black, design: .monospaced))
                .foregroundColor(neon)
                .frame(width: 24, alignment: .leading)
                .accessibilityHidden(true)

            Text(text)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.92))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var footer: some View {
        Text("No account • No backend • No tracking")
            .font(.system(size: 11, weight: .medium, design: .monospaced))
            .foregroundColor(.secondary)
            .padding(.top, 4)
    }

    private var statusColor: Color {
        switch extensionStatus {
        case .enabled:
            return neon
        case .checking:
            return .yellow
        case .disabled:
            return .orange
        case .unavailable:
            return .gray
        }
    }

    private func refreshExtensionStatus() {
        extensionStatus = .checking

        guard #available(iOS 26.2, *) else {
            extensionStatus = .unavailable(
                "Automatic Safari extension-state checking requires iOS 26.2 or later. Darkgrid still works on supported older iOS versions; verify that it is enabled in Settings → Safari → Extensions."
            )
            return
        }

        SFSafariExtensionManager.getStateOfExtension(
            withIdentifier: extensionBundleIdentifier
        ) { state, error in
            DispatchQueue.main.async {
                if let error = error {
                    extensionStatus = .unavailable("Safari could not report the extension state: \(error.localizedDescription)")
                } else if let state = state {
                    extensionStatus = state.isEnabled ? .enabled : .disabled
                } else {
                    extensionStatus = .unavailable("Safari returned no state for the embedded extension.")
                }
            }
        }
    }
}
