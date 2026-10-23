import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ConfirmModal,
  PageContainer,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  TransactionDetailModal,
  TransactionFormModal,
  useTransactionPresets,
  useTransactions,
  type TransactionListItem,
} from "@/modules/transactions";
import { ProGate, useProStatus } from "@/modules/pro";
import { useExperiencePreferences } from "@/modules/settings";
import {
  CalendarWalkthroughOverlay,
  DraggableTourChip,
  useCalendarWalkthrough,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  WalkthroughRegistryProvider,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import { CalendarBalanceSheetTab } from "../components/calendar-balance-sheet-tab";
import { CalendarGrid } from "../components/calendar-grid";
import { CalendarMonthHeader } from "../components/calendar-month-header";
import { CalendarNetTab } from "../components/calendar-net-tab";
import { CalendarSchedulesTab } from "../components/calendar-schedules-tab";
import { CalendarScopeBadge } from "../components/calendar-scope-badge";
import { CalendarSummaryRibbon } from "../components/calendar-summary-ribbon";
import {
  CalendarTabsHeader,
  type CalendarTabsHeaderHandle,
} from "../components/calendar-tabs-header";
import { CalendarTransactionsTab } from "../components/calendar-transactions-tab";
import { useCalendarData } from "../hooks/use-calendar-data";
import type { CalendarTab } from "../types/calendar.types";

export function CalendarScreen() {
  return (
    <WalkthroughRegistryProvider>
      <CalendarScreenContent />
    </WalkthroughRegistryProvider>
  );
}

function CalendarScreenContent() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { isPro } = useProStatus();

  const {
    activeMonth,
    selectedDay,
    activeTab,
    gridCells,
    scopedTransactions,
    scopedSchedules,
    summaryMetrics,
    categoryBreakdown,
    balanceSheetData,
    accounts,
    categories,
    pockets,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    toggleSelectDay,
    clearDaySelection,
    setActiveTab,
    refreshAll,
    postOccurrence,
    skipOccurrence,
  } = useCalendarData();

  const {
    recordTransaction,
    recordTransfer,
    editTransaction,
    editTransfer,
    deleteTx,
    pendingAction,
  } = useTransactions();

  const {
    presets,
    loading: presetsLoading,
    pending: presetPending,
    error: presetError,
    clearError: onClearPresetError,
    savePreset,
    deletePreset,
    archivePreset,
    restorePreset,
    permanentlyDeletePreset,
    reorderPresets,
    archivedPresets,
    sortBy: presetSortBy,
    setSortBy: onChangePresetSortBy,
  } = useTransactionPresets();

  // Transaction modals state
  const [inspectedTransaction, setInspectedTransaction] =
    useState<TransactionListItem | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [prefilledTransaction, setPrefilledTransaction] =
    useState<TransactionListItem | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [pendingDeleteTxId, setPendingDeleteTxId] = useState<string | null>(
    null,
  );

  // Schedule action modals state
  const [pendingPostScheduleId, setPendingPostScheduleId] = useState<
    string | null
  >(null);
  const [pendingSkipScheduleId, setPendingSkipScheduleId] = useState<
    string | null
  >(null);

  // Walkthrough targets & coordination
  const navControlsRef = useWalkthroughTarget("calArrows");
  const transactionsTabRef = useWalkthroughTarget("calTransactionsTab");
  const schedulesTabRef = useWalkthroughTarget("calSchedulesTab");
  const netTabRef = useWalkthroughTarget("calNetTab");
  const balanceSheetTabRef = useWalkthroughTarget("calBalanceSheetTab");

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const tabsHeaderRef = useRef<CalendarTabsHeaderHandle>(null);
  const didAutoStartWalkthroughRef = useRef(false);
  const { measureTargetInAncestor } = useWalkthroughRegistry();

  const handlePrepareTabTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      if (targetId === "calTransactionsTab") {
        tabsHeaderRef.current?.scrollTabIntoView("transactions");
      } else if (targetId === "calSchedulesTab") {
        tabsHeaderRef.current?.scrollTabIntoView("schedules");
      } else if (targetId === "calNetTab") {
        tabsHeaderRef.current?.scrollTabIntoView("net");
      } else if (targetId === "calBalanceSheetTab") {
        tabsHeaderRef.current?.scrollTabIntoView("balance_sheet");
      }
    },
    [],
  );

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
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

  const walkthrough = useCalendarWalkthrough({
    onPrepareTabTarget: handlePrepareTabTarget,
    onTabChange: setActiveTab,
    onScrollToTarget: handleScrollToTarget,
  });

  const { isPromptDismissed } = useExperiencePreferences();

  useEffect(() => {
    if (
      didAutoStartWalkthroughRef.current ||
      isPromptDismissed("calendarWalkthroughDismissed")
    ) {
      return;
    }
    const timer = setTimeout(() => {
      didAutoStartWalkthroughRef.current = true;
      walkthrough.startWalkthrough();
    }, 700);
    return () => clearTimeout(timer);
  }, [isPromptDismissed, walkthrough.startWalkthrough]);

  // Handlers for transactions
  const handleEditTransaction = (tx: TransactionListItem) => {
    setInspectedTransaction(null);
    setPrefilledTransaction(tx);
    setIsEditingTransaction(true);
    setFormModalOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    setPendingDeleteTxId(id);
  };

  const handleConfirmDeleteTx = async () => {
    if (!pendingDeleteTxId) return;
    setInspectedTransaction(null);
    const success = await deleteTx(pendingDeleteTxId);
    if (success) {
      setPendingDeleteTxId(null);
      refreshAll();
    }
  };

  const handleConfirmPostSchedule = () => {
    if (!pendingPostScheduleId) return;
    postOccurrence(pendingPostScheduleId);
    setPendingPostScheduleId(null);
    refreshAll();
  };

  const handleConfirmSkipSchedule = () => {
    if (!pendingSkipScheduleId) return;
    skipOccurrence(pendingSkipScheduleId);
    setPendingSkipScheduleId(null);
    refreshAll();
  };

  const handleSelectTab = (tab: CalendarTab) => {
    setActiveTab(tab);
  };

  const balanceSheetAccountCount =
    balanceSheetData.assets.accountTypes.reduce(
      (sum, g) => sum + g.accounts.length,
      0,
    ) +
    balanceSheetData.liabilities.accountTypes.reduce(
      (sum, g) => sum + g.accounts.length,
      0,
    );

  const currentTabCount =
    activeTab === "transactions"
      ? scopedTransactions.length
      : activeTab === "schedules"
        ? scopedSchedules.length
        : activeTab === "balance_sheet"
          ? balanceSheetAccountCount
          : scopedTransactions.length;

  return (
    <PageContainer
      scrollContentRef={scrollContentRef}
      scrollRef={scrollRef}
      floatingAction={
        <DraggableTourChip
          onPress={walkthrough.startWalkthrough}
          visible={!walkthrough.isWalkthroughActive}
        />
      }
    >
      <View style={styles.content}>
        {/* 1. Month Navigation Header */}
        <CalendarMonthHeader
          activeMonth={activeMonth}
          navControlsRef={navControlsRef}
          onNextMonth={goToNextMonth}
          onPrevMonth={goToPrevMonth}
          onToday={goToToday}
        />

        {/* 2. Calendar Grid */}
        <CalendarGrid
          activeTab={activeTab}
          cells={gridCells}
          onToggleDay={toggleSelectDay}
          selectedDay={selectedDay}
        />

        {/* 3. Scope Indicator / Clear Filter Badge */}
        <CalendarScopeBadge
          activeMonth={activeMonth}
          activeTab={activeTab}
          itemCount={currentTabCount}
          onClearDay={clearDaySelection}
          selectedDay={selectedDay}
        />

        {/* 4. Mini Summary Ribbon */}
        <CalendarSummaryRibbon
          activeTab={activeTab}
          isMonthScope={selectedDay === null}
          metrics={summaryMetrics}
        />

        {/* 5. Segmented Tabs Header */}
        <CalendarTabsHeader
          ref={tabsHeaderRef}
          activeTab={activeTab}
          balanceSheetRef={balanceSheetTabRef}
          isPro={isPro}
          netRef={netTabRef}
          onSelectTab={handleSelectTab}
          scheduleCount={scopedSchedules.length}
          schedulesRef={schedulesTabRef}
          transactionCount={scopedTransactions.length}
          transactionsRef={transactionsTabRef}
        />

        {/* 6. Active Tab Content */}
        {activeTab === "transactions" && (
          <CalendarTransactionsTab
            onDeleteTransaction={handleDeleteTransaction}
            onPressTransaction={(tx) => setInspectedTransaction(tx)}
            selectedDay={selectedDay}
            transactions={scopedTransactions}
          />
        )}

        {activeTab === "schedules" && (
          <CalendarSchedulesTab
            accounts={accounts}
            categories={categories}
            onNavigateToSchedules={() => router.navigate("/transactions/scheduled" as any)}
            onPostOccurrence={(id) => setPendingPostScheduleId(id)}
            onSkipOccurrence={(id) => setPendingSkipScheduleId(id)}
            schedules={scopedSchedules}
            selectedDay={selectedDay}
          />
        )}

        {activeTab === "net" && (
          <ProGate
            featureDescription="Visualize daily income vs expense variance, cash flow spikes, and net balance trajectories across your calendar with Kaizen Pro."
            featureTitle="Net Earnings Calendar"
            mode="blur"
          >
            <CalendarNetTab
              categoryBreakdown={categoryBreakdown}
              isMonthScope={selectedDay === null}
              metrics={summaryMetrics}
            />
          </ProGate>
        )}

        {activeTab === "balance_sheet" && (
          <ProGate
            featureDescription="Track daily asset, liability, and equity trends directly on your calendar timeline with Kaizen Pro."
            featureTitle="Balance Sheet Projections"
            mode="blur"
          >
            <CalendarBalanceSheetTab
              activeMonth={activeMonth}
              balanceSheet={balanceSheetData}
              selectedDay={selectedDay}
            />
          </ProGate>
        )}
      </View>

      {/* Transaction Details Modal */}
      <TransactionDetailModal
        onClose={() => setInspectedTransaction(null)}
        onDelete={handleDeleteTransaction}
        onEdit={handleEditTransaction}
        transaction={inspectedTransaction}
        visible={inspectedTransaction !== null}
      />

      {/* Create / Edit Transaction Modal */}
      <TransactionFormModal
        accounts={accounts}
        archivedPresets={archivedPresets}
        categories={categories}
        initialTransaction={prefilledTransaction}
        isEditing={isEditingTransaction}
        onArchivePreset={archivePreset}
        onClearPresetError={onClearPresetError}
        onClose={() => {
          setFormModalOpen(false);
          setPrefilledTransaction(null);
          setIsEditingTransaction(false);
        }}
        onDeletePreset={deletePreset}
        onPermanentlyDeletePreset={permanentlyDeletePreset}
        onReorderPresets={reorderPresets}
        onRestorePreset={restorePreset}
        onSavePreset={savePreset}
        onSaveTransaction={async (input, preset, atts) => {
          const success = await recordTransaction(input, preset, atts);
          if (success) refreshAll();
          return success;
        }}
        onSaveTransfer={async (input, preset, atts) => {
          const success = await recordTransfer(input, preset, atts);
          if (success) refreshAll();
          return success;
        }}
        onUpdateTransaction={async (id, input, atts) => {
          const success = await editTransaction(id, input, atts);
          if (success) refreshAll();
          return success;
        }}
        onUpdateTransfer={async (input, atts) => {
          const success = await editTransfer(input, atts);
          if (success) refreshAll();
          return success;
        }}
        pending={pendingAction}
        pockets={pockets}
        presetPending={presetPending}
        presets={presets}
        presetsLoading={presetsLoading}
        onCategoriesChanged={() => void refreshAll()}
        visible={formModalOpen}
      />

      {/* Delete Transaction Confirmation */}
      <ConfirmModal
        cancelLabel="Keep"
        confirmLabel="Delete"
        message="Are you sure you want to delete this transaction?"
        onCancel={() => setPendingDeleteTxId(null)}
        onConfirm={handleConfirmDeleteTx}
        pending={pendingAction}
        title="Delete Transaction"
        variant="destructive"
        visible={pendingDeleteTxId !== null}
      />

      {/* Post Schedule Occurrence Confirmation */}
      <ConfirmModal
        cancelLabel="Cancel"
        confirmLabel="Post Now"
        message="Do you want to post this scheduled transaction now?"
        onCancel={() => setPendingPostScheduleId(null)}
        onConfirm={handleConfirmPostSchedule}
        title="Post Scheduled Transaction"
        variant="primary"
        visible={pendingPostScheduleId !== null}
      />

      {/* Skip Schedule Occurrence Confirmation */}
      <ConfirmModal
        cancelLabel="Cancel"
        confirmLabel="Skip Occurrence"
        message="This scheduled occurrence will be marked as skipped and will not record a transaction."
        onCancel={() => setPendingSkipScheduleId(null)}
        onConfirm={handleConfirmSkipSchedule}
        title="Skip Scheduled Occurrence"
        variant="destructive"
        visible={pendingSkipScheduleId !== null}
      />

      {/* Calendar Walkthrough Overlay */}
      <CalendarWalkthroughOverlay
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
    content: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: 40,
    },
  });
}
