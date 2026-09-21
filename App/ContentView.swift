import Foundation
import SafariServices
import SwiftUI

private enum NeonTab: Int, CaseIterable {
    case home, appearance, sites, preview, settings

    var title: String {
        switch self {
        case .home: return "Home"
        case .appearance: return "Appearance"
        case .sites: return "Sites"
        case .preview: return "Preview"
        case .settings: return "Settings"
        }
    }

    var symbol: String {
        switch self {
        case .home: return "house.fill"
        case .appearance: return "paintpalette.fill"
        case .sites: return "globe"
        case .preview: return "rectangle.on.rectangle"
        case .settings: return "gearshape.fill"
        }
    }
}

private enum SafariExtensionState: Equatable {
    case checking
    case enabled
    case disabled
    case unavailable(String)

    var shortLabel: String {
        switch self {
        case .checking: return "Checking"
        case .enabled: return "Active"
        case .disabled: return "Needs Setup"
        case .unavailable: return "Unavailable"
        }
    }

    var detail: String {
        switch self {
        case .checking:
            return "Checking the embedded Safari extension."
        case .enabled:
            return "Safari reports that NeonGrid is enabled."
        case .disabled:
            return "Enable NeonGrid in Safari Extensions to style websites."
        case .unavailable(let message):
            return message
        }
    }
}

private struct NeonTheme: Identifiable, Equatable {
    let id: String
    let title: String
    let color: Color

    static let presets: [NeonTheme] = [
        .init(id: "cyan", title: "Cyan", color: Color(hex: "#00F5FF")),
        .init(id: "purple", title: "Purple", color: Color(hex: "#B026FF")),
        .init(id: "green", title: "Green", color: Color(hex: "#00FF66")),
        .init(id: "red", title: "Red", color: Color(hex: "#FF1744"))
    ]

