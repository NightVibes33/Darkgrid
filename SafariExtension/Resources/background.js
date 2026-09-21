const DEFAULT_SETTINGS = {
  enabled: true,
  accentColor: "#00F5FF",
  frostTint: true,
  colorLinks: true,
  colorBorders: true,
  colorAllText: false,
  edgeGlow: false,
  accentIntensity: 1.0,
  glowStrength: 1.0,
  excludedDomains: []
};

const NATIVE_APP_ID = "com.nightvibes33.Darkgrid";
const RENDERER_BASELINE_VERSION = 2;

function normalizeHost(value) {
  return String(value || "").trim().toLowerCase().replace(/^\.+|\.+$/g, "");
}

function normalizeHex(value) {
  const raw = String(value || "").trim().toUpperCase();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9A-F]{6}$/.test(withHash) ? withHash : DEFAULT_SETTINGS.accentColor;
}

function clamp01(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback;
}

function normalizeSettings(next) {
  const normalized = { ...DEFAULT_SETTINGS, ...(next || {}) };
  normalized.accentColor = normalizeHex(normalized.accentColor);
  normalized.accentIntensity = clamp01(normalized.accentIntensity, DEFAULT_SETTINGS.accentIntensity);
  normalized.glowStrength = clamp01(normalized.glowStrength, DEFAULT_SETTINGS.glowStrength);
  normalized.excludedDomains = Array.isArray(normalized.excludedDomains)
    ? Array.from(new Set(normalized.excludedDomains.map(normalizeHost).filter(Boolean)))
    : [];
  return normalized;
}

async function ensureDefaults() {
  const keys = [...Object.keys(DEFAULT_SETTINGS), "rendererBaselineVersion"];
  const existing = await browser.storage.local.get(keys);

  if (Number(existing.rendererBaselineVersion || 0) < RENDERER_BASELINE_VERSION) {
    await browser.storage.local.set({
      accentIntensity: 1.0,
      glowStrength: 1.0,
      rendererBaselineVersion: RENDERER_BASELINE_VERSION
    });
    existing.accentIntensity = 1.0;
    existing.glowStrength = 1.0;
    existing.rendererBaselineVersion = RENDERER_BASELINE_VERSION;
  }

  const missing = {};
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (typeof existing[key] === "undefined") missing[key] = value;
  }
  if (Object.keys(missing).length) await browser.storage.local.set(missing);
}

async function syncSharedSettings() {
  if (typeof browser.runtime?.sendNativeMessage !== "function") return null;

  try {
    const response = await browser.runtime.sendNativeMessage(
      NATIVE_APP_ID,
      { action: "getSharedSettings" }
    );

    if (!response?.ok || !response.settings) return null;

    const next = normalizeSettings(response.settings);
    await browser.storage.local.set(next);
    return next;
  } catch (error) {
    console.debug("NeonGrid shared-settings sync unavailable:", error?.message || error);
    return null;
  }
}

browser.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  await syncSharedSettings();
});

if (browser.runtime.onStartup?.addListener) {
  browser.runtime.onStartup.addListener(() => {
    void syncSharedSettings();
  });
}

browser.runtime.onMessage.addListener(message => {
  if (message?.type === "darkgrid:sync-shared") {
    return syncSharedSettings();
  }
  return undefined;
});

if (browser.tabs?.onActivated?.addListener) {
  browser.tabs.onActivated.addListener(() => {
    void syncSharedSettings();
  });
}

if (browser.tabs?.onUpdated?.addListener) {
  browser.tabs.onUpdated.addListener((_tabId, changeInfo) => {
    if (changeInfo?.status === "loading") void syncSharedSettings();
  });
}

void ensureDefaults().then(syncSharedSettings);
