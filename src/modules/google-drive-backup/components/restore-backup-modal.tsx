import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CloudDownload, LockKeyhole, RefreshCw, X } from "lucide-react-native";

import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { BackupFile } from "@/modules/google-drive-backup/types/google-drive-backup.types";

interface RestoreBackupModalProps {
  backups: BackupFile[];
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onSelect: (file: BackupFile) => void;
  visible: boolean;
}

export function RestoreBackupModal({
  backups,
  loading,
  onClose,
  onRefresh,
  onSelect,
  visible,
}: RestoreBackupModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  if (!visible) return null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close restore backup modal"
          onPress={onClose}
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
            <View style={styles.headerTextGroup}>
              <Text style={styles.modalTitle}>Restore from Backup</Text>
              <Text style={styles.modalSubtitle}>
                Choose a Google Drive backup to restore
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <X color={theme.colors.textSecondary} size={18} />
            </Pressable>
          </View>

          <View style={styles.toolbarRow}>
            <Text style={styles.backupCount}>
              {backups.length} backup{backups.length === 1 ? "" : "s"}
            </Text>
            <Pressable
              accessibilityLabel="Refresh backups"
              accessibilityRole="button"
              disabled={loading}
              onPress={onRefresh}
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.primary} size="small" />
              ) : (
                <RefreshCw color={theme.colors.primary} size={16} />
              )}
              <Text style={styles.refreshText}>Refresh</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          >
            {loading && backups.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
                <Text style={styles.emptyTitle}>Loading backups...</Text>
              </View>
            ) : backups.length === 0 ? (
              <View style={styles.emptyState}>
                <CloudDownload color={theme.colors.textMuted} size={28} />
                <Text style={styles.emptyTitle}>No backups yet</Text>
                <Text style={styles.emptyDescription}>
                  Create a backup first, then return here to restore it.
                </Text>
              </View>
            ) : (
              backups.map((file) => (
                <Pressable
                  key={file.id}
                  accessibilityLabel={`Restore backup from ${formatDate(file.createdTime)}`}
                  accessibilityRole="button"
                  disabled={loading}
                  onPress={() => onSelect(file)}
                  style={({ pressed }) => [
                    styles.backupCard,
                    pressed && styles.backupCardPressed,
                    loading && styles.disabled,
                  ]}
                >
                  <View style={styles.backupIcon}>
                    {file.passwordProtected ? (
                      <LockKeyhole color={theme.colors.primary} size={18} />
                    ) : (
                      <CloudDownload color={theme.colors.primary} size={18} />
                    )}
                  </View>
                  <View style={styles.backupCopy}>
                    <Text selectable style={styles.backupDate}>
                      {formatDate(file.createdTime)}
                    </Text>
                    <Text selectable style={styles.backupMeta}>
                      {formatBytes(file.size)} · {file.passwordProtected
                        ? "Password protected"
                        : "No password"}
                      {file.location === "legacy-hidden" ? " · Hidden legacy copy" : ""}
                    </Text>
                  </View>
                  <Text style={styles.restoreLabel}>Restore</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
      maxHeight: "88%",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      width: "100%",
      ...theme.shadows.modal,
    },
    sheetDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 520,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    headerTextGroup: {
      flex: 1,
      gap: theme.spacing.xxs,
      minWidth: 0,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    modalSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      marginLeft: theme.spacing.md,
      width: 32,
    },
    toolbarRow: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: theme.spacing.md,
    },
    backupCount: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    refreshButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 36,
      paddingHorizontal: theme.spacing.sm,
    },
    refreshText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    list: {
      maxHeight: 460,
    },
    listContent: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.md,
    },
    backupCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 68,
      padding: theme.spacing.md,
    },
    backupCardPressed: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.primary,
    },
    backupIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: theme.borderRadius.medium,
      flexShrink: 0,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    backupCopy: {
      flex: 1,
      gap: theme.spacing.xxs,
      minWidth: 0,
    },
    backupDate: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    backupMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    restoreLabel: {
      color: theme.colors.primary,
      flexShrink: 0,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    emptyState: {
      alignItems: "center",
      gap: theme.spacing.sm,
      justifyContent: "center",
      minHeight: 180,
      paddingHorizontal: theme.spacing.xl,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
    emptyDescription: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
      textAlign: "center",
    },
    pressed: {
      opacity: 0.65,
    },
    disabled: {
      opacity: 0.55,
    },
  });
}
