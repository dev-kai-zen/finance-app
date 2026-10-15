import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ConfirmModal,
  FloatingActionButton,
  PageContainer,
  PageErrorState,
  PageLoadingState,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import { useCurrencyPreferences } from "@/modules/currencies";
import { ManualSetupChecklist, useWorkspace } from "@/modules/onboarding";
import { useExperiencePreferences } from "@/modules/settings";
import { ExperiencePromptsCard } from "../components/experience-prompts-card";
import { FirstExpenseHintCard } from "../components/first-expense-hint-card";
import {
  TransactionDetailModal,
  TransactionFormModal,
  useTransactionPresets,
  useTransactions,
  type TransactionListItem,
  type TransactionType,
} from "@/modules/transactions";
import { DashboardNetWorthCard } from "../components/dashboard-net-worth-card";
import { RecentTransactionsCard } from "../components/recent-transactions-card";
import { useDashboard } from "../hooks/use-dashboard";

export function DashboardScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const { state: workspaceState } = useWorkspace();
  const { preferences: currencyPreferences } = useCurrencyPreferences();
  const { homeMode, isPromptDismissed, setHomeMode } = useExperiencePreferences();

  const {
    summary,
    loading,
    error: dashboardError,
    refresh: refreshDashboard,
  } = useDashboard();
  const { accounts, pockets, types, refresh: refreshAccounts } = useAccounts();
  const { categories, refresh: refreshCategories } = useCategories();
  const {
    recordTransaction,
    recordTransfer,
    editTransaction,
    editTransfer,
    deleteTx,
    pendingAction,
    error: transactionError,
    clearError: clearTransactionError,
    refresh: refreshTransactions,
  } = useTransactions();
  const {
    presets,
    archivedPresets,
    loading: presetsLoading,
    pending: presetPending,
    error: presetError,
    refresh: refreshPresets,
    savePreset,
    archivePreset,
    deletePreset,
    restorePreset,
    permanentlyDeletePreset,
    reorderPresets,
    sortBy: presetSortBy,
    setSortBy: setPresetSortBy,
    clearError: clearPresetError,
  } = useTransactionPresets();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<TransactionType>("expense");
  const [inspectedTransaction, setInspectedTransaction] =
    useState<TransactionListItem | null>(null);
  const [prefilledTransaction, setPrefilledTransaction] =
    useState<TransactionListItem | null>(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshCategories();
    }, [refreshCategories]),
  );

  const manualSetupSteps = [
    {
      id: "account-type",
      title: "Create an account type",
      description: "Define how your first account should be grouped.",
      complete: types.some(({ isSystem }) => !isSystem),
      actionLabel: "Manage account types",
      onPress: () => router.navigate("/accounts?setup=types" as any),
    },
    {
      id: "account",
      title: "Create your first account",
      description: "Add its name, current balance, and account type.",
      complete: accounts.length > 0,
      actionLabel: "Add an account",
      onPress: () => router.navigate("/accounts?setup=account" as any),
    },
    {
      id: "category",
      title: "Create category groups",
      description: "Add the income and expense groups you want to track.",
      complete: categories.some(({ isSystem }) => !isSystem),
      actionLabel: "Add a category group",
      onPress: () => router.navigate("/categories?setup=group" as any),
    },
    {
      id: "subcategory",
      title: "Add a subcategory",
      description: "Break a category group into useful detail.",
      complete: categories.some((category) =>
        category.subcategories?.some(({ isSystem }) => !isSystem),
      ),
      actionLabel: "Open categories",
      onPress: () => router.navigate("/categories" as any),
    },
  ];

  const handleOpenTransactionModal = (mode: TransactionType) => {
    refreshAccounts();
    setPrefilledTransaction(null);
    setIsEditingTransaction(false);
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const recentTx = summary?.recentTransactions ?? [];

  useEffect(() => {
    setInspectedTransaction((current) =>
      current
        ? recentTx.find((transaction) => transaction.id === current.id) ??
          current
        : null,
    );
  }, [recentTx]);

  const handleDuplicateTransaction = (tx: TransactionListItem) => {
    setInspectedTransaction(null);
    setPrefilledTransaction(tx);
    setIsEditingTransaction(false);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (tx: TransactionListItem) => {
    setInspectedTransaction(null);
    setPrefilledTransaction(tx);
    setIsEditingTransaction(true);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!pendingDeleteId) return;
    setInspectedTransaction(null);
    const deleted = await deleteTx(pendingDeleteId);
    if (deleted) {
      refreshAccounts();
      refreshDashboard();
      setPendingDeleteId(null);
    }
  };

  const handleViewAllTransactions = () => {
    router.navigate("/transactions" as any);
  };

  const handleSaveTx = async (
    input: Parameters<typeof recordTransaction>[0],
    preset?: Parameters<typeof recordTransaction>[1],
    attachmentChanges?: Parameters<typeof recordTransaction>[2],
  ) => {
    const success = await recordTransaction(input, preset, attachmentChanges);
    if (success) {
      refreshAccounts();
      refreshDashboard();
      refreshPresets();
    }
    return success;
  };

  const handleSaveTransfer = async (
    input: Parameters<typeof recordTransfer>[0],
    preset?: Parameters<typeof recordTransfer>[1],
    attachmentChanges?: Parameters<typeof recordTransfer>[2],
  ) => {
    const success = await recordTransfer(input, preset, attachmentChanges);
    if (success) {
      refreshAccounts();
      refreshDashboard();
      refreshPresets();
    }
    return success;
  };

  const netWorth = summary?.netWorthMinorUnits ?? 0;
  const assets = summary?.totalAssetsMinorUnits ?? 0;
  const liabilities = summary?.totalLiabilitiesMinorUnits ?? 0;
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const expenseTransactionCount = recentTx.filter(
    (transaction) => transaction.type === "expense",
  ).length;
  const showFirstExpenseHint =
    homeMode === "simple" &&
    !isPromptDismissed("firstExpenseDismissed") &&
    recentTx.length === 0;
  const hasCreditCardAccount = activeAccounts.some(
    (account) => account.creditCardDetails,
  );

  return (
    <PageContainer
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Record new transaction"
          onPress={() => handleOpenTransactionModal("expense")}
        />
      }
    >
      <View style={styles.container}>
        {workspaceState.status === "completed" &&
        workspaceState.mode === "personal" &&
        workspaceState.setupStrategy === "manual" ? (
          <ManualSetupChecklist steps={manualSetupSteps} />
        ) : null}
        {!summary ? (
          dashboardError ? (
            <PageErrorState message={dashboardError} onRetry={refreshDashboard} />
          ) : (
            <PageLoadingState
              message={loading ? "Loading your dashboard..." : "Preparing dashboard..."}
            />
          )
        ) : (
          <>
            <FirstExpenseHintCard visible={showFirstExpenseHint} onDismiss={() => {}} />
            <ExperiencePromptsCard
              activeAccountCount={activeAccounts.length}
              expenseTransactionCount={expenseTransactionCount}
              hasCreditCardAccount={hasCreditCardAccount}
            />
            <DashboardNetWorthCard
              currencyCode={currencyPreferences.defaultCurrency}
              history={summary.netWorthHistory}
              homeMode={homeMode}
              monthlyChangePercentage={summary.netWorthChangePercentage}
              monthlySpentMinorUnits={summary.monthlyCashflow.totalOutflowMinorUnits}
              netWorthMinorUnits={netWorth}
              onHomeModeChange={setHomeMode}
              totalAssetsMinorUnits={assets}
              totalLiabilitiesMinorUnits={liabilities}
            />
            <RecentTransactionsCard
              onPressTransaction={(tx) => setInspectedTransaction(tx)}
              onViewAll={handleViewAllTransactions}
              transactions={recentTx}
            />
          </>
        )}
      </View>

      <TransactionDetailModal
        onAttachmentsChanged={() => {
          void refreshTransactions();
          refreshDashboard();
        }}
        onClose={() => setInspectedTransaction(null)}
        onDelete={handleDeleteTransaction}
        onDuplicate={handleDuplicateTransaction}
        onEdit={handleEditTransaction}
        transaction={inspectedTransaction}
        visible={inspectedTransaction !== null}
      />

      {/* Direct Transaction Modal */}
      <TransactionFormModal
        accounts={accounts}
        pockets={pockets}
        categories={categories}
        presets={presets}
        presetsLoading={presetsLoading}
        presetPending={presetPending}
        presetError={presetError}
        error={transactionError}
        initialTransaction={prefilledTransaction}
        isEditing={isEditingTransaction}
        onClearError={clearTransactionError}
        onClearPresetError={clearPresetError}
        onClose={() => {
          setIsModalOpen(false);
          setPrefilledTransaction(null);
          setIsEditingTransaction(false);
        }}
        onSaveTransaction={handleSaveTx}
        onSaveTransfer={handleSaveTransfer}
        onSavePreset={savePreset}
        onDeletePreset={deletePreset}
        onArchivePreset={archivePreset}
        onRestorePreset={restorePreset}
        onPermanentlyDeletePreset={permanentlyDeletePreset}
        onReorderPresets={reorderPresets}
        archivedPresets={archivedPresets}
        presetSortBy={presetSortBy}
        onChangePresetSortBy={setPresetSortBy}
        onUpdateTransaction={async (id, input, attachmentChanges) => {
          const success = await editTransaction(id, input, attachmentChanges);
          if (success) {
            refreshAccounts();
            refreshDashboard();
          }
          return success;
        }}
        onUpdateTransfer={async (input, attachmentChanges) => {
          const success = await editTransfer(input, attachmentChanges);
          if (success) {
            refreshAccounts();
            refreshDashboard();
          }
          return success;
        }}
        onCategoriesChanged={() => void refreshCategories()}
        pending={pendingAction}
        visible={isModalOpen}
      />

      <ConfirmModal
        cancelLabel="Keep"
        confirmLabel="Delete"
        message="This record will be moved to Trash. You can restore it later."
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          void handleConfirmDeleteTransaction();
        }}
        pending={pendingAction}
        title="Delete transaction?"
        variant="destructive"
        visible={pendingDeleteId !== null}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
      paddingBottom: 80,
      paddingTop: theme.spacing.lg,
    },
  });
}
