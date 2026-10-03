import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  AlertCircle,
  AlertTriangle,
} from "lucide-react-native";
import {
  ConfirmModal,
  FloatingActionButton,
  NotificationModal,
  PageContainer,
  PageEmptyState,
} from "@/components";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import { BudgetCard } from "../components/budget-card";
import { BudgetFormModal } from "../components/budget-form-modal";
import { useBudgets } from "../hooks/use-budgets";
import type {
  BudgetFrequency,
  BudgetStatus,
  CategoryBudget,
  CategoryBudgetInput,
} from "../types/budget.types";

type FrequencyFilter = "all" | BudgetFrequency;

const FILTER_TABS: Array<{ key: FrequencyFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "custom_monthly", label: "Custom" },
  { key: "yearly", label: "Yearly" },
];

export function BudgetsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [selectedFilter, setSelectedFilter] = useState<FrequencyFilter>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<CategoryBudget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);

  const {
    budgets,
    budgetStatuses,
    summary,
    categories,
    loading,
    saving,
    error,
    saveBudget,
    toggleBudget,
    deleteBudget,
  } = useBudgets();

  // Filtered list
  const filteredStatuses = useMemo(() => {
    if (selectedFilter === "all") return budgetStatuses;
    return budgetStatuses.filter((s) => s.budget.frequency === selectedFilter);
  }, [budgetStatuses, selectedFilter]);

  const handleOpenCreate = () => {
    setBudgetToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (status: BudgetStatus) => {
    setBudgetToEdit(status.budget);
    setIsFormOpen(true);
  };

  const handleSave = async (input: CategoryBudgetInput) => {
    return saveBudget(input);
  };

  const handleDeleteFromForm = async (id: string): Promise<boolean> => {
    setBudgetToDelete(id);
    return true;
  };

  const handleConfirmDelete = async () => {
    if (budgetToDelete) {
      await deleteBudget(budgetToDelete);
      setBudgetToDelete(null);
    }
  };

  const overallClampedProgress = Math.min(summary.overallPercentage, 100);
  const isOverallExceeded = summary.totalSpentCents > summary.totalBudgetedCents;

  return (
    <PageContainer
      floatingAction={
        budgets.length > 0 ? (
          <FloatingActionButton
            accessibilityLabel="Set new category budget"
            onPress={handleOpenCreate}
          />
        ) : undefined
      }
    >
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading budgets from SQLite...</Text>
          </View>
        ) : budgets.length === 0 ? (
          <PageEmptyState
            actionLabel="+ Set Your First Category Budget"
            description="Control your spending with daily, weekly, or monthly limits per category with smart rollover."
            onAction={handleOpenCreate}
            title="No Budgets Configured"
          />
        ) : (
          <>
            {/* Overview Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryTitle}>Total Active Budget</Text>
                  <Text style={styles.summarySubtitle}>
                    {summary.activeCount} active categories budgeted
                  </Text>
                </View>
                <View style={styles.summaryBadgeRow}>
                  {summary.exceededCount > 0 && (
                    <View style={styles.exceededBadge}>
                      <AlertCircle color={theme.colors.danger} size={12} />
                      <Text style={styles.exceededBadgeText}>
                        {summary.exceededCount} Over Budget
                      </Text>
                    </View>
                  )}
                  {summary.nearLimitCount > 0 && (
                    <View style={styles.warningBadge}>
                      <AlertTriangle color={theme.colors.warning} size={12} />
                      <Text style={styles.warningBadgeText}>
                        {summary.nearLimitCount} Near Limit
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.summaryProgress}>
                <View style={styles.summaryProgressBar}>
                  <View
                    style={[
                      styles.summaryProgressFill,
                      {
                        width: `${overallClampedProgress}%`,
                        backgroundColor: isOverallExceeded
                          ? theme.colors.danger
                          : summary.overallPercentage >= 85
                            ? theme.colors.warning
                            : theme.colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Summary Metrics */}
              <View style={styles.summaryMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemLabel}>Spent</Text>
                  <Text
                    style={[
                      styles.metricItemValue,
                      {
                        color: isOverallExceeded
                          ? theme.colors.danger
                          : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {formatCurrency(summary.totalSpentCents, "PHP", false)}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemLabel}>Budgeted</Text>
                  <Text style={styles.metricItemValue}>
                    {formatCurrency(summary.totalBudgetedCents, "PHP", false)}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricItemLabel}>
                    {isOverallExceeded ? "Over by" : "Remaining"}
                  </Text>
                  <Text
                    style={[
                      styles.metricItemValue,
                      {
                        color: isOverallExceeded
                          ? theme.colors.danger
                          : theme.colors.success,
                      },
                    ]}
                  >
                    {formatCurrency(
                      Math.abs(summary.totalRemainingCents),
                      "PHP",
                      false,
                    )}
                  </Text>
                </View>
              </View>
            </View>

            {/* Frequency Filter Tabs */}
            <ScrollView
              contentContainerStyle={styles.filterScroll}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {FILTER_TABS.map((tab) => {
                const active = selectedFilter === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    accessibilityRole="button"
                    onPress={() => setSelectedFilter(tab.key)}
                    style={[
                      styles.filterTab,
                      active && styles.filterTabActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        active && styles.filterTabTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* List of Category Budgets */}
            {filteredStatuses.length === 0 ? (
              <View style={styles.noFilterResults}>
                <Text style={styles.noFilterResultsText}>
                  No {selectedFilter} budgets configured.
                </Text>
              </View>
            ) : (
              <View
                style={[styles.budgetList, isDesktop && styles.budgetListDesktop]}
              >
                {filteredStatuses.map((status) => (
                  <BudgetCard
                    key={status.budget.id}
                    onPress={() => handleOpenEdit(status)}
                    onToggle={(val) => toggleBudget(status.budget.id, val)}
                    status={status}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>


      {/* Budget Form Modal */}
      <BudgetFormModal
        categories={categories}
        existingBudgets={budgets}
        initialBudget={budgetToEdit}
        onClose={() => setIsFormOpen(false)}
        onDelete={handleDeleteFromForm}
        onSave={handleSave}
        pending={saving}
        visible={isFormOpen}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        confirmLabel="Remove Budget"
        message="Are you sure you want to remove this category budget? Past transactions will remain intact."
        onCancel={() => setBudgetToDelete(null)}
        onConfirm={handleConfirmDelete}
        pending={saving}
        title="Remove Budget"
        variant="destructive"
        visible={Boolean(budgetToDelete)}
      />

      {/* Notification Modal for error */}
      <NotificationModal
        message={error || ""}
        onClose={() => {}}
        title="Error"
        variant="error"
        visible={Boolean(error)}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl * 2,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
    },
    summaryTop: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    summaryTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    summarySubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    summaryBadgeRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    exceededBadge: {
      alignItems: "center",
      backgroundColor: `${theme.colors.danger}18`,
      borderRadius: theme.borderRadius.small,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    exceededBadgeText: {
      color: theme.colors.danger,
      fontSize: 11,
      fontWeight: "700",
    },
    warningBadge: {
      alignItems: "center",
      backgroundColor: `${theme.colors.warning}18`,
      borderRadius: theme.borderRadius.small,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    warningBadgeText: {
      color: theme.colors.warning,
      fontSize: 11,
      fontWeight: "700",
    },
    summaryProgress: {
      marginVertical: theme.spacing.sm,
    },
    summaryProgressBar: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 10,
      overflow: "hidden",
      width: "100%",
    },
    summaryProgressFill: {
      borderRadius: theme.borderRadius.round,
      height: "100%",
    },
    summaryMetrics: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    metricItem: {
      alignItems: "center",
      flex: 1,
    },
    metricItemLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    metricItemValue: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 2,
    },
    metricDivider: {
      backgroundColor: theme.colors.border,
      height: 24,
      width: 1,
    },
    filterScroll: {
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
      paddingVertical: 2,
    },
    filterTab: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    filterTabActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterTabText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    filterTabTextActive: {
      color: theme.colors.onPrimary,
    },
    budgetList: {
      gap: theme.spacing.xs,
    },
    budgetListDesktop: {
      display: "flex",
    },
    noFilterResults: {
      alignItems: "center",
      paddingVertical: theme.spacing.xl,
    },
    noFilterResultsText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
  });
}
