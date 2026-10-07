import { StyleSheet, Text, View } from "react-native";
import { Cloud } from "lucide-react-native";

import { PageContainer } from "@/components/page-container";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { GoogleDriveBackupPanel } from "@/modules/google-drive-backup/components/google-drive-backup-panel";

export function GoogleDriveBackupScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <PageContainer contentContainerStyle={styles.page} maxWidth={760}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Cloud color={theme.colors.primary} size={26} />
        </View>
        <View style={styles.summaryCopy}>
          <Text accessibilityRole="header" style={styles.summaryTitle}>
            Google Drive backup
          </Text>
          <Text selectable style={styles.summaryDescription}>
            Keep an exported copy of your financial database in your Google Drive
            account and restore it on another device.
          </Text>
        </View>
      </View>

      <GoogleDriveBackupPanel />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    page: {
      gap: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    },
    summaryCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    summaryIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: theme.borderRadius.round,
      height: 48,
      justifyContent: "center",
      width: 48,
    },
    summaryCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    summaryTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    summaryDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
  });
}
