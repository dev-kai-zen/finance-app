import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, ChevronRight, Search, X } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { IconHelper } from "./icon-helper";
import type { Category, CategoryType } from "@/modules/categories/types/category.types";
import { useResolveEntityColor } from "@/modules/hex-colors";

export interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelectCategory: (category: Category) => void;
  type?: CategoryType;
  title?: string;
}

export function CategoryPickerModal({
  visible,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
  type,
  title = "Select Category",
}: CategoryPickerModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<CategoryType>(type ?? "expense");

  // Synchronize internal type tab with prop if changed
  React.useEffect(() => {
    if (type) {
      setSelectedType(type);
    }
  }, [type]);

  // Organize categories into parent list with nested subcategories
  const hierarchicalCategories = useMemo(() => {
    // Separate parents and children if the list is flat or already nested
    const parents: Category[] = [];
    const childrenMap = new Map<string, Category[]>();

    for (const cat of categories) {
      if (cat.parentId) {
        const list = childrenMap.get(cat.parentId) || [];
        list.push(cat);
        childrenMap.set(cat.parentId, list);
      } else {
        // Clone to not mutate
        parents.push({
          ...cat,
          subcategories: cat.subcategories ? [...cat.subcategories] : [],
        });
      }
    }

    // Attach children to parents
    for (const parent of parents) {
      const extraChildren = childrenMap.get(parent.id);
      if (extraChildren && extraChildren.length > 0) {
        const existingIds = new Set((parent.subcategories || []).map((c) => c.id));
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

  // Filter categories by type and search query
  const filteredCategories = useMemo((): Category[] => {
    const effectiveType = type ?? selectedType;
    const list = hierarchicalCategories.filter((cat) => cat.type === effectiveType);

    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;

    // Filter parents and their subcategories
    const result: Category[] = [];
    for (const parent of list) {
      const parentMatches = parent.name.toLowerCase().includes(query);
      const matchingSubs = (parent.subcategories || []).filter((sub) =>
        sub.name.toLowerCase().includes(query),
      );

      if (parentMatches || matchingSubs.length > 0) {
        result.push({
          ...parent,
          // If parent matches, show all subs; if not, show only matching subs
          subcategories: parentMatches ? parent.subcategories : matchingSubs,
        });
      }
    }
    return result;
  }, [hierarchicalCategories, type, selectedType, searchQuery]);

  const handleSelect = (category: Category) => {
    onSelectCategory(category);
    setSearchQuery("");
    onClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  const resolveEntityColor = useResolveEntityColor();
  const getCategoryColor = (colorKey: string | null) => resolveEntityColor(colorKey);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.scrim} onPress={handleClose} />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>
                Select a category or subcategory
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              accessibilityLabel="Close category picker"
              accessibilityRole="button"
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Type Toggle Tabs if not fixed by prop */}
          {!type && (
            <View style={styles.typeTabsContainer}>
              <TouchableOpacity
                onPress={() => setSelectedType("expense")}
                style={[
                  styles.typeTab,
                  selectedType === "expense" && styles.activeTypeTabExpense,
                ]}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    selectedType === "expense" && styles.activeTypeTabText,
                  ]}
                >
                  Expenses
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedType("income")}
                style={[
                  styles.typeTab,
                  selectedType === "income" && styles.activeTypeTabIncome,
                ]}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    selectedType === "income" && styles.activeTypeTabText,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search
              size={18}
              color={theme.colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search category or subcategory..."
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
              clearButtonMode="while-editing"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && Platform.OS !== "ios" && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearSearchBtn}
              >
                <X size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Categories Hierarchical List */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredCategories.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No categories found</Text>
                <Text style={styles.emptyStateDesc}>
                  {searchQuery
                    ? `No categories matching "${searchQuery}"`
                    : "No categories available"}
                </Text>
              </View>
            ) : (
              filteredCategories.map((parent) => {
                const color = getCategoryColor(parent.color);
                const isParentSelected = selectedCategoryId === parent.id;
                const hasSubcategories =
                  parent.subcategories && parent.subcategories.length > 0;

                return (
                  <View key={parent.id} style={styles.categoryCard}>
                    {/* Parent Row */}
                    <TouchableOpacity
                      onPress={() => handleSelect(parent)}
                      activeOpacity={0.7}
                      style={[
                        styles.parentRow,
                        isParentSelected && styles.selectedParentRow,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Category ${parent.name}`}
                    >
                      <View style={styles.parentLeft}>
                        <View
                          style={[
                            styles.categoryIconWrap,
                            {
                              backgroundColor: `${color}18`,
                              borderColor: `${color}35`,
                            },
                          ]}
                        >
                          <IconHelper
                            name={parent.icon ?? "tag"}
                            size={18}
                            color={color}
                          />
                        </View>
                        <View style={styles.parentTextCol}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.parentName,
                              isParentSelected && styles.selectedText,
                            ]}
                          >
                            {parent.name}
                          </Text>
                          {hasSubcategories && (
                            <Text style={styles.subCountText}>
                              {parent.subcategories!.length}{" "}
                              {parent.subcategories!.length === 1
                                ? "subcategory"
                                : "subcategories"}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.parentRight}>
                        {isParentSelected ? (
                          <View style={styles.checkBadge}>
                            <Check
                              size={14}
                              color={theme.colors.surface}
                              strokeWidth={3}
                            />
                          </View>
                        ) : (
                          <View style={styles.selectParentBadge}>
                            <Text style={styles.selectParentText}>Select</Text>
                            <ChevronRight
                              size={14}
                              color={theme.colors.textMuted}
                            />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Subcategories Grid / Chips */}
                    {hasSubcategories && (
                      <View style={styles.subcategoriesContainer}>
                        <View style={styles.subDivider} />
                        <View style={styles.subGrid}>
                          {parent.subcategories!.map((sub) => {
                            const isSubSelected =
                              selectedCategoryId === sub.id;

                            return (
                              <TouchableOpacity
                                key={sub.id}
                                onPress={() => handleSelect(sub)}
                                activeOpacity={0.7}
                                style={[
                                  styles.subChip,
                                  isSubSelected && styles.selectedSubChip,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Subcategory ${sub.name}`}
                              >
                                <View
                                  style={[
                                    styles.subDot,
                                    { backgroundColor: color },
                                    isSubSelected && styles.selectedSubDot,
                                  ]}
                                />
                                <Text
                                  numberOfLines={1}
                                  style={[
                                    styles.subChipText,
                                    isSubSelected && styles.selectedSubChipText,
                                  ]}
                                >
                                  {sub.name}
                                </Text>
                                {isSubSelected && (
                                  <Check
                                    size={12}
                                    color={theme.colors.primary}
                                    strokeWidth={3}
                                    style={{ marginLeft: 4 }}
                                  />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
      maxHeight: "75%",
      minHeight: "55%",
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
    headerTextCol: {
      flex: 1,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: theme.typography.fontWeight.bold,
    },
    headerSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    closeBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    typeTabsContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      padding: 4,
    },
    typeTab: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      flex: 1,
      paddingVertical: 8,
    },
    activeTypeTabExpense: {
      backgroundColor: theme.colors.danger,
    },
    activeTypeTabIncome: {
      backgroundColor: theme.colors.success,
    },
    typeTabText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    activeTypeTabText: {
      color: "#FFFFFF",
    },
    searchContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      height: 44,
    },
    searchIcon: {
      marginRight: theme.spacing.sm,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
      height: "100%",
    },
    clearSearchBtn: {
      padding: 4,
    },
    scrollList: {
      flex: 1,
      marginTop: theme.spacing.sm,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    categoryCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    parentRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 56,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    selectedParentRow: {
      backgroundColor: `${theme.colors.primary}12`,
    },
    parentLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      marginRight: theme.spacing.sm,
    },
    categoryIconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    parentTextCol: {
      flex: 1,
    },
    parentName: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    selectedText: {
      color: theme.colors.primary,
    },
    subCountText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    parentRight: {
      alignItems: "center",
      flexDirection: "row",
    },
    selectParentBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      flexDirection: "row",
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    selectParentText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
    },
    checkBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      height: 22,
      justifyContent: "center",
      width: 22,
    },
    subcategoriesContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    subDivider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginBottom: theme.spacing.sm,
    },
    subGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    subChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    selectedSubChip: {
      backgroundColor: `${theme.colors.primary}18`,
      borderColor: theme.colors.primary,
    },
    subDot: {
      borderRadius: 3,
      height: 6,
      marginRight: 6,
      width: 6,
    },
    selectedSubDot: {
      backgroundColor: theme.colors.primary,
    },
    subChipText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.medium,
    },
    selectedSubChipText: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: theme.spacing.xxl,
    },
    emptyStateTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: 4,
    },
    emptyStateDesc: {
      color: theme.colors.textMuted,
      fontSize: 13,
      textAlign: "center",
    },
  });
}
