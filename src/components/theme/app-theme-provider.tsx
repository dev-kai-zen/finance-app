import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  ALL_THEME_PRESETS,
  THEMES_BY_ID,
  kaizenEmerald,
  type AppTheme,
} from "@/constants/theme";

export interface ThemeContextValue {
  theme: AppTheme;
  mode: AppTheme["mode"];
  themeId: string;
  setThemeId: (id: string) => void;
  availableThemes: AppTheme[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: kaizenEmerald,
  mode: "dark",
  themeId: kaizenEmerald.id,
  setThemeId: () => {},
  availableThemes: ALL_THEME_PRESETS,
});

export interface AppThemeProviderProps extends PropsWithChildren {
  initialThemeId?: string;
}

/**
 * Provides the application theme to the React Native component tree.
 * Allows instant dynamic switching between presets.
 */
export function AppThemeProvider({
  children,
  initialThemeId = kaizenEmerald.id,
}: AppThemeProviderProps) {
  const [themeId, setCurrentThemeId] = useState<string>(initialThemeId);

  const setThemeId = useCallback((id: string) => {
    if (THEMES_BY_ID[id]) {
      setCurrentThemeId(id);
    }
  }, []);

  const activeTheme = useMemo<AppTheme>(() => {
    return THEMES_BY_ID[themeId] ?? kaizenEmerald;
  }, [themeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: activeTheme,
      mode: activeTheme.mode,
      themeId: activeTheme.id,
      setThemeId,
      availableThemes: ALL_THEME_PRESETS,
    }),
    [activeTheme, setThemeId],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
