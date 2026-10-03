import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
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
import { CalendarGrid } from "../components/calendar-grid";
import { CalendarMonthHeader } from "../components/calendar-month-header";
import { CalendarNetTab } from "../components/calendar-net-tab";
import { CalendarSchedulesTab } from "../components/calendar-schedules-tab";
import { CalendarScopeBadge } from "../components/calendar-scope-badge";
import { CalendarSummaryRibbon } from "../components/calendar-summary-ribbon";
import { CalendarTabsHeader } from "../components/calendar-tabs-header";
import { CalendarTransactionsTab } from "../components/calendar-transactions-tab";
import { useCalendarData } from "../hooks/use-calendar-data";

export function CalendarScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const {
    activeMonth,
    selectedDay,
    activeTab,
    gridCells,
    scopedTransactions,
    scopedSchedules,
    summaryMetrics,
    categoryBreakdown,
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

  const currentTabCount =
    activeTab === "transactions"
      ? scopedTransactions.length
      : scopedSchedules.length;

  return (
    <PageContainer>
      <View style={styles.content}>
        {/* 1. Month Navigation Header */}
        <CalendarMonthHeader
          activeMonth={activeMonth}
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
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          scheduleCount={scopedSchedules.length}
          transactionCount={scopedTransactions.length}
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
          <CalendarNetTab
            categoryBreakdown={categoryBreakdown}
            isMonthScope={selectedDay === null}
            metrics={summaryMetrics}
          />
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
