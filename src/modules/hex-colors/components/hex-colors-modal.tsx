import React, { useState } from "react";
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
import { Pencil, Plus, Trash2, X } from "lucide-react-native";
import { ConfirmModal } from "@/components/confirm-modal";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useHexColors } from "../hooks/use-hex-colors";
import type { HexColor, HexColorInput } from "../types/hex-color.types";
import { HexColorFormModal } from "./hex-color-form-modal";

export interface HexColorsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HexColorsModal({ visible, onClose }: HexColorsModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const { colors, loading, error, addColor, editColor, removeColor } = useHexColors();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<HexColor | null>(null);
  const [deletingColor, setDeletingColor] = useState<HexColor | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingColor(null);
    setIsFormOpen(true);
    setActionError(null);
  };

  const handleOpenEdit = (color: HexColor) => {
    if (color.isSystem) return;
    setEditingColor(color);
    setIsFormOpen(true);
    setActionError(null);
  };

  const handleSaveColor = (input: HexColorInput, id?: string) => {
    try {
      setActionError(null);
      if (id) {
        editColor(id, input);
      } else {
        addColor(input);
      }
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save color.");
      return false;
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingColor) return;
    try {
      setActionError(null);
      removeColor(deletingColor.id);
      setDeletingColor(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete color.");
      setDeletingColor(null);
    }
  };

  if (!visible) return null;

  return (
    <>
      <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
        <View style={styles.overlay}>
          <Pressable accessibilityLabel="Close modal" onPress={onClose} style={styles.backdrop} />

          <View
            style={[
              styles.sheet,
              isDesktop && styles.sheetDesktop,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerTextGroup}>
                <Text style={styles.modalTitle}>Hex Color Palette</Text>
                <Text style={styles.modalSubtitle}>
                  {colors.length} palette color{colors.length === 1 ? "" : "s"} for accounts & categories
                </Text>
              </View>
              <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
                <X color={theme.colors.textSecondary} size={18} />
              </Pressable>
            </View>

            {/* Error Banner */}
            {actionError || error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{actionError || error}</Text>
              </View>
            ) : null}

            {/* Top Toolbar Action */}
            <View style={styles.toolbarRow}>
              <Pressable
                accessibilityLabel="Add custom hex color"
                onPress={handleOpenCreate}
                style={styles.addBtn}
              >
                <Plus color={theme.colors.onPrimary} size={16} />
                <Text style={styles.addBtnText}>Add Custom Color</Text>
              </Pressable>
            </View>

            {/* Colors List */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.colorsList}>
              {loading ? (
                <Text style={styles.emptyText}>Loading colors...</Text>
              ) : colors.length === 0 ? (
                <Text style={styles.emptyText}>No colors found. Tap above to add one.</Text>
              ) : (
                colors.map((color) => {
                  const isSystem = color.isSystem;

                  return (
                    <View key={color.id} style={styles.colorCard}>
                      <View style={styles.colorCardLeft}>
                        <View
                          style={[
                            styles.swatchCircle,
                            { backgroundColor: color.hex },
                          ]}
                        />
                        <View style={styles.colorMeta}>
                          <View style={styles.colorTitleRow}>
                            <Text style={styles.colorName}>{color.name}</Text>
                            <View
                              style={[
                                styles.typeBadge,
                                isSystem ? styles.typeBadgeSystem : styles.typeBadgeCustom,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.typeBadgeText,
                                  isSystem ? styles.typeBadgeTextSystem : styles.typeBadgeTextCustom,
                                ]}
                              >
                                {isSystem ? "System" : "Custom"}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.colorHex}>{color.hex.toUpperCase()}</Text>
                        </View>
                      </View>

                      {!isSystem ? (
                        <View style={styles.actionRow}>
                          <Pressable
                            accessibilityLabel={`Edit color ${color.name}`}
                            onPress={() => handleOpenEdit(color)}
                            style={styles.iconActionBtn}
                          >
                            <Pencil color={theme.colors.textSecondary} size={16} />
                          </Pressable>
                          <Pressable
                            accessibilityLabel={`Delete color ${color.name}`}
                            onPress={() => setDeletingColor(color)}
                            style={styles.iconActionBtn}
                          >
                            <Trash2 color={theme.colors.danger} size={16} />
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sub-Modal: Add / Edit Custom Color Form */}
      <HexColorFormModal
        initialColor={editingColor}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveColor}
        visible={isFormOpen}
      />

      {/* Confirmation Modal for Deleting Custom Color */}
      <ConfirmModal
        confirmLabel="Delete Color"
        message={`Are you sure you want to delete custom color "${deletingColor?.name}" (${deletingColor?.hex})?`}
        title="Delete Hex Color?"
        variant="destructive"
        visible={deletingColor !== null}
        onCancel={() => setDeletingColor(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.65)",
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
      gap: 2,
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
    closeBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: theme.colors.danger,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.sm,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
    },
    toolbarRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: theme.spacing.md,
    },
    addBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    addBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    colorsList: {
      maxHeight: 460,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      paddingVertical: theme.spacing.xl,
      textAlign: "center",
    },
    colorCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    colorCardLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      flex: 1,
    },
    swatchCircle: {
      borderColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 999,
      borderWidth: 2,
      height: 36,
      width: 36,
      ...theme.shadows.card,
    },
    colorMeta: {
      flex: 1,
      gap: 2,
    },
    colorTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    colorName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    colorHex: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontVariant: ["tabular-nums"],
    },
    typeBadge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    typeBadgeSystem: {
      backgroundColor: `${theme.colors.borderStrong}20`,
    },
    typeBadgeCustom: {
      backgroundColor: `${theme.colors.primary}20`,
    },
    typeBadgeText: {
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
    },
    typeBadgeTextSystem: {
      color: theme.colors.textMuted,
    },
    typeBadgeTextCustom: {
      color: theme.colors.primary,
    },
    actionRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    iconActionBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
  });
}
