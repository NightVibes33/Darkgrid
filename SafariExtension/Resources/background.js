const DEFAULT_SETTINGS = {
  enabled: true,
  accentColor: "#00F5FF",
  frostTint: false,
  colorLinks: true,
  colorBorders: true,
  colorAllText: false,
  edgeGlow: false,
  excludedDomains: []
};

const NATIVE_APP_ID = "com.nightvibes33.Darkgrid";
const LEGACY_VISUAL_RESET_VERSION = 3;

async function ensureDefaultsAndRepairRedesignState() {
  const keys = [...Object.keys(DEFAULT_SETTINGS), "legacyVisualResetVersion"];
  const existing = await browser.storage.local.get(keys);
  const patch = {};

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (typeof existing[key] === "undefined") patch[key] = value;
  }

  if (Number(existing.legacyVisualResetVersion || 0) < LEGACY_VISUAL_RESET_VERSION) {
    // The redesigned native app accidentally pushed appearance defaults into
    // Safari. Repair those toggles once, while deliberately preserving the
    // user's selected accent color and site exclusions.
    patch.frostTint = false;
    patch.colorLinks = true;
    patch.colorBorders = true;
    patch.colorAllText = false;
    patch.edgeGlow = false;
    patch.legacyVisualResetVersion = LEGACY_VISUAL_RESET_VERSION;
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

    if (Object.keys(patch).length) await browser.storage.local.set(patch);

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
  await ensureDefaultsAndRepairRedesignState();
  await syncExplicitAppChanges();
});

if (browser.runtime.onStartup?.addListener) {
  browser.runtime.onStartup.addListener(() => {
    void ensureDefaultsAndRepairRedesignState().then(syncExplicitAppChanges);
  });
}

void ensureDefaultsAndRepairRedesignState();
