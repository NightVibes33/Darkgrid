import SwiftUI

struct ContentView: View {
    @StateObject private var extensionState = ExtensionStateModel()
    @Environment(\.scenePhase) private var scenePhase

    private let neon = Color(red: 0.0, green: 0.96, blue: 1.0)

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    header
                    statusCard
                    setupCard
                    footer
                }
                .padding(.horizontal, 22)
                .padding(.vertical, 28)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear(perform: extensionState.refresh)
        .onChange(of: scenePhase) { phase in
            if phase == .active {
                extensionState.refresh()
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
            }

            Text("DARKGRID")
                .font(.system(size: 30, weight: .black, design: .monospaced))
                .tracking(5)
                .foregroundColor(.white)

            Text("TRUE BLACK. NEON WEB.")
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .tracking(2)
                .foregroundColor(neon.opacity(0.8))
        }
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 10, height: 10)
                    .shadow(color: statusColor.opacity(0.8), radius: 8)

                Text(statusTitle)
                    .font(.system(size: 15, weight: .bold, design: .monospaced))

                Spacer()
            }

            Text(statusDetail)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Button(action: extensionState.refresh) {
                Text("REFRESH STATUS")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(neon.opacity(0.12))
                    .foregroundColor(neon)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(neon.opacity(0.6), lineWidth: 1)
                    )
                    .cornerRadius(10)
            }
        }
        .padding(18)
        .background(Color.white.opacity(0.045))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(Color.white.opacity(0.09), lineWidth: 1)
        )
        .cornerRadius(18)
    }

    private var setupCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("ONE-TIME SETUP")
                .font(.system(size: 13, weight: .black, design: .monospaced))
                .tracking(1.5)
                .foregroundColor(neon)

            setupRow(number: "01", text: "Open Settings → Safari → Extensions → Darkgrid.")
            setupRow(number: "02", text: "Turn Darkgrid on.")
            setupRow(number: "03", text: "Grant website access to all websites once.")
            setupRow(number: "04", text: "In Safari, open Darkgrid from the Extensions menu to change colors, glow, or exclude the current site.")

            Divider().background(Color.white.opacity(0.12))

            Text("Darkgrid never asks for its own permission on every site. Safari owns the website-access permission; after you grant all-site access, the theme runs automatically on allowed pages.")
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

            Text(text)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white.opacity(0.9))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var footer: some View {
        Text("No account • No backend • No tracking")
            .font(.system(size: 11, weight: .medium, design: .monospaced))
            .foregroundColor(.secondary)
            .padding(.top, 4)
    }

    private var statusTitle: String {
        if let error = extensionState.errorMessage, !error.isEmpty {
            return "STATUS UNAVAILABLE"
        }

        switch extensionState.isEnabled {
        case true: return "SAFARI EXTENSION ENABLED"
        case false: return "SAFARI EXTENSION DISABLED"
        case nil: return "CHECKING EXTENSION"
        }
    }

    private var statusDetail: String {
        if let error = extensionState.errorMessage, !error.isEmpty {
            return error
        }

        switch extensionState.isEnabled {
        case true:
            return "Darkgrid is enabled in Safari. Website styling follows the controls in the Safari extension panel."
        case false:
            return "Enable Darkgrid in Safari settings, then grant all-site website access once."
        case nil:
            return "Checking the embedded Safari Web Extension state…"
        }
    }

    private var statusColor: Color {
        switch extensionState.isEnabled {
        case true: return neon
        case false: return .red
        case nil: return .yellow
        }
    }
}
