import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Repeat, Search, X } from "lucide-react-native";

import {
  AppToast,
  ConfirmModal,
  FloatingActionButton,
  PageContainer,
  PageEmptyState,
  PageLoadingState,
  useHeaderWalkthroughAction,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { AdBanner } from "@/modules/ads";
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
import { saveSubscription } from "../services/save-subscription.service";
import type {
  SaveSubscriptionInput,
  SubscriptionFilter,
  SubscriptionItem,
} from "../types/subscription.types";

export function SubscriptionsScreen() {
  return (
    <WalkthroughRegistryProvider>
      <SubscriptionsScreenContent />
    </WalkthroughRegistryProvider>
  );
}

function SubscriptionsScreenContent() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
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
    refresh,
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
  const [subToDelete, setSubToDelete] = useState<SubscriptionItem | null>(null);
  const [subToRestore, setSubToRestore] = useState<SubscriptionItem | null>(null);
  const [congratulationsVisible, setCongratulationsVisible] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    if (!loading && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, walkthroughIntro.canTrigger, walkthroughIntro.triggerIfFirstTime]);

  const filterCounts = useMemo<Partial<Record<SubscriptionFilter, number>>>(() => {
    return {
      all: subscriptions.filter((s) => !s.archivedAt).length,
      active: subscriptions.filter((s) => !s.archivedAt && s.status === "active").length,
      trial: subscriptions.filter((s) => !s.archivedAt && s.status === "trial").length,
      paused: subscriptions.filter((s) => !s.archivedAt && s.status === "paused").length,
      cancelled: subscriptions.filter((s) => !s.archivedAt && s.status === "cancelled").length,
      archived: subscriptions.filter((s) => Boolean(s.archivedAt)).length,
    };
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

  const handleCloseForm = useCallback(() => {
    setFormModalVisible(false);
    setEditingSubscription(null);
  }, []);

  const handleSaveSubscription = useCallback(
    (input: SaveSubscriptionInput, id?: string) => {
      try {
        const isFirstSub = subscriptions.length === 0 && !id;
        saveSubscription(input, id);
        refresh();
        setFormModalVisible(false);
        setEditingSubscription(null);
        setToastMessage(
          id
            ? t("subscriptions.updatedToast", { defaultValue: "Subscription updated" })
            : t("subscriptions.createdToast", { defaultValue: "Subscription added" }),
        );
        if (isFirstSub && !isPromptDismissed("firstSubscriptionCelebrated")) {
          dismissPrompt("firstSubscriptionCelebrated");
          setCongratulationsVisible(true);
        }
      } catch (err: any) {
        setToastMessage(err?.message || "Failed to save subscription");
      }
    },
    [dismissPrompt, isPromptDismissed, refresh, subscriptions.length, t],
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

  const handleRequestDelete = useCallback((sub: SubscriptionItem) => {
    setSubToDelete(sub);
  }, []);

  const handleFormDelete = useCallback(
    (id: string) => {
      const target = subscriptions.find((s) => s.id === id);
      if (target) {
        setFormModalVisible(false);
        setEditingSubscription(null);
        setSubToDelete(target);
      }
    },
    [subscriptions],
  );

  const isArchivedTarget = Boolean(subToDelete?.archivedAt);
  const targetHasPayments = subToDelete ? checkHasPayments(subToDelete.id) : false;
  const isArchiveOperation = targetHasPayments && !isArchivedTarget;

  const handleConfirmDeleteOrArchive = useCallback(() => {
    if (!subToDelete) return;
    try {
      const sub = subToDelete;
      setSubToDelete(null);

      if (isArchiveOperation) {
        archive(sub.id);
        setToastMessage(
          t("subscriptions.archivedToast", {
            defaultValue: "Subscription archived",
          }),
        );
      } else {
        remove(sub.id);
        setToastMessage(
          t("subscriptions.deletedToast", {
            defaultValue: "Subscription deleted",
          }),
        );
      }
    } catch (err: any) {
      setToastMessage(err?.message || "Failed to process request");
    }
  }, [subToDelete, isArchiveOperation, archive, remove, t]);

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
      setSubToRestore(null);
      restore(sub.id);
      setToastMessage(
        t("subscriptions.restoredToast", {
          defaultValue: "Subscription restored",
        }),
      );
    } catch (err: any) {
      setToastMessage(err?.message || "Failed to restore subscription");
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
        setMarkingPaidSub(null);
        setToastMessage(
          t("subscriptions.paymentRecordedToast", {
            name: markingPaidSub.name,
            defaultValue: `Recorded payment for ${markingPaidSub.name}`,
          }),
        );
      } catch (err: any) {
        setToastMessage(err?.message || "Failed to record payment");
      }
    },
    [markingPaidSub, markPaid, t],
  );

  const handleToggleStatus = useCallback(
    (sub: SubscriptionItem) => {
      const nextStatus = sub.status === "paused" ? "active" : "paused";
      changeStatus(sub.id, nextStatus);
      setToastMessage(
        nextStatus === "paused"
          ? t("subscriptions.pausedToast", { defaultValue: "Subscription paused" })
          : t("subscriptions.resumedToast", { defaultValue: "Subscription resumed" }),
      );
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

  return (
    <View style={styles.screenWrapper}>
      <PageContainer
        contentContainerStyle={styles.pageContent}
        floatingAction={
          <View ref={fabRef as any} collapsable={false}>
            <FloatingActionButton
              accessibilityLabel={t("subscriptions.addSubscription", {
                defaultValue: "Add Subscription",
              })}
              onPress={handleOpenCreate}
            />
          </View>
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
            <View ref={summaryTargetRef as any} collapsable={false}>
              <SubscriptionBurnRateSummaryCard summary={summary} />
            </View>

            {/* Filter Tabs */}
            <View ref={filterTabsRef as any} collapsable={false}>
              <SubscriptionFilterTabs
                counts={filterCounts}
                currentFilter={filter}
                onSelectFilter={setFilter}
              />
            </View>
          </View>
        )}

        {/* Subscription Cards List or Empty State */}
        {!hasSubscriptions ? (
          <View style={styles.emptyContainer}>
            <View ref={emptyAddRef as any} collapsable={false}>
              <PageEmptyState
                actionLabel={t("subscriptions.addFirstAction", {
                  defaultValue: "Add Subscription",
                })}
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
            <AdBanner
              placement="subscriptions"
              variant="card"
              style={{ marginTop: theme.spacing.md }}
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
                <View key={sub.id}>
                  <View
                    ref={index === 0 ? (firstItemRef as any) : undefined}
                    collapsable={false}
                  >
                    <SubscriptionCard
                      onDelete={() => handleRequestDelete(sub)}
                      onEdit={() => handleOpenEdit(sub)}
                      onMarkPaid={() => setMarkingPaidSub(sub)}
                      onPress={() => handleOpenEdit(sub)}
                      onRestore={() => handleRequestRestore(sub)}
                      onToggleStatus={() => handleToggleStatus(sub)}
                      subscription={sub}
                    />
                  </View>
                  {index === 0 ? (
                    <AdBanner
                      placement="subscriptions"
                      variant="card"
                      style={{ marginVertical: theme.spacing.sm }}
                    />
                  ) : null}
                </View>
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
        {subToDelete ? (
          <ConfirmModal
            cancelLabel={t("common.cancel", { defaultValue: "Cancel" })}
            confirmLabel={
              isArchiveOperation
                ? t("subscriptions.filterArchived", { defaultValue: "Archive" })
                : isArchivedTarget
                  ? t("subscriptions.deletePermanently", {
                      defaultValue: "Delete Permanently",
                    })
                  : t("common.delete", { defaultValue: "Delete" })
            }
            message={
              isArchiveOperation
                ? t("subscriptions.archiveConfirmMessage", {
                    name: subToDelete.name,
                    defaultValue: `"${subToDelete.name}" has recorded payments in your ledger. It will be moved to Archived to preserve your transaction history and stop all upcoming reminders. You can restore it anytime.`,
                  })
                : t("subscriptions.deleteConfirmMessage", {
                    name: subToDelete.name,
                    defaultValue: `Are you sure you want to permanently delete "${subToDelete.name}"? Past expense transactions in your accounts will not be deleted.`,
                  })
            }
            onCancel={() => setSubToDelete(null)}
            onConfirm={handleConfirmDeleteOrArchive}
            title={
              isArchiveOperation
                ? t("subscriptions.archiveConfirmTitle", {
                    defaultValue: "Archive Subscription",
                  })
                : t("subscriptions.deleteConfirmTitle", {
                    defaultValue: "Delete Subscription",
                  })
            }
            variant={isArchiveOperation ? "primary" : "destructive"}
            visible={Boolean(subToDelete)}
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

      {/* Feedback Toast */}
      <AppToast
        duration={2500}
        message={toastMessage ?? ""}
        onClose={() => setToastMessage(null)}
        position="top"
        variant="success"
        visible={Boolean(toastMessage)}
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
