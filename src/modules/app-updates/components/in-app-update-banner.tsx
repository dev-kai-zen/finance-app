import { Pressable, StyleSheet, Text, View } from "react-native";
import { Download, RefreshCw, X } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

export interface InAppUpdateBannerProps {
  visible: boolean;
  onRestart: () => void;
  onDismiss: () => void;
}

export function InAppUpdateBanner({
  visible,
  onRestart,
  onDismiss,
}: InAppUpdateBannerProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  if (!visible) return null;

  return (
    <View accessibilityRole="alert" style={styles.container}>
      <View style={styles.contentRow}>
        <View style={styles.iconContainer}>
          <Download color={theme.colors.primary} size={20} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{t("appUpdates.updateDownloadedTitle")}</Text>
          <Text numberOfLines={2} style={styles.description}>
            {t("appUpdates.updateDownloadedDescription")}
          </Text>
        </View>

        <Pressable
          accessibilityLabel={t("appUpdates.later")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onDismiss}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <X color={theme.colors.textSecondary} size={18} />
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onDismiss}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>{t("appUpdates.later")}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onRestart}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <RefreshCw color={theme.colors.onPrimary} size={14} />
          <Text style={styles.primaryButtonText}>{t("appUpdates.restartToApply")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderColor: `${theme.colors.primary}40`,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      elevation: 4,
      gap: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
      padding: theme.spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
    },
    contentRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    iconContainer: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    textContainer: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    closeButton: {
      alignItems: "center",
      justifyContent: "center",
      padding: 4,
    },
    actionsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "flex-end",
      marginTop: 2,
    },
    secondaryButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    secondaryButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.xs,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
