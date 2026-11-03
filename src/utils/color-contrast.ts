/**
 * Color contrast and luminance utilities based on WCAG 2.1 specifications.
 * Ensures dynamic semantic contrast (light text on dark backgrounds, dark text on light backgrounds).
 */

export interface ContrastOptions {
  lightText?: string;
  darkText?: string;
  threshold?: number;
}

const DEFAULT_LIGHT_TEXT = "#FFFFFF";
const DEFAULT_DARK_TEXT = "#0F172A";
const DEFAULT_LUMINANCE_THRESHOLD = 0.36;

/**
 * Parses a hex color string (#RGB, #RRGGBB, #RRGGBBAA or without #) to RGB values (0-255).
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  if (typeof hex !== "string") {
    return { r: 0, g: 0, b: 0 };
  }

  const clean = hex.trim().replace(/^#/, "");
  let expanded = clean;

  if (clean.length === 3 || clean.length === 4) {
    expanded = clean
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const num = parseInt(expanded.slice(0, 6), 16);
  if (Number.isNaN(num) || expanded.length < 6) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculates the relative luminance of a color according to WCAG 2.1.
 * Return value ranges from 0.0 (pure black) to 1.0 (pure white).
 */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const transform = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

/**
 * Determines whether a given background color is considered "light" (requiring dark text).
 */
export function isLightColor(
  hex: string,
  threshold = DEFAULT_LUMINANCE_THRESHOLD,
): boolean {
  return getRelativeLuminance(hex) > threshold;
}

/**
 * Returns a guaranteed contrasting text color based on the background color luminance.
 */
export function getContrastTextColor(
  backgroundHex: string,
  options?: ContrastOptions,
): string {
  const light = options?.lightText ?? DEFAULT_LIGHT_TEXT;
  const dark = options?.darkText ?? DEFAULT_DARK_TEXT;
  const threshold = options?.threshold ?? DEFAULT_LUMINANCE_THRESHOLD;

  return isLightColor(backgroundHex, threshold) ? dark : light;
}

