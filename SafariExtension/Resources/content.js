(() => {
  const Engine = globalThis.DarkgridSurfaceEngine;
  if (!Engine) return;

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

  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "TEMPLATE", "SOURCE", "TRACK"
  ]);

  const MANAGED_ATTRIBUTES = [
    "data-darkgrid-surface",
    "data-darkgrid-gradient",
    "data-darkgrid-border",
    "data-darkgrid-text",
    "data-darkgrid-shadow",
    "data-darkgrid-before-surface",
    "data-darkgrid-after-surface",
    "data-darkgrid-before-gradient",
    "data-darkgrid-after-gradient",
    "data-darkgrid-before-shadow",
    "data-darkgrid-after-shadow",
    "data-darkgrid-before-text",
    "data-darkgrid-after-text"
  ];

  const MANAGED_PROPERTIES = [
    "--darkgrid-surface-normal",
    "--darkgrid-surface-frost",
    "--darkgrid-box-shadow",
    "--darkgrid-before-normal",
    "--darkgrid-before-frost",
    "--darkgrid-before-shadow",
    "--darkgrid-before-text",
    "--darkgrid-after-normal",
    "--darkgrid-after-frost",
    "--darkgrid-after-shadow",
    "--darkgrid-after-text"
  ];

  const SHADOW_STYLE = `
:host([data-darkgrid-shadow-on]){color-scheme:dark!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-surface]{background-color:var(--darkgrid-surface-normal,#080808)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-frost]) [data-darkgrid-surface]{background-color:var(--darkgrid-surface-frost,#080808)!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-gradient]{background-blend-mode:multiply!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-text]{color:#e7e7e7!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]){color:var(--darkgrid-accent)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]) [data-darkgrid-text]{color:var(--darkgrid-accent)!important}
:host([data-darkgrid-shadow-on]) a{color:#e7e7e7!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-links]) a{color:var(--darkgrid-accent)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-color-links])) a{color:#e7e7e7!important;text-shadow:none!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-border]{border-color:#343434!important;outline-color:#343434!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-borders]) [data-darkgrid-border]{border-color:rgba(var(--darkgrid-accent-rgb),.5)!important;outline-color:rgba(var(--darkgrid-accent-rgb),.58)!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-shadow]{box-shadow:var(--darkgrid-box-shadow)!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-before-surface]::before{background-color:var(--darkgrid-before-normal)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-frost]) [data-darkgrid-before-surface]::before{background-color:var(--darkgrid-before-frost)!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-after-surface]::after{background-color:var(--darkgrid-after-normal)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-frost]) [data-darkgrid-after-surface]::after{background-color:var(--darkgrid-after-frost)!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-before-gradient]::before,
:host([data-darkgrid-shadow-on]) [data-darkgrid-after-gradient]::after{background-blend-mode:multiply!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-before-shadow]::before{box-shadow:var(--darkgrid-before-shadow)!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-after-shadow]::after{box-shadow:var(--darkgrid-after-shadow)!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-before-text]::before{color:var(--darkgrid-before-text)!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-after-text]::after{color:var(--darkgrid-after-text)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]) [data-darkgrid-before-text]::before,
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]) [data-darkgrid-after-text]::after{color:var(--darkgrid-accent)!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-svg-fill]{fill:#dcdcdc!important}
:host([data-darkgrid-shadow-on]) [data-darkgrid-svg-stroke]{stroke:#dcdcdc!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-links]) a [data-darkgrid-svg-fill]{fill:var(--darkgrid-accent)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-links]) a [data-darkgrid-svg-stroke]{stroke:var(--darkgrid-accent)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]) input::placeholder,
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]) textarea::placeholder{color:var(--darkgrid-accent)!important}
`;

  const pendingRoots = new Set();
  const shadowHosts = new Set();
  let observedRoots = new WeakSet();
  let observer = null;
  let scanFrame = 0;
  let settings = { ...DEFAULT_SETTINGS };
  let accent = { r: 0, g: 245, b: 255 };
  let enabledNow = false;
  let wasEnabled = false;
  let lastAccentHex = "";
  let waitingForRoot = false;
  let lifecycleHooksInstalled = false;

  function normalizeHost(value) {
    return String(value || "").trim().toLowerCase().replace(/^\.+|\.+$/g, "");
  }

  function isExcludedHost(value, entries) {
    const current = normalizeHost(value);
    if (!current) return false;
    return (entries || []).map(normalizeHost).filter(Boolean).some(entry => current === entry);
  }

  function frameHostnames() {
    const hosts = new Set();
    const own = normalizeHost(location.hostname);
    if (own) hosts.add(own);

    try {
      for (const origin of Array.from(location.ancestorOrigins || [])) {
        const candidate = normalizeHost(new URL(origin).hostname);
        if (candidate) hosts.add(candidate);
      }
    } catch {}

    return Array.from(hosts);
  }

  function pageIsExcluded(entries) {
    return frameHostnames().some(host => isExcludedHost(host, entries));
  }

  function normalizeHex(value) {
    const raw = String(value || "").trim().toUpperCase();
    const candidate = raw.startsWith("#") ? raw : `#${raw}`;
    return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : DEFAULT_SETTINGS.accentColor;
  }

  function hexToRgb(value) {
    const hex = normalizeHex(value).slice(1);
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16)
    };
  }

  function stripManagedStyle(value) {
    const probe = document.createElement("div");
    if (value) probe.setAttribute("style", value);

    // Avoid relying on CSSStyleDeclaration iteration, which is inconsistent on
    // older Safari versions still supported by the iOS 15 deployment target.
    for (let index = probe.style.length - 1; index >= 0; index -= 1) {
      const name = probe.style.item(index);
      if (name && name.startsWith("--darkgrid-")) probe.style.removeProperty(name);
    }

    return (probe.getAttribute("style") || "").trim();
  }

  function stripManagedClass(value) {
    return String(value || "")
      .split(/\s+/)
      .filter(Boolean)
      .filter(name => !name.startsWith("darkgrid-"))
      .sort()
      .join(" ");
  }

  function mutationIsInternal(mutation) {
    const name = String(mutation.attributeName || "");
    if (name.startsWith("data-darkgrid-")) return true;

    if (name === "style") {
      return stripManagedStyle(mutation.oldValue)
        === stripManagedStyle(mutation.target.getAttribute("style"));
    }

    if (name === "class") {
      return stripManagedClass(mutation.oldValue)
        === stripManagedClass(mutation.target.getAttribute("class"));
    }

    return false;
  }

  function setAttributeIfNeeded(element, name, value = "") {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function removeAttributeIfPresent(element, name) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  }

  function setPropertyIfNeeded(element, name, value) {
    if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
  }

  function removePropertyIfPresent(element, name) {
    if (element.style.getPropertyValue(name)) element.style.removeProperty(name);
  }

  function clearManagedElement(element) {
    for (const name of MANAGED_ATTRIBUTES) removeAttributeIfPresent(element, name);
    for (const name of MANAGED_PROPERTIES) removePropertyIfPresent(element, name);
  }

  function mapPseudoElement(element, prefix, pseudo) {
    let style;
    try {
      style = getComputedStyle(element, pseudo);
    } catch {
      return;
    }

    if (!Engine.pseudoIsRenderable(style)) return;

    const backgroundImage = String(style.backgroundImage || "none");
    const hasRaster = Engine.hasRasterBackground(backgroundImage);
    const hasGradient = Engine.hasGradientBackground(backgroundImage) && !hasRaster;
    const background = Engine.parseCssColor(style.backgroundColor);

    if (!hasRaster && background && background.a > 0.02) {
      const mapped = Engine.buildSurfaceColors(background, accent);
      setPropertyIfNeeded(element, `--darkgrid-${prefix}-normal`, mapped.normal);
      setPropertyIfNeeded(element, `--darkgrid-${prefix}-frost`, mapped.frost);
      setAttributeIfNeeded(element, `data-darkgrid-${prefix}-surface`);
      if (hasGradient) setAttributeIfNeeded(element, `data-darkgrid-${prefix}-gradient`);
    } else if (!hasRaster && hasGradient) {
      const mapped = Engine.buildSurfaceColors({ r: 160, g: 160, b: 160, a: 1 }, accent);
      setPropertyIfNeeded(element, `--darkgrid-${prefix}-normal`, mapped.normal);
      setPropertyIfNeeded(element, `--darkgrid-${prefix}-frost`, mapped.frost);
      setAttributeIfNeeded(element, `data-darkgrid-${prefix}-surface`);
      setAttributeIfNeeded(element, `data-darkgrid-${prefix}-gradient`);
    }

    const foreground = Engine.parseCssColor(style.color);
    if (foreground) {
      setPropertyIfNeeded(element, `--darkgrid-${prefix}-text`, Engine.buildForegroundColor(foreground));
      setAttributeIfNeeded(element, `data-darkgrid-${prefix}-text`);
    }

    const shadow = Engine.rewriteBoxShadow(style.boxShadow);
    if (shadow) {
      setPropertyIfNeeded(element, `--darkgrid-${prefix}-shadow`, shadow);
      setAttributeIfNeeded(element, `data-darkgrid-${prefix}-shadow`);
    }
  }

  function mapSvg(svg) {
    const shapes = Array.from(svg.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon"));
    for (const shape of shapes) {
      removeAttributeIfPresent(shape, "data-darkgrid-svg-fill");
      removeAttributeIfPresent(shape, "data-darkgrid-svg-stroke");
    }

    if (!Engine.isSimpleMonochromeSvg(svg)) return;

    for (const shape of shapes) {
      const style = getComputedStyle(shape);
      const fill = Engine.parseCssColor(style.fill);
      const stroke = Engine.parseCssColor(style.stroke);

      if (fill && fill.a > 0.02 && Engine.relativeLuminance(fill) < 0.52) {
        setAttributeIfNeeded(shape, "data-darkgrid-svg-fill");
      }
      if (stroke && stroke.a > 0.02 && Engine.relativeLuminance(stroke) < 0.52) {
        setAttributeIfNeeded(shape, "data-darkgrid-svg-stroke");
      }
    }
  }

  function syncShadowHost(host) {
    const state = {
      "data-darkgrid-shadow-on": enabledNow,
      "data-darkgrid-shadow-frost": enabledNow && Boolean(settings.frostTint),
      "data-darkgrid-shadow-color-links": enabledNow && Boolean(settings.colorLinks),
      "data-darkgrid-shadow-color-borders": enabledNow && Boolean(settings.colorBorders),
      "data-darkgrid-shadow-color-text": enabledNow && Boolean(settings.colorAllText)
    };

    for (const [name, active] of Object.entries(state)) {
      if (active) setAttributeIfNeeded(host, name);
      else removeAttributeIfPresent(host, name);
    }
  }

  function ensureShadowStyles(root) {
    if (root.querySelector("style[data-darkgrid-shadow-style]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-darkgrid-shadow-style", "");
    style.textContent = SHADOW_STYLE;
    root.prepend(style);
  }

  function inspectElement(element) {
    if (!(element instanceof Element)
      || element === document.documentElement
      || element === document.body) return;

    // SVG paint nodes are handled by the owning SVG as one icon/artwork unit.
    if (element.ownerSVGElement) return;

    if (SKIP_TAGS.has(element.tagName) || Engine.isMediaElement(element)) {
      clearManagedElement(element);
      return;
    }

    clearManagedElement(element);

    if (element.tagName === "SVG") mapSvg(element);

    const style = getComputedStyle(element);
    const backgroundImage = String(style.backgroundImage || "none");
    const hasRaster = Engine.hasRasterBackground(backgroundImage);
    const hasGradient = Engine.hasGradientBackground(backgroundImage) && !hasRaster;
    const background = Engine.parseCssColor(style.backgroundColor);

    // Raster backgrounds are never put into the frost/surface system. Their
    // pixels remain exactly under site control.
    if (!hasRaster && background && background.a > 0.02) {
      const mapped = Engine.buildSurfaceColors(background, accent);
      setPropertyIfNeeded(element, "--darkgrid-surface-normal", mapped.normal);
      setPropertyIfNeeded(element, "--darkgrid-surface-frost", mapped.frost);
      setAttributeIfNeeded(element, "data-darkgrid-surface");
      if (hasGradient) setAttributeIfNeeded(element, "data-darkgrid-gradient");
    } else if (!hasRaster && hasGradient) {
      const mapped = Engine.buildSurfaceColors({ r: 160, g: 160, b: 160, a: 1 }, accent);
      setPropertyIfNeeded(element, "--darkgrid-surface-normal", mapped.normal);
      setPropertyIfNeeded(element, "--darkgrid-surface-frost", mapped.frost);
      setAttributeIfNeeded(element, "data-darkgrid-surface");
      setAttributeIfNeeded(element, "data-darkgrid-gradient");
    }

    if (Engine.hasVisibleBorder(style)) setAttributeIfNeeded(element, "data-darkgrid-border");
    if (Engine.hasDirectText(element)) setAttributeIfNeeded(element, "data-darkgrid-text");

    const shadow = Engine.rewriteBoxShadow(style.boxShadow);
    if (shadow) {
      setPropertyIfNeeded(element, "--darkgrid-box-shadow", shadow);
      setAttributeIfNeeded(element, "data-darkgrid-shadow");
    }

    mapPseudoElement(element, "before", "::before");
    mapPseudoElement(element, "after", "::after");

    if (element.shadowRoot) {
      shadowHosts.add(element);
      ensureShadowStyles(element.shadowRoot);
      syncShadowHost(element);
      observeRoot(element.shadowRoot);
      queueScan(element.shadowRoot);
    }
  }

  function scanSubtree(root) {
    if (!root) return;
    if (root instanceof Element) inspectElement(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (SKIP_TAGS.has(node.tagName) || Engine.isMediaElement(node)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node = walker.nextNode();
    while (node) {
      inspectElement(node);
      node = walker.nextNode();
    }
  }

  function containsRoot(container, candidate) {
    if (container === candidate) return true;
    try {
      return Boolean(container.contains?.(candidate));
    } catch {
      return false;
    }
  }

  function queueScan(root) {
    if (!root) return;

    for (const queued of Array.from(pendingRoots)) {
      if (containsRoot(queued, root)) return;
      if (containsRoot(root, queued)) pendingRoots.delete(queued);
    }

    pendingRoots.add(root);
    if (!scanFrame) scanFrame = requestAnimationFrame(flushScans);
  }

  function pruneShadowHosts() {
    for (const host of Array.from(shadowHosts)) {
      if (!host.isConnected) shadowHosts.delete(host);
    }
  }

  function flushScans() {
    scanFrame = 0;
    pruneShadowHosts();

    const roots = Array.from(pendingRoots);
    pendingRoots.clear();
    for (const root of roots) {
      if (root?.isConnected !== false) scanSubtree(root);
    }
  }

  function normalizeMutationTarget(target) {
    if (target?.ownerSVGElement) return target.ownerSVGElement;
    if (target === document.documentElement || target === document.body) return document.documentElement;
    return target;
  }

  function observeRoot(root) {
    if (!observer || !root || observedRoots.has(root)) return;

    // Observe all attributes. Modern sites frequently drive CSS through
    // data-theme/data-state/aria-selected/etc., not just class/style.
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true
    });
    observedRoots.add(root);
  }

  function startObserver() {
    if (!observer) {
      observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            let needsParentScan = mutation.removedNodes.length > 0;
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                queueScan(normalizeMutationTarget(node));
              } else if (node.nodeType === Node.TEXT_NODE && String(node.nodeValue || "").trim()) {
                needsParentScan = true;
              }
            }
            if (needsParentScan) queueScan(normalizeMutationTarget(mutation.target));
          } else if (mutation.type === "characterData") {
            queueScan(normalizeMutationTarget(mutation.target.parentElement));
          } else if (mutation.type === "attributes" && !mutationIsInternal(mutation)) {
            queueScan(normalizeMutationTarget(mutation.target));
          }
        }
      });
    }

    observeRoot(document.documentElement);
  }

  function stopObserver() {
    observer?.disconnect();
    observedRoots = new WeakSet();
    pendingRoots.clear();
    if (scanFrame) {
      cancelAnimationFrame(scanFrame);
      scanFrame = 0;
    }
  }

  function syncAllShadowHosts() {
    pruneShadowHosts();
    for (const host of Array.from(shadowHosts)) syncShadowHost(host);
  }

  function installLifecycleHooks() {
    if (lifecycleHooksInstalled) return;
    lifecycleHooksInstalled = true;

    const rescan = () => {
      if (enabledNow && document.documentElement) queueScan(document.documentElement);
    };

    document.addEventListener("DOMContentLoaded", rescan, { once: true });
    window.addEventListener("load", rescan, { once: true });
    window.addEventListener("pageshow", event => {
      if (event.persisted) void applySettings();
      else rescan();
    });
  }

  async function applySettings() {
    const stored = await browser.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    settings = { ...DEFAULT_SETTINGS, ...stored };
    settings.excludedDomains = Array.isArray(settings.excludedDomains) ? settings.excludedDomains : [];

    const root = document.documentElement;
    if (!root) {
      if (!waitingForRoot) {
        waitingForRoot = true;
        document.addEventListener("DOMContentLoaded", () => {
          waitingForRoot = false;
          void applySettings();
        }, { once: true });
      }
      return;
    }

    installLifecycleHooks();

    accent = Engine.ensureReadableAccent(hexToRgb(settings.accentColor));
    const accentHex = Engine.rgbToHex(accent);
    enabledNow = Boolean(settings.enabled) && !pageIsExcluded(settings.excludedDomains);

    root.style.setProperty("--darkgrid-accent", accentHex);
    root.style.setProperty("--darkgrid-accent-rgb", `${accent.r}, ${accent.g}, ${accent.b}`);
    root.style.setProperty("--darkgrid-page-frost", Engine.buildPageFrostColor(accent));

    const classes = {
      "darkgrid-on": enabledNow,
      "darkgrid-frost": enabledNow && Boolean(settings.frostTint),
      "darkgrid-color-links": enabledNow && Boolean(settings.colorLinks),
      "darkgrid-color-borders": enabledNow && Boolean(settings.colorBorders),
      "darkgrid-color-text": enabledNow && Boolean(settings.colorAllText),
      "darkgrid-glow": enabledNow && Boolean(settings.edgeGlow)
    };
    for (const [name, active] of Object.entries(classes)) root.classList.toggle(name, active);

    syncAllShadowHosts();

    if (enabledNow) {
      startObserver();
      if (!wasEnabled || lastAccentHex !== accentHex) queueScan(document.documentElement);
    } else if (wasEnabled) {
      stopObserver();
    }

    wasEnabled = enabledNow;
    lastAccentHex = accentHex;
  }

  browser.storage.onChanged.addListener((_, areaName) => {
    if (areaName === "local") void applySettings();
  });

  browser.runtime.onMessage.addListener(message => {
    if (message?.type === "darkgrid:refresh") void applySettings();
  });

  void applySettings();
})();
