(() => {
  const MEDIA_TAGS = new Set(["IMG", "VIDEO", "CANVAS", "PICTURE", "IFRAME", "OBJECT", "EMBED"]);
  const SVG_PAINT_TAGS = new Set(["SVG", "PATH", "RECT", "CIRCLE", "ELLIPSE", "LINE", "POLYLINE", "POLYGON", "TEXT", "TSPAN", "USE"]);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseRgbComponent(token) {
    const text = String(token || "").trim();
    const value = Number.parseFloat(text);
    if (!Number.isFinite(value)) return 0;
    return text.endsWith("%")
      ? clamp(Math.round((value / 100) * 255), 0, 255)
      : clamp(Math.round(value), 0, 255);
  }

  function parseAlphaComponent(token) {
    if (token == null || token === "") return 1;
    const text = String(token).trim();
    const value = Number.parseFloat(text);
    if (!Number.isFinite(value)) return 1;
    return text.endsWith("%")
      ? clamp(value / 100, 0, 1)
      : clamp(value, 0, 1);
  }

  function srgbEncode(linear) {
    const value = clamp(linear, 0, 1);
    return value <= 0.0031308
      ? 12.92 * value
      : (1.055 * Math.pow(value, 1 / 2.4)) - 0.055;
  }

  function linearRgbToRgb(r, g, b, alpha = 1) {
    return {
      r: clamp(Math.round(srgbEncode(r) * 255), 0, 255),
      g: clamp(Math.round(srgbEncode(g) * 255), 0, 255),
      b: clamp(Math.round(srgbEncode(b) * 255), 0, 255),
      a: clamp(alpha, 0, 1)
    };
  }

  function oklabToRgb(L, a, b, alpha = 1) {
    const l_ = L + (0.3963377774 * a) + (0.2158037573 * b);
    const m_ = L - (0.1055613458 * a) - (0.0638541728 * b);
    const s_ = L - (0.0894841775 * a) - (1.2914855480 * b);
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    return linearRgbToRgb(
      (4.0767416621 * l) - (3.3077115913 * m) + (0.2309699292 * s),
      (-1.2684380046 * l) + (2.6097574011 * m) - (0.3413193965 * s),
      (-0.0041960863 * l) - (0.7034186147 * m) + (1.7076147010 * s),
      alpha
    );
  }

  function parseAngle(token) {
    const text = String(token || "0").trim().toLowerCase();
    const value = Number.parseFloat(text);
    if (!Number.isFinite(value)) return 0;
    if (text.endsWith("turn")) return value * 360;
    if (text.endsWith("rad")) return value * (180 / Math.PI);
    if (text.endsWith("grad")) return value * 0.9;
    return value;
  }

  function parseLightness(token, scale = 1) {
    const text = String(token || "").trim();
    const value = Number.parseFloat(text);
    if (!Number.isFinite(value)) return 0;
    return text.endsWith("%") ? (value / 100) * scale : value;
  }

  function labInv(value) {
    const epsilon = 6 / 29;
    return value > epsilon
      ? value * value * value
      : 3 * epsilon * epsilon * (value - (4 / 29));
  }

  function labToRgb(L, a, b, alpha = 1) {
    const fy = (L + 16) / 116;
    const fx = fy + (a / 500);
    const fz = fy - (b / 200);

    const x50 = 0.96422 * labInv(fx);
    const y50 = labInv(fy);
    const z50 = 0.82521 * labInv(fz);

    const x = (0.9555766 * x50) - (0.0230393 * y50) + (0.0631636 * z50);
    const y = (-0.0282895 * x50) + (1.0099416 * y50) + (0.0210077 * z50);
    const z = (0.0122982 * x50) - (0.0204830 * y50) + (1.3299098 * z50);

    return linearRgbToRgb(
      (3.2404542 * x) - (1.5371385 * y) - (0.4985314 * z),
      (-0.9692660 * x) + (1.8760108 * y) + (0.0415560 * z),
      (0.0556434 * x) - (0.2040259 * y) + (1.0572252 * z),
      alpha
    );
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

    const oklab = text.match(
      /^oklab\(\s*([+-]?[\d.]+%?)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:\s*\/\s*([+-]?[\d.]+%?))?\s*\)$/i
    );
    if (oklab) {
      return oklabToRgb(
        parseLightness(oklab[1], 1),
        Number.parseFloat(oklab[2]),
        Number.parseFloat(oklab[3]),
        parseAlphaComponent(oklab[4])
      );
    }

    const oklch = text.match(
      /^oklch\(\s*([+-]?[\d.]+%?)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+(?:deg|grad|rad|turn)?)(?:\s*\/\s*([+-]?[\d.]+%?))?\s*\)$/i
    );
    if (oklch) {
      const L = parseLightness(oklch[1], 1);
      const C = Number.parseFloat(oklch[2]);
      const h = parseAngle(oklch[3]) * (Math.PI / 180);
      return oklabToRgb(L, C * Math.cos(h), C * Math.sin(h), parseAlphaComponent(oklch[4]));
    }

    const lab = text.match(
      /^lab\(\s*([+-]?[\d.]+%?)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:\s*\/\s*([+-]?[\d.]+%?))?\s*\)$/i
    );
    if (lab) {
      return labToRgb(
        parseLightness(lab[1], 100),
        Number.parseFloat(lab[2]),
        Number.parseFloat(lab[3]),
        parseAlphaComponent(lab[4])
      );
    }

    const lch = text.match(
      /^lch\(\s*([+-]?[\d.]+%?)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+(?:deg|grad|rad|turn)?)(?:\s*\/\s*([+-]?[\d.]+%?))?\s*\)$/i
    );
    if (lch) {
      const L = parseLightness(lch[1], 100);
      const C = Number.parseFloat(lch[2]);
      const h = parseAngle(lch[3]) * (Math.PI / 180);
      return labToRgb(L, C * Math.cos(h), C * Math.sin(h), parseAlphaComponent(lch[4]));
    }

    const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hex) {
      let raw = hex[1];
      if (raw.length === 3 || raw.length === 4) raw = raw.split("").map(ch => ch + ch).join("");
      return {
        r: Number.parseInt(raw.slice(0, 2), 16),
        g: Number.parseInt(raw.slice(2, 4), 16),
        b: Number.parseInt(raw.slice(4, 6), 16),
        a: raw.length === 8 ? Number.parseInt(raw.slice(6, 8), 16) / 255 : 1
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

  function contrastRatio(first, second) {
    const a = relativeLuminance(first);
    const b = relativeLuminance(second);
    const lighter = Math.max(a, b);
    const darker = Math.min(a, b);
    return (lighter + 0.05) / (darker + 0.05);
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

  function ensureContrast(rgb, background = { r: 46, g: 46, b: 46 }, minimumRatio = 4.5) {
    if (contrastRatio(rgb, background) >= minimumRatio) return { ...rgb };

    let low = 0;
    let high = 1;
    let best = { r: 255, g: 255, b: 255 };
    for (let index = 0; index < 18; index += 1) {
      const amount = (low + high) / 2;
      const candidate = mixRgb(rgb, { r: 255, g: 255, b: 255 }, amount);
      if (contrastRatio(candidate, background) >= minimumRatio) {
        best = candidate;
        high = amount;
      } else {
        low = amount;
      }
    }
    return best;
  }

  function ensureReadableAccent(rgb, background = { r: 46, g: 46, b: 46 }, minimumRatio = 4.5) {
    return ensureContrast(rgb, background, minimumRatio);
  }

  function buildSurfaceColors(original, accent) {
    const normalizedBrightness = perceivedBrightness(original) / 255;
    const luminance = relativeLuminance(original);

    const level = clamp(Math.round(2 + (Math.pow(normalizedBrightness, 0.82) * 44)), 2, 46);
    const neutral = { r: level, g: level, b: level };
    const frostAmount = luminance > 0.6 ? 0.105 : luminance > 0.18 ? 0.085 : 0.06;
    const frost = mixRgb(neutral, accent, frostAmount);

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
    return Boolean(element?.tagName && MEDIA_TAGS.has(String(element.tagName).toUpperCase()));
  }

  function hasRasterBackground(value) {
    return /url\s*\(/i.test(String(value || ""));
  }

  function hasGradientBackground(value) {
    return /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i.test(String(value || ""));
  }

  function findGradientRanges(text) {
    const ranges = [];
    const pattern = /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/ig;
    let match;
    while ((match = pattern.exec(text))) {
      const start = match.index;
      let index = pattern.lastIndex;
      let depth = 1;
      let quote = "";
      while (index < text.length && depth > 0) {
        const ch = text[index];
        if (quote) {
          if (ch === "\\") index += 2;
          else {
            if (ch === quote) quote = "";
            index += 1;
          }
          continue;
        }
        if (ch === "'" || ch === '"') {
          quote = ch;
        } else if (ch === "(") {
          depth += 1;
        } else if (ch === ")") {
          depth -= 1;
        }
        index += 1;
      }
      if (depth === 0) ranges.push([start, index]);
      pattern.lastIndex = Math.max(pattern.lastIndex, index);
    }
    return ranges;
  }

  function rewriteColorTokens(segment, accent, frosted) {
    const tokenPattern = /(rgba?\([^()]*\)|color\([^()]*\)|oklab\([^()]*\)|oklch\([^()]*\)|lab\([^()]*\)|lch\([^()]*\)|#[0-9a-f]{3,8}\b)/ig;
    return segment.replace(tokenPattern, token => {
      const parsed = parseCssColor(token);
      if (!parsed) return token;
      const mapped = buildSurfaceColors(parsed, accent);
      return frosted ? mapped.frost : mapped.normal;
    });
  }

  function rewriteGradientColors(value, accent, frosted = false) {
    const text = String(value || "");
    if (!hasGradientBackground(text)) return null;

    const ranges = findGradientRanges(text);
    if (!ranges.length) return null;

    let result = "";
    let cursor = 0;
    for (const [start, end] of ranges) {
      result += text.slice(cursor, start);
      result += rewriteColorTokens(text.slice(start, end), accent, frosted);
      cursor = end;
    }
    result += text.slice(cursor);
    return result;
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
    return text.replace(
      /(rgba?\([^)]*\)|color\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|lab\([^)]*\)|lch\([^)]*\)|#[0-9a-f]{3,8}\b)/gi,
      token => {
        const color = parseCssColor(token);
        if (!color) return token;
        const level = relativeLuminance(color) > 0.45 ? 24 : 8;
        return formatRgb({ r: level, g: level, b: level }, Math.min(color.a ?? 1, 0.55));
      }
    );
  }

  function hasDirectText(element) {
    if (!element?.childNodes) return false;
    if (["INPUT", "TEXTAREA", "SELECT", "OPTION", "BUTTON"].includes(String(element.tagName).toUpperCase())) return true;
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

  function isNeutralColor(color, tolerance = 40) {
    if (!color) return false;
    const max = Math.max(color.r, color.g, color.b);
    const min = Math.min(color.r, color.g, color.b);
    return (max - min) <= tolerance;
  }

  function isSvgPaintElement(element) {
    return Boolean(element?.tagName && SVG_PAINT_TAGS.has(String(element.tagName).toUpperCase()));
  }

  function isSimpleMonochromeSvg(svg) {
    if (!svg || String(svg.tagName || "").toUpperCase() !== "SVG") return false;
    if (svg.querySelector("image,foreignObject,linearGradient,radialGradient,pattern,filter,mask")) return false;

    const shapes = [svg, ...Array.from(svg.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon,text,tspan,use"))];
    if (shapes.length <= 1 || shapes.length > 256) return false;

    let painted = 0;
    for (const shape of shapes) {
      let style;
      try {
        style = getComputedStyle(shape);
      } catch {
        continue;
      }
      for (const property of ["fill", "stroke"]) {
        const color = parseCssColor(style[property]);
        if (color && color.a > 0.02) {
          painted += 1;
          if (!isNeutralColor(color, 40)) return false;
        }
      }
    }
    return painted > 0;
  }

  globalThis.DarkgridSurfaceEngine = Object.freeze({
    parseCssColor,
    relativeLuminance,
    contrastRatio,
    perceivedBrightness,
    formatRgb,
    rgbToHex,
    ensureContrast,
    ensureReadableAccent,
    buildSurfaceColors,
    buildPageFrostColor,
    buildForegroundColor,
    isMediaElement,
    hasRasterBackground,
    hasGradientBackground,
    rewriteGradientColors,
    hasVisibleBorder,
    rewriteBoxShadow,
    hasDirectText,
    pseudoIsRenderable,
    isNeutralColor,
    isSvgPaintElement,
    isSimpleMonochromeSvg
  });
})();