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
  CUSTOM_THEME_ID,
  DEFAULT_CUSTOM_THEME_CONFIG,
  DEFAULT_THEME_ID,
  THEMES_BY_ID,
  buildCustomTheme,
  getSystemTheme,
  getThemeById,
  type AppTheme,
  type CustomThemeConfig,
  type ThemeSelection,
} from "@/constants/theme";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database";
import {
  readSavedCustomThemeConfig,
  readThemeSelection,
  writeSavedCustomThemeConfig,
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
  customThemeConfig: CustomThemeConfig;
  setCustomTheme: (config: CustomThemeConfig) => void;
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
  customThemeConfig: DEFAULT_CUSTOM_THEME_CONFIG,
  setCustomTheme: () => {},
});

export interface AppThemeProviderProps extends PropsWithChildren {
  initialThemeId?: string;
}

/**
 * Provides the application theme to the React Native component tree.
 * Allows instant dynamic switching between presets and custom themes.
 */
export function AppThemeProvider({
  children,
  initialThemeId,
}: AppThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [customThemeConfig, setCustomThemeConfig] =
    useState<CustomThemeConfig>(() => readSavedCustomThemeConfig());

  const [selection, setSelection] = useState<ThemeSelection>(() => {
    if (initialThemeId && THEMES_BY_ID[initialThemeId]) {
      return { kind: "preset", presetId: initialThemeId };
    }

    const storedSelection = readThemeSelection();
    if (storedSelection?.kind === "system") return storedSelection;
    if (storedSelection?.kind === "custom") return storedSelection;
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

  const reloadThemeFromStorage = useCallback(() => {
    const nextCustomConfig = readSavedCustomThemeConfig();
    setCustomThemeConfig(nextCustomConfig);

    const storedSelection = readThemeSelection();
    if (storedSelection?.kind === "system") {
      setSelection(storedSelection);
      return;
    }
    if (storedSelection?.kind === "custom") {
      setSelection(storedSelection);
      return;
    }
    if (
      storedSelection?.kind === "preset" &&
      THEMES_BY_ID[storedSelection.presetId]
    ) {
      setSelection(storedSelection);
    }
  }, []);

  useEffect(() => {
    reloadThemeFromStorage();
    return subscribeToDatabaseReplacement(() => {
      reloadThemeFromStorage();
    });
  }, [reloadThemeFromStorage]);

  const activeTheme = useMemo<AppTheme>(() => {
    if (selection.kind === "system") {
      return getSystemTheme(systemScheme === "dark" ? "dark" : "light");
    }
    if (selection.kind === "custom") {
      return buildCustomTheme(selection.config);
    }

    return getThemeById(selection.presetId);
  }, [selection, systemScheme]);

  const setThemeId = useCallback(
    (id: string) => {
      if (id === CUSTOM_THEME_ID) {
        const nextSelection: ThemeSelection = {
          kind: "custom",
          config: customThemeConfig,
        };
        setSelection(nextSelection);
        writeThemeSelection(nextSelection);
        return;
      }
      if (THEMES_BY_ID[id]) {
        const nextSelection: ThemeSelection = { kind: "preset", presetId: id };
        setSelection(nextSelection);
        writeThemeSelection(nextSelection);
      }
    },
    [customThemeConfig],
  );

  const setCustomTheme = useCallback((config: CustomThemeConfig) => {
    setCustomThemeConfig(config);
    writeSavedCustomThemeConfig(config);
    const nextSelection: ThemeSelection = { kind: "custom", config };
    setSelection(nextSelection);
    writeThemeSelection(nextSelection);
  }, []);

  const setFollowSystem = useCallback(
    (enabled: boolean) => {
      const nextSelection: ThemeSelection = enabled
        ? { kind: "system" }
        : selection.kind === "custom"
          ? { kind: "custom", config: customThemeConfig }
          : {
              kind: "preset",
              presetId:
                activeTheme.id === CUSTOM_THEME_ID
                  ? DEFAULT_THEME_ID
                  : activeTheme.id,
            };

      setSelection(nextSelection);
      writeThemeSelection(nextSelection);
    },
    [activeTheme.id, customThemeConfig, selection.kind],
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
      customThemeConfig,
      setCustomTheme,
    }),
    [
      activeTheme,
      customThemeConfig,
      selection.kind,
      setCustomTheme,
      setFollowSystem,
      setThemeId,
    ],
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
