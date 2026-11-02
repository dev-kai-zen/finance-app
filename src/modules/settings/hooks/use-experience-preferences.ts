import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

import {
  applyDashboardLayoutPreset,
  applyGuidedWorkspaceSimpleDefaults,
  DEFAULT_DASHBOARD_LAYOUT,
  getDashboardLayoutPreferences,
  getDeveloperModeEnabled,
  getGuideHelperEnabled,
  getGeneralSearchEnabled,
  getHiddenNavHrefs,
  getHomeExperienceMode,
  getNavVisibilityPreferences,
  getTransactionFormFieldPreferences,
  isDevModeAllowed,
  isPromptDismissed,
  isTransactionFormFieldEnabled,
  setDashboardLayoutPreferences,
  setDeveloperModeEnabled,
  setGuideHelperEnabled,
  setGeneralSearchEnabled,
  setHomeExperienceMode,
  setNavItemVisible,
  setPromptDismissed,
  setTransactionFormFieldEnabled,
  setTransactionFormFieldPreferences,
  subscribeToExperiencePreferences,
  type DashboardLayoutPreferences,
  type DashboardLayoutPresetId,
  type DashboardWidgetId,
  type FormFieldPreferenceKey,
  type HomeExperienceMode,
  type NavVisibilityPreferences,
  type TransactionFormFieldPreferences,
} from "../services/experience-preferences.service";
import type { NavVisibilityKey } from "../constants/settings.constants";

const DEVELOPER_TAP_TARGET = 10;
const DEVELOPER_TAP_RESET_MS = 2000;

