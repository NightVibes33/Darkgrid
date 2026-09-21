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

async function syncExplicitAppChanges() {
  if (typeof browser.runtime?.sendNativeMessage !== "function") return;

  try {
    const response = await browser.runtime.sendNativeMessage(
      NATIVE_APP_ID,
      { action: "getSharedSettings" }
    );

    if (!response?.ok) return;

    const patch = response.settings && typeof response.settings === "object"
      ? response.settings
      : {};
    const revision = Number(response.revision || 0);

    // Critical compatibility rule: only keys explicitly changed in the native
    // NeonGrid UI are returned here. App defaults can never overwrite the
    // Safari extension's existing visual state.
    if (Object.keys(patch).length) {
      await browser.storage.local.set(patch);
    }

    if (revision > 0) {
      try {
        await browser.runtime.sendNativeMessage(
          NATIVE_APP_ID,
          { action: "ackSharedSettings", revision }
        );
      } catch {}
    }
  } catch (error) {
    console.debug("NeonGrid app-settings bridge unavailable:", error?.message || error);
  }
}

browser.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  await syncExplicitAppChanges();
});

if (browser.runtime.onStartup?.addListener) {
  browser.runtime.onStartup.addListener(() => {
    void syncExplicitAppChanges();
  });
}

if (browser.tabs?.onActivated?.addListener) {
  browser.tabs.onActivated.addListener(() => {
    void syncExplicitAppChanges();
  });
}

if (browser.tabs?.onUpdated?.addListener) {
  browser.tabs.onUpdated.addListener((_tabId, changeInfo) => {
    if (changeInfo?.status === "loading") {
      void syncExplicitAppChanges();
    }
  });
}

void ensureDefaults();
