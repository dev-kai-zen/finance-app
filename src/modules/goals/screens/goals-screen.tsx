import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
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
import { useLocalization } from "@/infrastructure/localization";
import {
  DraggableTourChip,
  GoalCongratulationsModal,
  GoalsWalkthroughOverlay,
  WalkthroughIntroModal,
  useGoalsWalkthrough,
  useWalkthroughIntro,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  WalkthroughRegistryProvider,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  type WalkthroughTargetId,
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

export function GoalsScreen(props?: { initialAction?: "new" }) {
  return (
    <WalkthroughRegistryProvider>
      <GoalsScreenContent {...props} />
    </WalkthroughRegistryProvider>
  );
}

function GoalsScreenContent({
  initialAction,
}: {
  initialAction?: "new";
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useLocalization();
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
  const handledActionRef = useRef<string | null>(null);

  // Walkthrough targets & coordination
  const totalTargetRef = useWalkthroughTarget("goalTotalTargetCard");
  const statusFiltersRef = useWalkthroughTarget("goalStatusFilters");
  const hasGoalInList = filteredGoals.length > 0;
  const markCompleteRef = useWalkthroughTarget(
    hasGoalInList ? "goalFirstItemMarkComplete" : null,
  );
  const fabRef = useWalkthroughTarget("goalFab");

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const didAutoStartWalkthroughRef = useRef(false);
  const { measureTargetInAncestor } = useWalkthroughRegistry();

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      if (targetId === "goalFab") {
        return;
      }

      void (async () => {
        const layout = await measureTargetInAncestor(
          targetId,
          scrollContentRef,
        );
        if (!layout) {
          return;
        }

        scrollRef.current?.scrollTo({
          y: Math.max(0, layout.y - WALKTHROUGH_SCROLL_TOP_OFFSET),
          animated: true,
        });
      })();
    },
    [measureTargetInAncestor],
  );

  const walkthrough = useGoalsWalkthrough({
    hasGoalInList,
    onScrollToTarget: handleScrollToTarget,
  });

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "goalsWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
  });
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();

  const [congratulationsVisible, setCongratulationsVisible] = useState(false);

  useEffect(() => {
    if (!loading && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, walkthroughIntro.canTrigger, walkthroughIntro.triggerIfFirstTime]);

  const handleOpenCreate = useCallback(() => {
    if (goals.length >= PRO_LIMITS.FREE_MAX_GOALS) {
      guardAction(() => {
        setGoalToEdit(null);
        setIsFormOpen(true);
      }, {
        featureTitle: t("pro.limits.goalsTitle"),
        featureDescription: t("pro.limits.goalsDesc", {
          count: PRO_LIMITS.FREE_MAX_GOALS,
        }),
      });
      return;
    }
    setGoalToEdit(null);
    setIsFormOpen(true);
  }, [goals.length, guardAction, t]);

  useEffect(() => {
    if (!loading && initialAction === "new") {
      if (handledActionRef.current !== "new") {
        handledActionRef.current = "new";
        handleOpenCreate();
        router.setParams({ action: undefined });
      }
    } else if (!initialAction) {
      handledActionRef.current = null;
    }
  }, [handleOpenCreate, initialAction, loading, router]);

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
      scrollRef={scrollRef}
      scrollContentRef={scrollContentRef}
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

      <WalkthroughIntroModal
        visible={walkthroughIntro.isIntroVisible}
        title={t("goalsWalkthrough.introTitle")}
        subtitle={t("goalsWalkthrough.introSubtitle")}
        message={t("goalsWalkthrough.introMessage")}
        icon={<Target color={theme.colors.primary} size={32} />}
        onStart={walkthroughIntro.handleStart}
        onSkip={walkthroughIntro.handleSkip}
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
