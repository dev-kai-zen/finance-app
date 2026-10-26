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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronRight, CornerDownRight, Search, Tag, X } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { IconHelper } from "@/components/icon-helper";
import type { Category, CategoryType } from "@/modules/categories";

export interface KaiCategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelectCategory: (category: Category) => void;
}

export function KaiCategoryPickerModal({
  visible,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
}: KaiCategoryPickerModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | CategoryType>("all");

  // Organize categories into hierarchical parents and subcategories
  const hierarchicalCategories = useMemo(() => {
    const parents: Category[] = [];
    const childrenMap = new Map<string, Category[]>();

    for (const cat of categories) {
      if (cat.parentId) {
        const list = childrenMap.get(cat.parentId) || [];
        list.push(cat);
        childrenMap.set(cat.parentId, list);
      } else {
        parents.push({
          ...cat,
          subcategories: cat.subcategories ? [...cat.subcategories] : [],
        });
      }
    }

    for (const parent of parents) {
      const extraChildren = childrenMap.get(parent.id);
      if (extraChildren && extraChildren.length > 0) {
        const existingIds = new Set(
          (parent.subcategories || []).map((c) => c.id),
        );
        for (const child of extraChildren) {
          if (!existingIds.has(child.id)) {
            parent.subcategories = parent.subcategories || [];
            parent.subcategories.push(child);
          }
        }
      }
    }

    return parents;
  }, [categories]);

  // Filtered by search and tab
  const filteredParents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return hierarchicalCategories
      .filter((p) => {
        if (filterType !== "all" && p.type !== filterType) return false;
        return true;
      })
      .map((parent) => {
        if (!q) return parent;

        const parentMatches = parent.name.toLowerCase().includes(q);
        const matchingSubs = (parent.subcategories || []).filter((s) =>
          s.name.toLowerCase().includes(q),
        );

        if (parentMatches) {
          return parent;
        }

        if (matchingSubs.length > 0) {
          return {
            ...parent,
            subcategories: matchingSubs,
          };
        }

        return null;
      })
      .filter((p): p is Category => p !== null);
  }, [hierarchicalCategories, searchQuery, filterType]);

  const handleSelect = (category: Category) => {
    onSelectCategory(category);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      visible={visible}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>
              {t("chatWithKai.pickerSelectCategory")}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={t("chatWithKai.cancel")}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={styles.closeBtn}
          >
            <X color={theme.colors.textMuted} size={22} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBoxWrap}>
          <View style={styles.searchBox}>
            <Search color={theme.colors.textMuted} size={18} />
            <TextInput
              autoCapitalize="none"
              onChangeText={setSearchQuery}
              placeholder={t("chatWithKai.pickerSearchCategory")}
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable hitSlop={6} onPress={() => setSearchQuery("")}>
                <X color={theme.colors.textMuted} size={16} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Type Segment Bar */}
        <View style={styles.segmentRow}>
          <Pressable
            onPress={() => setFilterType("all")}
            style={[
              styles.segmentBtn,
              filterType === "all" && styles.segmentBtnActive,
            ]}
          >
            <Text
              style={[
                styles.segmentBtnText,
                filterType === "all" && styles.segmentBtnTextActive,
              ]}
            >
              {t("chatWithKai.allCategories")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterType("expense")}
            style={[
              styles.segmentBtn,
              filterType === "expense" && styles.segmentBtnActiveExpense,
            ]}
          >
            <Text
              style={[
                styles.segmentBtnText,
                filterType === "expense" && {
                  color: "#EF4444",
                  fontWeight: "700",
                },
              ]}
            >
              {t("chatWithKai.actionExpense")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterType("income")}
            style={[
              styles.segmentBtn,
              filterType === "income" && styles.segmentBtnActiveIncome,
            ]}
          >
            <Text
              style={[
                styles.segmentBtnText,
                filterType === "income" && {
                  color: "#10B981",
                  fontWeight: "700",
                },
              ]}
            >
              {t("chatWithKai.actionIncome")}
            </Text>
          </Pressable>
        </View>

        {/* Category List */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filteredParents.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Tag color={theme.colors.textMuted} size={36} />
              <Text style={styles.emptyText}>
                {t("chatWithKai.noCategoriesFound")}
              </Text>
            </View>
          ) : (
            filteredParents.map((parent) => {
              const isParentSelected = selectedCategoryId === parent.id;
              const hasSubs =
                Boolean(parent.subcategories) &&
                (parent.subcategories?.length ?? 0) > 0;

              return (
                <View key={parent.id} style={styles.categoryGroupCard}>
                  {/* Parent Row */}
                  <Pressable
                    accessibilityLabel={parent.name}
                    accessibilityRole="button"
                    onPress={() => handleSelect(parent)}
                    style={({ pressed }) => [
                      styles.parentRow,
                      isParentSelected && styles.rowSelected,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View style={styles.rowLeft}>
                      <View
                        style={[
                          styles.iconBadge,
                          {
                            backgroundColor: `${theme.colors.primary}18`,
                            borderColor: `${theme.colors.primary}35`,
                          },
                        ]}
                      >
                        <IconHelper
                          color={theme.colors.primary}
                          name={parent.icon ?? "tag"}
                          size={18}
                        />
                      </View>
                      <View style={styles.nameColumn}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.parentName,
                            isParentSelected && {
                              color: theme.colors.primary,
                            },
                          ]}
                        >
                          {parent.name}
                        </Text>
                        <Text style={styles.typeBadge}>
                          {parent.type === "expense"
                            ? t("chatWithKai.actionExpense").toUpperCase()
                            : t("chatWithKai.actionIncome").toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {isParentSelected ? (
                      <View style={styles.checkBadge}>
                        <Check color={theme.colors.onPrimary} size={14} />
                      </View>
                    ) : (
                      <ChevronRight color={theme.colors.textMuted} size={16} />
                    )}
                  </Pressable>

                  {/* Subcategories (if any) */}
                  {hasSubs && (
                    <View style={styles.subsContainer}>
                      {parent.subcategories!.map((sub) => {
                        const isSubSelected = selectedCategoryId === sub.id;
                        return (
                          <Pressable
                            key={sub.id}
                            accessibilityLabel={sub.name}
                            accessibilityRole="button"
                            onPress={() => handleSelect(sub)}
                            style={({ pressed }) => [
                              styles.subRow,
                              isSubSelected && styles.subRowSelected,
                              pressed && styles.rowPressed,
                            ]}
                          >
                            <View style={styles.subLeft}>
                              <CornerDownRight
                                color={theme.colors.textMuted}
                                size={14}
                                style={styles.subCornerIcon}
                              />
                              <View
                                style={[
                                  styles.subIconBadge,
                                  {
                                    backgroundColor:
                                      theme.colors.surfaceElevated,
                                  },
                                ]}
                              >
                                <IconHelper
                                  color={theme.colors.textSecondary}
                                  name={sub.icon ?? parent.icon ?? "tag"}
                                  size={14}
                                />
                              </View>
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.subName,
                                  isSubSelected && {
                                    color: theme.colors.primary,
                                    fontWeight: "700",
                                  },
                                ]}
                              >
                                {sub.name}
                              </Text>
                            </View>

                            {isSubSelected && (
                              <View style={styles.checkBadge}>
                                <Check
                                  color={theme.colors.onPrimary}
                                  size={14}
                                />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerTitleBox: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceElevated,
    },
    searchBoxWrap: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: theme.colors.surface,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    segmentRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 8,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    segmentBtnActive: {
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: theme.colors.primary,
    },
    segmentBtnActiveExpense: {
      backgroundColor: "#EF444415",
      borderColor: "#EF4444",
    },
    segmentBtnActiveIncome: {
      backgroundColor: "#10B98115",
      borderColor: "#10B981",
    },
    segmentBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    segmentBtnTextActive: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    listContent: {
      padding: 16,
      paddingBottom: 40,
      gap: 12,
    },
    emptyWrap: {
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    categoryGroupCard: {
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
    },
    parentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rowSelected: {
      backgroundColor: `${theme.colors.primary}12`,
    },
    rowPressed: {
      backgroundColor: theme.colors.surfaceElevated,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 10,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    nameColumn: {
      flex: 1,
    },
    parentName: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    typeBadge: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    checkBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    subsContainer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: `${theme.colors.surfaceElevated}50`,
    },
    subRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: 20,
      paddingRight: 14,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    subRowSelected: {
      backgroundColor: `${theme.colors.primary}15`,
    },
    subLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 10,
    },
    subCornerIcon: {
      marginRight: 8,
    },
    subIconBadge: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    subName: {
      fontSize: 13,
      fontWeight: "500",
      color: theme.colors.textPrimary,
      flex: 1,
    },
  });
