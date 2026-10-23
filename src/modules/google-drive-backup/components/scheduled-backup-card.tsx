import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarClock, Crown } from "lucide-react-native";

import { BackupScheduleOptions } from "@/components";
import { ThemedSwitch } from "@/components/themed-switch";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { ProFeatureModal, useProStatus } from "@/modules/pro";
import type { GoogleDriveScheduledBackupConfig } from "../types/google-drive-backup.types";
import { useGoogleDriveScheduledBackup } from "../hooks/use-google-drive-scheduled-backup";

export function ScheduledBackupCard() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { isPro } = useProStatus();
  const scheduled = useGoogleDriveScheduledBackup();
  const [proModalVisible, setProModalVisible] = useState(false);
  const busy = scheduled.operation !== "idle";

  const applyConfig = (patch: Partial<GoogleDriveScheduledBackupConfig>) => {
    if (!isPro) {
      setProModalVisible(true);
      return;
    }
    void scheduled.updateConfig({
      ...scheduled.config,
      ...patch,
    });
  };

  const formattedLastRun = scheduled.lastRunAt
    ? formatDateTime(scheduled.lastRunAt)
    : t("scheduledBackup.neverRun");

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        disabled={isPro}
        onPress={() => {
          if (!isPro) setProModalVisible(true);
        }}
        style={styles.headerRow}
      >
        <View style={styles.iconCircle}>
          <CalendarClock color={theme.colors.primary} size={20} />
        </View>
        <View style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t("scheduledBackup.title")}</Text>
            {!isPro && (
              <View style={styles.proChip}>
                <Crown color="#D97706" size={8} />
                <Text style={styles.proChipText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.description}>{t("scheduledBackup.description")}</Text>
        </View>
        <ThemedSwitch
          accessibilityLabel={t("scheduledBackup.title")}
          onValueChange={(enabled) => {
            if (enabled && !isPro) {
              setProModalVisible(true);
              return;
            }
            applyConfig({ enabled });
          }}
          value={Boolean(isPro && scheduled.config.enabled)}
        />
      </Pressable>

      {isPro && scheduled.config.enabled ? (
        <>
          <BackupScheduleOptions
            disabled={busy}
            onChange={(schedule) => applyConfig(schedule)}
            schedule={scheduled.config}
          />
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t("scheduledBackup.lastRun", { time: formattedLastRun })}
            </Text>
          </View>
        </>
      ) : null}

      <ProFeatureModal
        featureDescription={t("scheduledBackup.proDescription")}
        featureTitle={t("scheduledBackup.proTitle")}
        onClose={() => setProModalVisible(false)}
        visible={proModalVisible}
      />
    </View>
  );
}

function formatDateTime(value: Date): string {
  return value.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}14`,
      borderRadius: theme.borderRadius.round,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    headerCopy: { flex: 1, gap: theme.spacing.xxs },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    description: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    proChip: {
      alignItems: "center",
      backgroundColor: "#FEF3C7",
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 2,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    proChipText: {
      color: "#D97706",
      fontSize: 9,
      fontWeight: theme.typography.fontWeight.bold,
    },
    footer: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    footerText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
  });
}
