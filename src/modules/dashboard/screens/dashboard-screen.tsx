import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  FloatingActionButton,
  PageContainer,
  PageErrorState,
  PageLoadingState,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import { ManualSetupChecklist, useWorkspace } from "@/modules/onboarding";
import {
  TransactionFormModal,
  useTransactionPresets,
  useTransactions,
  type TransactionType,
} from "@/modules/transactions";
import { DashboardNetWorthCard } from "../components/dashboard-net-worth-card";
import { RecentTransactionsCard } from "../components/recent-transactions-card";
import { useDashboard } from "../hooks/use-dashboard";

export function DashboardScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const { state: workspaceState } = useWorkspace();

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
    pendingAction,
    error: transactionError,
    clearError: clearTransactionError,
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
    setModalMode(mode);
    setIsModalOpen(true);
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
  const recentTx = summary?.recentTransactions ?? [];

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
            <DashboardNetWorthCard
              history={summary.netWorthHistory}
              monthlyChangePercentage={summary.netWorthChangePercentage}
              netWorthMinorUnits={netWorth}
              totalAssetsMinorUnits={assets}
              totalLiabilitiesMinorUnits={liabilities}
            />
            <RecentTransactionsCard
              onViewAll={handleViewAllTransactions}
              transactions={recentTx}
            />
          </>
        )}
      </View>

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
        onClearError={clearTransactionError}
        onClearPresetError={clearPresetError}
        onClose={() => setIsModalOpen(false)}
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
        pending={pendingAction}
        visible={isModalOpen}
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