    static func theme(for id: String) -> NeonTheme {
        presets.first(where: { $0.id == id }) ?? presets[0]
    }
}

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase

    @AppStorage("neongrid.theme") private var themeID = "cyan"
    @AppStorage("neongrid.frostTint") private var frostTint = true
    @AppStorage("neongrid.colorLinks") private var colorLinks = true
    @AppStorage("neongrid.colorBorders") private var colorBorders = true
    @AppStorage("neongrid.colorAllText") private var colorAllText = false
    @AppStorage("neongrid.edgeGlow") private var edgeGlow = true
    @AppStorage("neongrid.accentIntensity") private var accentIntensity = 0.78
    @AppStorage("neongrid.glowStrength") private var glowStrength = 0.62
    @AppStorage("neongrid.surfaceStyle") private var surfaceStyle = "frosted"
    @AppStorage("neongrid.excludedDomains") private var excludedDomains = ""

    @State private var selectedTab: NeonTab = .home
    @State private var extensionState: SafariExtensionState = .checking
    @State private var previewStyled = true

    private let extensionBundleIdentifier = "com.nightvibes33.Darkgrid.Extension"

    private var theme: NeonTheme { NeonTheme.theme(for: themeID) }

    var body: some View {
        ZStack {
            NeonBackground(accent: theme.color)

            VStack(spacing: 0) {
                Group {
                    switch selectedTab {
                    case .home:
                        HomeScreen(
                            themeID: $themeID,
                            frostTint: $frostTint,
                            colorLinks: $colorLinks,
                            colorBorders: $colorBorders,
                            colorAllText: $colorAllText,
                            edgeGlow: $edgeGlow,
                            extensionState: extensionState,
                            refresh: refreshExtensionStatus,
                            openTab: { selectedTab = $0 }
                        )
                    case .appearance:
                        AppearanceScreen(
                            themeID: $themeID,
                            accentIntensity: $accentIntensity,
                            glowStrength: $glowStrength,
                            frostTint: $frostTint,
                            colorLinks: $colorLinks,
                            colorBorders: $colorBorders,
                            colorAllText: $colorAllText,
                            edgeGlow: $edgeGlow,
                            surfaceStyle: $surfaceStyle
                        )
                    case .sites:
                        SitesScreen(excludedDomains: $excludedDomains)
                    case .preview:
                        PreviewScreen(
                            theme: theme,
                            styled: $previewStyled,
                            frostTint: frostTint,
                            colorLinks: colorLinks,
                            colorBorders: colorBorders,
                            colorAllText: colorAllText,
                            edgeGlow: edgeGlow
                        )
                    case .settings:
                        SettingsScreen(
                            extensionState: extensionState,
                            refresh: refreshExtensionStatus,
                            reset: resetDashboardPreferences
                        )
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                NeonTabBar(selected: $selectedTab, accent: theme.color)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear(perform: refreshExtensionStatus)
        .onChange(of: scenePhase) { phase in
            if phase == .active { refreshExtensionStatus() }
        }
    }

    private func refreshExtensionStatus() {
        extensionState = .checking

        guard #available(iOS 26.2, *) else {
            extensionState = .unavailable(
                "Extension-state checking requires iOS 26.2 or later. On older iOS versions, verify NeonGrid in Settings → Safari → Extensions."
            )
            return
        }

        SFSafariExtensionManager.getStateOfExtension(withIdentifier: extensionBundleIdentifier) { state, error in
            DispatchQueue.main.async {
                if let error = error {
                    extensionState = .unavailable(error.localizedDescription)
                } else if let state = state {
                    extensionState = state.isEnabled ? .enabled : .disabled
                } else {
                    extensionState = .unavailable("Safari returned no extension state.")
                }
            }
        }
    }

    private func resetDashboardPreferences() {
        themeID = "cyan"
        frostTint = true
        colorLinks = true
        colorBorders = true
        colorAllText = false
        edgeGlow = true
        accentIntensity = 0.78
        glowStrength = 0.62
        surfaceStyle = "frosted"
        excludedDomains = ""
    }
}

private struct HomeScreen: View {
    @Binding var themeID: String
    @Binding var frostTint: Bool
    @Binding var colorLinks: Bool
    @Binding var colorBorders: Bool
    @Binding var colorAllText: Bool
    @Binding var edgeGlow: Bool

    let extensionState: SafariExtensionState
    let refresh: () -> Void
    let openTab: (NeonTab) -> Void

    private var theme: NeonTheme { NeonTheme.theme(for: themeID) }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                BrandHeader(accent: theme.color)

                ExtensionHeroCard(state: extensionState, accent: theme.color, refresh: refresh)

                ThemeHeroCard(theme: theme) {
                    openTab(.appearance)
                }

                sectionHeader("QUICK THEMES", trailing: "CHOOSE YOUR VIBE")

                HStack(spacing: 10) {
                    ForEach(NeonTheme.presets) { preset in
                        ThemeChip(theme: preset, selected: preset.id == themeID) {
                            themeID = preset.id
                        }
                    }
                }

                sectionHeader("APPEARANCE CONTROLS", trailing: "FINE-TUNE THE LOOK")

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    CompactToggleCard(
                        title: "Frost Tint",
                        subtitle: "Subtle glass tint",
                        symbol: "square.dashed",
                        isOn: $frostTint,
                        accent: theme.color
                    )
                    CompactToggleCard(
                        title: "Color Links",
                        subtitle: "Neon-style links",
                        symbol: "link",
                        isOn: $colorLinks,
                        accent: theme.color
                    )
                    CompactToggleCard(
                        title: "Color Borders",
                        subtitle: "Highlight elements",
                        symbol: "rectangle",
                        isOn: $colorBorders,
                        accent: theme.color
                    )
                    CompactToggleCard(
                        title: "Color All Text",
                        subtitle: "A consistent look",
                        symbol: "textformat",
                        isOn: $colorAllText,
                        accent: theme.color
                    )
                }

                CompactToggleCard(
                    title: "Edge Glow",
                    subtitle: "Ambient glow around pages",
                    symbol: "sparkles",
                    isOn: $edgeGlow,
                    accent: theme.color
                )

                sectionHeader("LIVE PREVIEW", trailing: "REAL WEBSITES. DARKER.")

                LivePreviewCard(theme: theme)

                Button {
                    openTab(.preview)
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "safari.fill")
                            .font(.system(size: 28))
                            .foregroundColor(Color(hex: "#53B7FF"))
                        VStack(alignment: .leading, spacing: 3) {
                            Text("The entire web, redesigned for the night.")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                            Text("Same content. A cleaner, darker internet.")
                                .font(.system(size: 11))
                                .foregroundColor(.white.opacity(0.55))
                        }
                        Spacer()
                        Text("Safari, but better.")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(hex: "#D77CFF"))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(hex: "#D77CFF"))
                    }
                    .padding(15)
                    .background(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(Color.white.opacity(0.055))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(
                                LinearGradient(
                                    colors: [theme.color.opacity(0.55), Color(hex: "#B026FF").opacity(0.55)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                ),
                                lineWidth: 1
                            )
                    )
                }
                .buttonStyle(.plain)
                .padding(.bottom, 10)
            }
            .padding(.horizontal, 18)
            .padding(.top, 18)
        }
    }

    private func sectionHeader(_ title: String, trailing: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .tracking(2)
                .foregroundColor(.white.opacity(0.8))
            Spacer()
            Text(trailing)
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .tracking(1.6)
                .foregroundColor(.white.opacity(0.42))
        }
        .padding(.top, 2)
    }
}

private struct AppearanceScreen: View {
    @Binding var themeID: String
    @Binding var accentIntensity: Double
    @Binding var glowStrength: Double
    @Binding var frostTint: Bool
    @Binding var colorLinks: Bool
    @Binding var colorBorders: Bool
    @Binding var colorAllText: Bool
    @Binding var edgeGlow: Bool
    @Binding var surfaceStyle: String

