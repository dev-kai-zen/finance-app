import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { WIDGET_CATALOG } from "../constants/widget-catalog.constants";
import {
  getPinnedWidgetNames,
  isWidgetPinningSupported,
  pinWidget,
} from "../services/widget-pin.service";

const CATALOG_WIDGET_NAMES = WIDGET_CATALOG.map((item) => item.widgetName);

export function useWidgetGallery() {
  const [pinnedWidgetNames, setPinnedWidgetNames] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingWidgetName, setPendingWidgetName] = useState<string | null>(null);

  const refreshPinned = useCallback(async () => {
    const pinned = await getPinnedWidgetNames(CATALOG_WIDGET_NAMES);
    setPinnedWidgetNames(pinned);
  }, []);

  useEffect(() => {
    void refreshPinned();
    // The launcher prompt runs outside the app; re-check when the user returns.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshPinned();
      }
    });
    return () => subscription.remove();
  }, [refreshPinned]);

  /**
   * Requests the launcher pin prompt. Resolves `false` when the launcher
   * does not support pinning so the screen can show manual steps.
   */
  const addWidget = useCallback(
    async (widgetName: string): Promise<boolean> => {
      setPendingWidgetName(widgetName);
      try {
        return await pinWidget(widgetName);
      } finally {
        setPendingWidgetName(null);
      }
    },
    [],
  );

  return {
    catalog: WIDGET_CATALOG,
    isSupported: isWidgetPinningSupported(),
    pinnedWidgetNames,
    pendingWidgetName,
    addWidget,
    refreshPinned,
  };
}
