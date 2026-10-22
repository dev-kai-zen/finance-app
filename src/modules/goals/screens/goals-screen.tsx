import React, { useEffect, useState } from "react";
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
import { PRO_LIMITS, ProFeatureModal, useProGuard } from "@/modules/pro";
import { useExperiencePreferences } from "@/modules/settings";
import {
  DraggableTourChip,
  GoalCongratulationsModal,
  GoalsWalkthroughOverlay,
  useGoalsWalkthrough,
  useWalkthroughTarget,
  WalkthroughRegistryProvider,
} from "@/modules/walkthrough";
import { GoalCard } from "../components/goal-card";
import { GoalFormModal } from "../components/goal-form-modal";
import { GoalSummaryHeader } from "../components/goal-summary-header";
import { useGoals, type GoalFilter } from "../hooks/use-goals";
import type { GoalInput, GoalStatus, GoalWithProgress } from "../types/goal.types";

const FILTER_TABS: Array<{ key: GoalFilter; label: string }> = [
  { key: "all", label: "All Goals" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

export function GoalsScreen() {
  return (
    <WalkthroughRegistryProvider>
      <GoalsScreenContent />
    </WalkthroughRegistryProvider>
  );
}

function GoalsScreenContent() {
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
  const { guardAction, paywallVisible, closePaywall, guardMeta } = useProGuard();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<GoalWithProgress | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<GoalWithProgress | null>(null);

  // Walkthrough targets & coordination
  const totalTargetRef = useWalkthroughTarget("goalTotalTargetCard");
  const statusFiltersRef = useWalkthroughTarget("goalStatusFilters");
  const markCompleteRef = useWalkthroughTarget("goalFirstItemMarkComplete");
  const fabRef = useWalkthroughTarget("goalFab");

  const hasGoals = goals.length > 0;
  const walkthrough = useGoalsWalkthrough({ hasGoals });
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();

  const [congratulationsVisible, setCongratulationsVisible] = useState(false);

  useEffect(() => {
    if (!loading && !isPromptDismissed("goalsWalkthroughDismissed")) {
      const timer = setTimeout(() => {
        walkthrough.startWalkthrough();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [loading, isPromptDismissed, walkthrough.startWalkthrough]);

  const handleOpenCreate = () => {
    if (goals.length >= PRO_LIMITS.FREE_MAX_GOALS) {
      guardAction(() => {
        setGoalToEdit(null);
        setIsFormOpen(true);
      }, {
        featureTitle: "Savings Goal Limit",
        featureDescription: `The free tier includes up to ${PRO_LIMITS.FREE_MAX_GOALS} active savings goals. Upgrade to Kaizen Pro to set unlimited goals, track multi-account targets, and project completion dates.`,
      });
      return;
    }
    setGoalToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (goal: GoalWithProgress) => {
    setGoalToEdit(goal);
    setIsFormOpen(true);
  };

  const handleSaveGoal = async (input: GoalInput, existingId?: string | null) => {
    const isFirstGoal = goals.length === 0 && !existingId;
    const result = saveGoal(input, existingId);
    if (result && isFirstGoal && !isPromptDismissed("firstGoalCelebrated")) {
      dismissPrompt("firstGoalCelebrated");
      setCongratulationsVisible(true);
    }
    return result;
  };

  const handleCloseCongratulations = () => {
    setCongratulationsVisible(false);
    const timer = setTimeout(() => {
      walkthrough.startWalkthrough();
    }, 400);
    return () => clearTimeout(timer);
  };

  const handleConfirmDelete = () => {
    if (goalToDelete) {
      deleteGoal(goalToDelete.id);
      setGoalToDelete(null);
    }
  };

  const contentSpacing = useThemeStyles((theme) => ({
    paddingTop: theme.spacing.lg,
  }));

  return (
    <PageContainer
      contentContainerStyle={contentSpacing}
      floatingAction={
        <>
          <FloatingActionButton
            accessibilityLabel="Add New Goal"
            fabRef={fabRef}
            onPress={handleOpenCreate}
          />
          <DraggableTourChip
            onPress={walkthrough.startWalkthrough}
            visible={!walkthrough.isWalkthroughActive}
          />
        </>
      }
    >
      {/* Summary Metrics */}
      <GoalSummaryHeader
        summary={summary}
        totalTargetRef={totalTargetRef}
      />

      {/* Filter Tabs */}
      <View
        collapsable={false}
        ref={statusFiltersRef}
        style={styles.filterTabsRow}
      >
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
          {filteredGoals.map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              markCompleteRef={index === 0 ? markCompleteRef : undefined}
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
        onSave={handleSaveGoal}
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

      <ProFeatureModal
        featureDescription={guardMeta?.featureDescription}
        featureTitle={guardMeta?.featureTitle}
        onClose={closePaywall}
        visible={paywallVisible}
      />

      {/* Goal Congratulations Modal */}
      <GoalCongratulationsModal
        onClose={handleCloseCongratulations}
        visible={congratulationsVisible}
      />

      {/* Goals Walkthrough Overlay */}
      <GoalsWalkthroughOverlay
        onFabPress={() => {
          walkthrough.completeWalkthrough();
          handleOpenCreate();
        }}
        onNext={walkthrough.nextStep}
        onPrev={walkthrough.prevStep}
        onSkip={walkthrough.skipWalkthrough}
        step={walkthrough.currentStep}
        stepIndex={walkthrough.activeStepIndex}
        targetLayout={walkthrough.activeTargetLayout}
        totalSteps={walkthrough.totalSteps}
        visible={walkthrough.isWalkthroughActive}
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
