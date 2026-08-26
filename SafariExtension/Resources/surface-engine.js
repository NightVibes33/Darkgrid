(() => {
  const MEDIA_TAGS = new Set([
    "IMG",
    "VIDEO",
    "CANVAS",
    "PICTURE",
    "IFRAME",
    "OBJECT",
    "EMBED",
    "SVG"
  ]);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseCssColor(value) {
    const text = String(value || "").trim().toLowerCase();

    if (!text || text === "transparent") {
      return null;
    }

    const match = text.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
    if (!match) {
      return null;
    }

    return {
      r: clamp(Math.round(Number(match[1])), 0, 255),
      g: clamp(Math.round(Number(match[2])), 0, 255),
      b: clamp(Math.round(Number(match[3])), 0, 255),
      a: clamp(match[4] == null ? 1 : Number(match[4]), 0, 1)
    };
  }

  function relativeLuminance(rgb) {
    const channels = [rgb.r, rgb.g, rgb.b].map(channel => {
      const value = channel / 255;
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

  function formatRgb(rgb) {
    return `rgb(${clamp(Math.round(rgb.r), 0, 255)}, ${clamp(Math.round(rgb.g), 0, 255)}, ${clamp(Math.round(rgb.b), 0, 255)})`;
  }

  function buildSurfaceColors(original, accent) {
    const brightness = perceivedBrightness(original);
    const luminance = relativeLuminance(original);

    // Compress every opaque page surface into a narrow true-dark range while
    // preserving enough brightness hierarchy to keep cards/panels distinct.
    const neutralLevel = clamp(Math.round(3 + (brightness * 0.075)), 3, 22);
    const neutral = { r: neutralLevel, g: neutralLevel, b: neutralLevel };

    // Brighter source surfaces get a slightly stronger neon wash. The result is
    // still fully opaque, so there is no see-through compositing artifact.
    const frostAmount = luminance > 0.5 ? 0.080 : luminance > 0.12 ? 0.065 : 0.050;
    const frost = mixRgb(neutral, accent, frostAmount);

    return {
      normal: formatRgb(neutral),
      frost: formatRgb(frost)
    };
  }

  function buildPageFrostColor(accent) {
    return formatRgb(mixRgb({ r: 0, g: 0, b: 0 }, accent, 0.024));
  }

  function isMediaElement(element) {
    return Boolean(element?.tagName && MEDIA_TAGS.has(element.tagName));
  }

  function hasRasterBackground(backgroundImage) {
    return /url\s*\(/i.test(String(backgroundImage || ""));
  }

  function hasGradientBackground(backgroundImage) {
    return /(?:linear|radial|conic)-gradient\s*\(/i.test(String(backgroundImage || ""));
  }

  function hasVisibleBorder(style) {
    if (!style) {
      return false;
    }

    const sides = ["Top", "Right", "Bottom", "Left"];

    return sides.some(side => {
      const width = Number.parseFloat(style[`border${side}Width`] || "0");
      const borderStyle = String(style[`border${side}Style`] || "none");
      const color = parseCssColor(style[`border${side}Color`]);

      return width > 0 && borderStyle !== "none" && borderStyle !== "hidden" && (!color || color.a > 0.02);
    });
  }

  globalThis.DarkgridSurfaceEngine = Object.freeze({
    parseCssColor,
    relativeLuminance,
    buildSurfaceColors,
    buildPageFrostColor,
    isMediaElement,
    hasRasterBackground,
    hasGradientBackground,
    hasVisibleBorder
  });
})();
