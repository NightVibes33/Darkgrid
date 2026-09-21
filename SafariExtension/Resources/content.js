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
    "--darkgrid-gradient-normal",
    "--darkgrid-gradient-frost",
    "--darkgrid-box-shadow",
    "--darkgrid-before-normal",
    "--darkgrid-before-frost",
    "--darkgrid-before-gradient-normal",
    "--darkgrid-before-gradient-frost",
    "--darkgrid-before-shadow",
    "--darkgrid-before-text",
    "--darkgrid-after-normal",
    "--darkgrid-after-frost",
    "--darkgrid-after-gradient-normal",
    "--darkgrid-after-gradient-frost",
    "--darkgrid-after-shadow",
    "--darkgrid-after-text"
  ];

  const SHADOW_STYLE = `
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])){color-scheme:dark!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-surface]{background-color:var(--darkgrid-surface-normal,#080808)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-frost]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-surface]{background-color:var(--darkgrid-surface-frost,#080808)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-gradient]{background-image:var(--darkgrid-gradient-normal)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-frost]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-gradient]{background-image:var(--darkgrid-gradient-frost)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-text]{color:#e7e7e7!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-measuring])){color:var(--darkgrid-accent-readable)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-text]{color:var(--darkgrid-accent-readable)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) a{color:#e7e7e7!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-links]:not([data-darkgrid-shadow-measuring])) a{color:var(--darkgrid-accent-readable)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-color-links]):not([data-darkgrid-shadow-measuring])) a{color:#e7e7e7!important;text-shadow:none!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-color-links]):not([data-darkgrid-shadow-measuring])) a [data-darkgrid-text]{color:#e7e7e7!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-color-links]):not([data-darkgrid-shadow-measuring])) a[data-darkgrid-before-text]::before,
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-color-links]):not([data-darkgrid-shadow-measuring])) a[data-darkgrid-after-text]::after,
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-color-links]):not([data-darkgrid-shadow-measuring])) a [data-darkgrid-before-text]::before,
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-color-links]):not([data-darkgrid-shadow-measuring])) a [data-darkgrid-after-text]::after{color:#e7e7e7!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-border]{border-color:#343434!important;outline-color:#343434!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-borders]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-border]{border-color:rgba(var(--darkgrid-accent-rgb),.5)!important;outline-color:rgba(var(--darkgrid-accent-rgb),.58)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-shadow]{box-shadow:var(--darkgrid-box-shadow)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-before-surface]::before{background-color:var(--darkgrid-before-normal)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-frost]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-before-surface]::before{background-color:var(--darkgrid-before-frost)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-after-surface]::after{background-color:var(--darkgrid-after-normal)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-frost]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-after-surface]::after{background-color:var(--darkgrid-after-frost)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-before-gradient]::before{background-image:var(--darkgrid-before-gradient-normal)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-frost]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-before-gradient]::before{background-image:var(--darkgrid-before-gradient-frost)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-after-gradient]::after{background-image:var(--darkgrid-after-gradient-normal)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-frost]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-after-gradient]::after{background-image:var(--darkgrid-after-gradient-frost)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-before-shadow]::before{box-shadow:var(--darkgrid-before-shadow)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-after-shadow]::after{box-shadow:var(--darkgrid-after-shadow)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-before-text]::before{color:var(--darkgrid-before-text)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-after-text]::after{color:var(--darkgrid-after-text)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-before-text]::before,
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-after-text]::after{color:var(--darkgrid-accent-readable)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-svg-fill]{fill:#dcdcdc!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) [data-darkgrid-svg-stroke]{stroke:#dcdcdc!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-links]:not([data-darkgrid-shadow-measuring])) a [data-darkgrid-svg-fill]{fill:var(--darkgrid-accent-readable)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-links]:not([data-darkgrid-shadow-measuring])) a [data-darkgrid-svg-stroke]{stroke:var(--darkgrid-accent-readable)!important}
:host([data-darkgrid-shadow-on]:not([data-darkgrid-shadow-measuring])) :where(input,textarea,select,button){color-scheme:dark!important;caret-color:var(--darkgrid-accent-readable)!important}
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-measuring])) input::placeholder,
:host([data-darkgrid-shadow-on][data-darkgrid-shadow-color-text]:not([data-darkgrid-shadow-measuring])) textarea::placeholder{color:var(--darkgrid-accent-readable)!important}
`;

  const pendingRoots = new Set();
  const shadowHosts = new Set();
  const activeAnimationTargets = new Set();
  const stylesheetFingerprints = new WeakMap();
  const mediaQueryListeners = new Map();

  let observedRoots = new WeakSet();
  let observer = null;
  let scanFrame = 0;
  let fullRescanFrame = 0;
  let animationPumpFrame = 0;
  let stylesheetPollTimer = 0;
  let shadowDiscoveryTimer = 0;
  let settings = { ...DEFAULT_SETTINGS };
  let accent = { r: 0, g: 245, b: 255 };
  let readableAccent = { r: 0, g: 245, b: 255 };
  let enabledNow = false;
  let wasEnabled = false;
  let lastAccentHex = "";
  let waitingForRoot = false;
  let lifecycleHooksInstalled = false;
  let stateHooksInstalled = false;

  function normalizedTagName(element) {
    return String(element?.tagName || "").toUpperCase();
  }

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
        const host = normalizeHost(new URL(origin).hostname);
        if (host) hosts.add(host);
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

  function isDarkgridElement(element) {
    return element?.id === "darkgrid-edge-glow"
      || element?.hasAttribute?.("data-darkgrid-shadow-style");
  }

  function backgroundNames(prefix) {
    if (prefix) {
      return {
        surfaceNormal: `--darkgrid-${prefix}-normal`,
        surfaceFrost: `--darkgrid-${prefix}-frost`,
        gradientNormal: `--darkgrid-${prefix}-gradient-normal`,
        gradientFrost: `--darkgrid-${prefix}-gradient-frost`,
        surfaceAttribute: `data-darkgrid-${prefix}-surface`,
        gradientAttribute: `data-darkgrid-${prefix}-gradient`
      };
    }
    return {
      surfaceNormal: "--darkgrid-surface-normal",
      surfaceFrost: "--darkgrid-surface-frost",
      gradientNormal: "--darkgrid-gradient-normal",
      gradientFrost: "--darkgrid-gradient-frost",
      surfaceAttribute: "data-darkgrid-surface",
      gradientAttribute: "data-darkgrid-gradient"
    };
  }

  function mapBackground(element, style, prefix = "") {
    const names = backgroundNames(prefix);
    const backgroundImage = String(style.backgroundImage || "none");
    const hasGradient = Engine.hasGradientBackground(backgroundImage);
    const background = Engine.parseCssColor(style.backgroundColor);

    if (background && background.a > 0.02) {
      const mapped = Engine.buildSurfaceColors(background, accent);
      setPropertyIfNeeded(element, names.surfaceNormal, mapped.normal);
      setPropertyIfNeeded(element, names.surfaceFrost, mapped.frost);
      setAttributeIfNeeded(element, names.surfaceAttribute);
    } else if (hasGradient) {
      const mapped = Engine.buildSurfaceColors({ r: 96, g: 96, b: 96, a: 1 }, accent);
      setPropertyIfNeeded(element, names.surfaceNormal, mapped.normal);
      setPropertyIfNeeded(element, names.surfaceFrost, mapped.frost);
      setAttributeIfNeeded(element, names.surfaceAttribute);
    }

    if (hasGradient) {
      const normalGradient = Engine.rewriteGradientColors(backgroundImage, accent, false);
      const frostGradient = Engine.rewriteGradientColors(backgroundImage, accent, true);
      if (normalGradient && frostGradient) {
        setPropertyIfNeeded(element, names.gradientNormal, normalGradient);
        setPropertyIfNeeded(element, names.gradientFrost, frostGradient);
        setAttributeIfNeeded(element, names.gradientAttribute);
      }
    }
  }

  function mapPseudoElement(element, prefix, pseudo) {
    let style;
    try {
      style = getComputedStyle(element, pseudo);
    } catch {
      return;
    }
    if (!Engine.pseudoIsRenderable(style)) return;

    mapBackground(element, style, prefix);

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
    const targets = [
      svg,
      ...Array.from(svg.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon,text,tspan,use"))
    ];

    for (const target of targets) {
      removeAttributeIfPresent(target, "data-darkgrid-svg-fill");
      removeAttributeIfPresent(target, "data-darkgrid-svg-stroke");
    }

    let rect = { width: 0, height: 0 };
    try { rect = svg.getBoundingClientRect(); } catch {}

    const interactive = Boolean(svg.closest?.("a,button,[role='button'],[role='img']"));
    const iconLike = interactive
      || ((rect.width > 0 || rect.height > 0) && rect.width <= 180 && rect.height <= 180)
      || Engine.isSimpleMonochromeSvg(svg);
    if (!iconLike) return;

    for (const target of targets) {
      let style;
      try { style = getComputedStyle(target); } catch { continue; }
      const fill = Engine.parseCssColor(style.fill);
      const stroke = Engine.parseCssColor(style.stroke);
      if (fill && fill.a > 0.02 && Engine.isNeutralColor(fill) && Engine.relativeLuminance(fill) < 0.30) {
        setAttributeIfNeeded(target, "data-darkgrid-svg-fill");
      }
      if (stroke && stroke.a > 0.02 && Engine.isNeutralColor(stroke) && Engine.relativeLuminance(stroke) < 0.30) {
        setAttributeIfNeeded(target, "data-darkgrid-svg-stroke");
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
    if (enabledNow) {
      setPropertyIfNeeded(host, "--darkgrid-accent", Engine.rgbToHex(accent));
      setPropertyIfNeeded(host, "--darkgrid-accent-readable", Engine.rgbToHex(readableAccent));
      setPropertyIfNeeded(host, "--darkgrid-accent-rgb", `${accent.r}, ${accent.g}, ${accent.b}`);
    }
  }

  function ensureShadowStyles(root) {
    if (root.querySelector("style[data-darkgrid-shadow-style]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-darkgrid-shadow-style", "");
    style.textContent = SHADOW_STYLE;
    root.prepend(style);
  }

  function prepareShadowRoot(root) {
    const isShadowRoot = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot;
    if (!isShadowRoot) return;
    const host = root.host;
    if (!host) return;
    shadowHosts.add(host);
    ensureShadowStyles(root);
    syncShadowHost(host);
    observeRoot(root);
  }

  function inspectElement(element) {
    if (!(element instanceof Element) || isDarkgridElement(element)) return;
    if (element.ownerSVGElement) return;

    if (SKIP_TAGS.has(normalizedTagName(element)) || Engine.isMediaElement(element)) {
      clearManagedElement(element);
      return;
    }

    clearManagedElement(element);
    if (normalizedTagName(element) === "SVG") mapSvg(element);

    let style;
    try { style = getComputedStyle(element); } catch { return; }
    mapBackground(element, style);

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
      prepareShadowRoot(element.shadowRoot);
      queueScan(element.shadowRoot);
    }
  }

  function withMeasurementMode(root, callback) {
    const isShadowRoot = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot;
    const marker = isShadowRoot ? root.host : document.documentElement;
    if (!marker) return callback();

    if (isShadowRoot) marker.setAttribute("data-darkgrid-shadow-measuring", "");
    else marker.classList.add("darkgrid-measuring");

    try {
      return callback();
    } finally {
      if (isShadowRoot) marker.removeAttribute("data-darkgrid-shadow-measuring");
      else marker.classList.remove("darkgrid-measuring");
    }
  }

  function scanSubtree(root) {
    if (!root) return;
    prepareShadowRoot(root);
    withMeasurementMode(root, () => {
      if (root instanceof Element) inspectElement(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
        acceptNode(node) {
          if (isDarkgridElement(node)) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(normalizedTagName(node)) || Engine.isMediaElement(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      let node = walker.nextNode();
      while (node) {
        inspectElement(node);
        node = walker.nextNode();
      }
    });
  }

  function containsRoot(container, candidate) {
    if (container === candidate) return true;
    try { return Boolean(container.contains?.(candidate)); } catch { return false; }
  }

  function queueScan(root) {
    if (!root || !enabledNow) return;
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

  function allScannableRoots() {
    const roots = [];
    if (document.documentElement) roots.push(document.documentElement);
    pruneShadowHosts();
    for (const host of shadowHosts) {
      if (host.shadowRoot) roots.push(host.shadowRoot);
    }
    return roots;
  }

  function queueAllRoots() {
    for (const root of allScannableRoots()) queueScan(root);
  }

  function scheduleFullRescan() {
    if (!enabledNow || fullRescanFrame) return;
    fullRescanFrame = requestAnimationFrame(() => {
      fullRescanFrame = 0;
      queueAllRoots();
    });
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

  function isSiteStylesheetElement(node) {
    if (!(node instanceof Element)) return false;
    const tagName = normalizedTagName(node);
    if (tagName === "STYLE") return !node.hasAttribute("data-darkgrid-shadow-style");
    if (tagName !== "LINK") return false;
    return String(node.getAttribute("rel") || "").toLowerCase().split(/\s+/).includes("stylesheet");
  }

  function stylesheetContext(node) {
    let root = null;
    try { root = node?.getRootNode?.() || null; } catch {}
    const isShadowRoot = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot;
    return isShadowRoot ? root : document.documentElement;
  }

  function mutationAffectsStylesheet(mutation) {
    if (mutation.type === "characterData") return isSiteStylesheetElement(mutation.target.parentElement);
    if (mutation.type === "attributes") return isSiteStylesheetElement(mutation.target);
    if (mutation.type === "childList") {
      if (isSiteStylesheetElement(mutation.target)) return true;
      return [...mutation.addedNodes, ...mutation.removedNodes].some(isSiteStylesheetElement);
    }
    return false;
  }

  function observeRoot(root) {
    if (!observer || !root || observedRoots.has(root)) return;
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
          if (mutationAffectsStylesheet(mutation)) {
            queueScan(stylesheetContext(mutation.target));
            refreshMediaQueryListeners();
            continue;
          }
          if (mutation.type === "childList") {
            let parentChanged = mutation.removedNodes.length > 0;
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (!isDarkgridElement(node)) queueScan(normalizeMutationTarget(node));
              } else if (node.nodeType === Node.TEXT_NODE && String(node.nodeValue || "").trim()) {
                parentChanged = true;
              }
            }
            if (parentChanged) queueScan(normalizeMutationTarget(mutation.target));
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
    if (scanFrame) cancelAnimationFrame(scanFrame);
    if (fullRescanFrame) cancelAnimationFrame(fullRescanFrame);
    scanFrame = 0;
    fullRescanFrame = 0;
  }

  function hashText(seed, text) {
    let hash = seed >>> 0;
    const value = String(text || "");
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash;
  }

  function sheetDigest(sheet) {
    let hash = 2166136261;
    try {
      const rules = Array.from(sheet.cssRules || []);
      hash = hashText(hash, rules.length);
      const selected = rules.length <= 192 ? rules : [...rules.slice(0, 96), ...rules.slice(-96)];
      for (const rule of selected) hash = hashText(hash, rule.cssText);
      return `ok:${hash}`;
    } catch {
      return `x:${String(sheet?.href || "")}`;
    }
  }

  function rootStylesheets(root) {
    const sheets = [];
    const isShadowRoot = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot;
    if (isShadowRoot) {
      for (const style of root.querySelectorAll("style:not([data-darkgrid-shadow-style])")) {
        if (style.sheet) sheets.push(style.sheet);
      }
      try { sheets.push(...Array.from(root.adoptedStyleSheets || [])); } catch {}
    } else {
      try { sheets.push(...Array.from(document.styleSheets || [])); } catch {}
      try { sheets.push(...Array.from(document.adoptedStyleSheets || [])); } catch {}
    }
    return sheets;
  }

  function rootStylesheetFingerprint(root) {
    let fingerprint = "";
    for (const sheet of rootStylesheets(root)) fingerprint += `|${sheetDigest(sheet)}`;
    return fingerprint;
  }

  function pollStylesheets() {
    if (!enabledNow) return;
    let changed = false;
    for (const root of allScannableRoots()) {
      const next = rootStylesheetFingerprint(root);
      const previous = stylesheetFingerprints.get(root);
      stylesheetFingerprints.set(root, next);
      if (previous != null && previous !== next) {
        queueScan(root);
        changed = true;
      }
    }
    if (changed) refreshMediaQueryListeners();
  }

  function startStylesheetPolling() {
    if (!stylesheetPollTimer) {
      pollStylesheets();
      stylesheetPollTimer = setInterval(pollStylesheets, 850);
    }
  }

  function stopStylesheetPolling() {
    if (stylesheetPollTimer) clearInterval(stylesheetPollTimer);
    stylesheetPollTimer = 0;
  }

  function collectMediaQueriesFromRules(rules, output) {
    for (const rule of Array.from(rules || [])) {
      const query = String(rule?.media?.mediaText || "").trim();
      if (query) output.add(query);
      try { if (rule.cssRules) collectMediaQueriesFromRules(rule.cssRules, output); } catch {}
    }
  }

  function collectMediaQueries() {
    const queries = new Set([
      "(prefers-color-scheme: dark)",
      "(prefers-color-scheme: light)",
      "(prefers-contrast: more)",
      "(prefers-reduced-motion: reduce)",
      "(orientation: portrait)",
      "(orientation: landscape)"
    ]);
    for (const root of allScannableRoots()) {
      for (const sheet of rootStylesheets(root)) {
        try { collectMediaQueriesFromRules(sheet.cssRules, queries); } catch {}
      }
    }
    return queries;
  }

  function refreshMediaQueryListeners() {
    if (!enabledNow || typeof matchMedia !== "function") return;
    const wanted = collectMediaQueries();
    for (const [query, entry] of Array.from(mediaQueryListeners)) {
      if (wanted.has(query)) continue;
      try {
        entry.mql.removeEventListener?.("change", entry.listener);
        entry.mql.removeListener?.(entry.listener);
      } catch {}
      mediaQueryListeners.delete(query);
    }
    for (const query of wanted) {
      if (mediaQueryListeners.has(query)) continue;
      try {
        const mql = matchMedia(query);
        const listener = () => scheduleFullRescan();
        if (mql.addEventListener) mql.addEventListener("change", listener);
        else mql.addListener?.(listener);
        mediaQueryListeners.set(query, { mql, listener });
      } catch {}
    }
  }

  function clearMediaQueryListeners() {
    for (const { mql, listener } of mediaQueryListeners.values()) {
      try {
        mql.removeEventListener?.("change", listener);
        mql.removeListener?.(listener);
      } catch {}
    }
    mediaQueryListeners.clear();
  }

  function discoverOpenShadowRoots() {
    if (!enabledNow || !document.documentElement) return;
    const roots = [document.documentElement];
    pruneShadowHosts();
    for (const host of shadowHosts) if (host.shadowRoot) roots.push(host.shadowRoot);

    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let node = root instanceof Element ? root : walker.nextNode();
      while (node) {
        if (node.shadowRoot && !shadowHosts.has(node)) {
          prepareShadowRoot(node.shadowRoot);
          queueScan(node.shadowRoot);
        }
        node = walker.nextNode();
      }
    }
  }

  function startShadowDiscovery() {
    if (!shadowDiscoveryTimer) {
      discoverOpenShadowRoots();
      shadowDiscoveryTimer = setInterval(discoverOpenShadowRoots, 1500);
    }
  }

  function stopShadowDiscovery() {
    if (shadowDiscoveryTimer) clearInterval(shadowDiscoveryTimer);
    shadowDiscoveryTimer = 0;
  }

  function animationTargetFromEvent(event) {
    const target = event?.target;
    if (!(target instanceof Element) || isDarkgridElement(target)) return null;
    return normalizeMutationTarget(target);
  }

  function pumpAnimatedTargets() {
    animationPumpFrame = 0;
    if (!enabledNow || !activeAnimationTargets.size) return;
    for (const target of Array.from(activeAnimationTargets)) {
      if (target?.isConnected === false) activeAnimationTargets.delete(target);
      else queueScan(target);
    }
    if (activeAnimationTargets.size) animationPumpFrame = requestAnimationFrame(pumpAnimatedTargets);
  }

  function startAnimationTracking(event) {
    const target = animationTargetFromEvent(event);
    if (!target) return;
    activeAnimationTargets.add(target);
    if (!animationPumpFrame) animationPumpFrame = requestAnimationFrame(pumpAnimatedTargets);
  }

  function stopAnimationTracking(event) {
    const target = animationTargetFromEvent(event);
    if (target) activeAnimationTargets.delete(target);
    if (!activeAnimationTargets.size && animationPumpFrame) {
      cancelAnimationFrame(animationPumpFrame);
      animationPumpFrame = 0;
    }
    if (target) queueScan(target);
  }

  function installStateHooks() {
    if (stateHooksInstalled) return;
    stateHooksInstalled = true;
    for (const eventName of [
      "pointerover", "pointerout", "pointerdown", "pointerup", "pointercancel",
      "focusin", "focusout", "keydown", "keyup"
    ]) document.addEventListener(eventName, scheduleFullRescan, true);

    document.addEventListener("animationstart", startAnimationTracking, true);
    document.addEventListener("animationiteration", startAnimationTracking, true);
    document.addEventListener("animationend", stopAnimationTracking, true);
    document.addEventListener("animationcancel", stopAnimationTracking, true);
    document.addEventListener("transitionrun", startAnimationTracking, true);
    document.addEventListener("transitionstart", startAnimationTracking, true);
    document.addEventListener("transitionend", stopAnimationTracking, true);
    document.addEventListener("transitioncancel", stopAnimationTracking, true);

    window.addEventListener("resize", scheduleFullRescan, { passive: true });
    window.addEventListener("orientationchange", scheduleFullRescan, { passive: true });
    try { window.visualViewport?.addEventListener("resize", scheduleFullRescan, { passive: true }); } catch {}
  }

  function syncAllShadowHosts() {
    pruneShadowHosts();
    for (const host of shadowHosts) syncShadowHost(host);
  }

  function ensureEdgeGlowElement() {
    const existing = document.getElementById("darkgrid-edge-glow");
    if (!enabledNow || !settings.edgeGlow) {
      existing?.remove();
      return;
    }
    if (existing || !document.body) return;
    const glow = document.createElement("div");
    glow.id = "darkgrid-edge-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(glow);
  }

  function installLifecycleHooks() {
    if (lifecycleHooksInstalled) return;
    lifecycleHooksInstalled = true;
    const rescan = () => {
      if (enabledNow && document.documentElement) {
        ensureEdgeGlowElement();
        scheduleFullRescan();
      }
    };
    document.addEventListener("DOMContentLoaded", rescan, { once: true });
    window.addEventListener("load", rescan, { once: true });
    window.addEventListener("pageshow", event => {
      if (event.persisted) void applySettings();
      else rescan();
    });
    document.addEventListener("load", event => {
      if (isSiteStylesheetElement(event.target)) {
        queueScan(stylesheetContext(event.target));
        refreshMediaQueryListeners();
      }
    }, true);
  }

  async function loadSettings() {
    try {
      const stored = await browser.storage.local.get(Object.keys(DEFAULT_SETTINGS));
      return { ...DEFAULT_SETTINGS, ...stored };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async function applySettings() {
    settings = await loadSettings();
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
    installStateHooks();

    accent = hexToRgb(settings.accentColor);
    const brightestSurface = Engine.parseCssColor(
      Engine.buildSurfaceColors({ r: 255, g: 255, b: 255, a: 1 }, accent).frost
    ) || { r: 46, g: 46, b: 46 };
    readableAccent = Engine.ensureReadableAccent(accent, brightestSurface, 4.5);

    const accentHex = Engine.rgbToHex(accent);
    const readableHex = Engine.rgbToHex(readableAccent);
    enabledNow = Boolean(settings.enabled) && !pageIsExcluded(settings.excludedDomains);

    root.style.setProperty("--darkgrid-accent", accentHex);
    root.style.setProperty("--darkgrid-accent-readable", readableHex);
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
    ensureEdgeGlowElement();

    if (enabledNow) {
      startObserver();
      startStylesheetPolling();
      startShadowDiscovery();
      refreshMediaQueryListeners();
      if (!wasEnabled || lastAccentHex !== accentHex) queueAllRoots();
    } else if (wasEnabled) {
      stopObserver();
      stopStylesheetPolling();
      stopShadowDiscovery();
      clearMediaQueryListeners();
      activeAnimationTargets.clear();
      if (animationPumpFrame) cancelAnimationFrame(animationPumpFrame);
      animationPumpFrame = 0;
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
