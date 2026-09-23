import { useMemo, useState } from "react";
import * as Linking from "expo-linking";
import {
  ActivityIndicator,
  Alert,
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
  RefreshCw,
  ShieldAlert,
} from "lucide-react-native";

import { ConfirmModal } from "@/components/confirm-modal";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useGoogleDriveBackup } from "@/modules/backup/hooks/use-google-drive-backup";
import type { BackupFile } from "@/modules/backup/types/backup.types";
import { BackupPassphraseModal } from "./backup-passphrase-modal";

export function GoogleDriveBackupSettings() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const backup = useGoogleDriveBackup();
  const [passphraseMode, setPassphraseMode] = useState<
    "create" | "restore" | null
  >(null);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const busy = backup.operation !== "idle";

  const operationLabel = useMemo(() => {
    switch (backup.operation) {
      case "connecting":
        return "Connecting to Google...";
      case "loading":
        return "Loading backups...";
      case "creating":
        return "Encrypting and uploading...";
      case "restoring":
        return "Verifying and restoring...";
      case "disconnecting":
        return "Disconnecting...";
      default:
        return null;
    }
  }, [backup.operation]);

  const beginRestore = (file: BackupFile) => {
    setSelectedBackup(file);
    setConfirmRestore(true);
  };

  const openBackupFolder = async () => {
    if (!backup.folderUrl) return;

    try {
      await Linking.openURL(backup.folderUrl);
    } catch {
      Alert.alert(
        "Unable to open Google Drive",
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
              accessibilityLabel="Create encrypted backup"
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
                  Save an encrypted snapshot to Kaizen Finance / Backups
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
            <View style={styles.backupHeader}>
              <Text style={styles.backupHeaderTitle}>AVAILABLE BACKUPS</Text>
              <Pressable
                accessibilityLabel="Refresh backups"
                accessibilityRole="button"
                disabled={busy}
                hitSlop={10}
                onPress={backup.refresh}
                style={busy && styles.disabled}
              >
                <RefreshCw color={theme.colors.textMuted} size={17} />
              </Pressable>
            </View>

            {backup.operation === "loading" && backup.backups.length === 0 ? (
              <View style={styles.inlineState}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
                <Text style={styles.description}>Loading backups...</Text>
              </View>
            ) : backup.backups.length === 0 ? (
              <View style={styles.inlineState}>
                <CloudDownload color={theme.colors.textMuted} size={18} />
                <Text style={styles.description}>No backups yet.</Text>
              </View>
            ) : (
              backup.backups.map((file, index) => (
                <View key={file.id}>
                  {index > 0 ? <View style={styles.insetDivider} /> : null}
                  <Pressable
                    accessibilityLabel={`Restore backup from ${formatDate(file.createdTime)}`}
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => beginRestore(file)}
                    style={({ pressed }) => [
                      styles.backupRow,
                      pressed && styles.pressed,
                      busy && styles.disabled,
                    ]}
                  >
                    <CloudDownload color={theme.colors.textSecondary} size={18} />
                    <View style={styles.copy}>
                      <Text style={styles.backupDate} selectable>
                        {formatDate(file.createdTime)}
                      </Text>
                      <Text style={styles.description} selectable>
                        {formatBytes(file.size)} · Encrypted
                        {file.location === "legacy-hidden"
                          ? " · Hidden legacy copy"
                          : ""}
                      </Text>
                    </View>
                    <Text style={styles.restoreLabel}>Restore</Text>
                  </Pressable>
                </View>
              ))
            )}

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

        {backup.notice ? (
          <Pressable
            accessibilityLabel="Dismiss backup message"
            accessibilityRole="button"
            onPress={backup.clearNotice}
            style={[
              styles.notice,
              backup.notice.variant === "error"
                ? styles.errorNotice
                : styles.successNotice,
            ]}
          >
            <Text
              selectable
              style={[
                styles.noticeText,
                backup.notice.variant === "error"
                  ? styles.errorText
                  : styles.successText,
              ]}
            >
              {backup.notice.message}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ConfirmModal
        confirmLabel="Continue"
        message="Restoring replaces all current local data with the selected backup. A safety copy is kept in memory and restored automatically if validation fails."
        onCancel={() => setConfirmRestore(false)}
        onConfirm={() => {
          setConfirmRestore(false);
          setPassphraseMode("restore");
        }}
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
    </>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    backupHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 42,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    backupHeaderTitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.6,
    },
    backupRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 62,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    backupDate: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    restoreLabel: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    inlineState: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 58,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
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
    notice: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    successNotice: {
      backgroundColor: `${theme.colors.success}12`,
      borderTopColor: `${theme.colors.success}40`,
    },
    errorNotice: {
      backgroundColor: `${theme.colors.danger}12`,
      borderTopColor: `${theme.colors.danger}40`,
    },
    noticeText: {
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    successText: {
      color: theme.colors.success,
    },
    errorText: {
      color: theme.colors.danger,
    },
  });
}
