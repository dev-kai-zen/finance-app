import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageContainer, PageEmptyState } from "@/components/page-container";
import { SortableListModal } from "@/components/sortable-list-modal";
import { ConfirmModal, IconHelper, InfoModal } from "@/components";
import { useResolveEntityColor } from "@/modules/hex-colors";
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
  const resolveEntityColor = useResolveEntityColor();

  const {
    categories,
    loading,
    saving,
    error,
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

  const [sortConfirmVisible, setSortConfirmVisible] = useState(false);
  const [protectedInfoVisible, setProtectedInfoVisible] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    category: Category;
    isGroup: boolean;
  } | null>(null);

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
    setSortConfirmVisible(true);
  };

  const handleConfirmSortAZ = async () => {
    await sortAlphabetically(selectedType, true);
    setSortConfirmVisible(false);
  };

  const handleDelete = (category: Category, isGroup = false) => {
    if (category.isSystem) {
      setProtectedInfoVisible(true);
      return;
    }

    setDeleteConfirm({ category, isGroup });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    await deleteCategory(deleteConfirm.category.id);
    setDeleteConfirm(null);
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

        {/* Category Group Toolbar */}
        <View style={styles.headerInfo}>
          <View
            style={styles.headerCountBadge}
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

            <Pressable
              accessibilityLabel={`New ${selectedType === "expense" ? "expense" : "income"} category group`}
              accessibilityRole="button"
              onPress={handleCreateGroup}
              style={({ pressed }) => [
                styles.newGroupBtn,
                { borderColor: activeColor },
                pressed && styles.headerActionPressed,
              ]}
            >
              <IconHelper color={activeColor} name="plus" size={15} />
              <Text style={[styles.headerActionBtnText, { color: activeColor }]}>New Group</Text>
            </Pressable>
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

              const groupColor = resolveEntityColor(group.color);

              return (
                <View key={group.id} style={styles.groupCard}>
                  {/* Category Group Header Row */}
                  <View style={styles.groupMainRow}>
                    <Pressable
                      accessibilityLabel={`Toggle ${group.name} subcategories`}
                      accessibilityRole="button"
                      onPress={() => hasSub && toggleExpand(group.id)}
                      style={({ pressed }) => [
                        styles.groupLeft,
                        pressed && styles.groupLeftPressed,
                      ]}
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
                        <Text numberOfLines={1} style={styles.groupNameText}>
                          {group.name}
                        </Text>
                        <Text style={styles.subCountText}>
                          {hasSub
                            ? `${subcategories.length} subcategor${subcategories.length === 1 ? "y" : "ies"}`
                            : "No subcategories"}
                        </Text>
                      </View>
                    </Pressable>

                    {hasSub ? (
                      <Pressable
                        accessibilityLabel={`${isExpanded ? "Collapse" : "Expand"} ${group.name} subcategories`}
                        accessibilityRole="button"
                        onPress={() => toggleExpand(group.id)}
                        style={({ pressed }) => [
                          styles.collapseBtn,
                          pressed && styles.groupActionPressed,
                        ]}
                      >
                        <IconHelper
                          color={theme.colors.textSecondary}
                          name={isExpanded ? "chevron-down" : "chevron-right"}
                          size={22}
                        />
                      </Pressable>
                    ) : null}

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
                        style={styles.plainActionBtn}
                      >
                        <IconHelper
                          color={theme.colors.textSecondary}
                          name="pencil"
                          size={20}
                        />
                      </Pressable>

                      {/* Delete Group (protected if system default) */}
                      {!group.isSystem && (
                        <Pressable
                          accessibilityLabel={`Delete ${group.name}`}
                          accessibilityRole="button"
                          onPress={() => handleDelete(group, true)}
                          style={styles.plainActionBtn}
                        >
                          <IconHelper
                            color={theme.colors.danger}
                            name="trash-2"
                            size={20}
                          />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Subcategories List (Expanded) */}
                  {hasSub && isExpanded && (
                    <View style={styles.subList}>
                      {subcategories.map((sub) => {
                        const subColor = resolveEntityColor(sub.color, groupColor);

                        return (
                          <View
                            key={sub.id}
                            style={styles.subRow}
                          >
                            <View style={styles.subLeft}>
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
                                  size={18}
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
                                  size={18}
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

      <ConfirmModal
        cancelLabel="Cancel"
        confirmLabel="Sort A-Z"
        message={`Sort all ${selectedType === "expense" ? "Expense" : "Income"} categories and subcategories A to Z?`}
        onCancel={() => setSortConfirmVisible(false)}
        onConfirm={() => {
          void handleConfirmSortAZ();
        }}
        title="Sort Alphabetically"
        variant="primary"
        visible={sortConfirmVisible}
      />

      <InfoModal
        buttonLabel="OK"
        message="Default system categories cannot be deleted."
        onClose={() => setProtectedInfoVisible(false)}
        title="Protected Category"
        visible={protectedInfoVisible}
      />

      <ConfirmModal
        cancelLabel="Cancel"
        confirmLabel="Delete"
        message={
          deleteConfirm?.isGroup
            ? `Are you sure you want to delete "${deleteConfirm.category.name}"? Any linked transactions will be safely reassigned to "Others".`
            : `Are you sure you want to delete subcategory "${deleteConfirm?.category.name ?? ""}"? Any linked transactions will be assigned to its parent or "Others".`
        }
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        title={
          deleteConfirm?.isGroup ? "Delete Category Group?" : "Delete Subcategory?"
        }
        variant="destructive"
        visible={deleteConfirm !== null}
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
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: 5,
    },
    tabSegmentWrapper: {
      flexDirection: "row",
      gap: 4,
    },
    tabBtn: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    tabBtnExpense: {
      backgroundColor: theme.colors.danger,
    },
    tabBtnIncome: {
      backgroundColor: theme.colors.success,
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "700",
    },
    tabTextActive: {
      color: theme.colors.onPrimary,
    },
    headerInfo: {
      gap: theme.spacing.sm,
    },
    headerCountBadge: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
      paddingVertical: 2,
    },
    headerCountText: {
      fontSize: 16,
      fontWeight: "700",
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    headerActionBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      minHeight: 42,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    newGroupBtn: {
      alignItems: "center",
      borderRadius: 8,
      borderWidth: 1.5,
      flexDirection: "row",
      gap: 5,
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    headerActionPressed: {
      opacity: 0.7,
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
      borderRadius: 24,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    groupMainRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
    },
    groupLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      minWidth: 0,
    },
    groupLeftPressed: {
      opacity: 0.72,
    },
    groupIconBadge: {
      alignItems: "center",
      borderRadius: 18,
      borderWidth: 1,
      height: 60,
      justifyContent: "center",
      width: 60,
    },
    groupTitleCol: {
      flex: 1,
      gap: 2,
    },
    groupNameText: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: "700",
    },
    subCountText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    collapseBtn: {
      alignItems: "center",
      height: 42,
      justifyContent: "center",
      width: 36,
    },
    groupActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    actionIconBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    addSubBtn: {
      borderColor: "transparent",
    },
    plainActionBtn: {
      alignItems: "center",
      height: 42,
      justifyContent: "center",
      width: 36,
    },
    groupActionPressed: {
      opacity: 0.65,
    },
    subList: {
      backgroundColor: theme.colors.surfaceMuted,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.sm,
    },
    subRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 56,
      paddingVertical: theme.spacing.xs,
    },
    subLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    subIconWrap: {
      alignItems: "center",
      borderRadius: 9,
      borderWidth: 1,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    subName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    subActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    subActionIconBtn: {
      alignItems: "center",
      height: 40,
      justifyContent: "center",
      width: 32,
    },
    subDeleteBtn: {
    },
  });
}