    private var theme: NeonTheme { NeonTheme.theme(for: themeID) }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 18) {
                ScreenTitle(title: "Appearance", subtitle: "Customize how the web looks.")

                Text("THEME PRESETS")
                    .sectionLabel()

                HStack(spacing: 12) {
                    ForEach(NeonTheme.presets) { preset in
                        ThemeOrb(theme: preset, selected: preset.id == themeID) {
                            themeID = preset.id
                        }
                    }
                }

                NeonCard(accent: theme.color) {
                    VStack(spacing: 18) {
                        ControlLine(title: "Accent Color", value: theme.title, accent: theme.color)
                        NeonSlider(title: "Accent Intensity", value: $accentIntensity, accent: theme.color)
                        NeonSlider(title: "Glow Strength", value: $glowStrength, accent: Color(hex: "#B026FF"))

                        Divider().background(Color.white.opacity(0.12))

                        Toggle("Frosted Surfaces", isOn: $frostTint)
                            .font(.system(size: 14, weight: .semibold))
                            .toggleStyle(SwitchToggleStyle(tint: theme.color))
                    }
                }

                Text("SURFACE STYLE")
                    .sectionLabel()

                HStack(spacing: 12) {
                    SurfaceStyleCard(
                        title: "Pure Dark",
                        subtitle: "Clean & minimal",
                        symbol: "square.fill",
                        selected: surfaceStyle == "dark",
                        accent: theme.color
                    ) { surfaceStyle = "dark" }

                    SurfaceStyleCard(
                        title: "Frosted",
                        subtitle: "Glass-like finish",
                        symbol: "square.on.square",
                        selected: surfaceStyle == "frosted",
                        accent: theme.color
                    ) { surfaceStyle = "frosted" }
                }

                Text("DETAIL CONTROLS")
                    .sectionLabel()

                NeonCard(accent: theme.color) {
                    VStack(spacing: 0) {
                        FullToggleRow(title: "Color Links", subtitle: "Tint links with the active accent.", symbol: "link", isOn: $colorLinks, accent: theme.color)
                        Divider().background(Color.white.opacity(0.08))
                        FullToggleRow(title: "Color Borders", subtitle: "Highlight existing UI boundaries.", symbol: "rectangle", isOn: $colorBorders, accent: theme.color)
                        Divider().background(Color.white.opacity(0.08))
                        FullToggleRow(title: "Color All Text", subtitle: "Apply the accent across readable text.", symbol: "textformat", isOn: $colorAllText, accent: theme.color)
                        Divider().background(Color.white.opacity(0.08))
                        FullToggleRow(title: "Edge Glow", subtitle: "Add a viewport-anchored neon vignette.", symbol: "sparkles", isOn: $edgeGlow, accent: theme.color)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 22)
            .padding(.bottom, 22)
        }
    }
}

private struct SitesScreen: View {
    @Binding var excludedDomains: String
    @State private var newDomain = ""

    private var domains: [String] {
        excludedDomains
            .split(separator: ",")
            .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
            .filter { !$0.isEmpty }
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 16) {
                ScreenTitle(title: "Sites", subtitle: "Control where NeonGrid is active.")

                NeonCard(accent: Color(hex: "#00F5FF")) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("CURRENT WEBSITE")
                            .sectionLabel()
                        HStack(spacing: 12) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(Color(hex: "#0D1722"))
                                    .frame(width: 42, height: 42)
                                Image(systemName: "safari.fill")
                                    .foregroundColor(Color(hex: "#53B7FF"))
                            }
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Use NeonGrid inside Safari")
                                    .font(.system(size: 14, weight: .semibold))
                                Text("Open Safari → Extensions → NeonGrid for the live current-site switch.")
                                    .font(.system(size: 11))
                                    .foregroundColor(.white.opacity(0.55))
                            }
                        }
                    }
                }

                Text("SITE RULES")
                    .sectionLabel()

                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.white.opacity(0.45))
                    TextField("Add a website, e.g. example.com", text: $newDomain)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                        .foregroundColor(.white)
                    Button("Add") { addDomain() }
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color(hex: "#00F5FF"))
                }
                .padding(13)
                .background(RoundedRectangle(cornerRadius: 14).fill(Color.white.opacity(0.06)))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.1), lineWidth: 1))

                if domains.isEmpty {
                    NeonCard(accent: Color(hex: "#B026FF")) {
                        VStack(spacing: 10) {
                            Image(systemName: "globe")
                                .font(.system(size: 28))
                                .foregroundColor(Color(hex: "#00F5FF"))
                            Text("No saved site rules")
                                .font(.system(size: 15, weight: .semibold))
                            Text("Add hostnames here to organize your exclusions. Live website exclusion is available from the Safari extension popup.")
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.55))
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                    }
                } else {
                    NeonCard(accent: Color(hex: "#00F5FF")) {
                        VStack(spacing: 0) {
                            ForEach(domains, id: \.self) { domain in
                                HStack(spacing: 12) {
                                    ZStack {
                                        RoundedRectangle(cornerRadius: 9)
                                            .fill(Color.white.opacity(0.06))
                                            .frame(width: 38, height: 38)
                                        Text(String(domain.prefix(1)).uppercased())
                                            .font(.system(size: 14, weight: .black))
                                            .foregroundColor(Color(hex: "#00F5FF"))
                                    }
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(domain)
                                            .font(.system(size: 14, weight: .semibold))
                                        Text("Excluded")
                                            .font(.system(size: 11))
                                            .foregroundColor(Color(hex: "#FF5470"))
                                    }
                                    Spacer()
                                    Button {
                                        removeDomain(domain)
                                    } label: {
                                        Image(systemName: "trash")
                                            .foregroundColor(Color(hex: "#FF5470"))
                                    }
                                    .buttonStyle(.plain)
                                }
                                .padding(.vertical, 11)

                                if domain != domains.last {
                                    Divider().background(Color.white.opacity(0.08))
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 22)
            .padding(.bottom, 22)
        }
    }

    private func addDomain() {
        var host = newDomain
            .lowercased()
            .replacingOccurrences(of: "https://", with: "")
            .replacingOccurrences(of: "http://", with: "")
        if let slash = host.firstIndex(of: "/") { host = String(host[..<slash]) }
        host = host.trimmingCharacters(in: CharacterSet(charactersIn: ". "))

        guard !host.isEmpty else { return }
        var next = domains
        if !next.contains(host) { next.append(host) }
        excludedDomains = next.joined(separator: ",")
        newDomain = ""
    }

    private func removeDomain(_ domain: String) {
        excludedDomains = domains.filter { $0 != domain }.joined(separator: ",")
    }
}

