import type { AppTheme } from "@/constants/theme";
import type { HexColor } from "../types/hex-color.types";

export interface ResolveHexColorOptions {
  colors?: HexColor[];
  theme?: AppTheme;
  fallback?: string;
}

export function resolveHexColor(
  colorValue: string | null | undefined,
  options: ResolveHexColorOptions = {},
): string {
  const fallback = options.fallback ?? options.theme?.colors.primary ?? "#64748B";

  if (!colorValue) {
    return fallback;
  }

  const normalized = colorValue.trim();
  if (!normalized) {
    return fallback;
  }

  if (normalized.startsWith("#")) {
    return normalized;
  }

  const fromList =
    options.colors?.find(
      (entry) =>
        entry.id === normalized ||
        entry.id === `color_${normalized}` ||
        entry.hex.toUpperCase() === normalized.toUpperCase(),
    ) ?? null;

  if (fromList) {
    return fromList.hex;
  }

  const categoricalKey = normalized.startsWith("color_")
    ? normalized.replace("color_", "")
    : normalized;

  if (options.theme && categoricalKey in options.theme.colors.categorical) {
    return options.theme.colors.categorical[
      categoricalKey as keyof AppTheme["colors"]["categorical"]
    ];
  }

  if (/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `#${normalized}`;
  }

  return fallback;
}
