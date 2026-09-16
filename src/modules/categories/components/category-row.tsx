import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { IconHelper } from "@/components";
import { useResolveEntityColor } from "@/modules/hex-colors";
import type { Category } from "../types/category.types";

export interface CategoryRowProps {
  category: Category;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  onAddSubcategory?: (parentCategory: Category) => void;
  onEditSubcategory?: (subcategory: Category, parentCategory: Category) => void;
  onDeleteSubcategory?: (subcategory: Category) => void;
}

export function CategoryRow({
  category,
  onEdit,
  onDelete,
  onAddSubcategory,
  onEditSubcategory,
  onDeleteSubcategory,
}: CategoryRowProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();
  const categoricalColor = resolveEntityColor(category.color);

  const subcategories = category.subcategories ?? [];
  const hasSubcategories = subcategories.length > 0;

  return (
    <View style={styles.cardContainer}>
      {/* Main Category Header Row */}
      <View style={styles.mainRow}>
        <View style={styles.leftContent}>
          {/* Categorical Icon / Dot Badge */}
          <View
            style={[
              styles.badge,
              {
                backgroundColor: `${categoricalColor}22`,
                borderColor: `${categoricalColor}55`,
              },
            ]}
          >
            <IconHelper color={categoricalColor} name={category.icon} size={20} />
          </View>

          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText} numberOfLines={1}>
                {category.name}
              </Text>
              {category.isSystem ? (
                <View style={styles.systemTag}>
                  <Text style={styles.systemTagText}>Default</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.typeText}>
              {category.type === "income" ? "Income" : "Expense"}
              {hasSubcategories
                ? ` • ${subcategories.length} subcategor${subcategories.length === 1 ? "y" : "ies"}`
                : ""}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {onAddSubcategory ? (
            <Pressable
              accessibilityLabel={`Add subcategory to ${category.name}`}
              accessibilityRole="button"
              onPress={() => onAddSubcategory(category)}
              style={({ pressed }) => [styles.addSubBtn, pressed && styles.actionBtnPressed]}
            >
              <Text style={styles.addSubBtnText}>+ Sub</Text>
            </Pressable>
          ) : null}

          {onEdit ? (
            <Pressable
              accessibilityLabel={`Edit ${category.name}`}
              accessibilityRole="button"
              onPress={() => onEdit(category)}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            >
              <Text style={styles.actionBtnText}>Edit</Text>
            </Pressable>
          ) : null}

          {!category.isSystem && onDelete ? (
            <Pressable
              accessibilityLabel={`Delete ${category.name}`}
              accessibilityRole="button"
              onPress={() => onDelete(category)}
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.actionBtnPressed]}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Subcategories Container */}
      {hasSubcategories ? (
        <View style={styles.subcategoriesSection}>
          {subcategories.map((sub, idx) => {
            const subColor = resolveEntityColor(sub.color, categoricalColor);

            return (
              <View
                key={sub.id}
                style={[
                  styles.subcategoryRow,
                  idx < subcategories.length - 1 && styles.subcategoryBorder,
                ]}
              >
                <View style={styles.subLeft}>
                  <Text style={styles.subTreeIcon}>↳</Text>
                  <View
                    style={[
                      styles.subBadge,
                      {
                        backgroundColor: `${subColor}18`,
                        borderColor: `${subColor}40`,
                      },
                    ]}
                  >
                    <IconHelper color={subColor} name={sub.icon ?? "tag"} size={14} />
                  </View>
                  <Text numberOfLines={1} style={styles.subNameText}>
                    {sub.name}
                  </Text>
                </View>

                <View style={styles.subActions}>
                  {onEditSubcategory ? (
                    <Pressable
                      accessibilityLabel={`Edit subcategory ${sub.name}`}
                      accessibilityRole="button"
                      onPress={() => onEditSubcategory(sub, category)}
                      style={({ pressed }) => [
                        styles.subActionBtn,
                        pressed && styles.actionBtnPressed,
                      ]}
                    >
                      <Text style={styles.subActionBtnText}>Edit</Text>
                    </Pressable>
                  ) : null}

                  {onDeleteSubcategory ? (
                    <Pressable
                      accessibilityLabel={`Delete subcategory ${sub.name}`}
                      accessibilityRole="button"
                      onPress={() => onDeleteSubcategory(sub)}
                      style={({ pressed }) => [
                        styles.subDeleteBtn,
                        pressed && styles.actionBtnPressed,
                      ]}
                    >
                      <Text style={styles.subDeleteBtnText}>✕</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    cardContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    mainRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      padding: theme.spacing.md,
    },
    leftContent: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    badge: {
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    infoCol: {
      flex: 1,
      gap: 2,
    },
    nameRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    nameText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    systemTag: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 4,
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    systemTagText: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    typeText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    actionRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    addSubBtn: {
      backgroundColor: `${theme.colors.primary}15`,
      borderColor: `${theme.colors.primary}45`,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    addSubBtnText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "700",
    },
    actionBtn: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    actionBtnPressed: {
      opacity: 0.7,
    },
    actionBtnText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "500",
    },
    deleteBtn: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    deleteBtnText: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: "500",
    },
    subcategoriesSection: {
      backgroundColor: theme.colors.surfaceMuted,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    subcategoryRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    subcategoryBorder: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    subLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 8,
    },
    subTreeIcon: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginLeft: 2,
    },
    subBadge: {
      alignItems: "center",
      borderRadius: 6,
      borderWidth: 1,
      height: 24,
      justifyContent: "center",
      width: 24,
    },
    subNameText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "500",
    },
    subActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    subActionBtn: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 6,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    subActionBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "500",
    },
    subDeleteBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 6,
      borderWidth: 1,
      height: 22,
      justifyContent: "center",
      width: 22,
    },
    subDeleteBtnText: {
      color: theme.colors.danger,
      fontSize: 11,
      fontWeight: "bold",
    },
  });
}
