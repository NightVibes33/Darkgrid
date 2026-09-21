const DEFAULT_SETTINGS = {
  enabled: true,
  accentColor: "#00F5FF",
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
let activeTab = null;
let activeDomain = null;

const enabled = document.querySelector("#enabled");
const edgeGlow = document.querySelector("#edgeGlow");
const colorPicker = document.querySelector("#colorPicker");
const hexColor = document.querySelector("#hexColor");
const presetName = document.querySelector("#presetName");
const statusDot = document.querySelector("#statusDot");
const statusText = document.querySelector("#statusText");
const domainLabel = document.querySelector("#domain");
const siteToggle = document.querySelector("#siteToggle");
const presetButtons = [...document.querySelectorAll(".preset")];

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/^\.+|\.+$/g, "");
}

function normalizeHex(value) {
  const raw = String(value || "").trim().toUpperCase();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9A-F]{6}$/.test(withHash) ? withHash : null;
}

function hexToRgb(hex) {
  const value = hex.slice(1);
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

function domainIsExcluded(domain) {
  const host = normalizeDomain(domain);
  return (settings.excludedDomains || [])
    .map(normalizeDomain)
    .some(item => item && (host === item || host.endsWith(`.${item}`)));
}

async function queryActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  activeTab = tabs[0] || null;

  if (!activeTab?.url) {
    return;
  }

  try {
    const url = new URL(activeTab.url);
    if (url.protocol === "http:" || url.protocol === "https:") {
      activeDomain = normalizeDomain(url.hostname);
    }
  } catch {
    activeDomain = null;
  }
}

async function loadSettings() {
  const stored = await browser.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  settings = { ...DEFAULT_SETTINGS, ...stored };
  settings.accentColor = normalizeHex(settings.accentColor) || DEFAULT_SETTINGS.accentColor;
  settings.excludedDomains = Array.isArray(settings.excludedDomains) ? settings.excludedDomains : [];
}

async function saveSettings(patch) {
  settings = { ...settings, ...patch };
  await browser.storage.local.set(patch);
  render();
  await refreshActivePage();
}

async function refreshActivePage() {
  if (!activeTab?.id) {
    return;
  }

  try {
    await browser.tabs.sendMessage(activeTab.id, { type: "darkgrid:refresh" });
  } catch {
    // The current tab can be a Safari/internal page where content scripts cannot run.
  }
}

function render() {
  const accent = normalizeHex(settings.accentColor) || DEFAULT_SETTINGS.accentColor;
  const [r, g, b] = hexToRgb(accent);

  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);

  enabled.checked = Boolean(settings.enabled);
  edgeGlow.checked = Boolean(settings.edgeGlow);
  colorPicker.value = accent.toLowerCase();
  hexColor.value = accent;

  for (const button of presetButtons) {
    button.classList.toggle("active", button.dataset.color === accent);
  }

  presetName.textContent = PRESET_NAMES.get(accent) || "CUSTOM";
  statusDot.style.background = settings.enabled ? accent : "#555";
  statusDot.style.boxShadow = settings.enabled ? `0 0 10px ${accent}` : "none";
  statusText.textContent = settings.enabled ? "ACTIVE" : "OFF";

  if (activeDomain) {
    domainLabel.textContent = activeDomain;
    siteToggle.disabled = false;
    siteToggle.textContent = domainIsExcluded(activeDomain)
      ? "ENABLE ON THIS SITE"
      : "DISABLE ON THIS SITE";
  } else {
    domainLabel.textContent = "Unavailable on this page";
    siteToggle.disabled = true;
    siteToggle.textContent = "SITE CONTROL UNAVAILABLE";
  }
}

enabled.addEventListener("change", () => {
  void saveSettings({ enabled: enabled.checked });
});

edgeGlow.addEventListener("change", () => {
  void saveSettings({ edgeGlow: edgeGlow.checked });
});

for (const button of presetButtons) {
  button.addEventListener("click", () => {
    void saveSettings({ accentColor: button.dataset.color });
  });
}

colorPicker.addEventListener("input", () => {
  const value = normalizeHex(colorPicker.value);
  if (value) {
    void saveSettings({ accentColor: value });
  }
});

hexColor.addEventListener("change", () => {
  const value = normalizeHex(hexColor.value);
  if (value) {
    void saveSettings({ accentColor: value });
  } else {
    hexColor.value = settings.accentColor;
  }
});

hexColor.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    hexColor.blur();
  }
});

siteToggle.addEventListener("click", () => {
  if (!activeDomain) {
    return;
  }

  const normalized = normalizeDomain(activeDomain);
  const current = (settings.excludedDomains || []).map(normalizeDomain).filter(Boolean);
  const next = domainIsExcluded(normalized)
    ? current.filter(item => item !== normalized)
    : [...new Set([...current, normalized])];

  void saveSettings({ excludedDomains: next });
});

(async () => {
  await Promise.all([loadSettings(), queryActiveTab()]);
  render();
})();
