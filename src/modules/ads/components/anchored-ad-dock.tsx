import { useCallback, useEffect, useState } from "react";
import { Keyboard, Platform, StyleSheet, Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useProStatus } from "@/modules/pro";
import type { AdBannerPlacement } from "../types/ads.types";
import { AdBanner } from "./ad-banner";

export interface AnchoredAdDockProps {
  placement: AdBannerPlacement;
  onVisibilityChange?: (visible: boolean) => void;
}

/**
 * Fixed bottom anchored banner dock placed outside scrollable content / PageContainer.
 * Complies with Google AdMob's Anchored Adaptive Banner policy:
 * - Anchored to the bottom edge (zero layout shift on scrolling content above)
 * - Separated by a top hairline border and "SPONSORED" micro-label
 * - Reserves the last loaded banner height across focus transitions
 * - Collapses for Pro users, Web, failed loads, or an open software keyboard
 */
export function AnchoredAdDock({
  placement,
  onVisibilityChange,
}: AnchoredAdDockProps) {
  const { isPro } = useProStatus();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);
  const [isLoaded, setIsLoaded] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(() => Keyboard.isVisible());

  const isDisabled = isPro || Platform.OS === "web";
  const isVisible = !isDisabled && !isKeyboardVisible && isLoaded;

  useFocusEffect(
    useCallback(() => {
      if (isDisabled) return;

      // Reconcile when returning from another screen that opened/closed the keyboard.
      setIsKeyboardVisible(Keyboard.isVisible());
      const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
        setIsKeyboardVisible(true);
      });
      const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
        setIsKeyboardVisible(false);
      });

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }, [isDisabled]),
  );

  useEffect(() => {
    if (isDisabled) {
      setIsLoaded(false);
      setBannerHeight(0);
    }
  }, [isDisabled]);

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  const handleAdLoaded = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleAdFailedToLoad = useCallback(() => {
    setIsLoaded(false);
  }, []);

  const handleBannerLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    // AdBanner unmounts its native view on blur; retain its last nonzero height.
    if (height > 0) setBannerHeight(height);
  }, []);

  if (isDisabled) {
    return null;
  }

  return (
    <View
      style={[
        styles.dockBase,
        isKeyboardVisible && styles.dockHidden,
        isVisible && [
          styles.dockVisible,
          { paddingBottom: Math.max(insets.bottom, 6) },
        ],
      ]}
    >
      {isVisible ? (
        <View style={styles.labelRow}>
          <Text style={styles.sponsoredBadge}>SPONSORED</Text>
        </View>
      ) : null}
      <View style={isVisible ? { minHeight: bannerHeight } : undefined}>
        <View onLayout={handleBannerLayout}>
          {!isKeyboardVisible ? (
            <AdBanner
              onAdFailedToLoad={handleAdFailedToLoad}
              onAdLoaded={handleAdLoaded}
              placement={placement}
              style={styles.bannerReset}
              variant="plain"
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    dockBase: {
      width: "100%",
    },
    dockHidden: {
      display: "none",
    },
    dockVisible: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: 4,
    },
    labelRow: {
      alignItems: "flex-end",
      marginBottom: 2,
      paddingHorizontal: theme.spacing.sm,
    },
    sponsoredBadge: {
      color: theme.colors.textMuted,
      fontSize: 9,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    bannerReset: {
      marginVertical: 0,
    },
  });
}
