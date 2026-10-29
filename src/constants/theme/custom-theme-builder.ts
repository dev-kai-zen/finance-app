import {
  darkShadows,
  lightShadows,
  themeBorderRadius,
  themeSpacing,
  themeTypography,
} from "./foundations";
import { palette } from "./palette";
import type {
  AppTheme,
  CustomThemeConfig,
  ThemeColors,
} from "./theme.types";

export const CUSTOM_THEME_ID = "custom";

export const DEFAULT_CUSTOM_THEME_CONFIG: CustomThemeConfig = {
  name: "Custom",
  baseMode: "dark",
  primaryHex: "#10B981",
  accentHex: "#F59E0B",
  tintIntensity: "subtle",
};

export const CURATED_PRIMARY_SWATCHES = [
  "#10B981", // Emerald
  "#2563EB", // Royal Blue
  "#8B5CF6", // Violet
  "#EC4899", // Rose Pink
  "#F59E0B", // Amber Gold
  "#0D9488", // Teal
  "#EA580C", // Sunset Orange
  "#6366F1", // Indigo
  "#14B8A6", // Mint Cyan
  "#E11D48", // Crimson
] as const;

export const CURATED_ACCENT_SWATCHES = [
  "#F59E0B", // Gold
  "#38BDF8", // Sky
  "#A3E635", // Lime
  "#F472B6", // Pink
  "#C084FC", // Lavender
  "#2DD4BF", // Aqua
  "#FB923C", // Coral
  "#FACC15", // Yellow
] as const;

const lightCategorical: ThemeColors["categorical"] = { ...palette.categorical };
const darkCategorical: ThemeColors["categorical"] = {
  blue: "#60A5FA",
  teal: "#2DD4BF",
  green: "#4ADE80",
  lime: "#A3E635",
  amber: "#FBBF24",
  orange: "#FB923C",
  red: "#F87171",
  purple: "#C084FC",
  indigo: "#818CF8",
  pink: "#F472B6",
  slate: "#94A3B8",
};

const HEX_COLOR_REGEX = /^#?[0-9A-Fa-f]{6}$/;

export function isValidHexColor(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return HEX_COLOR_REGEX.test(value.trim());
}

