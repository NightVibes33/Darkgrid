const Engine = globalThis.DarkgridSurfaceEngine;
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

const PRESET_NAMES = new Map([
  ["#00F5FF", "CYAN"],
  ["#FF1744", "RED"],
  ["#00FF66", "GREEN"],
  ["#B026FF", "PURPLE"]
]);

let settings = { ...DEFAULT_SETTINGS };
let activeDomain = null;
let colorSaveTimer = 0;
let accentSaveGeneration = 0;
let writeGeneration = 0;
let lastError = "";

const $ = selector => document.querySelector(selector);
const enabled = $("#enabled");
const frostTint = $("#frostTint");
const colorLinks = $("#colorLinks");
const colorBorders = $("#colorBorders");
const colorAllText = $("#colorAllText");
const edgeGlow = $("#edgeGlow");
const colorPicker = $("#colorPicker");
const hexColor = $("#hexColor");
const presetName = $("#presetName");
const statusDot = $("#statusDot");
const statusText = $("#statusText");
const errorText = $("#errorText");
const domainLabel = $("#domain");
const siteToggle = $("#siteToggle");
const presetButtons = Array.from(document.querySelectorAll(".preset"));

function normalizeHost(value) {
  return String(value || "").trim().toLowerCase().replace(/^\.+|\.+$/g, "");
}

function normalizeHex(value) {
  const raw = String(value || "").trim().toUpperCase();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9A-F]{6}$/.test(withHash) ? withHash : null;
}

function hexToRgb(hex) {
  const value = hex.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function safeHex(value) {
  return normalizeHex(value) || DEFAULT_SETTINGS.accentColor;
}

function readableHex(value) {
  const accent = hexToRgb(safeHex(value));
  if (!Engine) return safeHex(value);
  return Engine.rgbToHex(Engine.ensureReadableAccent(accent, { r: 46, g: 46, b: 46 }, 4.5));
}

function normalizeSettings(next) {
  const normalized = { ...DEFAULT_SETTINGS, ...next };
  normalized.accentColor = safeHex(normalized.accentColor);
  normalized.excludedDomains = Array.isArray(normalized.excludedDomains)
    ? Array.from(new Set(normalized.excludedDomains.map(normalizeHost).filter(Boolean)))
    : [];
  return normalized;
}

function domainIsExcluded(domain) {
  const host = normalizeHost(domain);
  return (settings.excludedDomains || [])
    .map(normalizeHost)
    .filter(Boolean)
    .some(entry => entry === host);
}

function showError(message) {
  lastError = String(message || "");
  errorText.textContent = lastError;
  errorText.hidden = !lastError;
  if (lastError) {
    statusText.textContent = "ERROR";
    statusDot.style.background = "#777";
    statusDot.style.boxShadow = "none";
  }
}

function clearError() {
  if (!lastError) return;
  lastError = "";
  errorText.textContent = "";
  errorText.hidden = true;
}

async function queryActiveTab() {
  activeDomain = null;
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0] || null;
    if (!tab?.url) return;

    const url = new URL(tab.url);
    if (url.protocol === "http:" || url.protocol === "https:") {
      activeDomain = normalizeHost(url.hostname);
    }
  } catch (error) {
    showError(`Could not read the active Safari tab: ${error?.message || error}`);
  }
}

async function loadSettings() {
  try {
    const stored = await browser.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    settings = normalizeSettings(stored);
  } catch (error) {
    settings = normalizeSettings(settings);
    showError(`Could not load settings: ${error?.message || error}`);
  }
}

function cancelAccentSave() {
  accentSaveGeneration += 1;
  if (colorSaveTimer) {
    clearTimeout(colorSaveTimer);
    colorSaveTimer = 0;
  }
}

async function persistPatch(patch, { cancelPendingAccent = true } = {}) {
  if (cancelPendingAccent && Object.prototype.hasOwnProperty.call(patch, "accentColor")) {
    cancelAccentSave();
  }

  const generation = ++writeGeneration;
  const previous = settings;
  settings = normalizeSettings({ ...settings, ...patch });
  render();

  try {
    await browser.storage.local.set(patch);
    if (generation === writeGeneration) clearError();
    return true;
  } catch (error) {
    if (generation === writeGeneration) {
      settings = previous;
      render();
      showError(`Could not save settings: ${error?.message || error}`);
    }
    return false;
  }
}

function scheduleAccentSave(value) {
  const accentColor = safeHex(value);
  cancelAccentSave();
  const generation = accentSaveGeneration;

  settings = normalizeSettings({ ...settings, accentColor });
  render();

  colorSaveTimer = setTimeout(() => {
    colorSaveTimer = 0;
    if (generation !== accentSaveGeneration) return;
    void persistPatch({ accentColor }, { cancelPendingAccent: false });
  }, 90);
}

