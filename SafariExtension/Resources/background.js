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
const VISUAL_STATE_VERSION = 5;

async function ensureDefaultsAndRepairState() {
  const keys = [...Object.keys(DEFAULT_SETTINGS), "visualStateVersion"];
  const existing = await browser.storage.local.get(keys);
  const patch = {};

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (typeof existing[key] === "undefined") patch[key] = value;
  }

  if (Number(existing.visualStateVersion || 0) < VISUAL_STATE_VERSION) {
    // Restore the exact pre-redesign appearance defaults. Keep the user's
    // selected accent, enabled state, and excluded sites intact.
    patch.frostTint = true;
    patch.colorLinks = true;
    patch.colorBorders = true;
    patch.colorAllText = false;
    patch.edgeGlow = false;
    patch.visualStateVersion = VISUAL_STATE_VERSION;
  }

  if (Object.keys(patch).length) await browser.storage.local.set(patch);
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
  await ensureDefaultsAndRepairState();
  await syncExplicitAppChanges();
});

if (browser.runtime.onStartup?.addListener) {
  browser.runtime.onStartup.addListener(() => {
    void ensureDefaultsAndRepairState().then(syncExplicitAppChanges);
  });
}

if (browser.tabs?.onActivated?.addListener) {
  browser.tabs.onActivated.addListener(() => {
    void syncExplicitAppChanges();
  });
}

void ensureDefaultsAndRepairState();
