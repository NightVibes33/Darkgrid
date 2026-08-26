import SwiftUI

struct ContentView: View {
    private let neon = Color(red: 0.0, green: 0.96, blue: 1.0)

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

    private var extensionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Circle()
                    .fill(neon)
                    .frame(width: 10, height: 10)
                    .shadow(color: neon.opacity(0.8), radius: 8)

                Text("SAFARI EXTENSION INCLUDED")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))

                Spacer()
            }

            Text("Darkgrid installs its Safari Web Extension with this app. Enable it once in Safari settings, then use its Safari extension panel for theme controls.")
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
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

            Text("Darkgrid does not ask for its own permission on every website. Safari owns the website-access permission; after all-site access is granted, the theme runs automatically on allowed pages.")
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
}
