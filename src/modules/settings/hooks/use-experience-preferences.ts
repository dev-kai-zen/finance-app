import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

import {
  applyGuidedWorkspaceSimpleDefaults,
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
  setDeveloperModeEnabled,
  setGuideHelperEnabled,
  setGeneralSearchEnabled,
  setHomeExperienceMode,
  setNavItemVisible,
  setPromptDismissed,
  setTransactionFormFieldEnabled,
  setTransactionFormFieldPreferences,
  subscribeToExperiencePreferences,
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
