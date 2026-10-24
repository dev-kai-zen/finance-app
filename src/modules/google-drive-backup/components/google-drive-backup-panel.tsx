import { useEffect, useMemo, useRef, useState } from "react";
import * as Linking from "expo-linking";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CheckCircle2,
  Cloud,
  CloudDownload,
  CloudUpload,
  Crown,
  FolderOpen,
  LogOut,
  ShieldAlert,
  Zap,
} from "lucide-react-native";
import { resolveGoogleDriveQuickSyncBackupFile } from "@/infrastructure/sync";
import { withGoogleDriveAccessToken } from "@/modules/google-drive-backup/services/google-drive-auth.service";

import {
  AppButton,
  ConfirmModal,
  NotificationModal,
  PageLoadingState,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { BackupPassphraseModal } from "@/modules/local-backup";
import { useGoogleDriveBackup } from "@/modules/google-drive-backup/hooks/use-google-drive-backup";
import type { BackupFile } from "@/modules/google-drive-backup/types/google-drive-backup.types";
import { RestoreBackupModal } from "@/modules/google-drive-backup/components/restore-backup-modal";
import { ProFeatureModal, useProStatus } from "@/modules/pro";
import { useQuickSync } from "../hooks/use-quick-sync";
import { QuickSyncCard } from "./quick-sync-card";
import { ScheduledBackupCard } from "./scheduled-backup-card";

export function GoogleDriveBackupPanel() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { isPro } = useProStatus();
  const [proModalVisible, setProModalVisible] = useState(false);
  const backup = useGoogleDriveBackup();
  const quickSync = useQuickSync();
  const [passphraseMode, setPassphraseMode] = useState<
    "create" | "restore" | null
  >(null);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [linkingError, setLinkingError] = useState<string | null>(null);
  const [quickSyncBackup, setQuickSyncBackup] = useState<BackupFile | null>(
    null,
  );
  const [quickSyncPromptVisible, setQuickSyncPromptVisible] = useState(false);
  const [confirmQuickSyncRestore, setConfirmQuickSyncRestore] = useState(false);
  const quickSyncPromptShownRef = useRef(false);
  const busy = backup.operation !== "idle";

  useEffect(() => {
    if (!backup.user) {
      setQuickSyncBackup(null);
      return;
    }

    let active = true;
    void withGoogleDriveAccessToken(async (accessToken) =>
      resolveGoogleDriveQuickSyncBackupFile(accessToken),
    )
      .then((file) => {
        if (!active) return;
        setQuickSyncBackup(file);
        if (!file || quickSyncPromptShownRef.current) return;

        const alreadyUsingRemoteQuickSync =
          quickSync.enabled &&
          quickSync.fileId === file.id &&
          Boolean(quickSync.lastSyncedAt);
        if (alreadyUsingRemoteQuickSync) return;

        quickSyncPromptShownRef.current = true;
        setQuickSyncPromptVisible(true);
      })
      .catch(() => {
        if (active) setQuickSyncBackup(null);
      });

    return () => {
      active = false;
    };
  }, [
    backup.user,
    quickSync.enabled,
    quickSync.fileId,
    quickSync.lastSyncedAt,
  ]);

  const operationLabel = useMemo(() => {
    switch (backup.operation) {
      case "connecting":
        return "Connecting to Google...";
      case "loading":
        return t("googleDriveBackup.loadingBackups");
      case "creating":
        return "Creating and uploading...";
      case "restoring":
        return "Verifying and restoring...";
      case "disconnecting":
        return "Disconnecting...";
      default:
        return null;
    }
  }, [backup.operation, t]);

  const beginRestore = (file: BackupFile) => {
    setRestoreModalVisible(false);
    setSelectedBackup(file);
    setConfirmRestore(true);
  };

  const openRestoreModal = () => {
    setRestoreModalVisible(true);
    void backup.refresh();
  };

  const confirmSelectedRestore = () => {
    setConfirmRestore(false);
    if (!selectedBackup) return;

    if (selectedBackup.passwordProtected) {
      setPassphraseMode("restore");
      return;
    }

    const fileId = selectedBackup.id;
    setSelectedBackup(null);
    void backup.restoreBackup(fileId, null);
  };

  const confirmGoogleDriveDisconnect = () => {
    setConfirmDisconnect(false);
    void backup.disconnect();
  };

  const openBackupFolder = async () => {
    if (!backup.folderUrl) return;

    try {
      await Linking.openURL(backup.folderUrl);
    } catch {
      setLinkingError(
        "Open Google Drive and look for Kaizen Finance / Backups.",
      );
    }
  };

  const showBootstrapLoading =
    backup.isBootstrapping && !backup.configurationError;

  return (
    <>
      {showBootstrapLoading ? (
        <View style={styles.container}>
          <View style={[styles.card, styles.loadingCard]}>
            <PageLoadingState message={t("googleDriveBackup.loading")} />
          </View>
        </View>
      ) : (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.iconCircle}>
              <Cloud color={theme.colors.primary} size={22} />
            </View>
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Google Drive</Text>
                {!isPro && (
                  <View style={styles.proChip}>
                    <Crown color="#D97706" size={8} />
                    <Text style={styles.proChipText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.description} selectable>
                {backup.configurationError
                  ? "Setup required"
                  : backup.user
                    ? backup.user.email ?? backup.user.name ?? "Connected"
                    : "Not connected"}
              </Text>
            </View>
            {backup.user ? (
              <CheckCircle2 color={theme.colors.success} size={20} />
            ) : null}
          </View>

          {backup.configurationError ? (
            <View style={styles.configurationMessage}>
              <ShieldAlert color={theme.colors.warning} size={18} />
              <Text style={styles.configurationText} selectable>
                {backup.configurationError}
              </Text>
            </View>
          ) : backup.user ? (
            <>
              {quickSyncBackup ? (
                <>
                  <View style={styles.divider} />
                  <Pressable
                    accessibilityLabel={t("googleDriveBackup.restoreQuickSyncAction")}
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => setConfirmQuickSyncRestore(true)}
                    style={({ pressed }) => [
                      styles.actionRow,
                      styles.quickSyncActionRow,
                      pressed && styles.pressed,
                      busy && styles.disabled,
                    ]}
                  >
                    <Zap color={theme.colors.primary} size={20} />
                    <View style={styles.copy}>
                      <Text style={styles.actionTitle}>
                        {t("googleDriveBackup.restoreQuickSyncTitle")}
                      </Text>
                      <Text style={styles.description}>
                        {t("googleDriveBackup.restoreQuickSyncDescription", {
                          date: formatBackupDate(quickSyncBackup.modifiedTime),
                        })}
                      </Text>
                    </View>
                  </Pressable>
                  <View style={styles.insetDivider} />
                </>
              ) : null}
              <View style={styles.divider} />
              <Pressable
                accessibilityLabel="Create backup"
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setPassphraseMode("create")}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && styles.pressed,
                  busy && styles.disabled,
                ]}
              >
                <CloudUpload color={theme.colors.primary} size={20} />
                <View style={styles.copy}>
                  <Text style={styles.actionTitle}>Back up now</Text>
                  <Text style={styles.description}>
                    Save with a password, or choose an unprotected backup
                  </Text>
                </View>
              </Pressable>

              <View style={styles.insetDivider} />
              <Pressable
                accessibilityLabel="Restore from backup"
                accessibilityRole="button"
                disabled={busy}
                onPress={openRestoreModal}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && styles.pressed,
                  busy && styles.disabled,
                ]}
              >
                <CloudDownload color={theme.colors.primary} size={20} />
                <View style={styles.copy}>
                  <Text style={styles.actionTitle}>Restore from backup</Text>
                  <Text style={styles.description}>
                    Choose a saved backup from Google Drive
                  </Text>
                </View>
              </Pressable>

              <View style={styles.insetDivider} />
              <Pressable
                accessibilityLabel="Open Kaizen Finance backups in Google Drive"
                accessibilityRole="button"
                disabled={busy || !backup.folderUrl}
                onPress={() => void openBackupFolder()}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && styles.pressed,
                  (busy || !backup.folderUrl) && styles.disabled,
                ]}
              >
                <FolderOpen color={theme.colors.primary} size={20} />
                <View style={styles.copy}>
                  <Text style={styles.actionTitle}>Open backups folder</Text>
                  <Text style={styles.description}>
                    View Kaizen Finance / Backups in Google Drive
                  </Text>
                </View>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.divider} />
              <Pressable
                accessibilityLabel="Connect to Google Drive"
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  if (!isPro) {
                    setProModalVisible(true);
                    return;
                  }
                  backup.connect();
                }}
                style={({ pressed }) => [
                  styles.connectButton,
                  pressed && styles.connectButtonPressed,
                  busy && styles.disabled,
                ]}
              >
                {backup.operation === "connecting" ? (
                  <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                ) : (
                  <Cloud color={theme.colors.onPrimary} size={18} />
                )}
                <Text style={styles.connectButtonText}>
                  Connect to Google Drive
                </Text>
                {!isPro && (
                  <View style={styles.buttonProBadge}>
                    <Crown color="#D97706" size={10} />
                    <Text style={styles.buttonProBadgeText}>PRO</Text>
                  </View>
                )}
              </Pressable>
            </>
          )}

          {operationLabel ? (
            <View style={styles.operationRow}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <Text style={styles.description}>{operationLabel}</Text>
            </View>
          ) : null}
        </View>

        {backup.user ? <ScheduledBackupCard /> : null}

        {backup.user ? <QuickSyncCard /> : null}

        {backup.user ? (
          <AppButton
            disabled={busy}
            label="Disconnect"
            leading={<LogOut color={theme.colors.onDanger} size={18} />}
            onPress={() => setConfirmDisconnect(true)}
            variant="destructive"
          />
        ) : null}
      </View>
      )}

      <RestoreBackupModal
        backups={backup.backups}
        loading={backup.operation === "loading"}
        onClose={() => setRestoreModalVisible(false)}
        onRefresh={() => void backup.refresh()}
        onSelect={beginRestore}
        visible={restoreModalVisible}
      />

      <ConfirmModal
        confirmLabel="Disconnect"
        message="Disconnect this Google account from Kaizen Finance? Existing backups will remain in Google Drive."
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={confirmGoogleDriveDisconnect}
        pending={backup.operation === "disconnecting"}
        title="Disconnect Google Drive?"
        visible={confirmDisconnect}
      />

      <ConfirmModal
        confirmLabel="Continue"
        message="Restoring replaces all current local data with the selected backup. A safety copy is kept in memory and restored automatically if validation fails."
        onCancel={() => setConfirmRestore(false)}
        onConfirm={confirmSelectedRestore}
        title="Replace local data?"
        variant="restore"
        visible={confirmRestore}
      />

      <ConfirmModal
        cancelLabel={t("googleDriveBackup.restoreQuickSyncUseFullBackup")}
        confirmLabel={t("googleDriveBackup.restoreQuickSyncAction")}
        message={t("googleDriveBackup.onboardingQuickSyncPromptMessage")}
        onCancel={() => {
          setQuickSyncPromptVisible(false);
          if (backup.user) openRestoreModal();
        }}
        onConfirm={() => {
          setQuickSyncPromptVisible(false);
          setConfirmQuickSyncRestore(true);
        }}
        title={t("googleDriveBackup.onboardingQuickSyncPromptTitle")}
        variant="restore"
        visible={quickSyncPromptVisible}
      />

      <ConfirmModal
        confirmLabel={t("googleDriveBackup.restoreQuickSyncAction")}
        message={t("googleDriveBackup.restoreQuickSyncConfirmMessage")}
        onCancel={() => setConfirmQuickSyncRestore(false)}
        onConfirm={() => {
          setConfirmQuickSyncRestore(false);
          void backup.restoreQuickSync();
        }}
        pending={backup.operation === "restoring"}
        title={t("googleDriveBackup.restoreQuickSyncConfirmTitle")}
        variant="restore"
        visible={confirmQuickSyncRestore}
      />

      <BackupPassphraseModal
        mode={passphraseMode ?? "create"}
        onCancel={() => {
          if (!busy) {
            setPassphraseMode(null);
            if (passphraseMode === "restore") setSelectedBackup(null);
          }
        }}
        onSubmit={(passphrase) =>
          passphraseMode === "restore" && selectedBackup
            ? backup.restoreBackup(selectedBackup.id, passphrase)
            : backup.createBackup(passphrase)
        }
        pending={
          backup.operation === "creating" || backup.operation === "restoring"
        }
        visible={passphraseMode !== null}
      />

      <NotificationModal
        message={backup.notice?.message ?? ""}
        onClose={backup.clearNotice}
        title={
          backup.notice?.variant === "success"
            ? "Backup complete"
            : backup.notice?.variant === "warning"
              ? "Backup needs attention"
              : "Backup failed"
        }
        variant={backup.notice?.variant ?? "error"}
        visible={Boolean(backup.notice)}
      />

      <NotificationModal
        message={linkingError ?? ""}
        onClose={() => setLinkingError(null)}
        title="Unable to open Google Drive"
        variant="error"
        visible={Boolean(linkingError)}
      />

      <ProFeatureModal
        featureDescription={t("pro.locked.cloudSyncDesc")}
        featureTitle={t("pro.locked.cloudSyncTitle")}
        onClose={() => setProModalVisible(false)}
        visible={proModalVisible}
      />
    </>
  );
}

function formatBackupDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    loadingCard: {
      minHeight: 180,
    },
    statusRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 72,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    iconCircle: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: 999,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    actionTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    description: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
    },
    insetDivider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginLeft: 54,
    },
    actionRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 62,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    quickSyncActionRow: {
      backgroundColor: `${theme.colors.primary}08`,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    disabled: {
      opacity: 0.55,
    },
    configurationMessage: {
      alignItems: "flex-start",
      backgroundColor: `${theme.colors.warning}12`,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    configurationText: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    connectButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "center",
      margin: theme.spacing.lg,
      minHeight: 44,
      paddingHorizontal: theme.spacing.lg,
    },
    connectButtonPressed: {
      opacity: 0.85,
    },
    connectButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    operationRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
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
    buttonProBadge: {
      alignItems: "center",
      backgroundColor: "#FFFFFF",
      borderRadius: 4,
      flexDirection: "row",
      gap: 3,
      marginLeft: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    buttonProBadgeText: {
      color: "#D97706",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
  });
}
