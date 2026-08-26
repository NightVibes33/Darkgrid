(() => {
  const Engine = globalThis.DarkgridSurfaceEngine;
  if (!Engine) {
    return;
  }

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
    "SCRIPT",
    "STYLE",
    "LINK",
    "META",
    "NOSCRIPT",
    "TEMPLATE",
    "SOURCE",
    "TRACK"
  ]);

  const surfaceRecords = new WeakMap();
  const observedRoots = new WeakSet();
  const pendingRoots = new Set();

  let observer = null;
  let scanFrame = 0;
  let currentAccent = { r: 0, g: 245, b: 255 };
  let lastAccent = "";
  let wasEnabled = false;

  function normalizeDomain(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^\.+|\.+$/g, "");
  }

  function isExcluded(hostname, excludedDomains) {
    const host = normalizeDomain(hostname);

    return excludedDomains
      .map(normalizeDomain)
      .filter(Boolean)
      .some(domain => host === domain || host.endsWith(`.${domain}`));
  }

  function normalizeHex(value) {
    const raw = String(value || "").trim().toUpperCase();
    const withHash = raw.startsWith("#") ? raw : `#${raw}`;
    return /^#[0-9A-F]{6}$/.test(withHash) ? withHash : DEFAULT_SETTINGS.accentColor;
  }

  function hexToRgb(hex) {
    const normalized = normalizeHex(hex).slice(1);
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16)
    };
  }

  function clearManagedSurface(element) {
    element.removeAttribute("data-darkgrid-surface");
    element.removeAttribute("data-darkgrid-gradient");
    element.removeAttribute("data-darkgrid-border");
    element.style.removeProperty("--darkgrid-surface-normal");
    element.style.removeProperty("--darkgrid-surface-frost");
  }

  function applySurfaceRecord(element, record) {
    if (!record?.background) {
      return;
    }

    const colors = Engine.buildSurfaceColors(record.background, currentAccent);
    element.style.setProperty("--darkgrid-surface-normal", colors.normal);
    element.style.setProperty("--darkgrid-surface-frost", colors.frost);
    element.setAttribute("data-darkgrid-surface", "");

    if (record.gradient) {
      element.setAttribute("data-darkgrid-gradient", "");
    }
  }

  function inspectElement(element) {
    if (!(element instanceof Element)) {
      return;
    }

    if (element === document.documentElement || element === document.body) {
      return;
    }

    if (SKIP_TAGS.has(element.tagName) || Engine.isMediaElement(element)) {
      clearManagedSurface(element);
      surfaceRecords.delete(element);
      return;
    }

    // Remove only Darkgrid's managed styling before reading computed page
    // styles. This prevents us from classifying our own replacement colors.
    clearManagedSurface(element);

    const style = getComputedStyle(element);
    const background = Engine.parseCssColor(style.backgroundColor);
    const backgroundImage = String(style.backgroundImage || "none");
    const hasRaster = Engine.hasRasterBackground(backgroundImage);
    const hasGradient = Engine.hasGradientBackground(backgroundImage) && !hasRaster;

    let record = null;

    if (background && background.a > 0.035) {
      record = {
        background: { r: background.r, g: background.g, b: background.b },
        gradient: hasGradient
      };
    } else if (hasGradient) {
      // Gradient-only surfaces still need an opaque dark base. The gradient is
      // retained and multiplied into that base instead of being discarded.
      record = {
        background: { r: 150, g: 150, b: 150 },
        gradient: true
      };
    }

    if (record) {
      surfaceRecords.set(element, record);
      applySurfaceRecord(element, record);
    } else {
      surfaceRecords.delete(element);
    }

    if (Engine.hasVisibleBorder(style)) {
      element.setAttribute("data-darkgrid-border", "");
    }

    if (element.shadowRoot) {
      observeRoot(element.shadowRoot);
      queueScan(element.shadowRoot);
    }
  }

  function scanSubtree(root) {
    if (!root) {
      return;
    }

    if (root instanceof Element) {
      inspectElement(root);
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (SKIP_TAGS.has(node.tagName) || Engine.isMediaElement(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node = walker.nextNode();
    while (node) {
      inspectElement(node);
      node = walker.nextNode();
    }
  }

  function flushScans() {
    scanFrame = 0;
    const roots = [...pendingRoots];
    pendingRoots.clear();

    for (const root of roots) {
      if (root?.isConnected !== false) {
        scanSubtree(root);
      }
    }
  }

  function queueScan(root) {
    if (!root) {
      return;
    }

    pendingRoots.add(root);

    if (!scanFrame) {
      scanFrame = requestAnimationFrame(flushScans);
    }
  }

  function observeRoot(root) {
    if (!observer || !root || observedRoots.has(root)) {
      return;
    }

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
    observedRoots.add(root);
  }

  function startObserver() {
    if (!observer) {
      observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                queueScan(node);
              }
            }
          } else if (mutation.type === "attributes" && mutation.target !== document.documentElement) {
            queueScan(mutation.target);
          }
        }
      });
    }

    observeRoot(document.documentElement);
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
    }
    observedRoots.delete?.(document.documentElement);
    pendingRoots.clear();
    if (scanFrame) {
      cancelAnimationFrame(scanFrame);
      scanFrame = 0;
    }
  }

  function repaintSurfaces() {
    for (const element of document.querySelectorAll("[data-darkgrid-surface]")) {
      const record = surfaceRecords.get(element);
      if (record) {
        applySurfaceRecord(element, record);
      }
    }
  }

  async function applySettings() {
    const stored = await browser.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    const settings = { ...DEFAULT_SETTINGS, ...stored };
    const root = document.documentElement;

    if (!root) {
      return;
    }

    const accent = normalizeHex(settings.accentColor);
    currentAccent = hexToRgb(accent);
    const blocked = isExcluded(
      location.hostname,
      Array.isArray(settings.excludedDomains) ? settings.excludedDomains : []
    );
    const shouldEnable = Boolean(settings.enabled) && !blocked;

    root.style.setProperty("--darkgrid-accent", accent);
    root.style.setProperty(
      "--darkgrid-accent-rgb",
      `${currentAccent.r}, ${currentAccent.g}, ${currentAccent.b}`
    );
    root.style.setProperty("--darkgrid-page-frost", Engine.buildPageFrostColor(currentAccent));

    root.classList.toggle("darkgrid-on", shouldEnable);
    root.classList.toggle("darkgrid-frost", shouldEnable && Boolean(settings.frostTint));
    root.classList.toggle("darkgrid-color-links", shouldEnable && Boolean(settings.colorLinks));
    root.classList.toggle("darkgrid-color-borders", shouldEnable && Boolean(settings.colorBorders));
    root.classList.toggle("darkgrid-color-text", shouldEnable && Boolean(settings.colorAllText));
    root.classList.toggle("darkgrid-glow", shouldEnable && Boolean(settings.edgeGlow));

    if (shouldEnable) {
      startObserver();

      if (!wasEnabled) {
        queueScan(document.documentElement);
      } else if (lastAccent !== accent) {
        repaintSurfaces();
      }
    } else if (wasEnabled) {
      stopObserver();
    }

    wasEnabled = shouldEnable;
    lastAccent = accent;
  }

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      void applySettings();
    }
  });

  browser.runtime.onMessage.addListener(message => {
    if (message?.type === "darkgrid:refresh") {
      void applySettings();
    }
  });

  void applySettings();
})();
