import { useMemo } from "react";
import { useThemeContext } from "@/components/theme";
import type { AppTheme } from "@/constants/theme";

/**
 * Access the active application theme tokens.
 */
export function useAppTheme(): AppTheme {
  const { theme } = useThemeContext();
  return theme;
}

/**
 * Helper hook to create and memoize theme-dependent styles.
 * Re-runs the factory only when the theme changes (e.g. preset/mode switch).
 */
export function useThemeStyles<T>(factory: (theme: AppTheme) => T): T {
  const theme = useAppTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}

/**
 * Hook to access active theme info and switch theme presets.
 */
export function useThemeController() {
  const { theme, mode, themeId, setThemeId, availableThemes } = useThemeContext();
  return {
    theme,
    mode,
    themeId,
    setThemeId,
    availableThemes,
  };
}
