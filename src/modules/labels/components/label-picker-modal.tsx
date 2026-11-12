import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, Plus, Search, Tag, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { LabelBadge } from "./label-badge";
import { LabelsManagerModal } from "./labels-manager-modal";
import { useLabels } from "../hooks/use-labels";
import { useLabelMutations } from "../hooks/use-label-mutations";
import type { Label } from "../types/label.types";

export interface LabelPickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedLabelIds: string[];
  onSelectLabels: (labelIds: string[]) => void;
  title?: string;
}

export function LabelPickerModal({
  visible,
  onClose,
  selectedLabelIds,
  onSelectLabels,
  title = "Select Labels",
}: LabelPickerModalProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);

  const { labels, activeLabels, refresh } = useLabels({ includeArchived: true });
  const { createLabel } = useLabelMutations(refresh);

  const [searchQuery, setSearchQuery] = useState("");
  const [managerVisible, setManagerVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  // Maintain local selection while modal is open
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedLabelIds);

  React.useEffect(() => {
    if (visible) {
      setLocalSelectedIds(selectedLabelIds);
      setSearchQuery("");
    }
  }, [visible, selectedLabelIds]);

  const cleanQuery = searchQuery.trim().replace(/^#+/, "");

  // Available labels to pick: active labels + any currently selected label even if archived
  const selectableLabels = useMemo(() => {
    const selectedSet = new Set(localSelectedIds);
    return labels.filter((lbl) => !lbl.isArchived || selectedSet.has(lbl.id));
  }, [labels, localSelectedIds]);

  const filteredLabels = useMemo(() => {
    if (!cleanQuery) return selectableLabels;
    const q = cleanQuery.toLowerCase();
    return selectableLabels.filter((lbl) => lbl.name.toLowerCase().includes(q));
  }, [selectableLabels, cleanQuery]);

  // Check if search query matches an existing label exactly
  const exactMatchExists = useMemo(() => {
    if (!cleanQuery) return true;
    const q = cleanQuery.toLowerCase();
    return labels.some((lbl) => lbl.name.toLowerCase() === q);
  }, [labels, cleanQuery]);

  const handleToggleLabel = (labelId: string) => {
    setLocalSelectedIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId],
    );
  };

  const handleCreateQuickLabel = async () => {
    if (!cleanQuery || creating) return;
    setCreating(true);
    try {
      const created = await createLabel({ name: cleanQuery });
      if (created) {
        setLocalSelectedIds((prev) => [...prev, created.id]);
        setSearchQuery("");
      }
    } catch {
      // Error handled in hook
    } finally {
      setCreating(false);
    }
  };

  const handleDone = () => {
    onSelectLabels(localSelectedIds);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        automaticOffset
        behavior="height"
        style={styles.backdrop}
      >
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* Manage Labels Chip */}
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setManagerVisible(true)}
              style={({ pressed }) => [
                styles.manageChip,
                pressed && styles.manageChipPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Manage Labels"
            >
              <Tag size={13} color={theme.colors.textSecondary} />
              <Text style={styles.manageChipText}>Manage Labels</Text>
            </Pressable>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color={theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search or create label..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <X size={16} color={theme.colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Create quick button if not exact match */}
          {cleanQuery.length > 0 && !exactMatchExists && (
            <Pressable
              onPress={handleCreateQuickLabel}
              disabled={creating}
              style={styles.createQuickRow}
            >
              <View style={styles.createQuickIcon}>
                <Plus size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.createQuickText}>
                Create <Text style={styles.createQuickBold}>#{cleanQuery}</Text>
              </Text>
            </Pressable>
          )}

          {/* List of labels */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
          >
            {filteredLabels.length === 0 && (exactMatchExists || !cleanQuery) ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? "No matching labels found" : "No labels yet"}
                </Text>
              </View>
            ) : (
              filteredLabels.map((lbl) => {
                const isSelected = localSelectedIds.includes(lbl.id);
                return (
                  <Pressable
                    key={lbl.id}
                    onPress={() => handleToggleLabel(lbl.id)}
                    style={[
                      styles.row,
                      isSelected ? styles.rowSelected : null,
                    ]}
                  >
                    <View style={styles.rowLeft}>
                      <LabelBadge label={lbl} size="md" />
                      {lbl.isArchived && (
                        <Text style={styles.archivedTag}>(Archived)</Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected ? styles.checkboxSelected : null,
                      ]}
                    >
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, theme.spacing.md) },
            ]}
          >
            <Text style={styles.countText}>
              {localSelectedIds.length} selected
            </Text>
            <Pressable
              onPress={handleDone}
              style={styles.doneBtn}
              accessibilityRole="button"
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <LabelsManagerModal
        visible={managerVisible}
        onClose={() => {
          setManagerVisible(false);
          refresh();
        }}
      />
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
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
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    closeButtonPressed: {
      opacity: 0.7,
    },
    chipRow: {
      flexDirection: "row",
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
    },
    manageChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    manageChipPressed: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
    },
    manageChipText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.2,
    },
    searchContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      paddingVertical: 4,
    },
    createQuickRow: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}10`,
      borderColor: `${theme.colors.primary}30`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    createQuickIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}20`,
      borderRadius: theme.borderRadius.round,
      height: 24,
      justifyContent: "center",
      width: 24,
    },
    createQuickText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
    },
    createQuickBold: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    list: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    emptyContainer: {
      alignItems: "center",
      paddingVertical: theme.spacing.xl,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
    },
    row: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
    },
    rowSelected: {
      backgroundColor: `${theme.colors.primary}08`,
      borderColor: theme.colors.primary,
    },
    rowLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    archivedTag: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
    },
    checkbox: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1.5,
      height: 20,
      justifyContent: "center",
      width: 20,
    },
    checkboxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    footer: {
      alignItems: "center",
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    countText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
    },
    doneBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.sm + 2,
    },
    doneBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
