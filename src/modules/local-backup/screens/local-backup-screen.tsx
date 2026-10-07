import { useMemo, useState } from "react";
import { Host, Switch } from "@expo/ui";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Archive,
  CalendarClock,
  Download,
  FileArchive,
  RotateCcw,
  Share2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react-native";

import { AppButton, ConfirmModal, NotificationModal } from "@/components";
import { PageContainer } from "@/components/page-container";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { BackupPassphraseModal } from "@/modules/local-backup/components/backup-passphrase-modal";
import { useLocalBackup } from "@/modules/local-backup/hooks/use-local-backup";
import type {
  AutomaticBackupFrequency,
  LocalBackupFile,
  LocalRestoreCandidate,
} from "@/modules/local-backup/types/backup.types";
import { useWorkspace } from "@/modules/onboarding";

export function LocalBackupScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const workspace = useWorkspace();
  const backup = useLocalBackup();
  const [passphraseMode, setPassphraseMode] = useState<
    "create" | "restore" | null
  >(null);
  const [restoreCandidate, setRestoreCandidate] =
    useState<LocalRestoreCandidate | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoreListVisible, setRestoreListVisible] = useState(false);
  const [deleteCandidate, setDeleteCandidate] =
    useState<LocalBackupFile | null>(null);

  const busy = backup.operation !== "idle" && backup.operation !== "loading";
  const personalWorkspace = workspace.state.mode === "personal";
  const latestBackup = backup.backups.find(({ valid }) => valid) ?? null;
  const operationLabel = useMemo(
    () => getOperationLabel(backup.operation),
    [backup.operation],
  );

  const beginRestore = (file: LocalBackupFile) => {
    if (!file.valid || file.passwordProtected === null) return;
    setRestoreCandidate({
      name: file.name,
      uri: file.uri,
      createdAt: file.createdAt,
      passwordProtected: file.passwordProtected,
    });
    setConfirmRestore(true);
  };

  const importBackup = async () => {
    const candidate = await backup.pickBackup();
    if (!candidate) return;
    setRestoreCandidate(candidate);
    setConfirmRestore(true);
  };

  const continueRestore = () => {
    setConfirmRestore(false);
    if (!restoreCandidate) return;
    if (restoreCandidate.passwordProtected) {
      setPassphraseMode("restore");
      return;
    }
    void backup.restoreBackup(restoreCandidate, null);
  };

  const updateFrequency = (frequency: AutomaticBackupFrequency) => {
    if (frequency === backup.config.frequency) return;
    void backup.updateAutomaticConfig({
      enabled: backup.config.enabled,
      frequency,
    });
  };

  return (
    <PageContainer contentContainerStyle={styles.page} maxWidth={760}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Archive color={theme.colors.primary} size={26} />
        </View>
        <View style={styles.summaryCopy}>
          <Text accessibilityRole="header" style={styles.summaryTitle}>
            {latestBackup ? "Your latest backup is ready" : "No local backup yet"}
          </Text>
          <Text selectable style={styles.summaryDescription}>
            {latestBackup
              ? `${formatDateTime(latestBackup.createdAt)} · ${formatFileSize(latestBackup.size)}`
              : "Create a backup to keep a restorable copy of your financial data in this app."}
          </Text>
        </View>
        {latestBackup ? (
          <ShieldCheck color={theme.colors.success} size={22} />
        ) : null}
      </View>

      {!personalWorkspace ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Sample workspace</Text>
          <Text selectable style={styles.infoText}>
            Creating and scheduling backups is paused for sample data. You can
            still import or restore a personal backup.
          </Text>
        </View>
      ) : null}

      <Section title="BACKUP ACTIONS">
        <View style={styles.actionGrid}>
          <AppButton
            disabled={!personalWorkspace || busy}
            label="Back up now"
            leading={<FileArchive color={theme.colors.onPrimary} size={18} />}
            onPress={() => setPassphraseMode("create")}
            style={styles.actionButton}
          />
          <AppButton
            disabled={busy}
            label="Import backup"
            leading={
              <Download color={theme.colors.onControlSecondary} size={18} />
            }
            onPress={() => void importBackup()}
            style={styles.actionButton}
            variant="secondary"
          />
        </View>
        <AppButton
          disabled={busy}
          label="Restore from local backup"
          leading={<RotateCcw color={theme.colors.onControlSecondary} size={18} />}
          onPress={() => setRestoreListVisible(true)}
          style={styles.restoreButton}
          variant="secondary"
        />
        <Text selectable style={styles.sectionHelp}>
          Backups contain the SQLite financial database and in-database settings.
          Receipt and note attachment files are not included yet.
        </Text>
      </Section>

      <Section title="AUTOMATIC BACKUPS">
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.rowIcon}>
              <CalendarClock color={theme.colors.primary} size={21} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Back up automatically</Text>
              <Text selectable style={styles.rowDescription}>
                Runs when the app becomes active and a backup is due.
              </Text>
            </View>
            <Host
              accessibilityLabel="Automatic backups"
              colorScheme={theme.mode}
              matchContents
              seedColor={theme.colors.primary}
            >
              <Switch
                disabled={!personalWorkspace || busy}
                onValueChange={(enabled) =>
                  void backup.updateAutomaticConfig({
                    ...backup.config,
                    enabled,
                  })
                }
                value={backup.config.enabled}
              />
            </Host>
          </View>

          {backup.config.enabled ? (
            <>
              <View style={styles.divider} />
              <View style={styles.frequencyRow}>
                <Text style={styles.frequencyLabel}>Frequency</Text>
                <View style={styles.frequencyOptions}>
                  {(["daily", "weekly"] as const).map((frequency) => {
                    const selected = backup.config.frequency === frequency;
                    return (
                      <Pressable
                        key={frequency}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        disabled={busy}
                        onPress={() => updateFrequency(frequency)}
                        style={({ pressed }) => [
                          styles.frequencyOption,
                          selected && styles.frequencyOptionSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.frequencyOptionText,
                            selected && styles.frequencyOptionTextSelected,
                          ]}
                        >
                          {frequency === "daily" ? "Daily" : "Weekly"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          ) : null}
        </View>
        <Text selectable style={styles.sectionHelp}>
          Automatic copies are unprotected and remain inside the app. The newest
          seven are retained. Export an important copy to keep it outside the app.
        </Text>
      </Section>

      <View style={styles.storageNotice}>
        <Text style={styles.storageNoticeTitle}>About app-managed storage</Text>
        <Text selectable style={styles.storageNoticeText}>
          These backups remain available across normal app updates, but uninstalling
          the app or clearing its data can remove them. Use Export for a copy you
          control in Files, Drive, or another storage provider.
        </Text>
      </View>

      {operationLabel ? (
        <View accessibilityLiveRegion="polite" style={styles.operationBar}>
          <ActivityIndicator color={theme.colors.primary} size="small" />
          <Text style={styles.operationText}>{operationLabel}</Text>
        </View>
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setRestoreListVisible(false);
        }}
        transparent
        visible={restoreListVisible}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityLabel="Close local backup list"
            accessibilityRole="button"
            disabled={busy}
            onPress={() => setRestoreListVisible(false)}
            style={styles.modalBackdrop}
          />
          <View
            style={[
              styles.backupListModal,
              isDesktop && styles.backupListModalDesktop,
              { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleCopy}>
                <Text accessibilityRole="header" style={styles.modalTitle}>
                  Restore from local backup
                </Text>
                <Text selectable style={styles.modalDescription}>
                  Choose a backup saved inside this app.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                disabled={busy}
                hitSlop={10}
                onPress={() => setRestoreListVisible(false)}
                style={({ pressed }) => [
                  styles.modalClose,
                  pressed && styles.pressed,
                ]}
              >
                <X color={theme.colors.textMuted} size={22} />
              </Pressable>
            </View>

            <View style={styles.modalToolbar}>
              <Text style={styles.backupCount}>
                {backup.backups.length} backup
                {backup.backups.length === 1 ? "" : "s"}
              </Text>
            </View>

            {backup.operation === "loading" ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.rowDescription}>Loading backups…</Text>
              </View>
            ) : backup.backups.length === 0 ? (
              <View style={styles.emptyCard}>
                <FileArchive color={theme.colors.textMuted} size={28} />
                <Text style={styles.emptyTitle}>No saved backups</Text>
                <Text selectable style={styles.emptyDescription}>
                  Create a backup first, or use Import backup to choose an exported
                  file.
                </Text>
              </View>
            ) : (
              <FlatList
                contentContainerStyle={styles.backupListContent}
                data={backup.backups}
                keyExtractor={(file) => file.id}
                renderItem={({ item: file }) => (
                  <BackupRow
                    disabled={busy}
                    file={file}
                    onDelete={() => {
                      setRestoreListVisible(false);
                      setDeleteCandidate(file);
                    }}
                    onExport={() => {
                      setRestoreListVisible(false);
                      void backup.exportBackup(file);
                    }}
                    onRestore={() => {
                      setRestoreListVisible(false);
                      beginRestore(file);
                    }}
                  />
                )}
                showsVerticalScrollIndicator
                style={styles.backupList}
              />
            )}
          </View>
        </View>
      </Modal>

      <BackupPassphraseModal
        mode={passphraseMode ?? "create"}
        onCancel={() => {
          if (!busy) {
            setPassphraseMode(null);
            if (passphraseMode === "restore") setRestoreCandidate(null);
          }
        }}
        onSubmit={(passphrase) =>
          passphraseMode === "restore" && restoreCandidate
            ? backup.restoreBackup(restoreCandidate, passphrase)
            : backup.createBackup(passphrase)
        }
        pending={
          backup.operation === "creating" || backup.operation === "restoring"
        }
        visible={passphraseMode !== null}
      />

      <ConfirmModal
        confirmLabel="Restore"
        message={
          restoreCandidate
            ? `Restore ${formatDateTime(restoreCandidate.createdAt)}? This replaces all current local financial data. A pre-restore safety backup will be created first.`
            : ""
        }
        onCancel={() => {
          setConfirmRestore(false);
          setRestoreCandidate(null);
        }}
        onConfirm={continueRestore}
        title="Replace local data?"
        variant="restore"
        visible={confirmRestore}
      />

      <ConfirmModal
        confirmLabel="Delete"
        message="This removes the selected backup from this app. An exported copy is not affected."
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (!deleteCandidate) return;
          const candidate = deleteCandidate;
          setDeleteCandidate(null);
          void backup.removeBackup(candidate);
        }}
        title="Delete backup?"
        visible={Boolean(deleteCandidate)}
      />

      <NotificationModal
        message={backup.notice?.message ?? ""}
        onClose={backup.clearNotice}
        title={
          backup.notice?.variant === "success"
            ? "Local backup updated"
            : backup.notice?.variant === "warning"
              ? "Backup needs attention"
              : "Backup failed"
        }
        variant={backup.notice?.variant ?? "error"}
        visible={Boolean(backup.notice)}
      />
    </PageContainer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BackupRow({
  file,
  disabled,
  onDelete,
  onExport,
  onRestore,
}: {
  file: LocalBackupFile;
  disabled: boolean;
  onDelete: () => void;
  onExport: () => void;
  onRestore: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const kindLabel =
    file.kind === "automatic"
      ? "Automatic backup"
      : file.kind === "safety"
        ? "Before restore"
        : "Manual backup";

  return (
    <View style={styles.backupRow}>
      <View style={styles.backupMain}>
        <View style={styles.backupIcon}>
          <FileArchive
            color={file.valid ? theme.colors.primary : theme.colors.danger}
            size={20}
          />
        </View>
        <View style={styles.backupCopy}>
          <Text style={styles.rowTitle}>{kindLabel}</Text>
          <Text selectable style={styles.rowDescription}>
            {file.valid
              ? `${formatDateTime(file.createdAt)} · ${formatFileSize(file.size)} · ${file.passwordProtected ? "Protected" : "Unprotected"}`
              : `${file.name} · Invalid or damaged`}
          </Text>
        </View>
      </View>
      <View style={styles.backupActions}>
        <IconAction
          accessibilityLabel={`Export backup from ${formatDateTime(file.createdAt)}`}
          disabled={disabled}
          icon={<Share2 color={theme.colors.primary} size={18} />}
          onPress={onExport}
        />
        <IconAction
          accessibilityLabel={`Restore backup from ${formatDateTime(file.createdAt)}`}
          disabled={disabled || !file.valid}
          icon={<RotateCcw color={theme.colors.success} size={18} />}
          onPress={onRestore}
        />
        <IconAction
          accessibilityLabel={`Delete backup from ${formatDateTime(file.createdAt)}`}
          disabled={disabled}
          icon={<Trash2 color={theme.colors.danger} size={18} />}
          onPress={onDelete}
        />
      </View>
    </View>
  );
}

function IconAction({
  accessibilityLabel,
  disabled,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  disabled: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconAction,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon}
    </Pressable>
  );
}

function getOperationLabel(operation: string): string | null {
  switch (operation) {
    case "creating":
      return "Creating backup…";
    case "importing":
      return "Checking selected file…";
    case "exporting":
      return "Preparing export…";
    case "restoring":
      return "Verifying and restoring…";
    case "deleting":
      return "Deleting backup…";
    case "configuring":
      return "Updating automatic backups…";
    default:
      return null;
  }
}

function formatDateTime(value: Date): string {
  if (value.getTime() === 0) return "Unknown date";
  return value.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    summaryCopy: { flex: 1, gap: theme.spacing.xs },
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
    infoCard: {
      backgroundColor: `${theme.colors.warning}12`,
      borderColor: `${theme.colors.warning}40`,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.xs,
      padding: theme.spacing.lg,
    },
    infoTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    infoText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    section: { gap: theme.spacing.sm },
    sectionTitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
      paddingHorizontal: theme.spacing.xs,
    },
    sectionHelp: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
      paddingHorizontal: theme.spacing.xs,
    },
    actionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    actionButton: { flexGrow: 1, minWidth: 180 },
    restoreButton: { width: "100%" },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    settingRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 76,
      padding: theme.spacing.lg,
    },
    rowIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}14`,
      borderRadius: theme.borderRadius.round,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    rowCopy: { flex: 1, gap: theme.spacing.xs },
    rowTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    rowDescription: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    divider: { backgroundColor: theme.colors.border, height: 1 },
    frequencyRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      padding: theme.spacing.lg,
    },
    frequencyLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    frequencyOptions: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      padding: theme.spacing.xxs,
    },
    frequencyOption: {
      borderRadius: theme.borderRadius.small,
      minWidth: 76,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    frequencyOptionSelected: { backgroundColor: theme.colors.primary },
    frequencyOptionText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
    frequencyOptionTextSelected: { color: theme.colors.onPrimary },
    backupRow: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: theme.spacing.md,
      minHeight: 76,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    backupMain: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    backupIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: theme.borderRadius.medium,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    backupCopy: { flex: 1, gap: theme.spacing.xs, minWidth: 0 },
    backupActions: {
      alignSelf: "flex-end",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    iconAction: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    pressed: { backgroundColor: theme.colors.surfaceMuted, opacity: 0.78 },
    disabled: { opacity: 0.4 },
    loadingCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "center",
      minHeight: 100,
      padding: theme.spacing.lg,
    },
    emptyCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.xs,
      padding: theme.spacing.xxl,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyDescription: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      textAlign: "center",
    },
    storageNotice: {
      backgroundColor: theme.colors.surfaceMuted,
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.large,
      gap: theme.spacing.xs,
      padding: theme.spacing.lg,
    },
    storageNoticeTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    storageNoticeText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    operationBar: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      bottom: theme.spacing.lg,
      flexDirection: "row",
      gap: theme.spacing.sm,
      left: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      position: "absolute",
      ...theme.shadows.modal,
    },
    operationText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    modalOverlay: {
      backgroundColor: theme.colors.overlay,
      flex: 1,
      justifyContent: "flex-end",
    },
    modalBackdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    backupListModal: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      maxHeight: "88%",
      overflow: "hidden",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      width: "100%",
      ...theme.shadows.modal,
    },
    backupListModalDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 620,
    },
    modalHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    modalTitleCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    modalDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    modalClose: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    backupList: {
      flexGrow: 0,
      maxHeight: 460,
    },
    backupListContent: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.md,
    },
    modalToolbar: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingBottom: theme.spacing.md,
    },
    backupCount: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
