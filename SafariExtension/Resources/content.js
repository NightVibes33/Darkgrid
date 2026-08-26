(() => {
  const DEFAULT_SETTINGS = {
    enabled: true,
    accentColor: "#00F5FF",
    frostTint: true,
    colorLinks: true,
    colorBorders: true,
    colorAllText: false,
    edgeGlow: false,
    excludedDomains: []
  };

  function normalizeDomain(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^\.+|\.+$/g, "");
  }

  function isExcluded(hostname, excludedDomains) {
    const host = normalizeDomain(hostname);

    return excludedDomains
      .map(normalizeDomain)
      .filter(Boolean)
      .some(domain => host === domain || host.endsWith(`.${domain}`));
  }

  function normalizeHex(value) {
    const raw = String(value || "").trim().toUpperCase();
    const withHash = raw.startsWith("#") ? raw : `#${raw}`;
    return /^#[0-9A-F]{6}$/.test(withHash) ? withHash : DEFAULT_SETTINGS.accentColor;
  }

  function hexToRgb(hex) {
    const normalized = normalizeHex(hex).slice(1);
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16)
    ];
  }

  async function applySettings() {
    const stored = await browser.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    const settings = { ...DEFAULT_SETTINGS, ...stored };
    const root = document.documentElement;

    if (!root) {
      return;
    }

    const accent = normalizeHex(settings.accentColor);
    const [r, g, b] = hexToRgb(accent);
    const blocked = isExcluded(location.hostname, Array.isArray(settings.excludedDomains) ? settings.excludedDomains : []);
    const shouldEnable = Boolean(settings.enabled) && !blocked;

    root.style.setProperty("--darkgrid-accent", accent);
    root.style.setProperty("--darkgrid-accent-rgb", `${r}, ${g}, ${b}`);

    root.classList.toggle("darkgrid-on", shouldEnable);
    root.classList.toggle("darkgrid-frost", shouldEnable && Boolean(settings.frostTint));
    root.classList.toggle("darkgrid-color-links", shouldEnable && Boolean(settings.colorLinks));
    root.classList.toggle("darkgrid-color-borders", shouldEnable && Boolean(settings.colorBorders));
    root.classList.toggle("darkgrid-color-text", shouldEnable && Boolean(settings.colorAllText));
    root.classList.toggle("darkgrid-glow", shouldEnable && Boolean(settings.edgeGlow));
  }

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      void applySettings();
    }
  });

  browser.runtime.onMessage.addListener(message => {
    if (message?.type === "darkgrid:refresh") {
      void applySettings();
    }
  });

  void applySettings();
})();
