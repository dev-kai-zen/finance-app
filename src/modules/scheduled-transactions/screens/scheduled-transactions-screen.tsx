import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox, Host } from "@expo/ui";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarClock,
  ExternalLink,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  SquarePen,
  Trash2,
} from "lucide-react-native";

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
import { AccountSearchBox } from "@/modules/accounts/components/account-search-box";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import { PRO_LIMITS, ProFeatureModal, useProGuard } from "@/modules/pro";
import { useExperiencePreferences } from "@/modules/settings";
import { useLocalization } from "@/infrastructure/localization";
import { Repeat } from "lucide-react-native";
import {
  FirstScheduleCongratulationsModal,
  ScheduledTransactionsWalkthroughOverlay,
  WalkthroughIntroModal,
  useScheduledTransactionsWalkthrough,
  useWalkthroughIntro,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  WalkthroughRegistryProvider,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import { formatCurrency } from "@/utils/currency";
import { AdvancePostModal } from "../components/advance-post-modal";
import { ScheduledOccurrenceCard } from "../components/scheduled-occurrence-card";
import { ScheduledTransactionFormModal } from "../components/scheduled-transaction-form-modal";
import { useScheduledTransactions } from "../hooks/use-scheduled-transactions";
import type {
  SaveScheduledTransactionInput,
  ScheduleOccurrence,
  ScheduledTransaction,
} from "../types/scheduled-transaction.types";
import {
  calculateScheduleOccurrence,
} from "../utils/recurrence";
import { formatScheduleRecurrence } from "../utils/format-schedule-recurrence";
import {
  scheduleAccountLine,
  scheduleCardTitle,
  scheduleStatusLabel,
} from "../utils/schedule-card-copy";
import {
  DEFAULT_SCHEDULE_LIST_FILTERS,
  filterSchedulesBySearch,
  filterSchedulesByStatus,
  normalizeScheduleSearchQuery,
  scheduleMatchesSearchQuery,
  type ScheduleListFilter,
  type ScheduleListSearchContext,
} from "../utils/schedule-list-filter";

export function ScheduledTransactionsScreen(props?: {
  initialAction?: "new";
  initialScheduleId?: string;
}) {
  return (
    <WalkthroughRegistryProvider>
      <ScheduledTransactionsScreenContent {...props} />
    </WalkthroughRegistryProvider>
  );
}

function ScheduledTransactionsScreenContent({
  initialScheduleId,
  initialAction,
}: {
  initialAction?: "new";
  initialScheduleId?: string;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemeStyles(createStyles);
  const { accounts, pockets, refresh: refreshAccounts } = useAccounts();
  const { categories } = useCategories();
  const {
    schedules,
    occurrences,
    hasMoreOccurrences,
    loadMoreOccurrences,
    loading,
    pending,
    error,
    save,
    setPaused,
    end,
    remove,
    permanentlyDelete,
    restore,
    postOccurrence,
    skipOccurrence,
    advancePost,
    scheduleIdsWithPostings,
  } = useScheduledTransactions();
  const { guardAction, paywallVisible, closePaywall, guardMeta } = useProGuard();
  const [formVisible, setFormVisible] = useState(false);
  const handledActionRef = useRef<string | null>(null);
  const handledScheduleIdRef = useRef<string | null>(null);
  const [editingSchedule, setEditingSchedule] =
    useState<ScheduledTransaction | null>(null);
  const [advancePostTarget, setAdvancePostTarget] =
    useState<ScheduledTransaction | null>(null);
  const [pendingEnd, setPendingEnd] =
    useState<ScheduledTransaction | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<ScheduledTransaction | null>(null);
  const [pendingPermanentDelete, setPendingPermanentDelete] =
    useState<ScheduledTransaction | null>(null);
  const [pendingRestore, setPendingRestore] =
    useState<ScheduledTransaction | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<
    ReadonlySet<ScheduleListFilter>
  >(() => new Set(DEFAULT_SCHEDULE_LIST_FILTERS));
  const [sourceFilter, setSourceFilter] = useState<"all" | "regular" | "subscription">("all");
  const [managedBySubTarget, setManagedBySubTarget] =
    useState<ScheduledTransaction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastState, setToastState] = useState<{
    visible: boolean;
    message: string;
    description?: string;
  }>({
    visible: false,
    message: "",
  });

  const searchRef = useWalkthroughTarget("scheduledSearch");
  const filterRef = useWalkthroughTarget("scheduledFilter");
  const fabRef = useWalkthroughTarget("scheduledFab");
  const firstItemRef = useWalkthroughTarget("scheduledFirstItem");
  const dueCardRef = useWalkthroughTarget("scheduledDueCard");
  const dueSkipRef = useWalkthroughTarget("scheduledDueSkip");
  const duePostRef = useWalkthroughTarget("scheduledDuePost");
  const pageScrollRef = useRef<ScrollView | null>(null);
  const scrollContentRef = useRef<View | null>(null);
  const didAutoStartWalkthroughRef = useRef(false);
  const { measureTargetInAncestor } = useWalkthroughRegistry();
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();
  const [showCongrats, setShowCongrats] = useState(false);

  const searchContext = useMemo((): ScheduleListSearchContext => {
    const accountById = new Map(
      accounts.map((account) => [account.id, account.name]),
    );
    const categoryById = new Map(
      categories.map((category) => [category.id, category.name]),
    );
    return {
      getAccountName: (accountId) => accountById.get(accountId),
      getCategoryName: (categoryId) =>
        categoryId ? categoryById.get(categoryId) : undefined,
    };
  }, [accounts, categories]);

  const normalizedSearchQuery = normalizeScheduleSearchQuery(searchQuery);

  const statusFilteredSchedules = useMemo(
    () => filterSchedulesByStatus(schedules, selectedFilters),
    [schedules, selectedFilters],
  );

  const sourceFilterCounts = useMemo(() => {
    return {
      all: statusFilteredSchedules.length,
      regular: statusFilteredSchedules.filter((s) => !s.subscriptionId).length,
      subscription: statusFilteredSchedules.filter((s) => Boolean(s.subscriptionId)).length,
    };
  }, [statusFilteredSchedules]);

  const sourceFilteredSchedules = useMemo(() => {
    if (sourceFilter === "regular") {
      return statusFilteredSchedules.filter((s) => !s.subscriptionId);
    }
    if (sourceFilter === "subscription") {
      return statusFilteredSchedules.filter((s) => Boolean(s.subscriptionId));
    }
    return statusFilteredSchedules;
  }, [statusFilteredSchedules, sourceFilter]);

  const visibleSchedules = useMemo(
    () =>
      filterSchedulesBySearch(
        sourceFilteredSchedules,
        searchQuery,
        searchContext,
      ),
    [sourceFilteredSchedules, searchQuery, searchContext],
  );

  const activeSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.archivedAt === null),
    [schedules],
  );

  const activeRegularSchedules = useMemo(
    () => activeSchedules.filter((schedule) => !schedule.subscriptionId),
    [activeSchedules],
  );

  const scheduleById = useMemo(
    () =>
      new Map(
        activeSchedules.map((schedule) => [schedule.id, schedule]),
      ),
    [activeSchedules],
  );
  const actionableOccurrences = useMemo(
    () =>
      occurrences.filter((occurrence) => {
        if (
          !scheduleById.has(occurrence.scheduleId) ||
          (occurrence.status !== "due" && occurrence.status !== "failed")
        ) {
          return false;
        }
        const schedule = scheduleById.get(occurrence.scheduleId);
        if (!schedule || schedule.status === "paused") return false;
        return scheduleMatchesSearchQuery(
          schedule,
          normalizedSearchQuery,
          searchContext,
        );
      }),
    [
      occurrences,
      scheduleById,
      normalizedSearchQuery,
      searchContext,
    ],
  );

  const scheduleFilterOptions = useMemo(
    () =>
      [
        {
          label: t("scheduledTransactions.statusFilter.active"),
          value: "active" as ScheduleListFilter,
        },
        {
          label: t("scheduledTransactions.statusFilter.completed"),
          value: "completed" as ScheduleListFilter,
        },
        {
          label: t("scheduledTransactions.statusFilter.archived"),
          value: "archived" as ScheduleListFilter,
        },
      ] as const,
    [t],
  );

  const emptyStateContent = useMemo(() => {
    if (schedules.length === 0) {
      return {
        title: t("scheduledTransactions.emptyTitle"),
        description: t("scheduledTransactions.emptyDesc"),
      };
    }
    if (sourceFilter === "subscription" && sourceFilteredSchedules.length === 0) {
      return {
        title: t("scheduledTransactions.noSubscriptionSchedulesTitle"),
        description: t("scheduledTransactions.noSubscriptionSchedulesDesc"),
      };
    }
    if (statusFilteredSchedules.length === 0 || sourceFilteredSchedules.length === 0) {
      return {
        title: t("scheduledTransactions.noMatchingTitle"),
        description: t("scheduledTransactions.noMatchingDesc"),
      };
    }
    if (normalizedSearchQuery) {
      return {
        title: t("scheduledTransactions.noMatchingTitle"),
        description: t("scheduledTransactions.noSearchMatchDesc"),
      };
    }
    return {
      title: t("scheduledTransactions.noMatchingTitle"),
      description: t("scheduledTransactions.noMatchingDesc"),
    };
  }, [
    schedules.length,
    sourceFilter,
    sourceFilteredSchedules.length,
    statusFilteredSchedules.length,
    normalizedSearchQuery,
    t,
  ]);
  const pendingDeleteHasHistory = Boolean(
    pendingDelete && scheduleIdsWithPostings.has(pendingDelete.id),
  );

  const openNew = useCallback(() => {
    if (
      activeRegularSchedules.length >=
      PRO_LIMITS.FREE_MAX_SCHEDULED_TRANSACTIONS
    ) {
      guardAction(() => {
        setEditingSchedule(null);
        setFormVisible(true);
      }, {
        featureTitle: t("pro.limits.schedulesTitle"),
        featureDescription: t("pro.limits.schedulesDesc", {
          count: PRO_LIMITS.FREE_MAX_SCHEDULED_TRANSACTIONS,
        }),
      });
      return;
    }
    setEditingSchedule(null);
    setFormVisible(true);
  }, [activeRegularSchedules.length, guardAction, t]);

  useEffect(() => {
    if (!loading && initialAction === "new") {
      if (handledActionRef.current !== "new") {
        handledActionRef.current = "new";
        openNew();
        router.setParams({ action: undefined });
      }
    } else if (!initialAction) {
      handledActionRef.current = null;
    }
  }, [initialAction, loading, openNew, router]);

  useEffect(() => {
    if (!loading && initialScheduleId && handledScheduleIdRef.current !== initialScheduleId) {
      const found = schedules.find((s) => s.id === initialScheduleId);
      if (found) {
        handledScheduleIdRef.current = initialScheduleId;
        if (found.subscriptionId) {
          setManagedBySubTarget(found);
        } else {
          setEditingSchedule(found);
          setFormVisible(true);
        }
        router.setParams({ scheduleId: undefined });
      }
    } else if (!initialScheduleId) {
      handledScheduleIdRef.current = null;
    }
  }, [initialScheduleId, loading, schedules, router]);

  const openEdit = (schedule: ScheduledTransaction) => {
    setEditingSchedule(schedule);
    setFormVisible(true);
  };

  const handlePost = (occurrence: ScheduleOccurrence) => {
    if (postOccurrence(occurrence.id)) refreshAccounts();
  };

  const handleAdvancePost = (transactionDate: Date) => {
    if (!advancePostTarget) return;
    const target = advancePostTarget;
    setAdvancePostTarget(null);
    const success = advancePost(target.id, transactionDate);
    if (success) {
      refreshAccounts();
      const nextOccurrence = calculateScheduleOccurrence(
        target,
        target.nextOccurrenceNumber + 1,
      );
      const nextDate = nextOccurrence
        ? nextOccurrence.effectiveAt ?? nextOccurrence.nominalAt
        : null;

      const description = nextDate
        ? t("scheduledTransactions.advancePostToastNext", {
            date: nextDate.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
          })
        : t("scheduledTransactions.advancePostToastCompleted");

      setToastState({
        visible: true,
        message: t("scheduledTransactions.advancePostToastTitle"),
        description,
      });
    }
  };

  const setFilterSelected = (
    filter: ScheduleListFilter,
    selected: boolean,
  ) => {
    setSelectedFilters((current) => {
      const next = new Set(current);
      if (selected) next.add(filter);
      else next.delete(filter);
      return next;
    });
  };

  const hasSchedules = activeSchedules.length > 0;
  const showDueSection =
    selectedFilters.has("active") && (actionableOccurrences.length > 0 || hasMoreOccurrences);
  const showFirstItem = visibleSchedules.length > 0;

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      if (targetId === "scheduledFab") {
        return;
      }

      void (async () => {
        const layout = await measureTargetInAncestor(targetId, scrollContentRef);
        if (!layout) {
          return;
        }

        pageScrollRef.current?.scrollTo({
          y: Math.max(0, layout.y - WALKTHROUGH_SCROLL_TOP_OFFSET),
          animated: true,
        });
      })();
    },
    [measureTargetInAncestor],
  );

  const walkthrough = useScheduledTransactionsWalkthrough({
    hasSchedules,
    hasDueSchedule: showDueSection,
    showDueSection,
    showFirstItem,
    onScrollToTarget: handleScrollToTarget,
  });

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "scheduledTransactionsWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
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

  useEffect(() => {
    if (!loading && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, walkthroughIntro.canTrigger, walkthroughIntro.triggerIfFirstTime]);

  const handleSave = (
    input: SaveScheduledTransactionInput,
    id?: string,
  ) => {
    const isFirst = schedules.length === 0 && !editingSchedule;
    const success = save(input, id);
    if (success && isFirst && !isPromptDismissed("firstScheduleCelebrated")) {
      dismissPrompt("firstScheduleCelebrated");
      setShowCongrats(true);
    }
    return success;
  };

  const contentSpacing = useThemeStyles((theme) => ({
    paddingTop: theme.spacing.lg,
  }));

  return (
    <View style={styles.screenWrapper}>
      {walkthroughIntro.isWaitingForIntro ? (
        <View pointerEvents="auto" style={styles.interactionBlocker} />
      ) : null}
      <PageContainer
      contentContainerStyle={contentSpacing}
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Create scheduled transaction"
          fabRef={fabRef}
          icon={<CalendarClock color={theme.colors.onPrimary} size={24} />}
          onPress={openNew}
        />
      }
      scrollContentRef={scrollContentRef}
      scrollRef={pageScrollRef}
      scrollEnabled={
        walkthroughIntro.scrollEnabled && !walkthrough.isWalkthroughActive
      }
    >
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <AccountSearchBox
          accessibilityLabel={t("scheduledTransactions.searchAccessibility")}
          clearAccessibilityLabel="Clear scheduled transaction search"
          onChangeText={setSearchQuery}
          placeholder={t("scheduledTransactions.searchPlaceholder")}
          style={styles.searchBox}
          targetRef={searchRef}
          value={searchQuery}
        />

        {showDueSection ? (
          <View style={styles.dueSection}>
            <Text style={styles.sectionHeading}>
              {t("scheduledTransactions.needsAttention")}
            </Text>
            {actionableOccurrences.map((occurrence, index) => {
              const schedule = scheduleById.get(occurrence.scheduleId);
              if (!schedule) return null;
              const source = accounts.find(
                (account) => account.id === schedule.accountId,
              );
              const destination = accounts.find(
                (account) => account.id === schedule.toAccountId,
              );
              const category = categories.find(
                (item) => item.id === schedule.categoryId,
              );

              return (
                <ScheduledOccurrenceCard
                  key={occurrence.id}
                  cardRef={index === 0 ? dueCardRef : undefined}
                  category={category}
                  destinationAccount={destination}
                  occurrence={occurrence}
                  onEdit={undefined}
                  onPost={handlePost}
                  onSkip={skipOccurrence}
                  pending={pending}
                  postRef={index === 0 ? duePostRef : undefined}
                  schedule={schedule}
                  skipRef={index === 0 ? dueSkipRef : undefined}
                  sourceAccount={source}
                />
              );
            })}
            {hasMoreOccurrences && (
              <Pressable accessibilityRole="button" disabled={loading} onPress={loadMoreOccurrences} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text>{t("scheduledTransactions.loadMoreOccurrences")}</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {/* Source Filter Tabs */}
        <View style={styles.sourceFilterContainer}>
          <ScrollView
            contentContainerStyle={styles.sourceFilterScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: sourceFilter === "all" }}
              onPress={() => setSourceFilter("all")}
              style={[
                styles.sourceTab,
                sourceFilter === "all" && styles.sourceTabSelected,
              ]}
            >
              <Text
                style={[
                  styles.sourceTabText,
                  sourceFilter === "all" && styles.sourceTabTextSelected,
                ]}
              >
                {t("scheduledTransactions.filters.all", { defaultValue: "All" })}
              </Text>
              {sourceFilterCounts.all > 0 ? (
                <View
                  style={[
                    styles.countBadge,
                    sourceFilter === "all" && styles.countBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      sourceFilter === "all" && styles.countTextSelected,
                    ]}
                  >
                    {sourceFilterCounts.all}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: sourceFilter === "regular" }}
              onPress={() => setSourceFilter("regular")}
              style={[
                styles.sourceTab,
                sourceFilter === "regular" && styles.sourceTabSelected,
              ]}
            >
              <Text
                style={[
                  styles.sourceTabText,
                  sourceFilter === "regular" && styles.sourceTabTextSelected,
                ]}
              >
                {t("scheduledTransactions.filters.regularSchedules", {
                  defaultValue: "Regular Schedules",
                })}
              </Text>
              {sourceFilterCounts.regular > 0 ? (
                <View
                  style={[
                    styles.countBadge,
                    sourceFilter === "regular" && styles.countBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      sourceFilter === "regular" && styles.countTextSelected,
                    ]}
                  >
                    {sourceFilterCounts.regular}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: sourceFilter === "subscription" }}
              onPress={() => setSourceFilter("subscription")}
              style={[
                styles.sourceTab,
                sourceFilter === "subscription" && styles.sourceTabSelected,
              ]}
            >
              <Text
                style={[
                  styles.sourceTabText,
                  sourceFilter === "subscription" && styles.sourceTabTextSelected,
                ]}
              >
                {t("scheduledTransactions.filters.subscriptions", {
                  defaultValue: "Subscriptions",
                })}
              </Text>
              {sourceFilterCounts.subscription > 0 ? (
                <View
                  style={[
                    styles.countBadge,
                    sourceFilter === "subscription" && styles.countBadgeSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      sourceFilter === "subscription" && styles.countTextSelected,
                    ]}
                  >
                    {sourceFilterCounts.subscription}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </ScrollView>
        </View>

        <View style={styles.scheduleHeadingRow}>
          <Text style={styles.sectionHeading}>
            {t("scheduledTransactions.schedulesHeading")}
          </Text>
          <View
            accessibilityLabel={t("scheduledTransactions.statusFilterAccessibility")}
            collapsable={false}
            ref={filterRef}
            style={styles.filterOptions}
          >
            {scheduleFilterOptions.map((option) => (
              <Host key={option.value} matchContents style={styles.filterCheckbox}>
                <Checkbox
                  disabled={pending}
                  label={option.label}
                  onValueChange={(selected) =>
                    setFilterSelected(option.value, selected)
                  }
                  value={selectedFilters.has(option.value)}
                />
              </Host>
            ))}
          </View>
        </View>
        {loading && schedules.length === 0 ? (
          <PageLoadingState message={t("scheduledTransactions.loading")} />
        ) : visibleSchedules.length === 0 ? (
          <PageEmptyState
            description={emptyStateContent.description}
            icon={<CalendarClock color={theme.colors.primary} size={34} />}
            title={emptyStateContent.title}
          />
        ) : (
          visibleSchedules.map((schedule, index) => {
            const source = accounts.find(
              (account) => account.id === schedule.accountId,
            );
            const destination = accounts.find(
              (account) => account.id === schedule.toAccountId,
            );
            const category = categories.find(
              (item) => item.id === schedule.categoryId,
            );
            const isTransfer = schedule.transactionType === "transfer";
            const signedAmount = isTransfer
              ? Math.abs(schedule.amountMinorUnits)
              : schedule.amountMinorUnits;
            const isSubscription = Boolean(schedule.subscriptionId);
            const canAdvancePost =
              !isSubscription &&
              !schedule.archivedAt &&
              schedule.status === "active" &&
              schedule.nextEffectiveAt !== null &&
              schedule.nextEffectiveAt.getTime() > Date.now();

            return (
              <View
                key={schedule.id}
                collapsable={false}
                ref={index === 0 ? firstItemRef : undefined}
                style={[
                  styles.scheduleCard,
                  schedule.archivedAt && styles.archivedScheduleCard,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardMain}>
                    <View style={styles.titleRow}>
                      <Text numberOfLines={1} style={styles.cardTitle}>
                        {scheduleCardTitle(schedule, category, t)}
                      </Text>
                      {isSubscription ? (
                        <View style={styles.subscriptionBadge}>
                          <Text style={styles.subscriptionBadgeText}>
                            {t("scheduledTransactions.subscriptionBadge", {
                              defaultValue: "Subscription",
                            })}
                          </Text>
                        </View>
                      ) : null}
                      <View
                        style={[
                          styles.statusBadge,
                          schedule.archivedAt
                            ? styles.statusArchived
                            : schedule.status === "active"
                            ? styles.statusActive
                            : schedule.status === "paused"
                              ? styles.statusPaused
                              : styles.statusCompleted,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {scheduleStatusLabel(schedule, t)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardMeta}>
                      {scheduleAccountLine(schedule, source, destination, category, t)}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {formatScheduleRecurrence(schedule, t)} ·{" "}
                      {schedule.autoPost
                        ? t("scheduledTransactions.postingMode.autoPost")
                        : t("scheduledTransactions.postingMode.confirmEach")}
                    </Text>
                    <View style={styles.nextRow}>
                      <Text style={styles.nextText}>
                        {schedule.nextEffectiveAt
                          ? t("scheduledTransactions.nextDate", {
                              date: schedule.nextEffectiveAt.toLocaleString(),
                            })
                          : t("scheduledTransactions.noFutureOccurrences")}
                      </Text>
                      {canAdvancePost ? (
                        <Pressable
                          accessibilityLabel={t(
                            "scheduledTransactions.advancePost",
                          )}
                          onPress={() => setAdvancePostTarget(schedule)}
                          style={styles.advancePostChip}
                        >
                          <FastForward
                            color={theme.colors.primary}
                            size={12}
                          />
                          <Text style={styles.advancePostChipText}>
                            {t("scheduledTransactions.advancePost")}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.amountText,
                      isTransfer
                        ? styles.amountTransfer
                        : signedAmount > 0
                          ? styles.amountIncome
                          : styles.amountExpense,
                    ]}
                  >
                    {formatCurrency(
                      signedAmount,
                      source?.currencyCode ?? "PHP",
                      signedAmount > 0 && !isTransfer,
                    )}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  {isSubscription ? (
                    <Pressable
                      accessibilityLabel={t(
                        "scheduledTransactions.manageInSubscriptions",
                        { defaultValue: "Manage in Subscriptions" },
                      )}
                      onPress={() => setManagedBySubTarget(schedule)}
                      style={styles.manageInSubAction}
                    >
                      <ExternalLink
                        color={theme.colors.primary}
                        size={15}
                      />
                      <Text style={styles.manageInSubActionText}>
                        {t("scheduledTransactions.manageInSubscriptions", {
                          defaultValue: "Manage in Subscriptions",
                        })}
                      </Text>
                    </Pressable>
                  ) : schedule.archivedAt ? (
                    <>
                      <Pressable
                        accessibilityLabel="Restore schedule"
                        onPress={() => setPendingRestore(schedule)}
                        style={styles.iconAction}
                      >
                        <RotateCcw color={theme.colors.success} size={17} />
                        <Text style={styles.restoreActionText}>Restore</Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Permanently delete schedule"
                        onPress={() => setPendingPermanentDelete(schedule)}
                        style={styles.deleteAction}
                      >
                        <Trash2 color={theme.colors.danger} size={17} />
                        <Text style={styles.endActionText}>Delete</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable
                        accessibilityLabel="Edit schedule"
                        onPress={() => openEdit(schedule)}
                        style={styles.iconAction}
                      >
                        <SquarePen
                          color={theme.colors.textSecondary}
                          size={17}
                        />
                        <Text style={styles.actionText}>Edit</Text>
                      </Pressable>
                      {schedule.status !== "completed" ? (
                        <Pressable
                          accessibilityLabel={
                            schedule.status === "paused"
                              ? "Resume schedule"
                              : "Pause schedule"
                          }
                          onPress={() =>
                            setPaused(
                              schedule.id,
                              schedule.status !== "paused",
                            )
                          }
                          style={styles.iconAction}
                        >
                          {schedule.status === "paused" ? (
                            <Play color={theme.colors.success} size={17} />
                          ) : (
                            <Pause
                              color={theme.colors.textSecondary}
                              size={17}
                            />
                          )}
                          <Text style={styles.actionText}>
                            {schedule.status === "paused" ? "Resume" : "Pause"}
                          </Text>
                        </Pressable>
                      ) : null}
                      {schedule.status !== "completed" ? (
                        <Pressable
                          accessibilityLabel="End schedule"
                          onPress={() => setPendingEnd(schedule)}
                          style={styles.iconAction}
                        >
                          <Text style={styles.endActionText}>End</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        accessibilityLabel="Delete schedule"
                        onPress={() => setPendingDelete(schedule)}
                        style={styles.deleteAction}
                      >
                        <Trash2 color={theme.colors.danger} size={17} />
                        <Text style={styles.endActionText}>Delete</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      <AdvancePostModal
        category={categories.find(
          (c) => c.id === advancePostTarget?.categoryId,
        )}
        destinationAccount={accounts.find(
          (a) => a.id === advancePostTarget?.toAccountId,
        )}
        onClose={() => setAdvancePostTarget(null)}
        onConfirm={handleAdvancePost}
        pending={pending}
        schedule={advancePostTarget}
        sourceAccount={accounts.find(
          (a) => a.id === advancePostTarget?.accountId,
        )}
        visible={Boolean(advancePostTarget)}
      />

      <ScheduledTransactionFormModal
        accounts={accounts}
        categories={categories}
        error={error}
        initialSchedule={editingSchedule}
        onClose={() => {
          setFormVisible(false);
          setEditingSchedule(null);
        }}
        onSave={handleSave}
        pending={pending}
        pockets={pockets}
        visible={formVisible}
      />

      <ConfirmModal
        cancelLabel={t("common.close", { defaultValue: "Close" })}
        confirmLabel={t("scheduledTransactions.goToSubscriptions", {
          defaultValue: "Go to Subscriptions",
        })}
        message={t("scheduledTransactions.managedBySubscriptionDesc", {
          defaultValue:
            "This scheduled transaction is automatically synchronized with your subscription. To adjust amounts, cycle, pause, or delete, manage it directly in Subscriptions.",
        })}
        onCancel={() => setManagedBySubTarget(null)}
        onConfirm={() => {
          setManagedBySubTarget(null);
          router.push("/subscriptions");
        }}
        title={t("scheduledTransactions.managedBySubscriptionTitle", {
          defaultValue: "Managed by Subscriptions",
        })}
        variant="primary"
        visible={managedBySubTarget !== null}
      />

      <ConfirmModal
        cancelLabel="Keep Archived"
        confirmLabel="Restore Schedule"
        message="This schedule will return to the schedules list. Its completed status and transaction history will remain unchanged."
        onCancel={() => setPendingRestore(null)}
        onConfirm={() => {
          if (pendingRestore) {
            const isRegular = !pendingRestore.subscriptionId;
            if (
              isRegular &&
              activeRegularSchedules.length >=
                PRO_LIMITS.FREE_MAX_SCHEDULED_TRANSACTIONS
            ) {
              const toRestore = pendingRestore;
              setPendingRestore(null);
              guardAction(() => {
                restore(toRestore.id);
              }, {
                featureTitle: t("pro.limits.schedulesTitle"),
                featureDescription: t("pro.limits.restoreScheduleDesc", {
                  count: PRO_LIMITS.FREE_MAX_SCHEDULED_TRANSACTIONS,
                }),
              });
              return;
            }
            const toRestore = pendingRestore;
            const restoreResult = restore(toRestore.id);
            if (restoreResult) {
              setPendingRestore(null);
              setToastState({
                visible: true,
                message: t("scheduledTransactions.restoreToastTitle"),
                description:
                  restoreResult === "completed"
                    ? t("scheduledTransactions.restoreToastCompleted", {
                        name:
                          toRestore.name ||
                          t("scheduledTransactions.defaultScheduleName"),
                      })
                    : t("scheduledTransactions.restoreToastActive", {
                        name:
                          toRestore.name ||
                          t("scheduledTransactions.defaultScheduleName"),
                      }),
              });
            }
          }
        }}
        pending={pending}
        title="Restore scheduled transaction?"
        variant="restore"
        visible={pendingRestore !== null}
      />

      <ConfirmModal
        cancelLabel="Keep Active"
        confirmLabel="End Schedule"
        message="Future occurrences will stop. Transactions already posted by this schedule will remain unchanged."
        onCancel={() => setPendingEnd(null)}
        onConfirm={() => {
          if (pendingEnd && end(pendingEnd.id)) setPendingEnd(null);
        }}
        pending={pending}
        title="End scheduled transaction?"
        variant="destructive"
        visible={pendingEnd !== null}
      />

      <ConfirmModal
        cancelLabel="Keep Schedule"
        confirmLabel={
          pendingDeleteHasHistory ? "Archive Schedule" : "Delete Permanently"
        }
        message={
          pendingDeleteHasHistory
            ? "This schedule has posted transactions in your accounts. It will be archived and removed from your active schedule list. Posted transactions stay in place."
            : "This schedule has no posted transactions and will be permanently deleted."
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            const isArchive = pendingDeleteHasHistory;
            const name = pendingDelete.name || "Schedule";
            if (remove(pendingDelete.id)) {
              setPendingDelete(null);
              setToastState({
                visible: true,
                message: isArchive ? "Schedule archived" : "Schedule deleted",
                description: isArchive
                  ? `"${name}" was moved to archive.`
                  : `"${name}" was permanently deleted.`,
              });
            }
          }
        }}
        pending={pending}
        title={
          pendingDeleteHasHistory
            ? "Archive scheduled transaction?"
            : "Delete scheduled transaction?"
        }
        variant="destructive"
        visible={pendingDelete !== null}
      />

      <ConfirmModal
        cancelLabel="Keep Archived"
        confirmLabel="Delete Permanently"
        message="This schedule and its run history will be permanently deleted. Any transactions already posted to your accounts will remain safe and unchanged."
        onCancel={() => setPendingPermanentDelete(null)}
        onConfirm={() => {
          if (
            pendingPermanentDelete &&
            permanentlyDelete(pendingPermanentDelete.id)
          ) {
            setPendingPermanentDelete(null);
          }
        }}
        pending={pending}
        title="Permanently delete schedule?"
        variant="destructive"
        visible={pendingPermanentDelete !== null}
      />

      <ProFeatureModal
        featureDescription={guardMeta?.featureDescription}
        featureTitle={guardMeta?.featureTitle}
        onClose={closePaywall}
        visible={paywallVisible}
      />

      <WalkthroughIntroModal
        visible={walkthroughIntro.isIntroVisible}
        title={t("scheduledTransactionsWalkthrough.introTitle")}
        subtitle={t("scheduledTransactionsWalkthrough.introSubtitle")}
        message={t("scheduledTransactionsWalkthrough.introMessage")}
        icon={<Repeat color={theme.colors.primary} size={32} />}
        onStart={walkthroughIntro.handleStart}
        onSkip={walkthroughIntro.handleSkip}
      />

      <ScheduledTransactionsWalkthroughOverlay
        onNext={walkthrough.nextStep}
        onPrev={walkthrough.prevStep}
        onSkip={walkthrough.skipWalkthrough}
        step={walkthrough.currentStep}
        stepIndex={walkthrough.activeStepIndex}
        targetLayout={walkthrough.activeTargetLayout}
        totalSteps={walkthrough.totalSteps}
        visible={walkthrough.isWalkthroughActive}
      />

      <FirstScheduleCongratulationsModal
        onClose={() => setShowCongrats(false)}
        onSkip={() => setShowCongrats(false)}
        onStartTour={() => {
          setShowCongrats(false);
          walkthrough.startWalkthrough();
        }}
        visible={showCongrats}
      />

      </PageContainer>

      <AppToast
        description={toastState.description}
        includeSafeArea
        message={toastState.message}
        onClose={() => setToastState((prev) => ({ ...prev, visible: false }))}
        position="top"
        variant="success"
        visible={toastState.visible}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screenWrapper: {
      flex: 1,
    },
    interactionBlocker: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "transparent",
      zIndex: 99999,
    },
    content: {
      gap: theme.spacing.md,
      paddingBottom: 80,
    },
    searchBox: {
      marginBottom: theme.spacing.xs,
    },
    errorBanner: {
      backgroundColor: theme.colors.danger + "18",
      borderColor: theme.colors.danger + "55",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
    },
    sectionHeading: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.4,
      marginTop: theme.spacing.xs,
      textTransform: "uppercase",
    },
    scheduleHeadingRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    sourceFilterContainer: {
      marginBottom: 0,
    },
    sourceFilterScroll: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingVertical: 2,
    },
    sourceTab: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    sourceTabSelected: {
      backgroundColor: theme.colors.primary + "14",
      borderColor: theme.colors.primary,
    },
    sourceTabText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sourceTabTextSelected: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    countBadge: {
      backgroundColor: theme.colors.border,
      borderRadius: 10,
      minWidth: 18,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    countBadgeSelected: {
      backgroundColor: theme.colors.primary,
    },
    countText: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    countTextSelected: {
      color: theme.colors.onPrimary,
    },
    subscriptionBadge: {
      backgroundColor: theme.colors.primary + "18",
      borderColor: theme.colors.primary + "40",
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    subscriptionBadgeText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
    },
    manageInSubAction: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 40,
      paddingHorizontal: theme.spacing.sm,
    },
    manageInSubActionText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    filterOptions: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    filterCheckbox: {
      minHeight: 36,
    },
    dueSection: {
      gap: theme.spacing.sm,
    },
    scheduleCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.md,
      ...theme.shadows.card,
    },
    archivedScheduleCard: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    cardHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
    },
    cardMain: {
      flex: 1,
      minWidth: 0,
    },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "capitalize",
    },
    cardMeta: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: 20,
      marginTop: 2,
    },
    nextRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      justifyContent: "space-between",
      marginTop: theme.spacing.xs,
    },
    nextText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    advancePostChip: {
      alignItems: "center",
      backgroundColor: theme.colors.primary + "14",
      borderColor: theme.colors.primary + "35",
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    advancePostChipText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
      lineHeight: 14,
    },
    failureText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      marginTop: theme.spacing.xs,
    },
    amountText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    amountExpense: {
      color: theme.colors.danger,
    },
    amountIncome: {
      color: theme.colors.success,
    },
    amountTransfer: {
      color: theme.colors.primary,
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
    },
    statusActive: {
      backgroundColor: theme.colors.success + "20",
    },
    statusPaused: {
      backgroundColor: theme.colors.warning + "20",
    },
    statusCompleted: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    statusArchived: {
      backgroundColor: theme.colors.warning + "20",
    },
    statusText: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
    },
    cardActions: {
      alignItems: "center",
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    iconAction: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 40,
      paddingHorizontal: theme.spacing.sm,
    },
    actionText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    restoreActionText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    deleteAction: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginLeft: "auto",
      minHeight: 40,
      paddingHorizontal: theme.spacing.sm,
    },
    endActionText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
