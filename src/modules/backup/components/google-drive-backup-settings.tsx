import { useMemo, useState } from "react";
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
  FolderOpen,
  LogOut,
  ShieldAlert,
} from "lucide-react-native";

import { ConfirmModal, NotificationModal } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useGoogleDriveBackup } from "@/modules/backup/hooks/use-google-drive-backup";
import type { BackupFile } from "@/modules/backup/types/backup.types";
import { BackupPassphraseModal } from "./backup-passphrase-modal";
import { RestoreBackupModal } from "./restore-backup-modal";

export function GoogleDriveBackupSettings() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const backup = useGoogleDriveBackup();
  const [passphraseMode, setPassphraseMode] = useState<
    "create" | "restore" | null
  >(null);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [linkingError, setLinkingError] = useState<string | null>(null);
  const busy = backup.operation !== "idle";

  const operationLabel = useMemo(() => {
    switch (backup.operation) {
      case "connecting":
        return "Connecting to Google...";
      case "loading":
        return "Loading backups...";
      case "creating":
        return "Creating and uploading...";
      case "restoring":
        return "Verifying and restoring...";
      case "disconnecting":
        return "Disconnecting...";
      default:
        return null;
    }
  }, [backup.operation]);

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

  return (
    <>
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View style={styles.iconCircle}>
            <Cloud color={theme.colors.primary} size={22} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>Google Drive</Text>
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
                <Text style={styles.actionTitle}>Restore from Backup</Text>
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

            <View style={styles.divider} />
            <Pressable
              accessibilityLabel="Disconnect Google Drive"
              accessibilityRole="button"
              disabled={busy}
              onPress={backup.disconnect}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}
            >
              <LogOut color={theme.colors.textMuted} size={19} />
              <Text style={styles.disconnectText}>Disconnect</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.divider} />
            <Pressable
              accessibilityLabel="Connect Google Drive"
              accessibilityRole="button"
              disabled={busy}
              onPress={backup.connect}
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
              <Text style={styles.connectButtonText}>Connect Google Drive</Text>
            </Pressable>
          </>
        )}

        {operationLabel && backup.operation !== "loading" ? (
          <View style={styles.operationRow}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <Text style={styles.description}>{operationLabel}</Text>
          </View>
        ) : null}

      </View>

      <RestoreBackupModal
        backups={backup.backups}
        loading={backup.operation === "loading"}
        onClose={() => setRestoreModalVisible(false)}
        onRefresh={() => void backup.refresh()}
        onSelect={beginRestore}
        visible={restoreModalVisible}
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
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
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
    disconnectText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    operationRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
  });
}