function render() {
  const accent = safeHex(settings.accentColor);
  const readable = readableHex(accent);
  const rgb = hexToRgb(accent);

  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-readable", readable);
  document.documentElement.style.setProperty("--accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);

  enabled.checked = Boolean(settings.enabled);
  frostTint.checked = Boolean(settings.frostTint);
  colorLinks.checked = Boolean(settings.colorLinks);
  colorBorders.checked = Boolean(settings.colorBorders);
  colorAllText.checked = Boolean(settings.colorAllText);
  edgeGlow.checked = Boolean(settings.edgeGlow);
  colorPicker.value = accent.toLowerCase();
  hexColor.value = accent;

  for (const button of presetButtons) {
    const active = safeHex(button.dataset.color) === accent;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  presetName.textContent = PRESET_NAMES.get(accent) || "CUSTOM";

  if (!lastError) {
    const excluded = activeDomain ? domainIsExcluded(activeDomain) : false;
    const activeHere = Boolean(settings.enabled) && !excluded;
    statusDot.style.background = activeHere ? accent : "#555";
    statusDot.style.boxShadow = activeHere ? `0 0 10px ${accent}` : "none";
    statusText.textContent = !settings.enabled ? "OFF" : excluded ? "EXCLUDED" : "ACTIVE";
  }

  if (activeDomain) {
    const excluded = domainIsExcluded(activeDomain);
    domainLabel.textContent = activeDomain;
    siteToggle.disabled = false;
    siteToggle.textContent = excluded ? "ENABLE ON THIS SITE" : "DISABLE ON THIS SITE";
    siteToggle.setAttribute(
      "aria-label",
      excluded ? `Enable Darkgrid on ${activeDomain}` : `Disable Darkgrid on ${activeDomain}`
    );
  } else {
    domainLabel.textContent = "Unavailable on this page";
    siteToggle.disabled = true;
    siteToggle.textContent = "SITE CONTROL UNAVAILABLE";
    siteToggle.setAttribute("aria-label", "Site control unavailable on this page");
  }
}

enabled.addEventListener("change", () => void persistPatch({ enabled: enabled.checked }));
frostTint.addEventListener("change", () => void persistPatch({ frostTint: frostTint.checked }));
colorLinks.addEventListener("change", () => void persistPatch({ colorLinks: colorLinks.checked }));
colorBorders.addEventListener("change", () => void persistPatch({ colorBorders: colorBorders.checked }));
colorAllText.addEventListener("change", () => void persistPatch({ colorAllText: colorAllText.checked }));
edgeGlow.addEventListener("change", () => void persistPatch({ edgeGlow: edgeGlow.checked }));

for (const button of presetButtons) {
  button.addEventListener("click", () => {
    cancelAccentSave();
    void persistPatch({ accentColor: safeHex(button.dataset.color) }, { cancelPendingAccent: false });
  });
}

colorPicker.addEventListener("input", () => scheduleAccentSave(colorPicker.value));

hexColor.addEventListener("change", () => {
  const value = normalizeHex(hexColor.value);
  if (value) {
    cancelAccentSave();
    void persistPatch({ accentColor: value }, { cancelPendingAccent: false });
  } else {
    hexColor.value = settings.accentColor;
    showError("Enter a six-digit hex color such as #00F5FF.");
  }
});

hexColor.addEventListener("keydown", event => {
  if (event.key === "Enter") hexColor.blur();
  if (event.key === "Escape") {
    hexColor.value = settings.accentColor;
    hexColor.blur();
  }
});

siteToggle.addEventListener("click", () => {
  if (!activeDomain) return;
  const current = (settings.excludedDomains || []).map(normalizeHost).filter(Boolean);
  const next = domainIsExcluded(activeDomain)
    ? current.filter(item => item !== activeDomain)
    : Array.from(new Set([...current, activeDomain]));
  void persistPatch({ excludedDomains: next });
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  if (Object.prototype.hasOwnProperty.call(changes, "accentColor")) cancelAccentSave();

  const patch = {};
  for (const [key, change] of Object.entries(changes || {})) {
    if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) patch[key] = change.newValue;
  }
  settings = normalizeSettings({ ...settings, ...patch });
  render();
});

(async () => {
  const results = await Promise.allSettled([loadSettings(), queryActiveTab()]);
  for (const result of results) {
    if (result.status === "rejected") showError(result.reason?.message || String(result.reason));
  }
  render();
})();