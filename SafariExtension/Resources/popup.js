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
  const normalized = normalizeHex(value) || DEFAULT_SETTINGS.accentColor;
  if (!Engine) return normalized;
  return Engine.rgbToHex(Engine.ensureReadableAccent(hexToRgb(normalized)));
}

function domainIsExcluded(domain) {
  const host = normalizeHost(domain);
  return (settings.excludedDomains || [])
    .map(normalizeHost)
    .filter(Boolean)
    .some(entry => entry === host);
}

async function queryActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0] || null;
  if (!tab?.url) return;

  try {
    const url = new URL(tab.url);
    if (url.protocol === "http:" || url.protocol === "https:") {
      activeDomain = normalizeHost(url.hostname);
    }
  } catch {
    activeDomain = null;
  }
}

async function loadSettings() {
  const stored = await browser.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  settings = { ...DEFAULT_SETTINGS, ...stored };
  settings.accentColor = safeHex(settings.accentColor);
  settings.excludedDomains = Array.isArray(settings.excludedDomains)
    ? settings.excludedDomains.map(normalizeHost).filter(Boolean)
    : [];
}

async function saveSettings(patch) {
  settings = { ...settings, ...patch };
  await browser.storage.local.set(patch);
  render();
}

function scheduleAccentSave(value) {
  const accentColor = safeHex(value);
  settings.accentColor = accentColor;
  render();
  clearTimeout(colorSaveTimer);
  colorSaveTimer = setTimeout(() => void saveSettings({ accentColor }), 90);
}

function render() {
  const accent = safeHex(settings.accentColor);
  const rgb = hexToRgb(accent);
  document.documentElement.style.setProperty("--accent", accent);
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
    button.classList.toggle("active", safeHex(button.dataset.color) === accent);
  }
  presetName.textContent = PRESET_NAMES.get(accent) || "CUSTOM";

  const excluded = activeDomain ? domainIsExcluded(activeDomain) : false;
  const activeHere = Boolean(settings.enabled) && !excluded;
  statusDot.style.background = activeHere ? accent : "#555";
  statusDot.style.boxShadow = activeHere ? `0 0 10px ${accent}` : "none";
  statusText.textContent = !settings.enabled ? "OFF" : excluded ? "EXCLUDED" : "ACTIVE";

  if (activeDomain) {
    domainLabel.textContent = activeDomain;
    siteToggle.disabled = false;
    siteToggle.textContent = excluded ? "ENABLE ON THIS SITE" : "DISABLE ON THIS SITE";
  } else {
    domainLabel.textContent = "Unavailable on this page";
    siteToggle.disabled = true;
    siteToggle.textContent = "SITE CONTROL UNAVAILABLE";
  }
}

enabled.addEventListener("change", () => void saveSettings({ enabled: enabled.checked }));
frostTint.addEventListener("change", () => void saveSettings({ frostTint: frostTint.checked }));
colorLinks.addEventListener("change", () => void saveSettings({ colorLinks: colorLinks.checked }));
colorBorders.addEventListener("change", () => void saveSettings({ colorBorders: colorBorders.checked }));
colorAllText.addEventListener("change", () => void saveSettings({ colorAllText: colorAllText.checked }));
edgeGlow.addEventListener("change", () => void saveSettings({ edgeGlow: edgeGlow.checked }));

for (const button of presetButtons) {
  button.addEventListener("click", () => void saveSettings({ accentColor: safeHex(button.dataset.color) }));
}

colorPicker.addEventListener("input", () => scheduleAccentSave(colorPicker.value));
hexColor.addEventListener("change", () => {
  const value = normalizeHex(hexColor.value);
  if (value) void saveSettings({ accentColor: safeHex(value) });
  else hexColor.value = settings.accentColor;
});
hexColor.addEventListener("keydown", event => {
  if (event.key === "Enter") hexColor.blur();
});

siteToggle.addEventListener("click", () => {
  if (!activeDomain) return;
  const current = (settings.excludedDomains || []).map(normalizeHost).filter(Boolean);
  const next = domainIsExcluded(activeDomain)
    ? current.filter(item => item !== activeDomain)
    : Array.from(new Set([...current, activeDomain]));
  void saveSettings({ excludedDomains: next });
});

(async () => {
  await Promise.all([loadSettings(), queryActiveTab()]);
  render();
})();
