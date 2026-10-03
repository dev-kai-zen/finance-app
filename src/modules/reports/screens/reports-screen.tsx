import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { PageContainer } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { BalanceSheetReport } from "../components/balance-sheet/balance-sheet-report";
import { CashFlowReport } from "../components/cash-flow/cash-flow-report";
import { IncomeExpenseReport } from "../components/income-expense/income-expense-report";
import { NetWorthGrowthReport } from "../components/net-worth/net-worth-growth-report";
import { ReportsTabBar } from "../components/reports-tab-bar";
import type { ReportTabKey } from "../types/reports.types";

export function ReportsScreen() {
  const styles = useThemeStyles(createStyles);
  const [activeTab, setActiveTab] = useState<ReportTabKey>("balance-sheet");

  return (
    <PageContainer
      scrollable={true}
      contentContainerStyle={styles.pageContent}
    >
      <View style={styles.card}>
        <ReportsTabBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {activeTab === "balance-sheet" ? (
          <BalanceSheetReport />
        ) : null}

        {activeTab === "income-expense" ? (
          <IncomeExpenseReport />
        ) : null}

        {activeTab === "cash-flow" ? (
          <CashFlowReport />
        ) : null}

        {activeTab === "net-worth" ? (
          <NetWorthGrowthReport />
        ) : null}
      </View>
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    pageContent: {
      paddingTop: 8,
      paddingBottom: 32,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
  });
}
