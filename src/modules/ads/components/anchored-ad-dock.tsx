import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
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
 * - Automatically collapses to 0px for Pro users, Web, offline/no-fill, or blurred screens
 */
export function AnchoredAdDock({
  placement,
  onVisibilityChange,
}: AnchoredAdDockProps) {
  const { isPro } = useProStatus();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);
  const [isLoaded, setIsLoaded] = useState(false);

  const isDisabled = isPro || Platform.OS === "web";
  const isVisible = !isDisabled && isLoaded;

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsLoaded(false);
      };
    }, []),
  );

  useEffect(() => {
    if (isDisabled) {
      setIsLoaded(false);
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

  if (isDisabled) {
    return null;
  }

  return (
    <View
      style={[
        styles.dockBase,
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
      <AdBanner
        onAdFailedToLoad={handleAdFailedToLoad}
        onAdLoaded={handleAdLoaded}
        placement={placement}
        style={styles.bannerReset}
        variant="plain"
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    dockBase: {
      width: "100%",
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
