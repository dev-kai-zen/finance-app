import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertTriangle,
  CloudDownload,
  Smartphone,
  UploadCloud,
  X,
} from "lucide-react-native";

import { AppButton } from "@/components";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import {
  useQuickSyncStatus,
  type QuickSyncRemoteConflict,
} from "@/infrastructure/sync";
import { appLockLifecycle } from "@/modules/security";

import {
  dismissQuickSyncConflictPrompt,
  resolveQuickSyncConflictByOverwrite,
  resolveQuickSyncConflictByRestore,
} from "../services/quick-sync.service";

type ConflictAction = "idle" | "restoring" | "overwriting";

export function QuickSyncConflictModal() {
  const quickSync = useQuickSyncStatus();
  const [isAppLocked, setIsAppLocked] = useState(() =>
    appLockLifecycle.getIsLocked(),
  );

  useEffect(() => {
    return appLockLifecycle.subscribe(setIsAppLocked);
  }, []);

  if (
    isAppLocked ||
    !quickSync.conflictPromptVisible ||
    !quickSync.remoteConflict
  ) {
    return null;
  }

  return <QuickSyncConflictModalContent conflict={quickSync.remoteConflict} />;
}

function QuickSyncConflictModalContent({
  conflict,
}: {
  conflict: QuickSyncRemoteConflict;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const [action, setAction] = useState<ConflictAction>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPending = action !== "idle";

  const handleDismiss = () => {
    if (isPending) return;
    setErrorMessage(null);
    dismissQuickSyncConflictPrompt();
  };

  const handleRestore = async () => {
    if (isPending) return;
    setAction("restoring");
    setErrorMessage(null);
    try {
      await resolveQuickSyncConflictByRestore();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("quickSync.restoreFailed"),
      );
    } finally {
      setAction("idle");
    }
  };

  const handleOverwrite = async () => {
    if (isPending) return;
    setAction("overwriting");
    setErrorMessage(null);
    try {
      await resolveQuickSyncConflictByOverwrite();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t("quickSync.conflictOverwriteFailed"),
      );
    } finally {
      setAction("idle");
    }
  };

  const remoteDeviceLabel =
    conflict.remoteDeviceName?.trim() || t("quickSync.conflictUnknownDevice");
  const formattedRemoteTime = formatDateTime(conflict.remoteModifiedTime);
  const formattedLocalTime = conflict.localLastSyncedAt
    ? formatDateTime(conflict.localLastSyncedAt)
    : t("quickSync.neverSynced");

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleDismiss}
      transparent
      visible
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={t("quickSync.conflictDecideLater")}
          accessibilityRole="button"
          disabled={isPending}
          onPress={handleDismiss}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheet,
            isDesktop && styles.sheetDesktop,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <AlertTriangle color={theme.colors.warning} size={22} />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.title}>{t("quickSync.conflictTitle")}</Text>
              <Text style={styles.subtitle}>
                {t("quickSync.conflictSubtitle")}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("quickSync.conflictDecideLater")}
              accessibilityRole="button"
              disabled={isPending}
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
                isPending && styles.disabled,
              ]}
            >
              <X color={theme.colors.textSecondary} size={18} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Drive vs Local Metadata Summary */}
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <View style={styles.metaLabelRow}>
                  <Smartphone color={theme.colors.textSecondary} size={14} />
                  <Text style={styles.metaLabel}>
                    {t("quickSync.conflictUpdatedByLabel")}
                  </Text>
                </View>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {remoteDeviceLabel}
                </Text>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>
                  {t("quickSync.conflictDriveUpdatedLabel")}
                </Text>
                <Text style={styles.metaValue}>{formattedRemoteTime}</Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>
                  {t("quickSync.conflictLocalSyncedLabel")}
                </Text>
                <Text style={styles.metaValueMuted}>{formattedLocalTime}</Text>
              </View>

              <View
                style={[
                  styles.localStatePill,
                  conflict.hasUnsyncedLocalChanges
                    ? styles.localStatePillWarning
                    : styles.localStatePillNeutral,
                ]}
              >
                <Text
                  style={[
                    styles.localStatePillText,
                    conflict.hasUnsyncedLocalChanges
                      ? styles.localStatePillTextWarning
                      : styles.localStatePillTextNeutral,
                  ]}
                >
                  {conflict.hasUnsyncedLocalChanges
                    ? t("quickSync.conflictHasLocalChanges")
                    : t("quickSync.conflictNoLocalChanges")}
                </Text>
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Option 1: Restore Quick Sync Data */}
            <View style={styles.optionCard}>
              <AppButton
                disabled={isPending}
                label={
                  action === "restoring"
                    ? t("quickSync.restoring")
                    : t("quickSync.conflictRestoreAction")
                }
                leading={
                  <CloudDownload color={theme.colors.onPrimary} size={17} />
                }
                loading={action === "restoring"}
                onPress={() => void handleRestore()}
                variant="primary"
              />
              <Text style={styles.optionWarning}>
                {t("quickSync.conflictRestoreWarning")}
              </Text>
            </View>

            {/* Option 2: Overwrite Drive Data */}
            <View style={styles.optionCard}>
              <AppButton
                disabled={isPending}
                label={
                  action === "overwriting"
                    ? t("quickSync.conflictOverwriting")
                    : t("quickSync.conflictOverwriteAction")
                }
                leading={
                  <UploadCloud color={theme.colors.onDanger} size={17} />
                }
                loading={action === "overwriting"}
                onPress={() => void handleOverwrite()}
                variant="destructive"
              />
              <Text style={styles.optionWarning}>
                {t("quickSync.conflictOverwriteWarning")}
              </Text>
            </View>

            <AppButton
              disabled={isPending}
              label={t("quickSync.conflictDecideLater")}
              onPress={handleDismiss}
              size="small"
              variant="ghost"
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      backgroundColor: theme.colors.overlay,
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      maxHeight: "90%",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      width: "100%",
      ...theme.shadows.modal,
    },
    sheetDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 480,
    },
    headerRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: `${theme.colors.warning}1A`,
      borderColor: `${theme.colors.warning}44`,
      borderRadius: 22,
      borderWidth: 1,
      flexShrink: 0,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    headerTextGroup: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      flexShrink: 0,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    bodyContent: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
    },
    metaCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
    },
    metaRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    metaLabelRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    metaLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    metaValue: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "right",
    },
    metaValueMuted: {
      color: theme.colors.textMuted,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.xs,
      textAlign: "right",
    },
    metaDivider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginVertical: 2,
    },
    localStatePill: {
      alignSelf: "flex-start",
      borderRadius: 999,
      marginTop: theme.spacing.xs,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    localStatePillWarning: {
      backgroundColor: `${theme.colors.warning}1E`,
    },
    localStatePillNeutral: {
      backgroundColor: theme.colors.surfaceElevated,
    },
    localStatePillText: {
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    localStatePillTextWarning: {
      color: theme.colors.warning,
    },
    localStatePillTextNeutral: {
      color: theme.colors.textSecondary,
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}14`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.sm,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    optionCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: theme.spacing.xs,
      padding: theme.spacing.sm,
    },
    optionWarning: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      paddingHorizontal: 2,
    },
    pressed: {
      opacity: 0.7,
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
