import { useCallback, useEffect, useRef, useState } from "react";

import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
import {
  applyDashboardLayoutPreset,
  applyGuidedWorkspaceSimpleDefaults,
  DEFAULT_DASHBOARD_LAYOUT,
  getDeveloperModeEnabled,
  getExperiencePreferencesSnapshot,
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
  type ExperiencePreferencesSnapshot,
  type FormFieldPreferenceKey,
  type HomeExperienceMode,
  type TransactionFormFieldPreferences,
} from "../services/experience-preferences.service";
import type { NavVisibilityKey } from "../constants/settings.constants";

const DEVELOPER_TAP_TARGET = 10;
const DEVELOPER_TAP_RESET_MS = 2000;

function patchSnapshot(
  prev: ExperiencePreferencesSnapshot,
  patch: Partial<ExperiencePreferencesSnapshot>,
): ExperiencePreferencesSnapshot {
  return { ...prev, ...patch };
}

export function useExperiencePreferences() {
  const [snapshot, setSnapshot] = useState<ExperiencePreferencesSnapshot>(() =>
    getExperiencePreferencesSnapshot(),
  );
  const [developerUnlockNotice, setDeveloperUnlockNotice] = useState(false);
  const [revision, setRevision] = useState(0);

  const tapCountRef = useRef(0);
  const lastTapAtRef = useRef(0);

  const refresh = useCallback(() => {
    const next = getExperiencePreferencesSnapshot();
    setSnapshot((prev) => (prev === next ? prev : next));
    setRevision((prev) => prev + 1);
  }, []);

  useEffect(() => {
    return subscribeToExperiencePreferences(refresh);
  }, [refresh]);

  const setDeveloperMode = useCallback(
    (enabled: boolean) => {
      setSnapshot((prev) => patchSnapshot(prev, { developerMode: enabled }));
      scheduleAfterPaint(() => {
        setDeveloperModeEnabled(enabled);
        refresh();
      });
    },
    [refresh],
  );

  const setGuideHelper = useCallback(
    (enabled: boolean) => {
      setSnapshot((prev) => patchSnapshot(prev, { guideHelperEnabled: enabled }));
      scheduleAfterPaint(() => {
        setGuideHelperEnabled(enabled);
        refresh();
      });
    },
    [refresh],
  );

  const setGeneralSearch = useCallback(
    (enabled: boolean) => {
      setSnapshot((prev) => patchSnapshot(prev, { generalSearchEnabled: enabled }));
      scheduleAfterPaint(() => {
        setGeneralSearchEnabled(enabled);
        refresh();
      });
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
        scheduleAfterPaint(() => {
          setDeveloperModeEnabled(true);
          setDeveloperUnlockNotice(true);
          refresh();
        });
      }
    }
  }, [refresh]);

  const dismissDeveloperUnlockNotice = useCallback(() => {
    setDeveloperUnlockNotice(false);
  }, []);

  const setFormField = useCallback(
    (field: FormFieldPreferenceKey, enabled: boolean) => {
      scheduleAfterPaint(() => {
        setTransactionFormFieldEnabled(field, enabled);
        refresh();
      });
    },
    [refresh],
  );

  const setFormFields = useCallback(
    (partial: Partial<TransactionFormFieldPreferences>) => {
      scheduleAfterPaint(() => {
        setTransactionFormFieldPreferences(partial);
        refresh();
      });
    },
    [refresh],
  );

  const setNavVisible = useCallback(
    (navKey: NavVisibilityKey, visible: boolean) => {
      scheduleAfterPaint(() => {
        setNavItemVisible(navKey, visible);
        refresh();
      });
    },
    [refresh],
  );

  const setHomeMode = useCallback(
    (mode: HomeExperienceMode) => {
      setSnapshot((prev) => patchSnapshot(prev, { homeMode: mode }));
      scheduleAfterPaint(() => {
        setHomeExperienceMode(mode);
        refresh();
      });
    },
    [refresh],
  );

  const updateDashboardLayout = useCallback(
    (next: DashboardLayoutPreferences) => {
      setSnapshot((prev) => patchSnapshot(prev, { dashboardLayout: next }));
      scheduleAfterPaint(() => {
        setDashboardLayoutPreferences(next);
        refresh();
      });
    },
    [refresh],
  );

  const toggleDashboardWidget = useCallback(
    (widgetId: DashboardWidgetId, visible: boolean) => {
      if (widgetId === "greeting") {
        return;
      }
      setSnapshot((prev) => {
        const current = prev.dashboardLayout;
        const hiddenSet = new Set(current.hidden.filter((id) => id !== "greeting"));
        if (visible) {
          hiddenSet.delete(widgetId);
        } else {
          hiddenSet.add(widgetId);
        }
        const nextLayout: DashboardLayoutPreferences = {
          ...current,
          hidden: Array.from(hiddenSet),
        };
        scheduleAfterPaint(() => {
          setDashboardLayoutPreferences(nextLayout);
          refresh();
        });
        return patchSnapshot(prev, { dashboardLayout: nextLayout });
      });
    },
    [refresh],
  );

  const moveDashboardWidget = useCallback(
    (widgetId: DashboardWidgetId, direction: "up" | "down") => {
      setSnapshot((prev) => {
        const current = prev.dashboardLayout;
        const index = current.order.indexOf(widgetId);
        if (index === -1) return prev;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= current.order.length) return prev;
        const nextOrder = [...current.order];
        const [item] = nextOrder.splice(index, 1);
        nextOrder.splice(targetIndex, 0, item);
        const nextLayout: DashboardLayoutPreferences = {
          ...current,
          order: nextOrder,
        };
        scheduleAfterPaint(() => {
          setDashboardLayoutPreferences(nextLayout);
          refresh();
        });
        return patchSnapshot(prev, { dashboardLayout: nextLayout });
      });
    },
    [refresh],
  );

  const reorderDashboardWidgets = useCallback(
    (orderedIds: DashboardWidgetId[]) => {
      setSnapshot((prev) => {
        const current = prev.dashboardLayout;
        const nextLayout: DashboardLayoutPreferences = {
          ...current,
          order: orderedIds,
        };
        scheduleAfterPaint(() => {
          setDashboardLayoutPreferences(nextLayout);
          refresh();
        });
        return patchSnapshot(prev, { dashboardLayout: nextLayout });
      });
    },
    [refresh],
  );

  const setShowGreetingQuote = useCallback(
    (showGreetingQuote: boolean) => {
      setSnapshot((prev) => {
        const nextLayout: DashboardLayoutPreferences = {
          ...prev.dashboardLayout,
          showGreetingQuote,
        };
        scheduleAfterPaint(() => {
          setDashboardLayoutPreferences(nextLayout);
          refresh();
        });
        return patchSnapshot(prev, { dashboardLayout: nextLayout });
      });
    },
    [refresh],
  );

  const setQuoteColors = useCallback(
    (quoteBackgroundColor: string | null, quoteTextColor: string | null) => {
      setSnapshot((prev) => {
        const nextLayout: DashboardLayoutPreferences = {
          ...prev.dashboardLayout,
          quoteBackgroundColor,
          quoteTextColor,
        };
        scheduleAfterPaint(() => {
          setDashboardLayoutPreferences(nextLayout);
          refresh();
        });
        return patchSnapshot(prev, { dashboardLayout: nextLayout });
      });
    },
    [refresh],
  );

  const selectDashboardPreset = useCallback(
    (presetId: DashboardLayoutPresetId) => {
      scheduleAfterPaint(() => {
        applyDashboardLayoutPreset(presetId);
        refresh();
      });
    },
    [refresh],
  );

  const resetDashboardLayout = useCallback(() => {
    setSnapshot((prev) =>
      patchSnapshot(prev, { dashboardLayout: DEFAULT_DASHBOARD_LAYOUT }),
    );
    scheduleAfterPaint(() => {
      setDashboardLayoutPreferences(DEFAULT_DASHBOARD_LAYOUT);
      refresh();
    });
  }, [refresh]);

  const dismissPrompt = useCallback(
    (promptKey: Parameters<typeof setPromptDismissed>[0]) => {
      scheduleAfterPaint(() => {
        setPromptDismissed(promptKey, true);
        refresh();
      });
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
    developerMode: snapshot.developerMode,
    guideHelperEnabled: snapshot.guideHelperEnabled,
    setGuideHelper,
    generalSearchEnabled: snapshot.generalSearchEnabled,
    setGeneralSearch,
    developerUnlockNotice,
    dismissDeveloperUnlockNotice,
    registerSettingsTitleTap,
    setDeveloperMode,
    homeMode: snapshot.homeMode,
    setHomeMode,
    dashboardLayout: snapshot.dashboardLayout,
    updateDashboardLayout,
    toggleDashboardWidget,
    moveDashboardWidget,
    reorderDashboardWidgets,
    setShowGreetingQuote,
    setQuoteColors,
    selectDashboardPreset,
    resetDashboardLayout,
    formFields: snapshot.formFields,
    setFormField,
    setFormFields,
    isFormFieldEnabled,
    navVisibility: snapshot.navVisibility,
    setNavVisible,
    hiddenNavHrefs: snapshot.hiddenNavHrefs,
    dismissPrompt,
    isPromptDismissed: isPromptDismissedState,
    applyGuidedDefaults: applyGuidedWorkspaceSimpleDefaults,
    refresh,
  };
}
