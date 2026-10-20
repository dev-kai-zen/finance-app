import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useProStatus } from "@/modules/pro";
import { getBannerAdUnitId } from "../constants/ads.constants";
import type { AdBannerProps } from "../types/ads.types";

export function AdBanner({
  placement = "dashboard",
  variant = "card",
  style,
  onAdLoaded,
  onAdFailedToLoad,
}: AdBannerProps) {
  const { isPro } = useProStatus();
  const styles = useThemeStyles(createStyles);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Pro users get 100% ad-free experience (zero ad calls / zero tracking)
  if (isPro) {
    return null;
  }

  // 2. Mobile ads are not supported in web browser environment
  if (Platform.OS === "web") {
    return null;
  }

  // 3. If an ad failed to load (offline or no fill), collapse cleanly without showing an empty gap
  if (hasError) {
    return null;
  }

  const adUnitId = getBannerAdUnitId(placement);

  const bannerContent = (
    <View style={styles.adWrapper}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          setIsLoaded(true);
          setHasError(false);
          onAdLoaded?.();
        }}
        onAdFailedToLoad={(error) => {
          console.warn(`[AdMob] Banner (${placement}) failed to load:`, error.message);
          setHasError(true);
          onAdFailedToLoad?.(error);
        }}
      />
    </View>
  );

  if (variant === "plain") {
    return (
      <View style={[styles.plainContainer, style]}>
        {bannerContent}
      </View>
    );
  }

  // Option A: Native Card Style
  return (
    <View style={[styles.cardContainer, style]}>
      <View style={styles.cardHeader}>
        <Text style={styles.sponsoredBadge}>SPONSORED</Text>
      </View>
      {bannerContent}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    cardContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginVertical: theme.spacing.sm,
      overflow: "hidden",
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      paddingTop: theme.spacing.xs,
      width: "100%",
    },
    cardHeader: {
      alignItems: "flex-end",
      marginBottom: 2,
      paddingHorizontal: theme.spacing.xs,
    },
    sponsoredBadge: {
      color: theme.colors.textMuted,
      fontSize: 9,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    adWrapper: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    plainContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginVertical: theme.spacing.xs,
      width: "100%",
    },
  });
}
