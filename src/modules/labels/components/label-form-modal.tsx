import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, Plus, X } from "lucide-react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { ConfirmModal } from "@/components/confirm-modal";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  HexColorFormModal,
  type HexColorInput,
  useHexColors,
} from "@/modules/hex-colors";
import type { CreateLabelInput, Label, UpdateLabelInput } from "../types/label.types";

export interface LabelFormModalProps {
  visible: boolean;
  onClose: () => void;
  label?: Label | null;
  onSave: (input: CreateLabelInput | UpdateLabelInput) => Promise<unknown>;
}

export function LabelFormModal({
  visible,
  onClose,
  label,
  onSave,
}: LabelFormModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const {
    colors: hexColorsList,
    refresh: refreshHexColors,
    addColor,
  } = useHexColors();

  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(false);
  const [isColorFormOpen, setIsColorFormOpen] = useState(false);
  const [pendingArchiveToggle, setPendingArchiveToggle] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(label?.name ?? "");
      setSelectedColor(label?.color ?? null);
      setIsArchived(label?.isArchived ?? false);
      setError(null);
      setIsColorFormOpen(false);
      setPendingArchiveToggle(null);
      refreshHexColors();
    }
  }, [visible, label, refreshHexColors]);

  const handleConfirmArchiveToggle = () => {
    if (pendingArchiveToggle !== null) {
      setIsArchived(pendingArchiveToggle);
    }
    setPendingArchiveToggle(null);
  };

  const handleSaveCustomColor = async (colorInput: HexColorInput): Promise<boolean> => {
    const created = await addColor(colorInput);
    if (created) {
      setSelectedColor(created.hex);
      setIsColorFormOpen(false);
      return true;
    }
    return false;
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Label name cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: trimmed,
        color: selectedColor,
        isArchived,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save label.");
    } finally {
      setSaving(false);
    }
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
            <Text style={styles.title}>
              {label ? "Edit Label" : "New Label"}
            </Text>
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

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Name Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.hashPrefix}>#</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. vacation, reimbursable"
                  placeholderTextColor={theme.colors.textMuted}
                  value={name}
                  onChangeText={(text) => {
                    setName(text.replace(/^#+/, ""));
                    if (error) setError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={40}
                />
              </View>
            </View>

            {/* Badge Color Selector */}
            <View style={styles.field}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldTitleRow}>
                  <Text style={styles.label}>Badge Color</Text>
                  {selectedColor && (
                    <View style={styles.selectedColorBadge}>
                      <View
                        style={[
                          styles.selectedColorDot,
                          { backgroundColor: selectedColor },
                        ]}
                      />
                      <Text style={styles.selectedColorText}>
                        {selectedColor.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                {selectedColor && (
                  <Pressable
                    onPress={() => setSelectedColor(null)}
                    hitSlop={8}
                  >
                    <Text style={styles.clearColorText}>Clear (Default)</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.colorHelperText}>
                Select a palette color or create your own custom color.
              </Text>
              <View style={styles.colorsGrid}>
                {hexColorsList.map((entry) => {
                  const isSelected =
                    selectedColor?.toLowerCase() === entry.hex.toLowerCase();
                  return (
                    <Pressable
                      key={entry.id}
                      accessibilityLabel={`Color ${entry.name} (${entry.hex})`}
                      accessibilityRole="button"
                      onPress={() =>
                        setSelectedColor(isSelected ? null : entry.hex)
                      }
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: entry.hex },
                        isSelected && styles.colorSwatchSelected,
                      ]}
                    >
                      {isSelected && (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      )}
                    </Pressable>
                  );
                })}
                <Pressable
                  accessibilityLabel="Add custom color"
                  accessibilityRole="button"
                  onPress={() => setIsColorFormOpen(true)}
                  style={({ pressed }) => [
                    styles.addColorSwatch,
                    { borderColor: theme.colors.primary },
                    pressed && styles.addColorSwatchPressed,
                  ]}
                >
                  <Plus color={theme.colors.primary} size={20} strokeWidth={2.5} />
                </Pressable>
              </View>
            </View>

            {/* Archive switch (edit mode only) */}
            {label && (
              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchLabel}>Archive Label</Text>
                  <Text style={styles.switchSublabel}>
                    Hide from picker while keeping history intact
                  </Text>
                </View>
                <Switch
                  value={isArchived}
                  onValueChange={(nextVal) => setPendingArchiveToggle(nextVal)}
                  trackColor={{
                    false: theme.colors.surfaceMuted,
                    true: theme.colors.primary,
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={[styles.btn, styles.cancelBtn]}
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving || !name.trim()}
              style={[
                styles.btn,
                styles.saveBtn,
                (!name.trim() || saving) ? styles.btnDisabled : null,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.saveBtnText}>
                {saving ? "Saving..." : label ? "Save Changes" : "Create Label"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <HexColorFormModal
        onClose={() => setIsColorFormOpen(false)}
        onSave={handleSaveCustomColor}
        visible={isColorFormOpen}
      />

      <ConfirmModal
        visible={pendingArchiveToggle === true}
        title="Archive Label?"
        message={`Are you sure you want to archive #${name.trim() || label?.name}? It will be hidden from the label picker, but existing transactions will keep this label.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleConfirmArchiveToggle}
        onCancel={() => setPendingArchiveToggle(null)}
      />

      <ConfirmModal
        visible={pendingArchiveToggle === false}
        title="Unarchive Label?"
        message={`Are you sure you want to unarchive #${name.trim() || label?.name}? It will appear in the label picker again.`}
        confirmLabel="Unarchive"
        cancelLabel="Cancel"
        variant="restore"
        onConfirm={handleConfirmArchiveToggle}
        onCancel={() => setPendingArchiveToggle(null)}
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
      maxHeight: "85%",
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
    closeBtn: {
      padding: theme.spacing.xs,
    },
    body: {
      maxHeight: 400,
    },
    bodyContent: {
      gap: theme.spacing.lg,
      padding: theme.spacing.lg,
    },
    errorContainer: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.sm,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
    },
    field: {
      gap: theme.spacing.xs,
    },
    fieldHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    fieldTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    selectedColorBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    selectedColorDot: {
      borderRadius: theme.borderRadius.round,
      height: 10,
      width: 10,
    },
    selectedColorText: {
      color: theme.colors.textPrimary,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    colorHelperText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: -2,
    },
    clearColorText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    inputWrapper: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      paddingHorizontal: theme.spacing.md,
    },
    hashPrefix: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      marginRight: theme.spacing.xs,
    },
    input: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      paddingVertical: theme.spacing.sm + 2,
    },
    colorsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    colorSwatch: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    colorSwatchSelected: {
      borderColor: theme.colors.textPrimary,
      borderWidth: 2,
      transform: [{ scale: 1.1 }],
    },
    colorCheckMark: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "bold",
    },
    addColorSwatch: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      borderStyle: "dashed",
      borderWidth: 1.5,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    addColorSwatchPressed: {
      opacity: 0.65,
      transform: [{ scale: 0.95 }],
    },
    switchRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: theme.spacing.xs,
    },
    switchTextContainer: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    switchLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    switchSublabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    footer: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    btn: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
    },
    cancelBtn: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    cancelBtnText: {
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    saveBtn: {
      backgroundColor: theme.colors.primary,
    },
    saveBtnText: {
      color: theme.colors.onPrimary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    btnDisabled: {
      opacity: 0.5,
    },
  });
}
