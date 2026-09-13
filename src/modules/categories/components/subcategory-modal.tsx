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
import type { Category, CategoryInput } from "../types/category.types";

export interface SubcategoryModalProps {
  visible: boolean;
  onClose: () => void;
  parentCategory: Category | null;
  subcategoryToEdit?: Category | null;
  onSave: (input: CategoryInput, id?: string) => Promise<boolean>;
  pending?: boolean;
  error?: string | null;
}

export function SubcategoryModal({
  visible,
  onClose,
  parentCategory,
  subcategoryToEdit,
  onSave,
  pending = false,
  error = null,
}: SubcategoryModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("slate");
  const [selectedIcon, setSelectedIcon] = useState<string>("tag");
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const parentColor =
    parentCategory?.color && parentCategory.color in theme.colors.categorical
      ? theme.colors.categorical[
          parentCategory.color as keyof AppTheme["colors"]["categorical"]
        ]
      : theme.colors.primary;

  const categoricalColor =
    selectedColor in theme.colors.categorical
      ? theme.colors.categorical[selectedColor as keyof AppTheme["colors"]["categorical"]]
      : theme.colors.primary;

  useEffect(() => {
    if (visible) {
      if (subcategoryToEdit) {
        setName(subcategoryToEdit.name);
        setSelectedColor(subcategoryToEdit.color ?? parentCategory?.color ?? "slate");
        setSelectedIcon(subcategoryToEdit.icon ?? "tag");
      } else {
        setName("");
        setSelectedColor(parentCategory?.color ?? "slate");
        setSelectedIcon("tag");
      }
      setLocalError(null);
    }
  }, [visible, subcategoryToEdit, parentCategory]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setLocalError("Please enter a subcategory name.");
      return;
    }

    if (!parentCategory) {
      setLocalError("Parent category is required.");
      return;
    }

    setLocalError(null);
    const success = await onSave(
      {
        name: trimmed,
        type: parentCategory.type,
        color: selectedColor,
        icon: selectedIcon,
        parentId: parentCategory.id,
      },
      subcategoryToEdit?.id,
    );

    if (success) {
      onClose();
    }
  };

  const displayError = localError || error;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Dismiss subcategory modal"
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
              {subcategoryToEdit ? "Edit Subcategory" : "New Subcategory"}
            </Text>
            <Pressable
              accessibilityLabel="Close subcategory modal"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Parent Category Banner */}
          {parentCategory && (
            <View style={styles.parentBanner}>
              <View style={styles.parentBannerLeft}>
                <View
                  style={[
                    styles.parentBadge,
                    {
                      backgroundColor: `${parentColor}20`,
                      borderColor: `${parentColor}45`,
                    },
                  ]}
                >
                  <IconHelper
                    color={parentColor}
                    name={parentCategory.icon}
                    size={16}
                  />
                </View>
                <View>
                  <Text style={styles.parentBannerLabel}>PARENT CATEGORY</Text>
                  <Text style={styles.parentBannerName}>
                    {parentCategory.name}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.typePill,
                  {
                    backgroundColor:
                      parentCategory.type === "income"
                        ? `${theme.colors.success}20`
                        : `${theme.colors.danger}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typePillText,
                    {
                      color:
                        parentCategory.type === "income"
                          ? theme.colors.success
                          : theme.colors.danger,
                    },
                  ]}
                >
                  {parentCategory.type === "income" ? "Income" : "Expense"}
                </Text>
              </View>
            </View>
          )}

          {displayError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollBody}>
            {/* Subcategory Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>SUBCATEGORY NAME</Text>
              <TextInput
                maxLength={50}
                onChangeText={setName}
                placeholder="e.g. Groceries, Restaurants, Electricity, Gas..."
                placeholderTextColor={theme.colors.textMuted}
                style={styles.textInput}
                value={name}
              />
            </View>

            {/* Icon Picker Trigger */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>ICON</Text>
              <Pressable
                accessibilityLabel={`Selected icon: ${selectedIcon}. Tap to change.`}
                accessibilityRole="button"
                onPress={() => setIsIconPickerOpen(true)}
                style={styles.iconPreviewCard}
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
                    <Text style={styles.iconSubtext}>Tap to choose icon</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.changeIconBadge,
                    {
                      backgroundColor: `${theme.colors.primary}15`,
                      borderColor: `${theme.colors.primary}40`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.changeIconBadgeText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Change Icon
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Theme Color Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>THEME COLOR</Text>
              <View style={styles.colorPalette}>
                {CATEGORY_COLOR_KEYS.map((colorKey) => {
                  const hex =
                    colorKey in theme.colors.categorical
                      ? theme.colors.categorical[
                          colorKey as keyof AppTheme["colors"]["categorical"]
                        ]
                      : theme.colors.primary;
                  const isSelected = selectedColor === colorKey;

                  return (
                    <Pressable
                      key={colorKey}
                      accessibilityLabel={`Color ${colorKey}`}
                      accessibilityRole="button"
                      onPress={() => setSelectedColor(colorKey)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: hex },
                        isSelected && styles.colorSwatchSelected,
                      ]}
                    >
                      {isSelected ? (
                        <Text style={styles.colorCheckMark}>✓</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              disabled={pending}
              onPress={onClose}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityLabel={
                subcategoryToEdit ? "Update Subcategory" : "Create Subcategory"
              }
              accessibilityRole="button"
              disabled={pending}
              onPress={handleSave}
              style={[styles.saveBtn, pending && styles.saveBtnDisabled]}
            >
              <Text style={styles.saveBtnText}>
                {pending
                  ? "Saving..."
                  : subcategoryToEdit
                    ? "Update Subcategory"
                    : "Create Subcategory"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <IconPickerModal
        onClose={() => setIsIconPickerOpen(false)}
        onSelectIcon={(iconKey) => {
          setSelectedIcon(iconKey);
          setIsIconPickerOpen(false);
        }}
        selectedIcon={selectedIcon}
        visible={isIconPickerOpen}
      />
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      backgroundColor: "rgba(0, 0, 0, 0.7)",
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
      maxWidth: 480,
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
    parentBanner: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    parentBannerLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },
    parentBadge: {
      alignItems: "center",
      borderRadius: 8,
      borderWidth: 1,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    parentBannerLabel: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    parentBannerName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    typePill: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    typePillText: {
      fontSize: 11,
      fontWeight: "700",
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
    iconPreviewCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 12,
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
      height: 42,
      justifyContent: "center",
      width: 42,
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
    colorPalette: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    colorSwatch: {
      alignItems: "center",
      borderRadius: 18,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    colorSwatchSelected: {
      borderColor: theme.colors.surface,
      borderWidth: 3,
      ...theme.shadows.card,
    },
    colorCheckMark: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "bold",
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
