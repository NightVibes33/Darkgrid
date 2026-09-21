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

const NATIVE_APP_ID = "com.nightvibes33.Darkgrid";

async function ensureDefaults() {
  const existing = await browser.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const missing = {};
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (typeof existing[key] === "undefined") missing[key] = value;
  }
  if (Object.keys(missing).length) await browser.storage.local.set(missing);
}

async function repairOnlyRecentBrokenState() {
  const state = await browser.storage.local.get([
    "visualStateVersion",
    "legacyVisualResetVersion"
  ]);

  if (state.visualStateVersion || state.legacyVisualResetVersion) {
    await browser.storage.local.set({
      frostTint: false,
      colorLinks: true,
      colorBorders: true,
      colorAllText: false,
      edgeGlow: false
    });
    await browser.storage.local.remove([
      "visualStateVersion",
      "legacyVisualResetVersion"
    ]);
  }
}

async function syncExplicitNativeChange() {
  if (typeof browser.runtime?.sendNativeMessage !== "function") return;

  try {
    const response = await browser.runtime.sendNativeMessage(
      NATIVE_APP_ID,
      { action: "dequeueSettingPatch" }
    );

    if (!response?.ok || !response.settings) return;

    const allowed = new Set([
      "enabled",
      "accentColor",
      "frostTint",
      "colorLinks",
      "colorBorders",
      "colorAllText",
      "edgeGlow",
      "excludedDomains"
    ]);

    const patch = {};
    for (const [key, value] of Object.entries(response.settings)) {
      if (allowed.has(key)) patch[key] = value;
    }

    if (Object.keys(patch).length) {
      await browser.storage.local.set(patch);
    }
  } catch {}
}

browser.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  await repairOnlyRecentBrokenState();
  await syncExplicitNativeChange();
});

if (browser.runtime.onStartup?.addListener) {
  browser.runtime.onStartup.addListener(() => {
    void ensureDefaults().then(repairOnlyRecentBrokenState).then(syncExplicitNativeChange);
  });
}

if (browser.tabs?.onActivated?.addListener) {
  browser.tabs.onActivated.addListener(() => {
    void syncExplicitNativeChange();
  });
}

if (browser.tabs?.onUpdated?.addListener) {
  browser.tabs.onUpdated.addListener((_tabId, changeInfo) => {
    if (changeInfo?.status === "loading") void syncExplicitNativeChange();
  });
}

void ensureDefaults().then(repairOnlyRecentBrokenState);
