import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageContainer, PageEmptyState } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { SortableListModal, type SortableItem } from "@/components/sortable-list-modal";
import { FeatureNotImplementedModal } from "@/components/feature-not-implemented-modal";
import { IconHelper } from "@/components";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { CategoryGroupModal } from "../components/category-group-modal";
import { SubcategoryModal } from "../components/subcategory-modal";
import { useCategories } from "../hooks/use-categories";
import type { Category, CategoryType } from "../types/category.types";

export function CategoriesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const {
    categories,
    loading,
    saving,
    error,
    refresh,
    saveCategory,
    deleteCategory,
    reorderCategories,
    sortAlphabetically,
  } = useCategories();

  const [selectedType, setSelectedType] = useState<CategoryType>("expense");

  // Category Group Modal State
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<Category | null>(null);

  // Subcategory Modal State
  const [isSubModalVisible, setIsSubModalVisible] = useState(false);
  const [parentForSub, setParentForSub] = useState<Category | null>(null);
  const [subToEdit, setSubToEdit] = useState<Category | null>(null);

  // Reorder Modals State
  const [reorderGroupsVisible, setReorderGroupsVisible] = useState(false);
  const [reorderSubsVisible, setReorderSubsVisible] = useState(false);
  const [groupForSubReorder, setGroupForSubReorder] = useState<Category | null>(null);

  // Feature Not Implemented Modal State
  const [notImplementedVisible, setNotImplementedVisible] = useState(false);
  const [notImplementedTitle, setNotImplementedTitle] = useState("");
  const [notImplementedDesc, setNotImplementedDesc] = useState("");

  // Expand / collapse state for group cards (default all open)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const isGroupExpanded = (id: string) => {
    return expandedGroups[id] === undefined ? true : expandedGroups[id];
  };

  const currentCategories = categories.filter((c) => c.type === selectedType);

  // Group Handlers
  const handleCreateGroup = () => {
    setGroupToEdit(null);
    setIsGroupModalVisible(true);
  };

  const handleEditGroup = (group: Category) => {
    setGroupToEdit(group);
    setIsGroupModalVisible(true);
  };

  // Subcategory Handlers
  const handleAddSubcategory = (parentGroup: Category) => {
    setParentForSub(parentGroup);
    setSubToEdit(null);
    setIsSubModalVisible(true);
  };

  const handleEditSubcategory = (parentGroup: Category, sub: Category) => {
    setParentForSub(parentGroup);
    setSubToEdit(sub);
    setIsSubModalVisible(true);
  };

  const handleOpenReorderSubcategories = (group: Category) => {
    setGroupForSubReorder(group);
    setReorderSubsVisible(true);
  };

  const handleQuickSortAZ = () => {
    const doSort = async () => {
      await sortAlphabetically(selectedType, true);
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          `Sort all ${selectedType === "expense" ? "Expense" : "Income"} categories and subcategories A to Z?`,
        )
      ) {
        void doSort();
      }
    } else {
      Alert.alert(
        "Sort Alphabetically",
        `Sort all ${selectedType === "expense" ? "Expense" : "Income"} categories and subcategories A to Z?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sort A-Z", onPress: doSort },
        ],
      );
    }
  };

  const handleDelete = (category: Category, isGroup = false) => {
    if (category.isSystem) {
      if (Platform.OS === "web") {
        window.alert("Default system categories cannot be deleted.");
      } else {
        Alert.alert("Protected Category", "Default system categories cannot be deleted.");
      }
      return;
    }

    const title = isGroup ? "Delete Category Group?" : "Delete Subcategory?";
    const confirmMessage = isGroup
      ? `Are you sure you want to delete "${category.name}"? Any linked transactions will be safely reassigned to "Others".`
      : `Are you sure you want to delete subcategory "${category.name}"? Any linked transactions will be assigned to its parent or "Others".`;

    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) {
        void deleteCategory(category.id);
      }
    } else {
      Alert.alert(title, confirmMessage, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteCategory(category.id),
        },
      ]);
    }
  };

  const activeColor =
    selectedType === "expense" ? theme.colors.danger : theme.colors.success;

  return (
    <PageContainer
      floatingAction={
        <FloatingActionButton
          accessibilityLabel={`Add New ${selectedType === "expense" ? "Expense" : "Income"} Category Group`}
          onPress={handleCreateGroup}
        />
      }
      header={
        <PageHeader
          breadcrumb="Kaizen Finance / Categories"
          primaryAction={{
            label: "+ Add Group",
            onPress: handleCreateGroup,
          }}
          subtitle="Organize your inflows and outflows with theme-driven categorical indicators."
          title="Categories"
        />
      }
    >
      <View style={styles.container}>
        {/* Full-Width Type Switcher Bar (Kaizen Design) */}
        <View style={styles.tabContainer}>
          <View style={styles.tabSegmentWrapper}>
            <Pressable
              accessibilityLabel="Expense Categories"
              accessibilityRole="button"
              onPress={() => setSelectedType("expense")}
              style={[
                styles.tabBtn,
                selectedType === "expense" && styles.tabBtnExpense,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedType === "expense" && styles.tabTextActive,
                ]}
              >
                Expense Categories
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Income Categories"
              accessibilityRole="button"
              onPress={() => setSelectedType("income")}
              style={[
                styles.tabBtn,
                selectedType === "income" && styles.tabBtnIncome,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedType === "income" && styles.tabTextActive,
                ]}
              >
                Income Categories
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Count & Action Header (Kaizen Design) */}
        <View style={styles.headerInfo}>
          <View
            style={[
              styles.headerCountBadge,
              {
                backgroundColor: `${activeColor}18`,
                borderColor: `${activeColor}40`,
              },
            ]}
          >
            <IconHelper color={activeColor} name="layers" size={14} />
            <Text style={[styles.headerCountText, { color: activeColor }]}>
              {currentCategories.length}{" "}
              {selectedType === "expense" ? "Expense" : "Income"} Groups
            </Text>
          </View>

          <View style={styles.headerActions}>
            {currentCategories.length > 1 && (
              <>
                <Pressable
                  accessibilityLabel="Quick Sort A-Z"
                  accessibilityRole="button"
                  onPress={handleQuickSortAZ}
                  style={[
                    styles.headerActionBtn,
                    { borderColor: `${activeColor}40` },
                  ]}
                >
                  <IconHelper color={activeColor} name="arrow-down-a-z" size={14} />
                  <Text style={[styles.headerActionBtnText, { color: activeColor }]}>
                    Sort A-Z
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityLabel="Reorder Groups"
                  accessibilityRole="button"
                  onPress={() => setReorderGroupsVisible(true)}
                  style={[
                    styles.headerActionBtn,
                    { borderColor: `${activeColor}40` },
                  ]}
                >
                  <IconHelper color={activeColor} name="arrow-up-down" size={14} />
                  <Text style={[styles.headerActionBtnText, { color: activeColor }]}>
                    Reorder
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading categories from SQLite...</Text>
          </View>
        ) : currentCategories.length === 0 ? (
          <PageEmptyState
            actionLabel={`+ Add First ${selectedType === "expense" ? "Expense" : "Income"} Group`}
            description="Create custom category groups and nested subcategories to organize your financial transactions."
            onAction={handleCreateGroup}
            title={`No ${selectedType === "expense" ? "Expense" : "Income"} Categories Found`}
          />
        ) : (
          <View style={[styles.groupsList, isDesktop && styles.groupsListDesktop]}>
            {currentCategories.map((group) => {
              const subcategories = group.subcategories || [];
              const hasSub = subcategories.length > 0;
              const isExpanded = isGroupExpanded(group.id);

              const groupColor =
                group.color && group.color in theme.colors.categorical
                  ? theme.colors.categorical[
                      group.color as keyof AppTheme["colors"]["categorical"]
                    ]
                  : theme.colors.primary;

              return (
                <View key={group.id} style={styles.groupCard}>
                  {/* Category Group Header Row */}
                  <View style={styles.groupMainRow}>
                    <Pressable
                      accessibilityLabel={`Toggle ${group.name} subcategories`}
                      accessibilityRole="button"
                      onPress={() => hasSub && toggleExpand(group.id)}
                      style={styles.groupLeft}
                    >
                      {/* Icon Badge */}
                      <View
                        style={[
                          styles.groupIconBadge,
                          {
                            backgroundColor: `${groupColor}22`,
                            borderColor: `${groupColor}55`,
                          },
                        ]}
                      >
                        <IconHelper
                          color={groupColor}
                          name={group.icon}
                          size={20}
                        />
                      </View>

                      {/* Group Title and Subcategory Count */}
                      <View style={styles.groupTitleCol}>
                        <View style={styles.groupTitleRow}>
                          <Text numberOfLines={1} style={styles.groupNameText}>
                            {group.name}
                          </Text>
                          {group.isSystem ? (
                            <View style={styles.systemTag}>
                              <Text style={styles.systemTagText}>Default</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.subCountRow}>
                          <Text style={styles.subCountText}>
                            {hasSub
                              ? `${subcategories.length} subcategor${subcategories.length === 1 ? "y" : "ies"}`
                              : "No subcategories"}
                          </Text>
                          {hasSub ? (
                            <IconHelper
                              color={theme.colors.textMuted}
                              name={isExpanded ? "chevron-down" : "chevron-right"}
                              size={14}
                            />
                          ) : null}
                        </View>
                      </View>
                    </Pressable>

                    {/* Action Buttons for Group */}
                    <View style={styles.groupActions}>
                      {/* Reorder Subcategories button (if > 1 subcategories) */}
                      {hasSub && subcategories.length > 1 && (
                        <Pressable
                          accessibilityLabel={`Reorder subcategories in ${group.name}`}
                          accessibilityRole="button"
                          onPress={() => handleOpenReorderSubcategories(group)}
                          style={[
                            styles.actionIconBtn,
                            { backgroundColor: `${groupColor}15` },
                          ]}
                        >
                          <IconHelper
                            color={groupColor}
                            name="arrow-up-down"
                            size={14}
                          />
                        </Pressable>
                      )}

                      {/* Add Subcategory (+) */}
                      <Pressable
                        accessibilityLabel={`Add subcategory to ${group.name}`}
                        accessibilityRole="button"
                        onPress={() => handleAddSubcategory(group)}
                        style={[
                          styles.actionIconBtn,
                          styles.addSubBtn,
                          { backgroundColor: `${groupColor}20` },
                        ]}
                      >
                        <IconHelper color={groupColor} name="plus" size={15} />
                      </Pressable>

                      {/* Edit Group */}
                      <Pressable
                        accessibilityLabel={`Edit ${group.name}`}
                        accessibilityRole="button"
                        onPress={() => handleEditGroup(group)}
                        style={styles.actionIconBtn}
                      >
                        <IconHelper
                          color={theme.colors.textSecondary}
                          name="pencil"
                          size={15}
                        />
                      </Pressable>

                      {/* Delete Group (protected if system default) */}
                      {!group.isSystem && (
                        <Pressable
                          accessibilityLabel={`Delete ${group.name}`}
                          accessibilityRole="button"
                          onPress={() => handleDelete(group, true)}
                          style={[styles.actionIconBtn, styles.deleteActionBtn]}
                        >
                          <IconHelper
                            color={theme.colors.danger}
                            name="trash-2"
                            size={15}
                          />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Subcategories List (Expanded) */}
                  {hasSub && isExpanded && (
                    <View style={styles.subList}>
                      {subcategories.map((sub, idx) => {
                        const subColor =
                          sub.color && sub.color in theme.colors.categorical
                            ? theme.colors.categorical[
                                sub.color as keyof AppTheme["colors"]["categorical"]
                              ]
                            : groupColor;

                        return (
                          <View
                            key={sub.id}
                            style={[
                              styles.subRow,
                              idx < subcategories.length - 1 && styles.subRowBorder,
                            ]}
                          >
                            <View style={styles.subLeft}>
                              <Text style={styles.subTreeSymbol}>↳</Text>
                              <View
                                style={[
                                  styles.subIconWrap,
                                  {
                                    backgroundColor: `${subColor}18`,
                                    borderColor: `${subColor}40`,
                                  },
                                ]}
                              >
                                <IconHelper
                                  color={subColor}
                                  name={sub.icon ?? "tag"}
                                  size={14}
                                />
                              </View>
                              <Text numberOfLines={1} style={styles.subName}>
                                {sub.name}
                              </Text>
                            </View>

                            <View style={styles.subActions}>
                              <Pressable
                                accessibilityLabel={`Edit subcategory ${sub.name}`}
                                accessibilityRole="button"
                                onPress={() => handleEditSubcategory(group, sub)}
                                style={styles.subActionIconBtn}
                              >
                                <IconHelper
                                  color={theme.colors.textMuted}
                                  name="pencil"
                                  size={13}
                                />
                              </Pressable>

                              <Pressable
                                accessibilityLabel={`Delete subcategory ${sub.name}`}
                                accessibilityRole="button"
                                onPress={() => handleDelete(sub, false)}
                                style={[
                                  styles.subActionIconBtn,
                                  styles.subDeleteBtn,
                                ]}
                              >
                                <IconHelper
                                  color={theme.colors.danger}
                                  name="trash-2"
                                  size={13}
                                />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 1. Category Group Modal */}
      <CategoryGroupModal
        categoryToEdit={groupToEdit}
        error={error}
        initialType={selectedType}
        onClose={() => {
          setIsGroupModalVisible(false);
          setGroupToEdit(null);
        }}
        onSave={saveCategory}
        pending={saving}
        visible={isGroupModalVisible}
      />

      {/* 2. Subcategory Modal */}
      <SubcategoryModal
        error={error}
        onClose={() => {
          setIsSubModalVisible(false);
          setParentForSub(null);
          setSubToEdit(null);
        }}
        onSave={saveCategory}
        parentCategory={parentForSub}
        pending={saving}
        subcategoryToEdit={subToEdit}
        visible={isSubModalVisible}
      />

      {/* 3. Reorder Category Groups Modal */}
      {reorderGroupsVisible && (
        <SortableListModal
          items={currentCategories.map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon ?? "tag",
            color: c.color,
          }))}
          onClose={() => setReorderGroupsVisible(false)}
          onSave={async (orderedIds) => {
            setReorderGroupsVisible(false);
            await reorderCategories(orderedIds);
          }}
          title={`Reorder ${selectedType === "expense" ? "Expense" : "Income"} Groups`}
          visible={reorderGroupsVisible}
        />
      )}

      {/* 4. Reorder Subcategories Modal */}
      {reorderSubsVisible && groupForSubReorder && (
        <SortableListModal
          items={(groupForSubReorder.subcategories || []).map((s) => ({
            id: s.id,
            name: s.name,
            icon: s.icon ?? "tag",
            color: s.color ?? groupForSubReorder.color,
          }))}
          onClose={() => {
            setReorderSubsVisible(false);
            setGroupForSubReorder(null);
          }}
          onSave={async (orderedIds) => {
            setReorderSubsVisible(false);
            setGroupForSubReorder(null);
            await reorderCategories(orderedIds);
          }}
          title={`Reorder ${groupForSubReorder.name} Subcategories`}
          visible={reorderSubsVisible}
        />
      )}

      {/* Feature Under Integration Modal */}
      <FeatureNotImplementedModal
        featureDescription={notImplementedDesc}
        featureTitle={notImplementedTitle}
        onClose={() => setNotImplementedVisible(false)}
        visible={notImplementedVisible}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.md,
    },
    tabContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: 4,
    },
    tabSegmentWrapper: {
      flexDirection: "row",
      gap: 4,
    },
    tabBtn: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium - 2,
      flex: 1,
      justifyContent: "center",
      paddingVertical: 9,
    },
    tabBtnExpense: {
      backgroundColor: theme.colors.danger,
    },
    tabBtnIncome: {
      backgroundColor: theme.colors.success,
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "700",
    },
    tabTextActive: {
      color: "#FFFFFF",
    },
    headerInfo: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    headerCountBadge: {
      alignItems: "center",
      borderRadius: 20,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    headerCountText: {
      fontSize: 12,
      fontWeight: "700",
    },
    headerActions: {
      flexDirection: "row",
      gap: 8,
    },
    headerActionBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    headerActionBtnText: {
      fontSize: 12,
      fontWeight: "600",
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: theme.colors.danger,
      borderRadius: 8,
      borderWidth: 1,
      padding: 10,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: "500",
    },
    loadingContainer: {
      alignItems: "center",
      gap: 12,
      paddingVertical: 40,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    groupsList: {
      gap: 12,
    },
    groupsListDesktop: {
      maxWidth: 720,
    },
    groupCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    groupMainRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      padding: theme.spacing.md,
    },
    groupLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 12,
    },
    groupIconBadge: {
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    groupTitleCol: {
      flex: 1,
      gap: 2,
    },
    groupTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    groupNameText: {
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
    subCountRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    subCountText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    groupActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    actionIconBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    addSubBtn: {
      borderColor: "transparent",
    },
    deleteActionBtn: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: `${theme.colors.danger}40`,
    },
    subList: {
      backgroundColor: theme.colors.surfaceMuted,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    subRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    subRowBorder: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    subLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 8,
    },
    subTreeSymbol: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginLeft: 2,
    },
    subIconWrap: {
      alignItems: "center",
      borderRadius: 6,
      borderWidth: 1,
      height: 26,
      justifyContent: "center",
      width: 26,
    },
    subName: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "500",
    },
    subActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    subActionIconBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 6,
      borderWidth: 1,
      height: 24,
      justifyContent: "center",
      width: 24,
    },
    subDeleteBtn: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: `${theme.colors.danger}40`,
    },
  });
}
