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
import { PageContainer, PageEmptyState } from "@/components/page-container";
import { SortableListModal } from "@/components/sortable-list-modal";
import { ActionBottomSheet } from "@/components/action-bottom-sheet";
import { ConfirmModal } from "@/components/confirm-modal";
import { IconHelper } from "@/components/icon-helper";
import { InfoModal } from "@/components/info-modal";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { isProtectedCategoryId } from "../constants/categories.constants";
import { CategoryGroupCard } from "../components/category-group-card";
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
    saveCategory,
    deleteCategory,
    reorderCategories,
    loadCategoryPresets,
    deleteCategoryPresets,
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

  const [presetMenuVisible, setPresetMenuVisible] = useState(false);
  const [presetConfirm, setPresetConfirm] = useState<"load" | "delete" | null>(null);
  const [protectedInfoVisible, setProtectedInfoVisible] = useState(false);
  const [blockedGroupDelete, setBlockedGroupDelete] = useState<Category | null>(null);
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

  const handleDelete = (category: Category, isGroup = false) => {
    if (isProtectedCategoryId(category.id)) {
      setProtectedInfoVisible(true);
      return;
    }

    if (isGroup && (category.subcategories?.length ?? 0) > 0) {
      setBlockedGroupDelete(category);
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

  const handleConfirmPresetAction = async () => {
    if (!presetConfirm) return;
    const success =
      presetConfirm === "load"
        ? await loadCategoryPresets()
        : await deleteCategoryPresets();
    if (success) setPresetConfirm(null);
  };

  return (
    <PageContainer>
      <View style={styles.container}>
        {/* Category type chips */}
        <View style={styles.tabRow}>
          <Pressable
            accessibilityLabel="Expenses"
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
              Expenses
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Income"
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
              Income
            </Text>
          </Pressable>
        </View>

        {/* Category Group Toolbar */}
        <View style={styles.headerInfo}>
          <View style={styles.headerSummaryRow}>
            <View style={styles.headerCountBadge}>
              <IconHelper color={activeColor} name="layers" size={14} />
              <Text style={[styles.headerCountText, { color: activeColor }]}>
                {currentCategories.length}{" "}
                {selectedType === "expense" ? "Expense" : "Income"} Groups
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Manage category presets"
              accessibilityRole="button"
              onPress={() => setPresetMenuVisible(true)}
              style={({ pressed }) => [
                styles.presetsButton,
                pressed && styles.headerActionPressed,
              ]}
            >
              <IconHelper color={theme.colors.textSecondary} name="settings-2" size={20} />
            </Pressable>
          </View>

          <View style={styles.headerActions}>
            {currentCategories.length > 1 && (
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
                <Text style={[styles.headerActionBtnText, { color: activeColor }]}>Reorder</Text>
              </Pressable>
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
            title={`No ${selectedType === "expense" ? "Expense" : "Income"} Groups Found`}
          />
        ) : (
          <View style={[styles.groupsList, isDesktop && styles.groupsListDesktop]}>
            {currentCategories.map((group) => (
              <CategoryGroupCard
                key={group.id}
                canDeleteGroup={!isProtectedCategoryId(group.id)}
                group={group}
                isExpanded={isGroupExpanded(group.id)}
                onAddSubcategory={() => handleAddSubcategory(group)}
                onDeleteGroup={() => handleDelete(group, true)}
                onDeleteSubcategory={(sub) => handleDelete(sub, false)}
                onEditGroup={() => handleEditGroup(group)}
                onEditSubcategory={(sub) => handleEditSubcategory(group, sub)}
                onReorderSubcategories={() => handleOpenReorderSubcategories(group)}
                onToggleExpand={() => toggleExpand(group.id)}
              />
            ))}
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
          showAlphabetizeAction={false}
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
          showAlphabetizeAction={false}
          title={`Reorder ${groupForSubReorder.name} Subcategories`}
          visible={reorderSubsVisible}
        />
      )}

      <ActionBottomSheet
        items={[
          {
            id: "load-category-presets",
            label: "Load category presets",
            icon: <IconHelper color={theme.colors.success} name="download" size={20} />,
            onPress: () => setPresetConfirm("load"),
          },
          {
            id: "delete-category-presets",
            label: "Delete category presets",
            icon: <IconHelper color={theme.colors.danger} name="trash-2" size={20} />,
            onPress: () => setPresetConfirm("delete"),
          },
        ]}
        onClose={() => setPresetMenuVisible(false)}
        visible={presetMenuVisible}
      />

      <ConfirmModal
        cancelLabel="Cancel"
        confirmLabel={presetConfirm === "load" ? "Load presets" : "Delete presets"}
        message={
          presetConfirm === "load"
            ? "Load the built-in category groups and subcategories? Existing categories will not be overwritten."
            : "Delete all built-in category groups and subcategories? Your transactions will be reassigned safely."
        }
        onCancel={() => setPresetConfirm(null)}
        onConfirm={() => {
          void handleConfirmPresetAction();
        }}
        pending={saving}
        title={presetConfirm === "load" ? "Load Category Presets?" : "Delete Category Presets?"}
        variant={presetConfirm === "load" ? "primary" : "destructive"}
        visible={presetConfirm !== null}
      />

      <InfoModal
        buttonLabel="OK"
        message="Default system categories cannot be deleted."
        onClose={() => setProtectedInfoVisible(false)}
        title="Protected Category"
        visible={protectedInfoVisible}
      />

      <InfoModal
        buttonLabel="OK"
        message={
          blockedGroupDelete
            ? `This group contains ${blockedGroupDelete.subcategories?.length ?? 0} subcategor${blockedGroupDelete.subcategories?.length === 1 ? "y" : "ies"}. Delete the subcategor${blockedGroupDelete.subcategories?.length === 1 ? "y" : "ies"} first, then try deleting the group again.`
            : "Delete the subcategories first, then try deleting the group again."
        }
        onClose={() => setBlockedGroupDelete(null)}
        title="Cannot Delete Category Group"
        visible={blockedGroupDelete !== null}
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
      paddingTop: theme.spacing.sm,
    },
    tabRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    tabBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      paddingVertical: theme.spacing.sm,
    },
    tabBtnExpense: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
    },
    tabBtnIncome: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
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
    headerSummaryRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
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
    presetsButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 40,
      justifyContent: "center",
      width: 40,
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
  });
}