private struct PreviewScreen: View {
    let theme: NeonTheme
    @Binding var styled: Bool
    let frostTint: Bool
    let colorLinks: Bool
    let colorBorders: Bool
    let colorAllText: Bool
    let edgeGlow: Bool

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 18) {
                ScreenTitle(title: "Preview", subtitle: "See your theme in action.")

                HStack(spacing: 0) {
                    previewSegment("Original", selected: !styled) { styled = false }
                    previewSegment("Styled", selected: styled) { styled = true }
                }
                .padding(4)
                .background(RoundedRectangle(cornerRadius: 13).fill(Color.white.opacity(0.06)))

                BrowserMock(styled: styled, accent: theme.color)

                NeonCard(accent: theme.color) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("LIVE PREVIEW")
                            .sectionLabel()
                        PreviewFlag(title: "Accent Color", enabled: true, accent: theme.color)
                        PreviewFlag(title: "Frosted Surfaces", enabled: frostTint, accent: theme.color)
                        PreviewFlag(title: "Neon Borders", enabled: colorBorders, accent: theme.color)
                        PreviewFlag(title: "Color Links", enabled: colorLinks, accent: theme.color)
                        PreviewFlag(title: "Color All Text", enabled: colorAllText, accent: theme.color)
                        PreviewFlag(title: "Edge Glow", enabled: edgeGlow, accent: theme.color)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 22)
            .padding(.bottom, 22)
        }
    }

    private func previewSegment(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(selected ? .white : .white.opacity(0.5))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(selected ? Color(hex: "#243A82") : Color.clear)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(selected ? theme.color.opacity(0.65) : Color.clear, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

private struct SettingsScreen: View {
    let extensionState: SafariExtensionState
    let refresh: () -> Void
    let reset: () -> Void

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 18) {
                ScreenTitle(title: "Settings", subtitle: "Make NeonGrid yours.")

                NeonCard(accent: Color(hex: "#00F5FF")) {
                    VStack(spacing: 0) {
                        SettingsRow(symbol: "checkmark.shield.fill", title: "Safari Extension", subtitle: extensionState.shortLabel, color: Color(hex: "#00F5FF"))
                        Divider().background(Color.white.opacity(0.08))
                        Button(action: refresh) {
                            SettingsRow(symbol: "arrow.clockwise", title: "REFRESH EXTENSION STATUS", subtitle: extensionState.detail, color: Color(hex: "#53B7FF"))
                        }
                        .buttonStyle(.plain)
                    }
                }

                NeonCard(accent: Color(hex: "#B026FF")) {
                    VStack(spacing: 0) {
                        SettingsRow(symbol: "hand.raised.fill", title: "Privacy", subtitle: "Local-only settings. No account. No tracking.", color: Color(hex: "#B026FF"))
                        Divider().background(Color.white.opacity(0.08))
                        SettingsRow(symbol: "info.circle.fill", title: "About", subtitle: "NeonGrid: Dark Mode for Safari • Version 1.2.0", color: Color(hex: "#00F5FF"))
                    }
                }

                Button(action: reset) {
                    HStack {
                        Image(systemName: "arrow.counterclockwise")
                        Text("Reset Dashboard Preferences")
                            .fontWeight(.semibold)
                        Spacer()
                    }
                    .foregroundColor(Color(hex: "#FF5470"))
                    .padding(15)
                    .background(RoundedRectangle(cornerRadius: 16).fill(Color(hex: "#3A0C16").opacity(0.55)))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "#FF5470").opacity(0.35), lineWidth: 1))
                }
                .buttonStyle(.plain)

                NeonCard(accent: Color(hex: "#00F5FF")) {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("SAFARI SETUP")
                            .sectionLabel()
                        setupLine("1", "Open Settings → Apps → Safari → Extensions → NeonGrid.")
                        setupLine("2", "Turn NeonGrid on.")
                        setupLine("3", "Allow access on Every Website / Always Allow.")
                        setupLine("4", "Open NeonGrid from Safari's Extensions menu for live page controls.")
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 22)
            .padding(.bottom, 22)
        }
    }

    private func setupLine(_ number: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number)
                .font(.system(size: 11, weight: .black, design: .monospaced))
                .foregroundColor(Color(hex: "#00F5FF"))
                .frame(width: 22, height: 22)
                .background(Circle().fill(Color(hex: "#00F5FF").opacity(0.12)))
            Text(text)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.7))
        }
    }
}