export function normalizeHexColor(
  value: string | null | undefined,
  fallback: string,
): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) {
    return fallback;
  }
  return (trimmed.startsWith("#") ? trimmed : `#${trimmed}`).toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) {
    return { r: 16, g: 185, b: 129 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/**
 * Mixes `baseHex` with `tintHex` by `weight` (0 = 100% base, 1 = 100% tint).
 */
export function mixHex(baseHex: string, tintHex: string, weight: number): string {
  const w = Math.max(0, Math.min(1, weight));
  const base = hexToRgb(baseHex);
  const tint = hexToRgb(tintHex);
  return rgbToHex(
    base.r + (tint.r - base.r) * w,
    base.g + (tint.g - base.g) * w,
    base.b + (tint.b - base.b) * w,
  );
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

function getReadableOnColor(backgroundHex: string): string {
  const lum = getRelativeLuminance(backgroundHex);
  return lum > 0.36 ? mixHex("#090D10", backgroundHex, 0.15) : "#FFFFFF";
}

export function isCustomThemeConfig(value: unknown): value is CustomThemeConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CustomThemeConfig>;
  return (
    (candidate.baseMode === "light" ||
      candidate.baseMode === "dark" ||
      candidate.baseMode === "oled") &&
    typeof candidate.primaryHex === "string" &&
    typeof candidate.accentHex === "string" &&
    (candidate.tintIntensity === "neutral" ||
      candidate.tintIntensity === "subtle" ||
      candidate.tintIntensity === "rich")
  );
}

export function buildCustomTheme(
  inputConfig?: Partial<CustomThemeConfig> | null,
): AppTheme {
  const config: CustomThemeConfig = {
    ...DEFAULT_CUSTOM_THEME_CONFIG,
    ...(inputConfig ?? {}),
  };
  const primary = normalizeHexColor(
    config.primaryHex,
    DEFAULT_CUSTOM_THEME_CONFIG.primaryHex,
  );
  const accent = normalizeHexColor(
    config.accentHex,
    DEFAULT_CUSTOM_THEME_CONFIG.accentHex,
  );
  const isLight = config.baseMode === "light";
  const isOled = config.baseMode === "oled";
  const mode = isLight ? "light" : "dark";

  const tintMultiplier =
    config.tintIntensity === "neutral"
      ? 0
      : config.tintIntensity === "subtle"
        ? 1
        : 2.1;

  if (isLight) {
    const background = mixHex("#F8FAFC", primary, 0.035 * tintMultiplier);
    const surface =
      config.tintIntensity === "rich"
        ? mixHex("#FFFFFF", primary, 0.04)
        : "#FFFFFF";
    const surfaceMuted = mixHex("#EEF2F6", primary, 0.07 * tintMultiplier);
    const border = mixHex("#D8E0E8", primary, 0.09 * tintMultiplier);
    const borderStrong = mixHex("#A6B4C2", primary, 0.14 * tintMultiplier);

    return {
      id: CUSTOM_THEME_ID,
      name: config.name?.trim() || "Custom",
      description: "Personalized color combination crafted in Custom Theme Studio.",
      mode: "light",
      spacing: themeSpacing,
      borderRadius: themeBorderRadius,
      typography: themeTypography,
      shadows: lightShadows,
      colors: {
        background,
        surface,
        surfaceMuted,
        surfaceElevated: "#FFFFFF",
        surfaceInverse: mixHex("#111827", primary, 0.12),
        surfaceInverseElevated: mixHex("#1F2937", primary, 0.14),
        textPrimary: mixHex("#111827", primary, 0.08 * tintMultiplier),
        textSecondary: mixHex("#4B5563", primary, 0.08 * tintMultiplier),
        textMuted: mixHex("#6B7280", primary, 0.06 * tintMultiplier),
        textInverse: "#FFFFFF",
        textInverseMuted: "#D1D5DB",
        border,
        borderStrong,
        primary,
        onPrimary: getReadableOnColor(primary),
        controlSecondary: mixHex("#E5E7EB", primary, 0.15),
        onControlSecondary: mixHex("#111827", primary, 0.35),
        accent,
        onAccent: getReadableOnColor(accent),
        focusRing: mixHex(primary, "#FFFFFF", 0.2),
        success: "#187A4C",
        warning: "#9A5B00",
        danger: "#B42318",
        onDanger: "#FFFFFF",
        info: "#176B87",
        overlay: "rgba(10, 18, 28, 0.48)",
        categorical: lightCategorical,
      },
    };
  }

  // Dark or OLED mode
  const baseBg = isOled ? "#000000" : "#0B0F17";
  const baseSurface = isOled ? "#0D1015" : "#131924";
  const baseSurfaceMuted = isOled ? "#161B22" : "#1C2433";
  const baseSurfaceElevated = isOled ? "#1E252E" : "#232D3F";

  const background =
    isOled && config.tintIntensity !== "rich"
      ? "#000000"
      : mixHex(baseBg, primary, 0.055 * tintMultiplier);
  const surface = mixHex(baseSurface, primary, 0.08 * tintMultiplier);
  const surfaceMuted = mixHex(baseSurfaceMuted, primary, 0.11 * tintMultiplier);
  const surfaceElevated = mixHex(baseSurfaceElevated, primary, 0.12 * tintMultiplier);
  const border = mixHex("#262F3D", primary, 0.14 * tintMultiplier);
  const borderStrong = mixHex("#455266", primary, 0.18 * tintMultiplier);

  return {
    id: CUSTOM_THEME_ID,
    name: config.name?.trim() || "Custom",
    description: "Personalized color combination crafted in Custom Theme Studio.",
    mode: "dark",
    spacing: themeSpacing,
    borderRadius: themeBorderRadius,
    typography: themeTypography,
    shadows: darkShadows,
    colors: {
      background,
      surface,
      surfaceMuted,
      surfaceElevated,
      surfaceInverse: "#F8FAFC",
      surfaceInverseElevated: "#FFFFFF",
      textPrimary: "#F8FAFC",
      textSecondary: mixHex("#C2C9D6", primary, 0.06 * tintMultiplier),
      textMuted: mixHex("#8E98A8", primary, 0.06 * tintMultiplier),
      textInverse: "#0F172A",
      textInverseMuted: "#475569",
      border,
      borderStrong,
      primary,
      onPrimary: getReadableOnColor(primary),
      controlSecondary: mixHex("#1E2633", primary, 0.22),
      onControlSecondary: mixHex("#E2E8F0", primary, 0.2),
      accent,
      onAccent: getReadableOnColor(accent),
      focusRing: mixHex(primary, "#FFFFFF", 0.28),
      success: "#63D69B",
      warning: "#F0B45A",
      danger: "#FF7770",
      onDanger: "#2A0402",
      info: "#72C5E8",
      overlay: "rgba(0, 0, 0, 0.78)",
      categorical: darkCategorical,
    },
  };
}

