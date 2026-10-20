import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Crown, Sparkles, ShieldCheck, ChevronRight } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

import { useProStatus } from "../hooks/use-pro-status";
import { ProPaywallModal } from "../screens/pro-paywall-modal";

export function ProSidebarCard() {
  const styles = useThemeStyles(createStyles);
  const theme = useAppTheme();
  const { t } = useLocalization();
  const { isPro } = useProStatus();
  const [paywallOpen, setPaywallOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setPaywallOpen(true)}
        style={({ pressed }) => [
          styles.container,
          isPro ? styles.containerPro : styles.containerFree,
          pressed && styles.containerPressed,
        ]}
      >
        <View style={styles.leftContent}>
          <View
            style={[
              styles.iconWrapper,
              isPro ? styles.iconWrapperPro : styles.iconWrapperFree,
            ]}
          >
            {isPro ? (
              <Crown color={theme.colors.success} size={16} />
            ) : (
              <Sparkles color="#D97706" size={16} />
            )}
          </View>
          <View style={styles.textContainer}>
            <Text numberOfLines={1} style={styles.title}>
              {isPro ? t("pro.proActive") : t("pro.sidebarTitle")}
            </Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {isPro
                ? t("pro.allFeaturesUnlocked")
                : t("pro.sidebarSubtitle")}
            </Text>
          </View>
        </View>

        {!isPro ? (
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>{t("pro.unlockPro")}</Text>
          </View>
        ) : (
          <ShieldCheck color={theme.colors.success} size={16} />
        )}
      </Pressable>

      <ProPaywallModal
        onClose={() => setPaywallOpen(false)}
        visible={paywallOpen}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      marginHorizontal: 2,
      marginVertical: theme.spacing.xs,
    },
    containerFree: {
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: "rgba(217, 119, 6, 0.3)",
    },
    containerPro: {
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: "rgba(16, 185, 129, 0.25)",
    },
    containerPressed: {
      opacity: 0.85,
    },
    leftContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
      minWidth: 0,
      marginRight: theme.spacing.xs,
    },
    iconWrapper: {
      width: 28,
      height: 28,
      borderRadius: theme.borderRadius.round,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    iconWrapperFree: {
      backgroundColor: "rgba(217, 119, 6, 0.15)",
    },
    iconWrapperPro: {
      backgroundColor: "rgba(16, 185, 129, 0.15)",
    },
    textContainer: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs + 1,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.medium,
      marginTop: 1,
    },
    badgePill: {
      backgroundColor: theme.colors.warning,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: 8,
      paddingVertical: 3,
      flexShrink: 0,
    },
    badgePillText: {
      color: "#000000",
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
  });
}