private struct BrandHeader: View {
    let accent: Color

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                GradientBrandText(text: "NeonGrid", size: 38)
                Text("Dark Mode for Safari")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(.white.opacity(0.82))
                Text("A  B R I G H T E R   W E B   A F T E R   D A R K")
                    .font(.system(size: 8, weight: .semibold, design: .monospaced))
                    .foregroundColor(.white.opacity(0.42))
                    .padding(.top, 2)
            }

            Spacer()

            VStack(spacing: 4) {
                Image(systemName: "sparkles")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Color(hex: "#93A7FF"))
                Text("SAFARI\nLOOKS BETTER\nIN NEON")
                    .font(.system(size: 8, weight: .bold, design: .monospaced))
                    .tracking(1.2)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.white.opacity(0.6))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(RoundedRectangle(cornerRadius: 14).fill(Color(hex: "#0B0B19").opacity(0.85)))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#6D4AFF").opacity(0.45), lineWidth: 1))
        }
    }
}

private struct ExtensionHeroCard: View {
    let state: SafariExtensionState
    let accent: Color
    let refresh: () -> Void

    var body: some View {
        Button(action: refresh) {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(accent.opacity(0.12))
                        .frame(width: 52, height: 52)
                    Circle()
                        .stroke(accent.opacity(0.7), lineWidth: 1)
                        .frame(width: 52, height: 52)
                        .shadow(color: accent.opacity(0.8), radius: 10)
                    Image(systemName: state == .enabled ? "power" : "bolt.fill")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(accent)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(state == .enabled ? "NeonGrid is Active" : "Enable NeonGrid")
                        .font(.system(size: 17, weight: .bold))
                    Text(state.detail)
                        .font(.system(size: 11))
                        .foregroundColor(.white.opacity(0.55))
                        .lineLimit(2)
                }

                Spacer()

                HStack(spacing: 8) {
                    Circle()
                        .fill(state == .enabled ? Color(hex: "#00FF9D") : Color(hex: "#FFB84D"))
                        .frame(width: 8, height: 8)
                    Text(state.shortLabel.uppercased())
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(.white.opacity(0.75))
                }
            }
            .padding(15)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#061317").opacity(0.95), Color(hex: "#10101B").opacity(0.95)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
            )
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(accent.opacity(0.45), lineWidth: 1))
            .shadow(color: accent.opacity(0.12), radius: 18)
        }
        .buttonStyle(.plain)
    }
}

private struct ThemeHeroCard: View {
    let theme: NeonTheme
    let customize: () -> Void

    var body: some View {
        ZStack(alignment: .leading) {
            CyberLandscape(accent: theme.color)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

            VStack(alignment: .leading, spacing: 4) {
                Text("CURRENT THEME")
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .tracking(1.8)
                    .foregroundColor(.white.opacity(0.55))
                Text(theme.title)
                    .font(.system(size: 27, weight: .bold))
                    .foregroundColor(theme.color)
                Text("Clean. Modern. Electric.")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.65))

                Button(action: customize) {
                    HStack(spacing: 8) {
                        Text("Customize")
                        Image(systemName: "arrow.right")
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(theme.color)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 9)
                    .background(Capsule().fill(Color.black.opacity(0.4)))
                    .overlay(Capsule().stroke(theme.color.opacity(0.9), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .padding(.top, 6)
            }
            .padding(16)

            VStack {
                HStack {
                    Spacer()
                    Text("DARKER\nSITES\nBRIGHTER\nIDEAS")
                        .font(.system(size: 8, weight: .bold, design: .monospaced))
                        .tracking(1.7)
                        .foregroundColor(theme.color.opacity(0.75))
                        .padding(.top, 18)
                        .padding(.trailing, 18)
                }
                Spacer()
            }
        }
        .frame(height: 176)
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(theme.color.opacity(0.34), lineWidth: 1))
    }
}

