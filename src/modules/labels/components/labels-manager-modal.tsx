import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Archive, ArchiveRestore, Check, Edit2, Plus, Trash2, X } from "lucide-react-native";
import { ConfirmModal } from "@/components/confirm-modal";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { LabelBadge } from "./label-badge";
import { LabelFormModal } from "./label-form-modal";
import { useLabels } from "../hooks/use-labels";
import { useLabelMutations } from "../hooks/use-label-mutations";
import type { CreateLabelInput, Label, UpdateLabelInput } from "../types/label.types";

export interface LabelsManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LabelsManagerModal({
  visible,
  onClose,
}: LabelsManagerModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const { labels, activeLabels, archivedLabels, refresh } = useLabels({
    includeArchived: true,
  });
  const { createLabel, updateLabel, deleteLabel } = useLabelMutations(refresh);

  const [formVisible, setFormVisible] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [pendingDeleteLabel, setPendingDeleteLabel] = useState<Label | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setShowArchived(false);
    }
  }, [visible]);

  const handleEdit = (lbl: Label) => {
    setEditingLabel(lbl);
    setFormVisible(true);
  };

  const handleNew = () => {
    setEditingLabel(null);
    setFormVisible(true);
  };

  const [pendingArchiveLabel, setPendingArchiveLabel] = useState<Label | null>(null);
  const [pendingRestoreLabel, setPendingRestoreLabel] = useState<Label | null>(null);
  const [archivePending, setArchivePending] = useState(false);

  const handleConfirmArchive = async () => {
    if (!pendingArchiveLabel) return;
    setArchivePending(true);
    try {
      await updateLabel(pendingArchiveLabel.id, { isArchived: true });
      setPendingArchiveLabel(null);
    } catch {
      // Handled
    } finally {
      setArchivePending(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreLabel) return;
    setArchivePending(true);
    try {
      await updateLabel(pendingRestoreLabel.id, { isArchived: false });
      setPendingRestoreLabel(null);
    } catch {
      // Handled
    } finally {
      setArchivePending(false);
    }
  };

  const handleDelete = (lbl: Label) => {
    if ((lbl.usageCount ?? 0) > 0) return;
    setPendingDeleteLabel(lbl);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteLabel) return;
    setDeletePending(true);
    try {
      await deleteLabel(pendingDeleteLabel.id);
      setPendingDeleteLabel(null);
    } catch {
      // Handled
    } finally {
      setDeletePending(false);
    }
  };

  const handleSaveForm = async (input: CreateLabelInput | UpdateLabelInput) => {
    if (editingLabel) {
      await updateLabel(editingLabel.id, input);
    } else {
      await createLabel(input as CreateLabelInput);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Manage Labels</Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleNew}
                style={styles.addBtn}
                accessibilityRole="button"
                accessibilityLabel="Create New Label"
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>New</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Filter Bar with Checkbox */}
          {labels.length > 0 && (
            <View style={styles.filterBar}>
              <Pressable
                accessibilityLabel="Show archived labels"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: showArchived }}
                onPress={() => setShowArchived((prev) => !prev)}
                style={styles.checkboxRow}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    showArchived ? styles.checkboxBoxChecked : null,
                  ]}
                >
                  {showArchived && (
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Show archived</Text>
                {archivedLabels.length > 0 && (
                  <Text style={styles.archivedCountBadge}>
                    ({archivedLabels.length})
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
          >
            {labels.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No Labels Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create labels to tag and organize transactions.
                </Text>
              </View>
            ) : (
              <>
                {/* Active Section */}
                {activeLabels.length > 0 ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>
                      Active Labels ({activeLabels.length})
                    </Text>
                    {activeLabels.map((lbl) => (
                      <View key={lbl.id} style={styles.row}>
                        <View style={styles.rowLeft}>
                          <LabelBadge label={lbl} size="md" />
                          <Text style={styles.usageText}>
                            {lbl.usageCount ?? 0} used
                          </Text>
                        </View>
                        <View style={styles.rowActions}>
                          <Pressable
                            onPress={() => handleEdit(lbl)}
                            hitSlop={8}
                            style={styles.actionBtn}
                            accessibilityLabel={`Edit label ${lbl.name}`}
                            accessibilityRole="button"
                          >
                            <Edit2 size={16} color={theme.colors.textMuted} />
                          </Pressable>
                          <Pressable
                            onPress={() => setPendingArchiveLabel(lbl)}
                            hitSlop={8}
                            style={styles.actionBtn}
                            accessibilityLabel={`Archive label ${lbl.name}`}
                            accessibilityRole="button"
                          >
                            <Archive size={16} color={theme.colors.textMuted} />
                          </Pressable>
                          {(lbl.usageCount ?? 0) === 0 ? (
                            <Pressable
                              onPress={() => handleDelete(lbl)}
                              hitSlop={8}
                              style={styles.actionBtn}
                              accessibilityLabel={`Delete label ${lbl.name}`}
                              accessibilityRole="button"
                            >
                              <Trash2 size={16} color={theme.colors.danger} />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : !showArchived ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>All labels are archived</Text>
                    <Text style={styles.emptySubtitle}>
                      Check "Show archived" above to view or restore them.
                    </Text>
                  </View>
                ) : null}

                {/* Archived Section */}
                {showArchived && (
                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>
                      Archived Labels ({archivedLabels.length})
                    </Text>
                    {archivedLabels.length === 0 ? (
                      <View style={styles.emptyArchivedContainer}>
                        <Text style={styles.emptyArchivedText}>
                          No archived labels
                        </Text>
                      </View>
                    ) : (
                      archivedLabels.map((lbl) => (
                        <View key={lbl.id} style={[styles.row, styles.archivedRow]}>
                          <View style={styles.rowLeft}>
                            <LabelBadge label={lbl} size="md" />
                            <Text style={styles.usageText}>
                              {lbl.usageCount ?? 0} used
                            </Text>
                          </View>
                          <View style={styles.rowActions}>
                            <Pressable
                              onPress={() => setPendingRestoreLabel(lbl)}
                              hitSlop={8}
                              style={styles.actionBtn}
                              accessibilityLabel={`Restore label ${lbl.name}`}
                              accessibilityRole="button"
                            >
                              <ArchiveRestore size={16} color={theme.colors.primary} />
                            </Pressable>
                            {(lbl.usageCount ?? 0) === 0 ? (
                              <Pressable
                                onPress={() => handleDelete(lbl)}
                                hitSlop={8}
                                style={styles.actionBtn}
                                accessibilityLabel={`Delete label ${lbl.name}`}
                                accessibilityRole="button"
                              >
                                <Trash2 size={16} color={theme.colors.danger} />
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>

      <LabelFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        label={editingLabel}
        onSave={handleSaveForm}
      />

      <ConfirmModal
        visible={!!pendingArchiveLabel}
        title="Archive Label?"
        message={`Are you sure you want to archive #${pendingArchiveLabel?.name}? It will be hidden from the label picker, but existing transactions will keep this label.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        variant="destructive"
        pending={archivePending}
        onConfirm={handleConfirmArchive}
        onCancel={() => setPendingArchiveLabel(null)}
      />

      <ConfirmModal
        visible={!!pendingRestoreLabel}
        title="Unarchive Label?"
        message={`Are you sure you want to unarchive #${pendingRestoreLabel?.name}? It will appear in the label picker again.`}
        confirmLabel="Unarchive"
        cancelLabel="Cancel"
        variant="restore"
        pending={archivePending}
        onConfirm={handleConfirmRestore}
        onCancel={() => setPendingRestoreLabel(null)}
      />

      <ConfirmModal
        visible={!!pendingDeleteLabel}
        title="Delete Label"
        message={`Are you sure you want to delete #${pendingDeleteLabel?.name}?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        pending={deletePending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteLabel(null)}
      />
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    filterBar: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
    },
    checkboxRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    checkboxBox: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1.5,
      height: 18,
      justifyContent: "center",
      width: 18,
    },
    checkboxBoxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    archivedCountBadge: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyArchivedContainer: {
      alignItems: "center",
      paddingVertical: theme.spacing.md,
    },
    emptyArchivedText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
    },
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
    },
    scrim: {
      backgroundColor: theme.colors.overlay,
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    container: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: theme.borderRadius.large,
      borderTopRightRadius: theme.borderRadius.large,
      borderTopWidth: 1,
      height: "75%",
      maxHeight: "75%",
      width: "100%",
      ...theme.shadows.modal,
    },
    header: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    addBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    addBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    closeBtn: {
      padding: theme.spacing.xs,
    },
    list: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      gap: theme.spacing.lg,
      padding: theme.spacing.lg,
    },
    emptyContainer: {
      alignItems: "center",
      paddingVertical: theme.spacing.xxl,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptySubtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      marginTop: 4,
      textAlign: "center",
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionHeader: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "uppercase",
    },
    row: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
    },
    archivedRow: {
      opacity: 0.7,
    },
    rowLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    usageText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    rowActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    actionBtn: {
      padding: 4,
    },
  });
}
