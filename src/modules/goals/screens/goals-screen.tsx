import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Target } from "lucide-react-native";
import {
  ConfirmModal,
  FloatingActionButton,
  PageContainer,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { GoalCard } from "../components/goal-card";
import { GoalFormModal } from "../components/goal-form-modal";
import { GoalSummaryHeader } from "../components/goal-summary-header";
import { useGoals, type GoalFilter } from "../hooks/use-goals";
import type { GoalStatus, GoalWithProgress } from "../types/goal.types";

const FILTER_TABS: Array<{ key: GoalFilter; label: string }> = [
  { key: "all", label: "All Goals" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

export function GoalsScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const {
    goals,
    filteredGoals,
    summary,
    filter,
    setFilter,
    loading,
    saveGoal,
    deleteGoal,
    toggleStatus,
  } = useGoals();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<GoalWithProgress | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<GoalWithProgress | null>(null);

  const handleOpenCreate = () => {
    setGoalToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (goal: GoalWithProgress) => {
    setGoalToEdit(goal);
    setIsFormOpen(true);
  };

  const handleConfirmDelete = () => {
    if (goalToDelete) {
      deleteGoal(goalToDelete.id);
      setGoalToDelete(null);
    }
  };

  return (
    <PageContainer
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Add New Goal"
          onPress={handleOpenCreate}
        />
      }
    >
      {/* Summary Metrics */}
      <GoalSummaryHeader summary={summary} />

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {FILTER_TABS.map((tab) => {
          const isSelected = filter === tab.key;
          const count =
            tab.key === "all"
              ? goals.length
              : tab.key === "in_progress"
                ? summary.activeGoalsCount
                : summary.completedGoalsCount;

          return (
            <Pressable
              key={tab.key}
              accessibilityLabel={`${tab.label} filter tab`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setFilter(tab.key)}
              style={[
                styles.filterTab,
                isSelected && styles.filterTabSelected,
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isSelected && styles.filterTabTextSelected,
                ]}
              >
                {tab.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  isSelected && styles.countBadgeSelected,
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    isSelected && styles.countBadgeTextSelected,
                  ]}
                >
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Main Content Area */}
      {loading && goals.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : filteredGoals.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconCircle}>
            <Target color={theme.colors.primary} size={36} />
          </View>
          <Text style={styles.emptyTitle}>
            {filter === "completed"
              ? "No completed goals yet"
              : filter === "in_progress"
                ? "No active goals in progress"
                : "No savings goals created"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {filter === "all"
              ? "Create your first goal, link it to an account, and monitor your savings journey with live balances and deadlines using the + button."
              : "Adjust your filter or create a new goal to track your progress."}
          </Text>
        </View>
      ) : (
        <View style={styles.goalsList}>
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDelete={() => setGoalToDelete(goal)}
              onEdit={() => handleOpenEdit(goal)}
              onPress={() => handleOpenEdit(goal)}
              onToggleStatus={(newStatus: GoalStatus) =>
                toggleStatus(goal.id, newStatus)
              }
            />
          ))}
        </View>
      )}

      {/* Create / Edit Form Modal */}
      <GoalFormModal
        initialGoal={goalToEdit}
        onClose={() => setIsFormOpen(false)}
        onSave={saveGoal}
        visible={isFormOpen}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        cancelLabel="Keep Goal"
        confirmLabel="Delete Goal"
        message={`Are you sure you want to delete "${goalToDelete?.name}"? This action cannot be undone.`}
        onCancel={() => setGoalToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Savings Goal"
        variant="destructive"
        visible={Boolean(goalToDelete)}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    filterTabsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingBottom: theme.spacing.sm,
    },
    filterTab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterTabSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterTabText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    filterTabTextSelected: {
      color: theme.colors.onPrimary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    countBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.surfaceElevated,
    },
    countBadgeSelected: {
      backgroundColor: `${theme.colors.onPrimary}30`,
    },
    countBadgeText: {
      fontSize: 10,
      color: theme.colors.textMuted,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    countBadgeTextSelected: {
      color: theme.colors.onPrimary,
    },
    goalsList: {
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.xl,
    },
    centered: {
      paddingVertical: theme.spacing.xxl,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyStateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: "dashed",
      marginVertical: theme.spacing.lg,
    },
    emptyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: `${theme.colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing.xs,
      textAlign: "center",
    },
    emptySubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      textAlign: "center",
      lineHeight: 20,
      maxWidth: 420,
      marginBottom: theme.spacing.lg,
    },
  });
}