private struct ThemeChip: View {
    let theme: NeonTheme
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 9) {
                Circle()
                    .stroke(theme.color, lineWidth: 3)
                    .frame(width: 36, height: 36)
                    .shadow(color: theme.color.opacity(0.9), radius: 9)
                Text(theme.title)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 17)
                    .fill(theme.color.opacity(selected ? 0.13 : 0.05))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 17)
                    .stroke(selected ? theme.color : Color.white.opacity(0.13), lineWidth: selected ? 1.5 : 1)
            )
            .shadow(color: selected ? theme.color.opacity(0.35) : .clear, radius: 10)
        }
        .buttonStyle(.plain)
    }
}

private struct ThemeOrb: View {
    let theme: NeonTheme
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(theme.color.opacity(0.16))
                        .frame(width: 48, height: 48)
                    Circle()
                        .stroke(theme.color, lineWidth: selected ? 4 : 2)
                        .frame(width: 40, height: 40)
                        .shadow(color: theme.color.opacity(0.9), radius: 9)
                }
                Text(theme.title)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(selected ? theme.color : .white.opacity(0.7))
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}

private struct CompactToggleCard: View {
    let title: String
    let subtitle: String
    let symbol: String
    @Binding var isOn: Bool
    let accent: Color

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(Color(hex: "#2A1450").opacity(0.7))
                    .frame(width: 37, height: 37)
                Image(systemName: symbol)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Color(hex: "#B85CFF"))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 12, weight: .semibold))
                Text(subtitle)
                    .font(.system(size: 9))
                    .foregroundColor(.white.opacity(0.5))
                    .lineLimit(1)
            }

            Spacer(minLength: 6)

            Toggle("", isOn: $isOn)
                .labelsHidden()
                .toggleStyle(SwitchToggleStyle(tint: accent))
                .scaleEffect(0.78)
                .frame(width: 42)
        }
        .padding(.horizontal, 11)
        .padding(.vertical, 12)
        .background(RoundedRectangle(cornerRadius: 17).fill(Color(hex: "#071117").opacity(0.9)))
        .overlay(RoundedRectangle(cornerRadius: 17).stroke(Color(hex: "#163B4A").opacity(0.9), lineWidth: 1))
    }
}

private struct FullToggleRow: View {
    let title: String
    let subtitle: String
    let symbol: String
    @Binding var isOn: Bool
    let accent: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(Color(hex: "#B85CFF"))
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundColor(.white.opacity(0.5))
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
                .toggleStyle(SwitchToggleStyle(tint: accent))
        }
        .padding(.vertical, 12)
    }
}

private struct LivePreviewCard: View {
    let theme: NeonTheme

    var body: some View {
        HStack(spacing: 0) {
            MiniBrowserPanel(styled: false, accent: theme.color)
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "#7B2BFF"), theme.color],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: 1)
            MiniBrowserPanel(styled: true, accent: theme.color)
        }
        .frame(height: 225)
        .background(Color.black)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(
                    LinearGradient(colors: [theme.color.opacity(0.7), Color(hex: "#B026FF").opacity(0.75)], startPoint: .leading, endPoint: .trailing),
                    lineWidth: 1
                )
        )
    }
}

private struct MiniBrowserPanel: View {
    let styled: Bool
    let accent: Color