export function useExperiencePreferences() {
  const [developerMode, setDeveloperModeState] = useState(() =>
    getDeveloperModeEnabled(),
  );
  const [guideHelperEnabled, setGuideHelperEnabledState] = useState(() =>
    getGuideHelperEnabled(),
  );
  const [generalSearchEnabled, setGeneralSearchEnabledState] = useState(() =>
    getGeneralSearchEnabled(),
  );
  const [homeMode, setHomeModeState] = useState<HomeExperienceMode>(() =>
    getHomeExperienceMode(),
  );
  const [dashboardLayout, setDashboardLayoutState] =
    useState<DashboardLayoutPreferences>(() => getDashboardLayoutPreferences());
  const [formFields, setFormFieldsState] =
    useState<TransactionFormFieldPreferences>(() =>
      getTransactionFormFieldPreferences(),
    );
  const [navVisibility, setNavVisibilityState] =
    useState<NavVisibilityPreferences>(() => getNavVisibilityPreferences());
  const [hiddenNavHrefs, setHiddenNavHrefs] = useState<string[]>(() =>
    getHiddenNavHrefs(),
  );
  const [developerUnlockNotice, setDeveloperUnlockNotice] = useState(false);
  const [revision, setRevision] = useState(0);

  const tapCountRef = useRef(0);
  const lastTapAtRef = useRef(0);

  const refresh = useCallback(() => {
    setDeveloperModeState(getDeveloperModeEnabled());
    setGuideHelperEnabledState(getGuideHelperEnabled());
    setGeneralSearchEnabledState(getGeneralSearchEnabled());
    setHomeModeState(getHomeExperienceMode());
    setDashboardLayoutState(getDashboardLayoutPreferences());
    setFormFieldsState(getTransactionFormFieldPreferences());
    setNavVisibilityState(getNavVisibilityPreferences());
    setHiddenNavHrefs(getHiddenNavHrefs());
    setRevision((prev) => prev + 1);
  }, []);

  useEffect(() => {
    return subscribeToExperiencePreferences(refresh);
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const setDeveloperMode = useCallback(
    (enabled: boolean) => {
      setDeveloperModeEnabled(enabled);
      refresh();
    },
    [refresh],
  );

  const setGuideHelper = useCallback(
    (enabled: boolean) => {
      setGuideHelperEnabled(enabled);
      refresh();
    },
    [refresh],
  );

  const setGeneralSearch = useCallback(
    (enabled: boolean) => {
      setGeneralSearchEnabled(enabled);
      refresh();
    },
    [refresh],
  );

  const registerSettingsTitleTap = useCallback(() => {
    if (!isDevModeAllowed()) {
      return;
    }
    const now = Date.now();
    if (now - lastTapAtRef.current > DEVELOPER_TAP_RESET_MS) {
      tapCountRef.current = 0;
    }
    lastTapAtRef.current = now;
    tapCountRef.current += 1;

    if (tapCountRef.current >= DEVELOPER_TAP_TARGET) {
      tapCountRef.current = 0;
      if (!getDeveloperModeEnabled()) {
        setDeveloperModeEnabled(true);
        setDeveloperUnlockNotice(true);
        refresh();
      }
    }
  }, [refresh]);

  const dismissDeveloperUnlockNotice = useCallback(() => {
    setDeveloperUnlockNotice(false);
  }, []);

  const setFormField = useCallback(
    (field: FormFieldPreferenceKey, enabled: boolean) => {
      setTransactionFormFieldEnabled(field, enabled);
      refresh();
    },
    [refresh],
  );

  const setFormFields = useCallback(
    (partial: Partial<TransactionFormFieldPreferences>) => {
      setTransactionFormFieldPreferences(partial);
      refresh();
    },
    [refresh],
  );

  const setNavVisible = useCallback(
    (navKey: NavVisibilityKey, visible: boolean) => {
      setNavItemVisible(navKey, visible);
      refresh();
    },
    [refresh],
  );

  const setHomeMode = useCallback(
    (mode: HomeExperienceMode) => {
      setHomeExperienceMode(mode);
      refresh();
    },
    [refresh],
  );

  const updateDashboardLayout = useCallback(
    (next: DashboardLayoutPreferences) => {
      setDashboardLayoutPreferences(next);
      refresh();
    },
    [refresh],
  );

  const toggleDashboardWidget = useCallback(
    (widgetId: DashboardWidgetId, visible: boolean) => {
      const current = getDashboardLayoutPreferences();
      const hiddenSet = new Set(current.hidden);
      if (visible) {
        hiddenSet.delete(widgetId);
      } else {
        // Keep at least one main widget visible
        const visibleCount =
          current.order.length - (hiddenSet.has(widgetId) ? hiddenSet.size : hiddenSet.size + 1);
        if (visibleCount <= 0) {
          return;
        }
        hiddenSet.add(widgetId);
      }
      setDashboardLayoutPreferences({
        ...current,
        hidden: Array.from(hiddenSet),
      });
      refresh();
    },
    [refresh],
  );

  const moveDashboardWidget = useCallback(
    (widgetId: DashboardWidgetId, direction: "up" | "down") => {
      const current = getDashboardLayoutPreferences();
      const index = current.order.indexOf(widgetId);
      if (index === -1) return;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.order.length) return;
      const nextOrder = [...current.order];
      const [item] = nextOrder.splice(index, 1);
      nextOrder.splice(targetIndex, 0, item);
      setDashboardLayoutPreferences({
        ...current,
        order: nextOrder,
      });
      refresh();
    },
    [refresh],
  );

  const reorderDashboardWidgets = useCallback(
    (orderedIds: DashboardWidgetId[]) => {
      const current = getDashboardLayoutPreferences();
      setDashboardLayoutPreferences({
        ...current,
        order: orderedIds,
      });
      refresh();
    },
    [refresh],
  );

  const setShowGreetingQuote = useCallback(
    (showGreetingQuote: boolean) => {
      const current = getDashboardLayoutPreferences();
      setDashboardLayoutPreferences({
        ...current,
        showGreetingQuote,
      });
      refresh();
    },
    [refresh],
  );

  const selectDashboardPreset = useCallback(
    (presetId: DashboardLayoutPresetId) => {
      applyDashboardLayoutPreset(presetId);
      refresh();
    },
    [refresh],
  );

  const resetDashboardLayout = useCallback(() => {
    setDashboardLayoutPreferences(DEFAULT_DASHBOARD_LAYOUT);
    refresh();
  }, [refresh]);

  const dismissPrompt = useCallback(
    (promptKey: Parameters<typeof setPromptDismissed>[0]) => {
      setPromptDismissed(promptKey, true);
      refresh();
    },
    [refresh],
  );

  const isFormFieldEnabled = useCallback(
    (field: FormFieldPreferenceKey) => isTransactionFormFieldEnabled(field),
    [],
  );

  const isPromptDismissedState = useCallback(
    (promptKey: Parameters<typeof isPromptDismissed>[0]) =>
      isPromptDismissed(promptKey),
    [revision],
  );

  return {
    isDevModeAllowed: isDevModeAllowed(),
    developerMode,
    guideHelperEnabled,
    setGuideHelper,
    generalSearchEnabled,
    setGeneralSearch,
    developerUnlockNotice,
    dismissDeveloperUnlockNotice,
    registerSettingsTitleTap,
    setDeveloperMode,
    homeMode,
    setHomeMode,
    dashboardLayout,
    updateDashboardLayout,
    toggleDashboardWidget,
    moveDashboardWidget,
    reorderDashboardWidgets,
    setShowGreetingQuote,
    selectDashboardPreset,
    resetDashboardLayout,
    formFields,
    setFormField,
    setFormFields,
    isFormFieldEnabled,
    navVisibility,
    setNavVisible,
    hiddenNavHrefs,
    dismissPrompt,
    isPromptDismissed: isPromptDismissedState,
    applyGuidedDefaults: applyGuidedWorkspaceSimpleDefaults,
    refresh,
  };
}
