import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import {
  ALL_THEME_PRESETS,
  DEFAULT_THEME_ID,
  THEMES_BY_ID,
  getSystemTheme,
  getThemeById,
  type AppTheme,
  type ThemeSelection,
} from "@/constants/theme";
import {
  readThemeSelection,
  writeThemeSelection,
} from "@/infrastructure/preferences/theme-preference.storage";

export interface ThemeContextValue {
  theme: AppTheme;
  mode: AppTheme["mode"];
  themeId: string;
  setThemeId: (id: string) => void;
  isFollowingSystem: boolean;
  setFollowSystem: (enabled: boolean) => void;
  availableThemes: AppTheme[];
}

const defaultTheme = getThemeById(DEFAULT_THEME_ID);

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  mode: defaultTheme.mode,
  themeId: defaultTheme.id,
  setThemeId: () => {},
  isFollowingSystem: false,
  setFollowSystem: () => {},
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
  initialThemeId,
}: AppThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [selection, setSelection] = useState<ThemeSelection>(() => {
    if (initialThemeId && THEMES_BY_ID[initialThemeId]) {
      return { kind: "preset", presetId: initialThemeId };
    }

    const storedSelection = readThemeSelection();
    if (storedSelection?.kind === "system") return storedSelection;
    if (
      storedSelection?.kind === "preset" &&
      THEMES_BY_ID[storedSelection.presetId]
    ) {
      return storedSelection;
    }

    return {
      kind: "preset",
      presetId: DEFAULT_THEME_ID,
    };
  });

  const activeTheme = useMemo<AppTheme>(() => {
    if (selection.kind === "system") {
      return getSystemTheme(systemScheme === "dark" ? "dark" : "light");
    }

    return getThemeById(selection.presetId);
  }, [selection, systemScheme]);

  const setThemeId = useCallback((id: string) => {
    if (THEMES_BY_ID[id]) {
      const nextSelection: ThemeSelection = { kind: "preset", presetId: id };
      setSelection(nextSelection);
      writeThemeSelection(nextSelection);
    }
  }, []);

  const setFollowSystem = useCallback(
    (enabled: boolean) => {
      const nextSelection: ThemeSelection = enabled
        ? { kind: "system" }
        : { kind: "preset", presetId: activeTheme.id };

      setSelection(nextSelection);
      writeThemeSelection(nextSelection);
    },
    [activeTheme.id],
  );

  useEffect(() => {
    Appearance.setColorScheme(
      selection.kind === "system" ? "unspecified" : activeTheme.mode,
    );
  }, [activeTheme.mode, selection.kind]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: activeTheme,
      mode: activeTheme.mode,
      themeId: activeTheme.id,
      setThemeId,
      isFollowingSystem: selection.kind === "system",
      setFollowSystem,
      availableThemes: ALL_THEME_PRESETS,
    }),
    [activeTheme, selection.kind, setFollowSystem, setThemeId],
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