    var body: some View {
        VStack(spacing: 0) {
            Text(styled ? "WITH NEONGRID" : "BEFORE")
                .font(.system(size: 8, weight: .bold, design: .monospaced))
                .tracking(1.2)
                .foregroundColor(styled ? accent : .black.opacity(0.7))
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(Capsule().fill(styled ? Color.black.opacity(0.55) : Color.white.opacity(0.82)))
                .overlay(Capsule().stroke(styled ? accent.opacity(0.8) : Color.clear, lineWidth: 1))
                .padding(.top, 8)

            VStack(spacing: 8) {
                HStack {
                    Text("AA")
                    Spacer()
                    Image(systemName: "lock.fill")
                    Text("apple.com")
                    Spacer()
                    Image(systemName: "arrow.clockwise")
                }
                .font(.system(size: 8))
                .foregroundColor(styled ? accent : .black.opacity(0.72))
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(styled ? Color(hex: "#06131C") : Color(hex: "#ECECEF"))

                Image(systemName: "applelogo")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(styled ? .white : .black)

                Text("iPhone 15 Pro")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(styled ? accent : .black)

                Text("Titanium. So strong. So light. So Pro.")
                    .font(.system(size: 8))
                    .foregroundColor(styled ? Color(hex: "#D67AFF") : .black.opacity(0.65))
                    .multilineTextAlignment(.center)

                ZStack {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(styled ? Color(hex: "#06121A") : Color(hex: "#D5D0C6"))
                        .frame(width: 72, height: 78)
                    RoundedRectangle(cornerRadius: 13)
                        .stroke(styled ? accent : Color.gray.opacity(0.6), lineWidth: 2)
                        .frame(width: 50, height: 62)
                        .shadow(color: styled ? accent.opacity(0.75) : .clear, radius: 8)
                    Circle()
                        .fill(Color.black.opacity(0.85))
                        .frame(width: 20, height: 20)
                        .offset(x: -10, y: -12)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(styled ? Color.black : Color.white)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct BrowserMock: View {
    let styled: Bool
    let accent: Color

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Text("AA")
                Spacer()
                Image(systemName: "lock.fill")
                Text("theverge.com")
                Spacer()
                Image(systemName: "arrow.clockwise")
            }
            .font(.system(size: 11))
            .foregroundColor(styled ? accent : .black.opacity(0.7))
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .background(styled ? Color(hex: "#07141D") : Color(hex: "#ECECEF"))

            VStack(alignment: .leading, spacing: 15) {
                Text("The Verge")
                    .font(.system(size: 24, weight: .black))
                    .foregroundColor(styled ? .white : .black)
                Text("Tech   /   Reviews   /   Science   /   More +")
                    .font(.system(size: 10))
                    .foregroundColor(styled ? accent : .black.opacity(0.65))
                Divider().background(styled ? accent.opacity(0.6) : Color.black.opacity(0.2))
                Text("The next generation\nof the web is darker.")
                    .font(.system(size: 29, weight: .black))
                    .foregroundColor(styled ? .white : .black)
                Text("Cleaner. Sharper. Better.")
                    .font(.system(size: 13))
                    .foregroundColor(styled ? .white.opacity(0.6) : .black.opacity(0.6))
                Spacer()
                ZStack(alignment: .bottomTrailing) {
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: styled ? [Color.black, Color(hex: "#090B2D")] : [Color(hex: "#E6E6E6"), Color(hex: "#C9D6FF")],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: styled ? [accent, Color(hex: "#B026FF")] : [Color.gray, Color.white],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 190, height: 190)
                        .offset(x: 55, y: 55)
                        .shadow(color: styled ? accent.opacity(0.45) : .clear, radius: 20)
                }
                .frame(height: 210)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .padding(18)
            .background(styled ? Color.black : Color.white)
        }
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(styled ? accent.opacity(0.55) : Color.white.opacity(0.12), lineWidth: 1)
        )
        .shadow(color: styled ? accent.opacity(0.18) : .clear, radius: 20)
    }
}

private struct PreviewFlag: View {
    let title: String
    let enabled: Bool
    let accent: Color

    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 12, weight: .medium))
            Spacer()
            Image(systemName: enabled ? "checkmark.circle.fill" : "circle")
                .foregroundColor(enabled ? accent : .white.opacity(0.25))
        }
    }
}

private struct ControlLine: View {
    let title: String
    let value: String
    let accent: Color

    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 13, weight: .medium))
            Spacer()
            Circle().fill(accent).frame(width: 15, height: 15).shadow(color: accent.opacity(0.7), radius: 6)
            Text(value)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.white.opacity(0.55))
        }
    }
}

private struct NeonSlider: View {
    let title: String
    @Binding var value: Double
    let accent: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title).font(.system(size: 13, weight: .medium))
                Spacer()
                Text("\(Int(value * 100))%")
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundColor(.white.opacity(0.5))
            }
            Slider(value: $value, in: 0...1)
                .accentColor(accent)
        }
    }
}

private struct SurfaceStyleCard: View {
    let title: String
    let subtitle: String
    let symbol: String
    let selected: Bool
    let accent: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 11) {
                Image(systemName: symbol)
                    .font(.system(size: 20))
                    .foregroundColor(selected ? accent : .white.opacity(0.45))
                    .frame(width: 42, height: 42)
                    .background(RoundedRectangle(cornerRadius: 10).fill(Color.black.opacity(0.55)))
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 13, weight: .semibold))
                    Text(subtitle)
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.45))
                }
                Spacer()
            }
            .padding(12)
            .background(RoundedRectangle(cornerRadius: 15).fill(Color.white.opacity(selected ? 0.065 : 0.035)))
            .overlay(RoundedRectangle(cornerRadius: 15).stroke(selected ? accent : Color.white.opacity(0.1), lineWidth: selected ? 1.4 : 1))
        }
        .buttonStyle(.plain)
    }
}

private struct ScreenTitle: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.system(size: 29, weight: .bold))
            Text(subtitle)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.5))
        }
    }
}

private struct SettingsRow: View {
    let symbol: String
    let title: String
    let subtitle: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: symbol)
                .foregroundColor(color)
                .frame(width: 26)
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                Text(subtitle)
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.48))
                    .multilineTextAlignment(.leading)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white.opacity(0.28))
        }
        .padding(.vertical, 12)
    }
}

