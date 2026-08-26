(() => {
  const MEDIA_TAGS = new Set(["IMG", "VIDEO", "CANVAS", "PICTURE", "IFRAME", "OBJECT", "EMBED"]);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseRgbComponent(token) {
    const text = String(token || "").trim();
    return text.endsWith("%")
      ? clamp(Math.round((Number.parseFloat(text) / 100) * 255), 0, 255)
      : clamp(Math.round(Number.parseFloat(text)), 0, 255);
  }

  function parseAlphaComponent(token) {
    if (token == null || token === "") return 1;
    const text = String(token).trim();
    return text.endsWith("%")
      ? clamp(Number.parseFloat(text) / 100, 0, 1)
      : clamp(Number.parseFloat(text), 0, 1);
  }

  function parseCssColor(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text || text === "transparent" || text === "none") return null;

    const rgb = text.match(
      /^rgba?\(\s*([+-]?[\d.]+%?)[,\s]+([+-]?[\d.]+%?)[,\s]+([+-]?[\d.]+%?)(?:\s*[,/]\s*([+-]?[\d.]+%?))?\s*\)$/i
    );
    if (rgb) {
      return {
        r: parseRgbComponent(rgb[1]),
        g: parseRgbComponent(rgb[2]),
        b: parseRgbComponent(rgb[3]),
        a: parseAlphaComponent(rgb[4])
      };
    }

    const wide = text.match(
      /^color\(\s*(?:srgb|display-p3)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:\s*\/\s*([+-]?[\d.]+%?))?\s*\)$/i
    );
    if (wide) {
      return {
        r: clamp(Math.round(Number.parseFloat(wide[1]) * 255), 0, 255),
        g: clamp(Math.round(Number.parseFloat(wide[2]) * 255), 0, 255),
        b: clamp(Math.round(Number.parseFloat(wide[3]) * 255), 0, 255),
        a: parseAlphaComponent(wide[4])
      };
    }

    return null;
  }

  function relativeLuminance(rgb) {
    const channels = [rgb.r, rgb.g, rgb.b].map(channel => {
      const value = clamp(channel, 0, 255) / 255;
      return value <= 0.04045
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
  }

  function perceivedBrightness(rgb) {
    return (0.2126 * rgb.r) + (0.7152 * rgb.g) + (0.0722 * rgb.b);
  }

  function mixRgb(base, accent, amount) {
    const ratio = clamp(amount, 0, 1);
    return {
      r: Math.round((base.r * (1 - ratio)) + (accent.r * ratio)),
      g: Math.round((base.g * (1 - ratio)) + (accent.g * ratio)),
      b: Math.round((base.b * (1 - ratio)) + (accent.b * ratio))
    };
  }

  function formatRgb(rgb, alpha = 1) {
    const r = clamp(Math.round(rgb.r), 0, 255);
    const g = clamp(Math.round(rgb.g), 0, 255);
    const b = clamp(Math.round(rgb.b), 0, 255);
    const a = clamp(Number(alpha), 0, 1);
    return a >= 0.999
      ? `rgb(${r}, ${g}, ${b})`
      : `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
  }

  function rgbToHex(rgb) {
    const part = value => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0").toUpperCase();
    return `#${part(rgb.r)}${part(rgb.g)}${part(rgb.b)}`;
  }

  // 0.175 relative luminance is approximately a 4.5:1 contrast ratio on true black.
  // It keeps Darkgrid's built-in purple preset unchanged while lifting genuinely
  // unreadable custom colors such as #000000.
  function ensureReadableAccent(rgb, minimumLuminance = 0.175) {
    if (relativeLuminance(rgb) >= minimumLuminance) return { ...rgb };

    let low = 0;
    let high = 1;
    let best = { ...rgb };
    for (let index = 0; index < 16; index += 1) {
      const amount = (low + high) / 2;
      const candidate = mixRgb(rgb, { r: 255, g: 255, b: 255 }, amount);
      if (relativeLuminance(candidate) >= minimumLuminance) {
        best = candidate;
        high = amount;
      } else {
        low = amount;
      }
    }
    return best;
  }

  function buildSurfaceColors(original, accent) {
    const normalizedBrightness = perceivedBrightness(original) / 255;
    const luminance = relativeLuminance(original);

    // Keep more hierarchy than a flat black replacement while still keeping the
    // entire mapped range OLED-dark.
    const level = clamp(Math.round(2 + (Math.pow(normalizedBrightness, 0.82) * 44)), 2, 46);
    const neutral = { r: level, g: level, b: level };
    const frostAmount = luminance > 0.6 ? 0.105 : luminance > 0.18 ? 0.085 : 0.06;
    const frost = mixRgb(neutral, accent, frostAmount);

    // Critical: retain the website's original alpha. A translucent panel remains
    // translucent instead of becoming an opaque sheet over images or video.
    const alpha = clamp(original.a == null ? 1 : original.a, 0, 1);
    return {
      normal: formatRgb(neutral, alpha),
      frost: formatRgb(frost, alpha),
      alpha
    };
  }

  function buildPageFrostColor(accent) {
    return formatRgb(mixRgb({ r: 0, g: 0, b: 0 }, accent, 0.03));
  }

  function buildForegroundColor(original) {
    if (!original || relativeLuminance(original) < 0.34) return "#E7E7E7";
    return formatRgb(original, original.a ?? 1);
  }

  function isMediaElement(element) {
    return Boolean(element?.tagName && MEDIA_TAGS.has(element.tagName));
  }

  function hasRasterBackground(value) {
    return /url\s*\(/i.test(String(value || ""));
  }

  function hasGradientBackground(value) {
    return /(?:linear|radial|conic)-gradient\s*\(/i.test(String(value || ""));
  }

  function hasVisibleBorder(style) {
    if (!style) return false;
    return ["Top", "Right", "Bottom", "Left"].some(side => {
      const width = Number.parseFloat(style[`border${side}Width`] || "0");
      const borderStyle = String(style[`border${side}Style`] || "none");
      const raw = String(style[`border${side}Color`] || "").trim().toLowerCase();
      const color = parseCssColor(raw);
      return width > 0
        && borderStyle !== "none"
        && borderStyle !== "hidden"
        && raw !== "transparent"
        && (!color || color.a > 0.02);
    });
  }

  function rewriteBoxShadow(value) {
    const text = String(value || "");
    if (!text || text === "none") return null;
    return text.replace(/(rgba?\([^)]*\)|color\([^)]*\))/gi, token => {
      const color = parseCssColor(token);
      if (!color) return token;
      const level = relativeLuminance(color) > 0.45 ? 24 : 8;
      return formatRgb({ r: level, g: level, b: level }, Math.min(color.a ?? 1, 0.55));
    });
  }

  function hasDirectText(element) {
    if (!element?.childNodes) return false;
    if (["INPUT", "TEXTAREA", "SELECT", "OPTION", "BUTTON"].includes(element.tagName)) return true;
    return Array.from(element.childNodes).some(node =>
      node.nodeType === Node.TEXT_NODE && String(node.nodeValue || "").trim()
    );
  }

  function pseudoIsRenderable(style) {
    if (!style) return false;
    const content = String(style.content || "").trim();
    const opacity = Number.parseFloat(style.opacity || "1");
    return content !== ""
      && content !== "none"
      && content !== "normal"
      && style.display !== "none"
      && style.visibility !== "hidden"
      && (!Number.isFinite(opacity) || opacity > 0.001);
  }

  function isSimpleMonochromeSvg(svg) {
    if (!svg || svg.tagName !== "SVG") return false;
    if (svg.querySelector("image,foreignObject,linearGradient,radialGradient,pattern,filter,mask,clipPath")) return false;

    const shapes = Array.from(svg.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon"));
    if (!shapes.length || shapes.length > 16) return false;

    let painted = 0;
    for (const shape of shapes) {
      const style = getComputedStyle(shape);
      for (const property of ["fill", "stroke"]) {
        const color = parseCssColor(style[property]);
        if (color && color.a > 0.02) {
          painted += 1;
          if (Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b) > 34) return false;
        }
      }
    }
    return painted > 0;
  }

  globalThis.DarkgridSurfaceEngine = Object.freeze({
    parseCssColor,
    relativeLuminance,
    perceivedBrightness,
    formatRgb,
    rgbToHex,
    ensureReadableAccent,
    buildSurfaceColors,
    buildPageFrostColor,
    buildForegroundColor,
    isMediaElement,
    hasRasterBackground,
    hasGradientBackground,
    hasVisibleBorder,
    rewriteBoxShadow,
    hasDirectText,
    pseudoIsRenderable,
    isSimpleMonochromeSvg
  });
})();
