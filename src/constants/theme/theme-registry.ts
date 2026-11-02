import {
  amethystTheme,
  blushTheme,
  clayTheme,
  cobaltTheme,
  contrastTheme,
  duneTheme,
  forestTheme,
  graphiteTheme,
  inkTheme,
  lavenderTheme,
  midnightTheme,
  mossTheme,
  paperTheme,
  tideTheme,
} from "./presets";
import type { AppTheme, ThemeMode } from "./theme.types";

export const DEFAULT_THEME_ID = inkTheme.id;
export const SYSTEM_THEME_IDS: Record<ThemeMode, string> = {
  light: paperTheme.id,
  dark: inkTheme.id,
};

export const FREE_THEME_IDS = new Set<string>([
  paperTheme.id,
  inkTheme.id,
  tideTheme.id,
  midnightTheme.id,
]);

export function isFreeThemePreset(themeId: string): boolean {
  return FREE_THEME_IDS.has(themeId);
}

export const ALL_THEME_PRESETS: AppTheme[] = [
  paperTheme,
  inkTheme,
  tideTheme,
  midnightTheme,
  forestTheme,
  amethystTheme,
  cobaltTheme,
  graphiteTheme,
  lavenderTheme,
  mossTheme,
  blushTheme,
  clayTheme,
  duneTheme,
  contrastTheme,
];

export const THEMES_BY_ID: Record<string, AppTheme> = Object.fromEntries(
  ALL_THEME_PRESETS.map((theme) => [theme.id, theme]),
);

export function getThemeById(themeId: string): AppTheme {
  return THEMES_BY_ID[themeId] ?? THEMES_BY_ID[DEFAULT_THEME_ID];
}

export function getSystemTheme(mode: ThemeMode): AppTheme {
  return getThemeById(SYSTEM_THEME_IDS[mode]);
}
