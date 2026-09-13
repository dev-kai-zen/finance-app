import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { IconHelper, IconPickerModal } from "@/components";
import { CATEGORY_COLOR_KEYS } from "../constants/categories.constants";
import type { Category, CategoryInput, CategoryType } from "../types/category.types";

export interface CategoryFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (input: CategoryInput, id?: string) => Promise<boolean>;
  categoryToEdit?: Category | null;
  initialType?: CategoryType;
  pending?: boolean;
  error?: string | null;
}

export function CategoryFormModal({
  visible,
  onClose,
  onSave,
  categoryToEdit,
  initialType = "expense",
  pending = false,
  error = null,
}: CategoryFormModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>(initialType);
  const [selectedColor, setSelectedColor] = useState<string>("slate");
  const [selectedIcon, setSelectedIcon] = useState<string>("tag");
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const categoricalColor =
    selectedColor in theme.colors.categorical
      ? theme.colors.categorical[selectedColor as keyof AppTheme["colors"]["categorical"]]
      : theme.colors.primary;

  useEffect(() => {
    if (visible) {
      if (categoryToEdit) {
        setName(categoryToEdit.name);
        setType(categoryToEdit.type);
        setSelectedColor(categoryToEdit.color ?? "slate");
        setSelectedIcon(categoryToEdit.icon ?? "tag");
      } else {
        setName("");
        setType(initialType);
        setSelectedColor(initialType === "income" ? "green" : "blue");
        setSelectedIcon("tag");
      }
      setLocalError(null);
    }
  }, [visible, categoryToEdit, initialType]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setLocalError("Category name is required.");
      return;
    }

    setLocalError(null);
    const success = await onSave(
      {
        name: trimmed,
        type,
        color: selectedColor,
        icon: selectedIcon,
      },
      categoryToEdit?.id,
    );

    if (success) {
      onClose();
    }
  };

  const displayError = localError || error;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Dismiss category form"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheetContainer,
            isDesktop && styles.sheetContainerDesktop,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>
              {categoryToEdit ? "Edit Category" : "New Category"}
            </Text>
            <Pressable
              accessibilityLabel="Close category form"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {displayError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Category Type Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>CATEGORY TYPE</Text>
              <View style={styles.typeSegment}>
                <Pressable
                  accessibilityLabel="Expense category"
                  accessibilityRole="button"
                  disabled={Boolean(categoryToEdit?.isSystem)}
                  onPress={() => setType("expense")}
                  style={[
                    styles.typeOption,
                    type === "expense" && styles.typeOptionActiveExpense,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      type === "expense" && styles.typeOptionTextActive,
                    ]}
                  >
                    Expense
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityLabel="Income category"
                  accessibilityRole="button"
                  disabled={Boolean(categoryToEdit?.isSystem)}
                  onPress={() => setType("income")}
                  style={[
                    styles.typeOption,
                    type === "income" && styles.typeOptionActiveIncome,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      type === "income" && styles.typeOptionTextActive,
                    ]}
                  >
                    Income
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Category Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>CATEGORY NAME</Text>
              <TextInput
                accessibilityLabel="Category name"
                autoFocus={!categoryToEdit}
                maxLength={50}
                onChangeText={setName}
                placeholder="e.g. Subscriptions, Groceries"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.textInput}
                value={name}
              />
            </View>

            {/* Color Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>THEME COLOR</Text>
              <View style={styles.colorPalette}>
                {CATEGORY_COLOR_KEYS.map((colKey) => {
                  const hex = theme.colors.categorical[colKey];
                  const isSelected = selectedColor === colKey;

                  return (
                    <Pressable
                      key={colKey}
                      accessibilityLabel={`Select color ${colKey}`}
                      accessibilityRole="button"
                      onPress={() => setSelectedColor(colKey)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: hex },
                        isSelected && styles.colorSwatchSelected,
                      ]}
                    >
                      {isSelected ? <View style={styles.colorCheckDot} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Icon Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>CATEGORY ICON</Text>
              <Pressable
                accessibilityLabel="Choose category icon"
                accessibilityRole="button"
                onPress={() => setIsIconPickerOpen(true)}
                style={styles.iconSelectTrigger}
              >
                <View style={styles.iconPreviewLeft}>
                  <View
                    style={[
                      styles.iconPreviewBadge,
                      {
                        backgroundColor: `${categoricalColor}22`,
                        borderColor: `${categoricalColor}55`,
                      },
                    ]}
                  >
                    <IconHelper
                      color={categoricalColor}
                      name={selectedIcon}
                      size={22}
                    />
                  </View>
                  <View style={styles.iconInfoCol}>
                    <Text style={styles.iconNameText}>{selectedIcon}</Text>
                    <Text style={styles.iconSubtext}>
                      Tap to browse 100+ icons in library
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.changeIconBadge,
                    { borderColor: `${categoricalColor}66` },
                  ]}
                >
                  <Text style={[styles.changeIconBadgeText, { color: categoricalColor }]}>
                    Change ▾
                  </Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityLabel={pending ? "Saving..." : "Save Category"}
              accessibilityRole="button"
              disabled={pending}
              onPress={handleSave}
              style={[styles.saveBtn, pending && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveBtnText}>
                {pending ? "Saving..." : "Save Category"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <IconPickerModal
        onClose={() => setIsIconPickerOpen(false)}
        onSelectIcon={setSelectedIcon}
        selectedIcon={selectedIcon}
        themeColor={categoricalColor}
        title="Select Category Icon"
        visible={isIconPickerOpen}
      />
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      maxHeight: "90%",
      paddingHorizontal: 20,
      paddingTop: 16,
      width: "100%",
      ...theme.shadows.modal,
    },
    sheetContainerDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 460,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    closeBtn: {
      alignItems: "center",
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    closeBtnText: {
      color: theme.colors.textMuted,
      fontSize: 16,
      fontWeight: "bold",
    },
    errorBox: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: theme.colors.danger,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 12,
      padding: 10,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: "500",
    },
    scrollBody: {
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    typeSegment: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      overflow: "hidden",
      padding: 3,
    },
    typeOption: {
      alignItems: "center",
      borderRadius: 9,
      flex: 1,
      paddingVertical: 8,
    },
    typeOptionActiveExpense: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
      borderWidth: 1,
    },
    typeOptionActiveIncome: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
      borderWidth: 1,
    },
    typeOptionText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
    typeOptionTextActive: {
      color: theme.colors.textPrimary,
      fontWeight: "700",
    },
    textInput: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.borderStrong,
      borderRadius: 12,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: 15,
      minHeight: 46,
      paddingHorizontal: 14,
    },
    colorPalette: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    colorSwatch: {
      alignItems: "center",
      borderRadius: 18,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    colorSwatchSelected: {
      borderColor: "#FFFFFF",
      borderWidth: 2.5,
      transform: [{ scale: 1.1 }],
    },
    colorCheckDot: {
      backgroundColor: "#FFFFFF",
      borderRadius: 3,
      height: 6,
      width: 6,
    },
    iconGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    iconSelectTrigger: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 58,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    iconPreviewLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    iconPreviewBadge: {
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    iconInfoCol: {
      flex: 1,
    },
    iconNameText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    iconSubtext: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    changeIconBadge: {
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    changeIconBadgeText: {
      fontSize: 12,
      fontWeight: "600",
    },
    footerRow: {
      flexDirection: "row",
      gap: 10,
      paddingTop: 8,
    },
    cancelBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flex: 1,
      height: 46,
      justifyContent: "center",
    },
    cancelBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
    saveBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      flex: 2,
      height: 46,
      justifyContent: "center",
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
