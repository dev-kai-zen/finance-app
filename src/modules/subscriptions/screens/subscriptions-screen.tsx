import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Repeat, Search, X } from "lucide-react-native";

import {
  AppToast,
  ConfirmModal,
  FloatingActionButton,
  PageContainer,
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
  useHeaderWalkthroughAction,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { AnchoredAdDock } from "@/modules/ads";
import { PRO_LIMITS, ProFeatureModal, useProGuard } from "@/modules/pro";
import { useExperiencePreferences } from "@/modules/settings";
import {
  SubscriptionCongratulationsModal,
  SubscriptionsWalkthroughOverlay,
  useSubscriptionsWalkthrough,
  WalkthroughIntroModal,
  useWalkthroughIntro,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  WalkthroughRegistryProvider,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import { MarkPaidModal } from "../components/mark-paid-modal";
import { SubscriptionBurnRateSummaryCard } from "../components/subscription-burn-rate-summary";
import { SubscriptionCard } from "../components/subscription-card";
import { SubscriptionFilterTabs } from "../components/subscription-filter-tabs";
import { SubscriptionFormModal } from "../components/subscription-form-modal";
import { useSubscriptions } from "../hooks/use-subscriptions";
import type {
  SaveSubscriptionInput,
  SubscriptionFilter,
  SubscriptionItem,
} from "../types/subscription.types";

export interface SubscriptionsScreenProps {
  initialAction?: "new";
  initialFilter?: SubscriptionFilter;
  initialSubscriptionId?: string;
}

export function SubscriptionsScreen(props?: SubscriptionsScreenProps) {
  return (
    <WalkthroughRegistryProvider>
      <SubscriptionsScreenContent {...props} />
    </WalkthroughRegistryProvider>
  );
}

function SubscriptionsScreenContent({
  initialAction,
  initialFilter,
  initialSubscriptionId,
}: SubscriptionsScreenProps = {}) {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [isBottomAdVisible, setIsBottomAdVisible] = useState(false);
  const { t } = useLocalization();

  const {
    subscriptions,
    filteredSubscriptions,
    summary,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    refresh,
    save,
    markPaid,
    changeStatus,
    archive,
    restore,
    remove,
    checkHasPayments,
  } = useSubscriptions();

  // Pro Guards & Preferences
  const { guardAction, paywallVisible, closePaywall, guardMeta } = useProGuard();
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();

  // Modal states
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingSubscription, setEditingSubscription] =
    useState<SubscriptionItem | null>(null);
  const [markingPaidSub, setMarkingPaidSub] =
    useState<SubscriptionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    sub: SubscriptionItem;
    isArchive: boolean;
    isArchivedTarget: boolean;
  } | null>(null);
  const [subToRestore, setSubToRestore] = useState<SubscriptionItem | null>(null);
  const [congratulationsVisible, setCongratulationsVisible] = useState(false);

  // Toast feedback
  const [toastFeedback, setToastFeedback] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  const hasSubscriptions = subscriptions.length > 0;
  const hasSubInList = filteredSubscriptions.length > 0;

  // Walkthrough targets & coordination
  const summaryTargetRef = useWalkthroughTarget("subBurnRateSummary");
  const filterTabsRef = useWalkthroughTarget("subFilterTabs");
  const firstItemRef = useWalkthroughTarget(
    hasSubInList ? "subFirstItemCard" : null,
  );
  const fabRef = useWalkthroughTarget("subFab");
  const emptyAddRef = useWalkthroughTarget(
    !hasSubscriptions ? "subEmptyAddButton" : null,
  );

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const { measureTargetInAncestor } = useWalkthroughRegistry();

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      if (targetId === "subFab") {
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

  const walkthrough = useSubscriptionsWalkthrough({
    hasSubscriptions,
    hasSubInList,
    onScrollToTarget: handleScrollToTarget,
  });

  useHeaderWalkthroughAction(
    useMemo(
      () => ({
        onStart: walkthrough.startWalkthrough,
        isActive: walkthrough.isWalkthroughActive,
      }),
      [walkthrough.startWalkthrough, walkthrough.isWalkthroughActive],
    ),
  );

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "subscriptionsWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
  });

  useEffect(() => {
    if (!loading && !error && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [error, loading, walkthroughIntro.canTrigger, walkthroughIntro.triggerIfFirstTime]);

  const filterCounts = useMemo<Partial<Record<SubscriptionFilter, number>>>(() => {
    const counts: Record<SubscriptionFilter, number> = {
      all: 0,
      active: 0,
      trial: 0,
      paused: 0,
      cancelled: 0,
      archived: 0,
    };
    for (let i = 0; i < subscriptions.length; i++) {
      const s = subscriptions[i];
      if (s.archivedAt) {
        counts.archived += 1;
      } else {
        counts.all += 1;
        if (s.status === "active") counts.active += 1;
        else if (s.status === "trial") counts.trial += 1;
        else if (s.status === "paused") counts.paused += 1;
        else if (s.status === "cancelled") counts.cancelled += 1;
      }
    }
    return counts;
  }, [subscriptions]);

  const handleOpenCreate = useCallback(() => {
    const activeSubs = subscriptions.filter((s) => !s.archivedAt);
    if (activeSubs.length >= PRO_LIMITS.FREE_MAX_SUBSCRIPTIONS) {
      guardAction(
        () => {
          setEditingSubscription(null);
          setFormModalVisible(true);
        },
        {
          featureTitle: t("pro.limits.subscriptionsTitle"),
          featureDescription: t("pro.limits.subscriptionsDesc", {
            count: PRO_LIMITS.FREE_MAX_SUBSCRIPTIONS,
          }),
        },
      );
      return;
    }
    setEditingSubscription(null);
    setFormModalVisible(true);
  }, [guardAction, subscriptions, t]);

  const handleOpenEdit = useCallback((sub: SubscriptionItem) => {
    setEditingSubscription(sub);
    setFormModalVisible(true);
  }, []);

  const handledActionRef = useRef<string | null>(null);
  const handledSubIdRef = useRef<string | null>(null);
  const handledFilterRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialFilter && handledFilterRef.current !== initialFilter) {
      handledFilterRef.current = initialFilter;
      setFilter(initialFilter);
    } else if (!initialFilter) {
      handledFilterRef.current = null;
    }
  }, [initialFilter, setFilter]);

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

  useEffect(() => {
    if (
      !loading &&
      initialSubscriptionId &&
      handledSubIdRef.current !== initialSubscriptionId
    ) {
      const found = subscriptions.find((s) => s.id === initialSubscriptionId);
      if (found) {
        handledSubIdRef.current = initialSubscriptionId;
        if (found.archivedAt && filter !== "archived") {
          setFilter("archived");
        }
        handleOpenEdit(found);
        router.setParams({ subscriptionId: undefined });
      }
    } else if (!initialSubscriptionId) {
      handledSubIdRef.current = null;
    }
  }, [
    filter,
    handleOpenEdit,
    initialSubscriptionId,
    loading,
    router,
    setFilter,
    subscriptions,
  ]);

  const handleCloseForm = useCallback(() => {
    setFormModalVisible(false);
    setEditingSubscription(null);
  }, []);

  const handleSaveSubscription = useCallback(
    (input: SaveSubscriptionInput, id?: string) => {
      try {
        const isFirstSub = subscriptions.length === 0 && !id;
        save(input, id);
        setFormModalVisible(false);
        setEditingSubscription(null);
        setToastFeedback({
          message: id
            ? t("subscriptions.updatedToast", { defaultValue: "Subscription updated" })
            : t("subscriptions.createdToast", { defaultValue: "Subscription added" }),
          variant: "success",
        });
        if (isFirstSub && !isPromptDismissed("firstSubscriptionCelebrated")) {
          dismissPrompt("firstSubscriptionCelebrated");
          setCongratulationsVisible(true);
        }
      } catch (err: any) {
        setToastFeedback({
          message: err?.message || "Failed to save subscription",
          variant: "error",
        });
      }
    },
    [dismissPrompt, isPromptDismissed, save, subscriptions.length, t],
  );

  const handleStartCongratulationsTour = () => {
    setCongratulationsVisible(false);
    const timer = setTimeout(() => {
      walkthrough.startWalkthrough();
    }, 400);
    return () => clearTimeout(timer);
  };

  const handleSkipCongratulations = () => {
    setCongratulationsVisible(false);
  };

  const handleRequestDelete = useCallback(
    (sub: SubscriptionItem) => {
      const isArchivedTarget = Boolean(sub.archivedAt);
      const targetHasPayments = checkHasPayments(sub.id);
      const isArchive = targetHasPayments && !isArchivedTarget;
      setDeleteTarget({ sub, isArchive, isArchivedTarget });
    },
    [checkHasPayments],
  );

  const handleFormDelete = useCallback(
    (id: string) => {
      const target = subscriptions.find((s) => s.id === id);
      if (target) {
        setFormModalVisible(false);
        setEditingSubscription(null);
        handleRequestDelete(target);
      }
    },
    [handleRequestDelete, subscriptions],
  );

  const handleConfirmDeleteOrArchive = useCallback(() => {
    if (!deleteTarget) return;
    try {
      const { sub, isArchive } = deleteTarget;
      if (isArchive) {
        archive(sub.id);
        setDeleteTarget(null);
        setToastFeedback({
          message: t("subscriptions.archivedToast", {
            defaultValue: "Subscription archived",
          }),
          variant: "success",
        });
      } else {
        remove(sub.id);
        setDeleteTarget(null);
        setToastFeedback({
          message: t("subscriptions.deletedToast", {
            defaultValue: "Subscription deleted",
          }),
          variant: "success",
        });
      }
    } catch (err: any) {
      setToastFeedback({
        message: err?.message || "Failed to process request",
        variant: "error",
      });
    }
  }, [deleteTarget, archive, remove, t]);

  const handleRequestRestore = useCallback(
    (sub: SubscriptionItem) => {
      const activeSubs = subscriptions.filter((s) => !s.archivedAt);
      if (activeSubs.length >= PRO_LIMITS.FREE_MAX_SUBSCRIPTIONS) {
        guardAction(
          () => setSubToRestore(sub),
          {
            featureTitle: t("pro.limits.subscriptionsTitle"),
            featureDescription: t("pro.limits.restoreSubscriptionDesc", {
              count: PRO_LIMITS.FREE_MAX_SUBSCRIPTIONS,
            }),
          },
        );
        return;
      }
      setSubToRestore(sub);
    },
    [guardAction, subscriptions, t],
  );

  const handleConfirmRestore = useCallback(() => {
    if (!subToRestore) return;
    try {
      const sub = subToRestore;
      restore(sub.id);
      setSubToRestore(null);
      setToastFeedback({
        message: t("subscriptions.restoredToast", {
          defaultValue: "Subscription restored",
        }),
        variant: "success",
      });
    } catch (err: any) {
      setToastFeedback({
        message: err?.message || "Failed to restore subscription",
        variant: "error",
      });
    }
  }, [subToRestore, restore, t]);

  const handleConfirmMarkPaid = useCallback(
    (options: {
      accountId: string;
      pocketId?: string | null;
      paidAt: Date;
    }) => {
      if (!markingPaidSub) return;
      try {
        markPaid(markingPaidSub.id, options);
        const name = markingPaidSub.name;
        setMarkingPaidSub(null);
        setToastFeedback({
          message: t("subscriptions.paymentRecordedToast", {
            name,
            defaultValue: `Recorded payment for ${name}`,
          }),
          variant: "success",
        });
      } catch (err: any) {
        setToastFeedback({
          message: err?.message || "Failed to record payment",
          variant: "error",
        });
      }
    },
    [markingPaidSub, markPaid, t],
  );

  const handleToggleStatus = useCallback(
    (sub: SubscriptionItem) => {
      try {
        const nextStatus = sub.status === "paused" ? "active" : "paused";
        changeStatus(sub.id, nextStatus);
        setToastFeedback({
          message:
            nextStatus === "paused"
              ? t("subscriptions.pausedToast", { defaultValue: "Subscription paused" })
              : t("subscriptions.resumedToast", { defaultValue: "Subscription resumed" }),
          variant: "success",
        });
      } catch (err: any) {
        setToastFeedback({
          message: err?.message || "Failed to update subscription status",
          variant: "error",
        });
      }
    },
    [changeStatus, t],
  );

  if (loading && subscriptions.length === 0) {
    return (
      <PageContainer>
        <PageLoadingState />
      </PageContainer>
    );
  }

  if (error && subscriptions.length === 0) {
    return (
      <PageContainer>
        <PageErrorState message={error} onRetry={refresh} />
      </PageContainer>
    );
  }

  return (
    <View style={styles.screenWrapper}>
      <PageContainer
        contentContainerStyle={styles.pageContent}
        floatingAction={
          <FloatingActionButton
            accessibilityLabel={t("subscriptions.addSubscription", {
              defaultValue: "Add Subscription",
            })}
            fabRef={fabRef}
            onPress={handleOpenCreate}
            style={isBottomAdVisible ? styles.fabAboveAdDock : undefined}
          />
        }
        scrollable={false}
      >
        {/* Fixed Header Section: Search, Summary, Filter Tabs */}
        {hasSubscriptions && (
          <View style={styles.fixedHeader}>
            {/* Search Input Bar */}
            <View style={styles.searchBar}>
              <Search color={theme.colors.textSecondary} size={16} />
              <TextInput
                onChangeText={setSearchQuery}
                placeholder={t("subscriptions.searchPlaceholder", {
                  defaultValue: "Search subscriptions, utilities, services...",
                })}
                placeholderTextColor={theme.colors.textSecondary}
                style={styles.searchInput}
                value={searchQuery}
              />
              {searchQuery.length > 0 ? (
                <Pressable hitSlop={8} onPress={() => setSearchQuery("")}>
                  <X color={theme.colors.textSecondary} size={16} />
                </Pressable>
              ) : null}
            </View>

            {/* Hero Burn Rate Card */}
            <SubscriptionBurnRateSummaryCard
              cardRef={summaryTargetRef}
              summary={summary}
            />

            {/* Filter Tabs */}
            <SubscriptionFilterTabs
              containerRef={filterTabsRef}
              counts={filterCounts}
              currentFilter={filter}
              onSelectFilter={setFilter}
            />
          </View>
        )}

        {/* Subscription Cards List or Empty State */}
        {loading ? (
          <PageLoadingState />
        ) : error && subscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <PageErrorState message={error} onRetry={refresh} />
          </View>
        ) : !hasSubscriptions ? (
          <View style={styles.emptyContainer}>
            <PageEmptyState
              actionLabel={t("subscriptions.addFirstAction", {
                defaultValue: "Add Subscription",
              })}
              actionRef={emptyAddRef}
              description={t("subscriptions.emptyDescription", {
                defaultValue:
                  "Track your recurring memberships, streaming apps, gym, and bills in one place with automatic renewal countdowns.",
              })}
              icon={<Repeat color={theme.colors.primary} size={32} />}
              onAction={handleOpenCreate}
              title={t("subscriptions.emptyTitle", {
                defaultValue: "No Subscriptions Tracked Yet",
              })}
            />
          </View>
        ) : filteredSubscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <PageEmptyState
              description={t("subscriptions.noMatchDescription", {
                defaultValue: "Try adjusting your search query or switching tabs.",
              })}
              icon={<Search color={theme.colors.textSecondary} size={28} />}
              title={t("subscriptions.noMatchTitle", {
                defaultValue: "No matching subscriptions found",
              })}
            />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            style={styles.listScrollView}
          >
            <View ref={scrollContentRef} collapsable={false}>
              {filteredSubscriptions.map((sub, index) => (
                <SubscriptionCard
                  key={sub.id}
                  cardRef={index === 0 ? firstItemRef : undefined}
                  onDelete={handleRequestDelete}
                  onEdit={handleOpenEdit}
                  onMarkPaid={setMarkingPaidSub}
                  onPress={handleOpenEdit}
                  onRestore={handleRequestRestore}
                  onToggleStatus={handleToggleStatus}
                  subscription={sub}
                />
              ))}
            </View>
          </ScrollView>
        )}

        {/* Add / Edit Form Modal */}
        <SubscriptionFormModal
          onClose={handleCloseForm}
          onDelete={handleFormDelete}
          onSave={handleSaveSubscription}
          subscription={editingSubscription}
          visible={formModalVisible}
        />

        {/* Mark Paid Confirmation Modal */}
        <MarkPaidModal
          onClose={() => setMarkingPaidSub(null)}
          onConfirm={handleConfirmMarkPaid}
          subscription={markingPaidSub}
          visible={Boolean(markingPaidSub)}
        />

        {/* Delete / Archive Confirmation Modal */}
        {deleteTarget ? (
          <ConfirmModal
            cancelLabel={t("common.cancel", { defaultValue: "Cancel" })}
            confirmLabel={
              deleteTarget.isArchive
                ? t("subscriptions.filterArchived", { defaultValue: "Archive" })
                : deleteTarget.isArchivedTarget
                  ? t("subscriptions.deletePermanently", {
                      defaultValue: "Delete Permanently",
                    })
                  : t("common.delete", { defaultValue: "Delete" })
            }
            message={
              deleteTarget.isArchive
                ? t("subscriptions.archiveConfirmMessage", {
                    name: deleteTarget.sub.name,
                    defaultValue: `"${deleteTarget.sub.name}" has recorded payments in your ledger. It will be moved to Archived to preserve your transaction history and stop all upcoming reminders. You can restore it anytime.`,
                  })
                : t("subscriptions.deleteConfirmMessage", {
                    name: deleteTarget.sub.name,
                    defaultValue: `Are you sure you want to permanently delete "${deleteTarget.sub.name}"? Past expense transactions in your accounts will not be deleted.`,
                  })
            }
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleConfirmDeleteOrArchive}
            title={
              deleteTarget.isArchive
                ? t("subscriptions.archiveConfirmTitle", {
                    defaultValue: "Archive Subscription",
                  })
                : t("subscriptions.deleteConfirmTitle", {
                    defaultValue: "Delete Subscription",
                  })
            }
            variant={deleteTarget.isArchive ? "primary" : "destructive"}
            visible={Boolean(deleteTarget)}
          />
        ) : null}

        {/* Restore Confirmation Modal */}
        {subToRestore ? (
          <ConfirmModal
            cancelLabel={t("common.cancel", { defaultValue: "Cancel" })}
            confirmLabel={t("subscriptions.restore", { defaultValue: "Restore" })}
            message={t("subscriptions.restoreConfirmMessage", {
              name: subToRestore.name,
              defaultValue: `Do you want to restore "${subToRestore.name}"? Its renewal countdown and recurring schedule will be reactivated.`,
            })}
            onCancel={() => setSubToRestore(null)}
            onConfirm={handleConfirmRestore}
            title={t("subscriptions.restoreConfirmTitle", {
              defaultValue: "Restore Subscription",
            })}
            variant="restore"
            visible={Boolean(subToRestore)}
          />
        ) : null}

        {/* Pro Feature Paywall Modal */}
        <ProFeatureModal
          featureDescription={guardMeta?.featureDescription}
          featureTitle={guardMeta?.featureTitle}
          onClose={closePaywall}
          visible={paywallVisible}
        />

        {/* First Subscription Congratulations Modal */}
        <SubscriptionCongratulationsModal
          onClose={handleSkipCongratulations}
          onSkip={handleSkipCongratulations}
          onStartTour={handleStartCongratulationsTour}
          visible={congratulationsVisible}
        />

        {/* Walkthrough Intro Prompt */}
        <WalkthroughIntroModal
          icon={<Repeat color={theme.colors.primary} size={32} />}
          message={t("subscriptionsWalkthrough.introMessage")}
          onStart={walkthroughIntro.handleStart}
          onSkip={walkthroughIntro.handleSkip}
          subtitle={t("subscriptionsWalkthrough.introSubtitle")}
          title={t("subscriptionsWalkthrough.introTitle")}
          visible={walkthroughIntro.isIntroVisible}
        />

        {/* Subscriptions Walkthrough Overlay */}
        <SubscriptionsWalkthroughOverlay
          onFabPress={() => {
            walkthrough.skipWalkthrough();
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

      <AnchoredAdDock
        onVisibilityChange={setIsBottomAdVisible}
        placement="subscriptions"
      />

      {/* Block interaction while waiting for the first-time modal */}
      {walkthroughIntro.isWaitingForIntro ? (
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={() => {}}
          style={styles.interactionBlocker}
        />
      ) : null}

      {/* Feedback Toast */}
      <AppToast
        duration={2500}
        includeSafeArea
        message={toastFeedback?.message ?? ""}
        onClose={() => setToastFeedback(null)}
        position="top"
        variant={toastFeedback?.variant ?? "success"}
        visible={Boolean(toastFeedback)}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screenWrapper: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    fabAboveAdDock: {
      bottom: 16,
    },
    interactionBlocker: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.01)",
      zIndex: 99999,
    },
    pageContent: {
      flex: 1,
      paddingBottom: 0,
      paddingTop: theme.spacing.md,
    },
    fixedHeader: {
      flexShrink: 0,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textPrimary,
      padding: 0,
    },
    listScrollView: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 96,
    },
    emptyContainer: {
      flex: 1,
      paddingTop: theme.spacing.xl,
    },
  });
}
