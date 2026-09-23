import { useRouter } from "expo-router";
import { useState } from "react";
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
import {
  TransactionFormModal,
  useTransactions,
  type TransactionType,
} from "@/modules/transactions";
import { DashboardNetWorthCard } from "../components/dashboard-net-worth-card";
import { RecentTransactionsCard } from "../components/recent-transactions-card";
import { useDashboard } from "../hooks/use-dashboard";

export function DashboardScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);

  const {
    summary,
    loading,
    error: dashboardError,
    refresh: refreshDashboard,
  } = useDashboard();
  const { accounts, pockets, refresh: refreshAccounts } = useAccounts();
  const { categories } = useCategories();
  const {
    recordTransaction,
    recordTransfer,
    pendingAction,
    error: transactionError,
  } = useTransactions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<TransactionType>("expense");

  const handleOpenTransactionModal = (mode: TransactionType) => {
    refreshAccounts();
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleViewAllTransactions = () => {
    router.navigate("/transactions" as any);
  };

  const handleSaveTx = async (input: any) => {
    const success = await recordTransaction(input);
    if (success) {
      refreshAccounts();
      refreshDashboard();
    }
    return success;
  };

  const handleSaveTransfer = async (input: any) => {
    const success = await recordTransfer(input);
    if (success) {
      refreshAccounts();
      refreshDashboard();
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
        error={transactionError}
        onClose={() => setIsModalOpen(false)}
        onSaveTransaction={handleSaveTx}
        onSaveTransfer={handleSaveTransfer}
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
