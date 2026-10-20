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
  Crown,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Wifi,
  Zap,
} from "lucide-react-native";

import { AppButton, ConfirmModal } from "@/components";
import { ThemedSwitch } from "@/components/themed-switch";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { QuickSyncNetworkPreference } from "@/infrastructure/sync";
import { ProFeatureModal, useProStatus } from "@/modules/pro";
import { useQuickSync } from "../hooks/use-quick-sync";

export function QuickSyncCard() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { isPro } = useProStatus();
  const [proModalVisible, setProModalVisible] = useState(false);
  const quickSync = useQuickSync();
  const [syncingManual, setSyncingManual] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirmVisible, setRestoreConfirmVisible] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const isBusy = quickSync.status === "syncing" || syncingManual || restoring;
  const isSyncing = quickSync.status === "syncing" || syncingManual;

  const handleToggle = (value: boolean) => {
    if (value && !isPro) {
      setProModalVisible(true);
      return;
    }
    void quickSync.setEnabled(value);
  };

  const handleNetworkSelect = (pref: QuickSyncNetworkPreference) => {
    if (pref === quickSync.networkPreference) return;
    quickSync.setNetworkPreference(pref);
  };

  const handleManualSync = async () => {
    if (isBusy) return;
    setSyncingManual(true);
    setRestoreError(null);
    try {
      await quickSync.triggerSync();
    } finally {
      setSyncingManual(false);
    }
  };

  const handleRestore = async () => {
    if (isBusy) return;
    setRestoring(true);
    setRestoreError(null);
    try {
      await quickSync.restoreFromQuickSync();
      setRestoreConfirmVisible(false);
    } catch (error) {
      setRestoreError(
        error instanceof Error ? error.message : t("quickSync.restoreFailed"),
      );
    } finally {
      setRestoring(false);
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
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t("quickSync.title")}</Text>
            {!isPro && (
              <View style={styles.proChip}>
                <Crown color="#D97706" size={8} />
                <Text style={styles.proChipText}>PRO</Text>
              </View>
            )}
          </View>
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
              {restoreError ? (
                <Text style={styles.errorText} numberOfLines={2}>
                  {restoreError}
                </Text>
              ) : null}
            </View>

            <View style={styles.actionButtons}>
              <AppButton
                disabled={isBusy}
                label={
                  restoring ? t("quickSync.restoring") : t("quickSync.restore")
                }
                leading={
                  <RotateCcw
                    color={
                      isBusy ? theme.colors.textMuted : theme.colors.primary
                    }
                    size={16}
                  />
                }
                onPress={() => setRestoreConfirmVisible(true)}
                size="small"
                style={styles.actionButton}
                variant="secondary"
              />
              <AppButton
                disabled={isBusy}
                label={isSyncing ? t("quickSync.syncingNow") : t("quickSync.syncNow")}
                leading={
                  <RefreshCw
                    color={
                      isSyncing ? theme.colors.textMuted : theme.colors.primary
                    }
                    size={16}
                  />
                }
                onPress={() => void handleManualSync()}
                size="small"
                style={styles.actionButton}
                variant="secondary"
              />
            </View>
          </View>
        </>
      ) : null}

      <ConfirmModal
        confirmLabel={t("quickSync.restoreConfirmAction")}
        message={t("quickSync.restoreConfirmMessage")}
        onCancel={() => {
          if (!restoring) setRestoreConfirmVisible(false);
        }}
        onConfirm={() => void handleRestore()}
        pending={restoring}
        title={t("quickSync.restoreConfirmTitle")}
        variant="restore"
        visible={restoreConfirmVisible}
      />

      <ProFeatureModal
        featureDescription="Automatically keep your financial records, accounts, and transactions backed up to Google Drive in real time with Kaizen Pro."
        featureTitle="Automatic Cloud Quick Sync"
        onClose={() => setProModalVisible(false)}
        visible={proModalVisible}
      />
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
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    proChip: {
      alignItems: "center",
      backgroundColor: "rgba(217, 119, 6, 0.15)",
      borderColor: "rgba(217, 119, 6, 0.4)",
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    proChipText: {
      color: "#D97706",
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.3,
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
      alignItems: "flex-start",
      flexDirection: "column",
      gap: theme.spacing.md,
    },
    actionButtons: {
      alignSelf: "stretch",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
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
