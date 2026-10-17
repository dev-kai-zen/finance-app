import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CheckCircle2,
  RefreshCw,
  Smartphone,
  Wifi,
  Zap,
} from "lucide-react-native";

import { AppButton } from "@/components";
import { ThemedSwitch } from "@/components/themed-switch";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { QuickSyncNetworkPreference } from "@/infrastructure/sync";
import { useQuickSync } from "../hooks/use-quick-sync";

export function QuickSyncCard() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const quickSync = useQuickSync();
  const [syncingManual, setSyncingManual] = useState(false);

  const isSyncing = quickSync.status === "syncing" || syncingManual;

  const handleToggle = (value: boolean) => {
    void quickSync.setEnabled(value);
  };

  const handleNetworkSelect = (pref: QuickSyncNetworkPreference) => {
    if (pref === quickSync.networkPreference) return;
    quickSync.setNetworkPreference(pref);
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    setSyncingManual(true);
    try {
      await quickSync.triggerSync();
    } finally {
      setSyncingManual(false);
    }
  };

  const formattedLastSynced = quickSync.lastSyncedAt
    ? formatDateTime(new Date(quickSync.lastSyncedAt))
    : t("quickSync.neverSynced");

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Zap color={theme.colors.primary} size={20} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t("quickSync.title")}</Text>
          <Text style={styles.description}>{t("quickSync.description")}</Text>
        </View>
        <ThemedSwitch
          accessibilityLabel={t("quickSync.title")}
          onValueChange={handleToggle}
          value={quickSync.enabled}
        />
      </View>

      {quickSync.enabled ? (
        <>
          <View style={styles.divider} />

          {/* Network Preference Selection */}
          <View style={styles.networkSection}>
            <Text style={styles.sectionLabel}>{t("quickSync.networkLabel")}</Text>
            <View style={styles.networkOptions}>
              <Pressable
                accessibilityLabel={t("quickSync.wifiOnly")}
                accessibilityRole="button"
                accessibilityState={{
                  selected: quickSync.networkPreference === "wifi_only",
                }}
                onPress={() => handleNetworkSelect("wifi_only")}
                style={({ pressed }) => [
                  styles.optionButton,
                  quickSync.networkPreference === "wifi_only" &&
                    styles.optionButtonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Wifi
                  color={
                    quickSync.networkPreference === "wifi_only"
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                  size={16}
                />
                <Text
                  style={[
                    styles.optionText,
                    quickSync.networkPreference === "wifi_only" &&
                      styles.optionTextSelected,
                  ]}
                >
                  {t("quickSync.wifiOnly")}
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel={t("quickSync.anyNetwork")}
                accessibilityRole="button"
                accessibilityState={{
                  selected: quickSync.networkPreference === "any",
                }}
                onPress={() => handleNetworkSelect("any")}
                style={({ pressed }) => [
                  styles.optionButton,
                  quickSync.networkPreference === "any" &&
                    styles.optionButtonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Smartphone
                  color={
                    quickSync.networkPreference === "any"
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                  }
                  size={16}
                />
                <Text
                  style={[
                    styles.optionText,
                    quickSync.networkPreference === "any" &&
                      styles.optionTextSelected,
                  ]}
                >
                  {t("quickSync.anyNetwork")}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Status & Last Synced Timestamp */}
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <View style={styles.statusBadgeRow}>
                {isSyncing ? (
                  <ActivityIndicator
                    color={theme.colors.primary}
                    size="small"
                  />
                ) : (
                  <CheckCircle2 color={theme.colors.success} size={16} />
                )}
                <Text style={styles.statusLabel}>
                  {isSyncing
                    ? t("sync.syncing")
                    : quickSync.status === "waiting_network"
                      ? t("sync.waitingNetwork")
                      : quickSync.status === "error"
                        ? t("sync.failed")
                        : t("sync.synced")}
                </Text>
              </View>
              <Text style={styles.lastSyncedText}>
                {t("quickSync.lastSynced", { time: formattedLastSynced })}
              </Text>
              {quickSync.lastError ? (
                <Text style={styles.errorText} numberOfLines={2}>
                  {quickSync.lastError}
                </Text>
              ) : null}
            </View>

            <AppButton
              disabled={isSyncing}
              label={isSyncing ? t("quickSync.syncingNow") : t("quickSync.syncNow")}
              leading={
                <RefreshCw
                  color={
                    isSyncing
                      ? theme.colors.textMuted
                      : theme.colors.primary
                  }
                  size={16}
                />
              }
              onPress={() => void handleManualSync()}
              size="small"
              variant="secondary"
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

function formatDateTime(value: Date): string {
  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.lg,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 999,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    headerCopy: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginVertical: theme.spacing.md,
    },
    networkSection: {
      gap: theme.spacing.sm,
    },
    sectionLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.2,
      textTransform: "uppercase",
    },
    networkOptions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    optionButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    optionButtonSelected: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.primary,
    },
    optionText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.medium,
    },
    optionTextSelected: {
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    statusRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    statusInfo: {
      flex: 1,
      gap: 3,
    },
    statusBadgeRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    statusLabel: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    lastSyncedText: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 11,
      marginTop: 2,
    },
    pressed: {
      opacity: 0.8,
    },
  });
}
