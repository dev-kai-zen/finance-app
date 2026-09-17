import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { FloatingActionButton, PageContainer, PageHeader } from "@/components";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import {
  TransactionFormModal,
  useTransactions,
  type TransactionType,
} from "@/modules/transactions";
import { CategorySpendingCard } from "../components/category-spending-card";
import { DashboardMonthlyCashflowCard } from "../components/dashboard-monthly-cashflow-card";
import { DashboardNetWorthCard } from "../components/dashboard-net-worth-card";
import { DashboardQuickActions } from "../components/dashboard-quick-actions";
import { RecentTransactionsCard } from "../components/recent-transactions-card";
import { useDashboard } from "../hooks/use-dashboard";

export function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = isTabletOrDesktop(width);
  const styles = useThemeStyles(createStyles);

  const { summary, refresh: refreshDashboard } = useDashboard();
  const { accounts, refresh: refreshAccounts } = useAccounts();
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

  const handleNavigateToAccounts = () => {
    router.navigate("/accounts" as any);
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
  const monthlyCashflow = summary?.monthlyCashflow ?? {
    totalInflowMinorUnits: 0,
    totalOutflowMinorUnits: 0,
    netSavingsMinorUnits: 0,
    savingsRatePercentage: 0,
    monthLabel: "Current Month",
  };
  const topSpending = summary?.topSpendingCategories ?? [];
  const recentTx = summary?.recentTransactions ?? [];

  return (
    <PageContainer
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Record new transaction"
          onPress={() => handleOpenTransactionModal("expense")}
        />
      }
      header={
        <PageHeader
          breadcrumb="Kaizen Finance / Overview"
          primaryAction={{
            label: "+ Add Transaction",
            onPress: () => handleOpenTransactionModal("expense"),
          }}
          subtitle="Real-time financial pulse, cash flow, and spending overview."
          title="Dashboard"
        />
      }
    >
      <View style={styles.container}>
        {/* Quick Action Buttons */}
        <DashboardQuickActions
          onNavigateToAccounts={handleNavigateToAccounts}
          onOpenTransactionModal={handleOpenTransactionModal}
        />

        {/* Top Hero Cards: Net Worth & Monthly Cashflow */}
        <View style={[styles.heroRow, isDesktop && styles.heroRowDesktop]}>
          <View style={styles.heroCol}>
            <DashboardNetWorthCard
              netWorthMinorUnits={netWorth}
              totalAssetsMinorUnits={assets}
              totalLiabilitiesMinorUnits={liabilities}
            />
          </View>
          <View style={styles.heroCol}>
            <DashboardMonthlyCashflowCard cashflow={monthlyCashflow} />
          </View>
        </View>

        {/* Secondary Grid: Category Spending & Recent Transactions */}
        <View style={[styles.heroRow, isDesktop && styles.heroRowDesktop]}>
          <View style={styles.heroCol}>
            <CategorySpendingCard categories={topSpending} />
          </View>
          <View style={styles.heroCol}>
            <RecentTransactionsCard
              onAddTransaction={() => handleOpenTransactionModal("expense")}
              onViewAll={handleViewAllTransactions}
              transactions={recentTx}
            />
          </View>
        </View>
      </View>

      {/* Direct Transaction Modal */}
      <TransactionFormModal
        accounts={accounts}
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
    },
    heroRow: {
      flexDirection: "column",
      gap: theme.spacing.lg,
    },
    heroRowDesktop: {
      flexDirection: "row",
      alignItems: "stretch",
    },
    heroCol: {
      flex: 1,
    },
  });
}
