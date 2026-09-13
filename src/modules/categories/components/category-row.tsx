import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { Category } from "../types/category.types";

export interface CategoryRowProps {
  category: Category;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

export function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const categoricalColor =
    category.color && category.color in theme.colors.categorical
      ? theme.colors.categorical[category.color as keyof AppTheme["colors"]["categorical"]]
      : theme.colors.primary;

  const initialLetter = (category.name || "?").charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.leftContent}>
        {/* Categorical Icon / Dot Badge */}
        <View style={[styles.badge, { backgroundColor: `${categoricalColor}22`, borderColor: `${categoricalColor}55` }]}>
          <Text style={[styles.badgeText, { color: categoricalColor }]}>
            {initialLetter}
          </Text>
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
            {category.type === "income" ? "Income Category" : "Expense Category"}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
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
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      padding: theme.spacing.md,
      ...theme.shadows.card,
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
    badgeText: {
      fontSize: 17,
      fontWeight: "700",
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
    actionBtn: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 12,
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
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    deleteBtnText: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: "500",
    },
  });
}