private struct NeonCard<Content: View>: View {
    let accent: Color
    let content: Content

    init(accent: Color, @ViewBuilder content: () -> Content) {
        self.accent = accent
        self.content = content()
    }

    var body: some View {
        content
            .padding(15)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#0A1017").opacity(0.96), Color(hex: "#11111A").opacity(0.96)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(
                        LinearGradient(
                            colors: [accent.opacity(0.34), Color.white.opacity(0.07), Color(hex: "#B026FF").opacity(0.22)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
    }
}

private struct GradientBrandText: View {
    let text: String
    let size: CGFloat

    var body: some View {
        Text(text)
            .font(.system(size: size, weight: .black, design: .rounded))
            .foregroundColor(.clear)
            .overlay(
                LinearGradient(
                    colors: [Color(hex: "#00F5FF"), Color(hex: "#74B7FF"), Color(hex: "#B026FF"), Color(hex: "#FF43C8")],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .mask(
                    Text(text)
                        .font(.system(size: size, weight: .black, design: .rounded))
                )
            )
    }
}

private struct CyberLandscape: View {
    let accent: Color

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                LinearGradient(
                    colors: [Color(hex: "#051019"), Color.black],
                    startPoint: .top,
                    endPoint: .bottom
                )

                Circle()
                    .fill(
                        RadialGradient(
                            colors: [accent.opacity(0.9), accent.opacity(0.12), .clear],
                            center: .center,
                            startRadius: 5,
                            endRadius: 70
                        )
                    )
                    .frame(width: 120, height: 120)
                    .offset(x: proxy.size.width * 0.23, y: -25)

                Path { path in
                    let w = proxy.size.width
                    let h = proxy.size.height
                    path.move(to: CGPoint(x: w * 0.26, y: h * 0.74))
                    path.addLine(to: CGPoint(x: w * 0.42, y: h * 0.38))
                    path.addLine(to: CGPoint(x: w * 0.52, y: h * 0.64))
                    path.addLine(to: CGPoint(x: w * 0.65, y: h * 0.28))
                    path.addLine(to: CGPoint(x: w * 0.82, y: h * 0.72))
                    path.addLine(to: CGPoint(x: w, y: h * 0.72))
                    path.addLine(to: CGPoint(x: w, y: h))
                    path.addLine(to: CGPoint(x: 0, y: h))
                    path.closeSubpath()
                }
                .fill(
                    LinearGradient(
                        colors: [Color.black, Color(hex: "#0B1821"), accent.opacity(0.28)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [.clear, accent.opacity(0.14), accent.opacity(0.5), .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 2)
                    .offset(y: proxy.size.height * 0.34)

                LinearGradient(
                    colors: [.clear, accent.opacity(0.16)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
    }
}

private struct NeonTabBar: View {
    @Binding var selected: NeonTab
    let accent: Color

    var body: some View {
        HStack(spacing: 0) {
            ForEach(NeonTab.allCases, id: \.rawValue) { tab in
                Button {
                    selected = tab
                } label: {
                    VStack(spacing: 5) {
                        Image(systemName: tab.symbol)
                            .font(.system(size: 17, weight: .semibold))
                        Text(tab.title)
                            .font(.system(size: 9, weight: .medium))
                    }
                    .foregroundColor(selected == tab ? accent : .white.opacity(0.48))
                    .frame(maxWidth: .infinity)
                    .padding(.top, 10)
                    .padding(.bottom, 8)
                    .background(
                        LinearGradient(
                            colors: selected == tab ? [accent.opacity(0.13), .clear] : [.clear, .clear],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .background(Color.black.opacity(0.97))
        .overlay(Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1), alignment: .top)
    }
}

private struct NeonBackground: View {
    let accent: Color

    var body: some View {
        ZStack {
            Color.black
            Circle()
                .fill(accent.opacity(0.13))
                .frame(width: 320, height: 320)
                .blur(radius: 95)
                .offset(x: -170, y: -280)
            Circle()
                .fill(Color(hex: "#B026FF").opacity(0.11))
                .frame(width: 300, height: 300)
                .blur(radius: 100)
                .offset(x: 180, y: 80)
        }
        .ignoresSafeArea()
    }
}

private extension Text {
    func sectionLabel() -> some View {
        self
            .font(.system(size: 10, weight: .bold, design: .monospaced))
            .tracking(1.7)
            .foregroundColor(.white.opacity(0.72))
    }
}

private extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)

        let r, g, b: Double
        switch cleaned.count {
        case 6:
            r = Double((value >> 16) & 0xFF) / 255
            g = Double((value >> 8) & 0xFF) / 255
            b = Double(value & 0xFF) / 255
        default:
            r = 1
            g = 1
            b = 1
        }
        self.init(red: r, green: g, blue: b)
    }
}
