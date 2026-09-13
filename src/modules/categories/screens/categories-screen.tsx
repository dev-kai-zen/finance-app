import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { PageContainer, PageEmptyState } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { isTabletOrDesktop, LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

interface CategoryItem {
  id: string;
  name: string;
  type: "expense" | "income";
  colorKey: keyof AppTheme["colors"]["categorical"];
  itemCount: number;
}

const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: "c1", name: "Salary & Wages", type: "income", colorKey: "green", itemCount: 12 },
  { id: "c2", name: "Client Retainers", type: "income", colorKey: "teal", itemCount: 8 },
  { id: "c3", name: "Investments & Dividends", type: "income", colorKey: "blue", itemCount: 4 },
  { id: "c4", name: "Groceries & Market", type: "expense", colorKey: "lime", itemCount: 28 },
  { id: "c5", name: "Electric & Water Utilities", type: "expense", colorKey: "amber", itemCount: 14 },
  { id: "c6", name: "Dining & Food Delivery", type: "expense", colorKey: "orange", itemCount: 32 },
  { id: "c7", name: "Transportation & Fuel", type: "expense", colorKey: "indigo", itemCount: 19 },
  { id: "c8", name: "Health & Medical", type: "expense", colorKey: "pink", itemCount: 6 },
  { id: "c9", name: "Subscriptions & SaaS", type: "expense", colorKey: "purple", itemCount: 9 },
];

export function CategoriesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const styles = useThemeStyles(createStyles);
  const [selectedType, setSelectedType] = useState<"all" | "expense" | "income">("all");

  const incomeCategories = INITIAL_CATEGORIES.filter((c) => c.type === "income");
  const expenseCategories = INITIAL_CATEGORIES.filter((c) => c.type === "expense");

  const handleAddCategory = () => {
    if (Platform.OS === "web") {
      window.alert("Add Category triggered. Ready for form modal integration.");
    } else {
      Alert.alert("Add Category", "Add Category triggered. Ready for form modal integration.");
    }
  };

  return (
    <PageContainer
      header={
        <PageHeader
          breadcrumb="Kaizen Finance / Categories"
          primaryAction={{
            label: "+ Add Category",
            onPress: handleAddCategory,
          }}
          subtitle="Classify your financial inflows and outflows for organized budgeting."
          title="Categories"
        />
      }
    >
      <View style={styles.container}>
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <Pressable
            accessibilityLabel="Filter All Categories"
            accessibilityRole="button"
            onPress={() => setSelectedType("all")}
            style={[styles.filterPill, selectedType === "all" && styles.filterPillActive]}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedType === "all" && styles.filterPillTextActive,
              ]}
            >
              All ({INITIAL_CATEGORIES.length})
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Filter Income Categories"
            accessibilityRole="button"
            onPress={() => setSelectedType("income")}
            style={[styles.filterPill, selectedType === "income" && styles.filterPillActive]}
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
          <Pressable
            accessibilityLabel="Filter Expense Categories"
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
              Expenses ({expenseCategories.length})
            </Text>
          </Pressable>
        </View>

        {/* Income Categories Section */}
        {(selectedType === "all" || selectedType === "income") && (
          <View style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>INCOME CATEGORIES</Text>
              <Text style={styles.groupCount}>{incomeCategories.length} categories</Text>
            </View>

            <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
              {incomeCategories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </View>
          </View>
        )}

        {/* Expense Categories Section */}
        {(selectedType === "all" || selectedType === "expense") && (
          <View style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>EXPENSE CATEGORIES</Text>
              <Text style={styles.groupCount}>{expenseCategories.length} categories</Text>
            </View>

            <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
              {expenseCategories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </View>
          </View>
        )}
      </View>
    </PageContainer>
  );
}

function CategoryCard({ category }: { category: CategoryItem }) {
  const styles = useThemeStyles(createStyles);
  const colorToken = useThemeStyles((theme) => theme.colors.categorical[category.colorKey]);

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.colorDot, { backgroundColor: colorToken }]} />
        <View>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryCount}>{category.itemCount} transactions</Text>
        </View>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{category.type}</Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xl,
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    filterPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: LAYOUT_DIMENSIONS.minTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    filterPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterPillText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    filterPillTextActive: {
      color: theme.colors.onPrimary,
    },
    groupSection: {
      gap: theme.spacing.md,
    },
    groupHeader: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingBottom: theme.spacing.sm,
    },
    groupTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
    },
    groupCount: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    grid: {
      flexDirection: "column",
      gap: theme.spacing.sm,
    },
    gridDesktop: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    card: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 56,
      minWidth: 260,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      ...theme.shadows.card,
    },
    cardLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    colorDot: {
      borderRadius: 5,
      height: 10,
      width: 10,
    },
    categoryName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    categoryCount: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    badge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
    },
    badgeText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
      textTransform: "capitalize",
    },
  });
}
