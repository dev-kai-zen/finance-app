import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageContainer, PageEmptyState } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { CategoryRow } from "../components/category-row";
import { CategoryFormModal } from "../components/category-form-modal";
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
  } = useCategories();

  const [selectedType, setSelectedType] = useState<"all" | "expense" | "income">("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const displayedCategories = categories.filter((c) => {
    if (selectedType === "all") return true;
    return c.type === selectedType;
  });

  const handleOpenCreate = () => {
    setCategoryToEdit(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (category: Category) => {
    setCategoryToEdit(category);
    setModalVisible(true);
  };

  const handleDelete = (category: Category) => {
    if (category.isSystem) {
      if (Platform.OS === "web") {
        window.alert("Default system categories cannot be deleted.");
      } else {
        Alert.alert("Protected Category", "Default system categories cannot be deleted.");
      }
      return;
    }

    const confirmMessage = `Are you sure you want to delete "${category.name}"? Any linked transactions will be safely reassigned to "Others".`;

    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) {
        void deleteCategory(category.id);
      }
    } else {
      Alert.alert("Delete Category", confirmMessage, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteCategory(category.id),
        },
      ]);
    }
  };

  return (
    <PageContainer
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Add New Category"
          onPress={handleOpenCreate}
        />
      }
      header={
        <PageHeader
          breadcrumb="Kaizen Finance / Categories"
          primaryAction={{
            label: "+ Add Category",
            onPress: handleOpenCreate,
          }}
          subtitle="Organize your inflows and outflows with theme-driven categorical indicators."
          title="Categories"
        />
      }
    >
      <View style={styles.container}>
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <Pressable
            accessibilityLabel={`Filter All Categories (${categories.length})`}
            accessibilityRole="button"
            onPress={() => setSelectedType("all")}
            style={[
              styles.filterPill,
              selectedType === "all" && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedType === "all" && styles.filterPillTextActive,
              ]}
            >
              All ({categories.length})
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel={`Filter Expense Categories (${expenseCategories.length})`}
            accessibilityRole="button"
            onPress={() => setSelectedType("expense")}
            style={[
              styles.filterPill,
              selectedType === "expense" && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedType === "expense" && styles.filterPillTextActive,
              ]}
            >
              Expense ({expenseCategories.length})
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel={`Filter Income Categories (${incomeCategories.length})`}
            accessibilityRole="button"
            onPress={() => setSelectedType("income")}
            style={[
              styles.filterPill,
              selectedType === "income" && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedType === "income" && styles.filterPillTextActive,
              ]}
            >
              Income ({incomeCategories.length})
            </Text>
          </Pressable>
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
        ) : displayedCategories.length === 0 ? (
          <PageEmptyState
            actionLabel="+ Add Your First Category"
            description="Create custom income or expense categories to organize your financial transactions."
            onAction={handleOpenCreate}
            title="No Categories Found"
          />
        ) : (
          <View style={[styles.categoriesGrid, isDesktop && styles.categoriesGridDesktop]}>
            {displayedCategories.map((category) => (
              <View
                key={category.id}
                style={[styles.categoryWrapper, isDesktop && styles.categoryWrapperDesktop]}
              >
                <CategoryRow
                  category={category}
                  onDelete={handleDelete}
                  onEdit={handleOpenEdit}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Category Create/Edit Modal */}
      <CategoryFormModal
        categoryToEdit={categoryToEdit}
        error={error}
        initialType={selectedType === "all" ? "expense" : (selectedType as CategoryType)}
        onClose={() => setModalVisible(false)}
        onSave={saveCategory}
        pending={saving}
        visible={modalVisible}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    filterPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    filterPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterPillText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    filterPillTextActive: {
      color: theme.colors.onPrimary,
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: theme.colors.danger,
      borderRadius: 12,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 14,
      fontWeight: "500",
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      gap: 12,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    categoriesGrid: {
      flexDirection: "column",
      gap: theme.spacing.md,
    },
    categoriesGridDesktop: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    categoryWrapper: {
      width: "100%",
    },
    categoryWrapperDesktop: {
      width: "48.5%",
    },
  });
}
