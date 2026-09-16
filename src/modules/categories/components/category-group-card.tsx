import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconHelper } from "@/components/icon-helper";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useResolveEntityColor } from "@/modules/hex-colors";
import type { Category } from "../types/category.types";

export interface CategoryGroupCardProps {
  group: Category;
  isExpanded: boolean;
  canDeleteGroup: boolean;
  onToggleExpand: () => void;
  onReorderSubcategories: () => void;
  onAddSubcategory: () => void;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
  onEditSubcategory: (sub: Category) => void;
  onDeleteSubcategory: (sub: Category) => void;
}

export function CategoryGroupCard({
  group,
  isExpanded,
  canDeleteGroup,
  onToggleExpand,
  onReorderSubcategories,
  onAddSubcategory,
  onEditGroup,
  onDeleteGroup,
  onEditSubcategory,
  onDeleteSubcategory,
}: CategoryGroupCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();

  const subcategories = group.subcategories ?? [];
  const hasSub = subcategories.length > 0;
  const groupColor = resolveEntityColor(group.color);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel={`${isExpanded ? "Collapse" : "Expand"} ${group.name}`}
          accessibilityRole="button"
          disabled={!hasSub}
          onPress={hasSub ? onToggleExpand : undefined}
          style={({ pressed }) => [
            styles.headerMain,
            pressed && hasSub && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.groupIconBadge,
              {
                backgroundColor: `${groupColor}18`,
                borderColor: `${groupColor}45`,
              },
            ]}
          >
            <IconHelper color={groupColor} name={group.icon ?? "tag"} size={22} />
          </View>

          <View style={styles.titleCol}>
            <Text numberOfLines={2} style={styles.groupName}>
              {group.name}
            </Text>
            <Text style={styles.subCount}>
              {hasSub
                ? `${subcategories.length} subcategor${subcategories.length === 1 ? "y" : "ies"}`
                : "No subcategories"}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          {hasSub ? (
            <Pressable
              accessibilityLabel={`${isExpanded ? "Collapse" : "Expand"} ${group.name}`}
              accessibilityRole="button"
              onPress={onToggleExpand}
              style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
            >
              <IconHelper
                color={theme.colors.textSecondary}
                name={isExpanded ? "chevron-down" : "chevron-right"}
                size={20}
              />
            </Pressable>
          ) : null}

          {hasSub && subcategories.length > 1 ? (
            <Pressable
              accessibilityLabel={`Reorder subcategories in ${group.name}`}
              accessibilityRole="button"
              onPress={onReorderSubcategories}
              style={({ pressed }) => [
                styles.tintedAction,
                {
                  backgroundColor: `${groupColor}14`,
                  borderColor: `${groupColor}30`,
                },
                pressed && styles.pressed,
              ]}
            >
              <IconHelper color={groupColor} name="arrow-up-down" size={15} />
            </Pressable>
          ) : null}

          <Pressable
            accessibilityLabel={`Add subcategory to ${group.name}`}
            accessibilityRole="button"
            onPress={onAddSubcategory}
            style={({ pressed }) => [
              styles.tintedAction,
              {
                backgroundColor: `${groupColor}18`,
                borderColor: `${groupColor}35`,
              },
              pressed && styles.pressed,
            ]}
          >
            <IconHelper color={groupColor} name="plus" size={16} />
          </Pressable>

          <Pressable
            accessibilityLabel={`Edit ${group.name}`}
            accessibilityRole="button"
            onPress={onEditGroup}
            style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
          >
            <IconHelper color={theme.colors.textSecondary} name="pencil" size={18} />
          </Pressable>

          {canDeleteGroup ? (
            <Pressable
              accessibilityLabel={`Delete ${group.name}`}
              accessibilityRole="button"
              onPress={onDeleteGroup}
              style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}
            >
              <IconHelper color={theme.colors.danger} name="trash-2" size={18} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {hasSub && isExpanded ? (
        <View style={styles.subList}>
          {subcategories.map((sub) => {
            const subColor = resolveEntityColor(sub.color, groupColor);

            return (
              <View key={sub.id} style={styles.subRow}>
                <View style={styles.subMain}>
                  <View
                    style={[
                      styles.subIconBadge,
                      {
                        backgroundColor: `${subColor}14`,
                        borderColor: `${subColor}28`,
                      },
                    ]}
                  >
                    <IconHelper color={subColor} name={sub.icon ?? "tag"} size={15} />
                  </View>
                  <Text numberOfLines={1} style={styles.subName}>
                    {sub.name}
                  </Text>
                </View>

                <View style={styles.subActions}>
                  <Pressable
                    accessibilityLabel={`Edit subcategory ${sub.name}`}
                    accessibilityRole="button"
                    onPress={() => onEditSubcategory(sub)}
                    style={({ pressed }) => [styles.subIconAction, pressed && styles.pressed]}
                  >
                    <IconHelper color={theme.colors.textMuted} name="pencil" size={16} />
                  </Pressable>

                  <Pressable
                    accessibilityLabel={`Delete subcategory ${sub.name}`}
                    accessibilityRole="button"
                    onPress={() => onDeleteSubcategory(sub)}
                    style={({ pressed }) => [styles.subIconAction, pressed && styles.pressed]}
                  >
                    <IconHelper color={theme.colors.danger} name="trash-2" size={16} />
                  </Pressable>
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
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      paddingBottom: theme.spacing.sm,
      ...theme.shadows.card,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    headerMain: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minWidth: 0,
    },
    groupIconBadge: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      height: 48,
      justifyContent: "center",
      width: 48,
    },
    titleCol: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    groupName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.lineHeight.base,
    },
    subCount: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    iconAction: {
      alignItems: "center",
      height: 36,
      justifyContent: "center",
      width: 28,
    },
    tintedAction: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small + 2,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    subList: {
      gap: 2,
      paddingBottom: theme.spacing.xs,
      paddingLeft: theme.spacing.xl,
      paddingRight: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    subRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 48,
      paddingVertical: 6,
    },
    subMain: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minWidth: 0,
      paddingRight: theme.spacing.sm,
    },
    subIconBadge: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small + 2,
      borderWidth: 1,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    subName: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    subActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    subIconAction: {
      alignItems: "center",
      height: 34,
      justifyContent: "center",
      width: 30,
    },
    pressed: {
      opacity: 0.68,
    },
  });
}
